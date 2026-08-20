const { GoogleGenAI } = require("@google/genai");

// Model is configurable so it can be changed without a code edit (NFR8).
// Google retires model versions periodically: gemini-2.0-flash returned 404
// "no longer available" on 20 Aug 2026 and was replaced via .env alone.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// Guard against sending an unbounded document to the API. Part A scopes
// testing to documents of up to 10 pages or 50,000 characters (NFR1).
const MAX_INPUT_CHARS = 50000;

// Beyond this the request is abandoned so the caller can offer a retry (NFR5)
const REQUEST_TIMEOUT_MS = 60000;

let client = null;

// Created on first use rather than at module load, so the server still starts
// when no key is configured. Callers surface that as a 503 instead of a crash.
const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error("GEMINI_API_KEY is not set");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  return client;
};

// Prompt templates per output type. Keyed by the ai_outputs.output_type enum.
const PROMPTS = {
  summary: (text) =>
    `You are helping a university student revise from their own study material.

Summarise the study material below. Cover the key concepts and any definitions that appear in it.

Rules:
- Use only information present in the material. Do not add facts from outside it.
- If the material is too short or unclear to summarise, say so plainly instead of inventing content.
- Write in clear prose with short paragraphs. Do not use markdown headings.

Study material:
---
${text}
---`,

  // FR10.1 - question/answer pairs parsed into individual flashcard records
  flashcards: (text) =>
    `You are helping a university student revise from their own study material.

Create revision flashcards from the study material below.

Rules:
- Use only information present in the material. Do not add facts from outside it.
- Each question must be answerable from the material alone.
- Write one clear question and one concise answer per card.
- Produce between 5 and 15 cards depending on how much distinct content the material contains.
- If the material is too short or unclear to make cards from, return an empty array.

Return JSON only, in exactly this shape:
{"cards":[{"question":"...","answer":"..."}]}

Study material:
---
${text}
---`,

  // FR11.1 - multiple-choice and true/false questions, each with a marked answer
  quiz: (text) =>
    `You are helping a university student test themselves on their own study material.

Create a practice quiz from the study material below.

Rules:
- Use only information present in the material. Do not add facts from outside it.
- Every question must be answerable from the material alone.
- Include a mix of multiple-choice and true/false questions.
- For multiple-choice, give exactly 4 options. Wrong options must be plausible but clearly incorrect according to the material.
- For true/false, the options must be exactly ["True","False"].
- "correct_answer" must repeat one of the options word for word.
- Produce between 5 and 10 questions depending on how much distinct content the material contains.
- If the material is too short or unclear to make questions from, return an empty array.

Return JSON only, in exactly this shape:
{"questions":[
  {"type":"multiple_choice","question":"...","options":["...","...","...","..."],"correct_answer":"..."},
  {"type":"true_false","question":"...","options":["True","False"],"correct_answer":"True"}
]}

Study material:
---
${text}
---`,

  // FR12.1 - explanation pitched at a user-selected level
  explanation: (text, { concept, level }) =>
    `You are helping a university student understand a concept from their own study material.

Explain this concept: ${concept}

Pitch the explanation at ${LEVEL_GUIDANCE[level]}

Rules:
- Base the explanation on the study material below. Do not add facts from outside it.
- If the concept does not appear in the material, say so plainly and explain only what the material does cover about it. Do not invent content.
- Write in clear prose with short paragraphs. Do not use markdown headings.

Study material:
---
${text}
---`
};

// FR12.1 - the three levels the interface offers, and what each one means for
// the explanation produced
const LEVEL_GUIDANCE = {
  beginner:
    "a beginner: assume no prior knowledge, define every term you use, keep " +
    "sentences short, and use an everyday analogy if one fits the material.",
  intermediate:
    "an intermediate learner: assume familiarity with the basics, focus on how " +
    "the parts relate to each other, and use the subject's proper terminology.",
  advanced:
    "an advanced learner: assume solid background knowledge, be precise and " +
    "concise, and cover mechanisms, edge cases or limitations the material raises."
};

const LEVELS = Object.keys(LEVEL_GUIDANCE);

// Output types that must be returned as JSON rather than prose. Each has a
// parser that converts the model's response into the records the API returns.
const STRUCTURED = {
  flashcards: (parsed) => {
    const cards = Array.isArray(parsed) ? parsed : parsed && parsed.cards;

    if (!Array.isArray(cards)) {
      const error = new Error("Flashcard response was not an array of cards");
      error.code = "AI_MALFORMED_RESPONSE";
      throw error;
    }

    const clean = cards
      .filter((c) => c && typeof c.question === "string" && typeof c.answer === "string")
      .map((c) => ({ question: c.question.trim(), answer: c.answer.trim() }))
      .filter((c) => c.question.length > 0 && c.answer.length > 0);

    if (clean.length === 0) {
      const error = new Error("No usable flashcards were generated");
      error.code = "AI_EMPTY_RESPONSE";
      throw error;
    }

    return clean;
  },

  quiz: (parsed) => {
    const questions = Array.isArray(parsed) ? parsed : parsed && parsed.questions;

    if (!Array.isArray(questions)) {
      const error = new Error("Quiz response was not an array of questions");
      error.code = "AI_MALFORMED_RESPONSE";
      throw error;
    }

    const clean = questions
      .filter((q) => q && typeof q.question === "string" && Array.isArray(q.options))
      .map((q) => {
        const options = q.options
          .filter((o) => typeof o === "string")
          .map((o) => o.trim())
          .filter((o) => o.length > 0);

        const isTrueFalse =
          options.length === 2 &&
          options.every((o) => ["true", "false"].includes(o.toLowerCase()));

        return {
          type: isTrueFalse ? "true_false" : "multiple_choice",
          question: q.question.trim(),
          options,
          correct_answer: typeof q.correct_answer === "string" ? q.correct_answer.trim() : ""
        };
      })
      // A question whose marked answer is not one of its own options is
      // unusable — it cannot be scored — so it is discarded rather than shown.
      .filter(
        (q) =>
          q.question.length > 0 &&
          q.options.length >= 2 &&
          q.correct_answer.length > 0 &&
          q.options.includes(q.correct_answer)
      );

    if (clean.length === 0) {
      const error = new Error("No usable quiz questions were generated");
      error.code = "AI_EMPTY_RESPONSE";
      throw error;
    }

    return clean;
  }
};

// FR9.1 - build the prompt for the requested output type.
// `options` carries per-type inputs: explanation uses { concept, level }.
const buildPrompt = (text, outputType, options = {}) => {
  const template = PROMPTS[outputType];

  if (!template) {
    const error = new Error(`Unsupported output type: ${outputType}`);
    error.code = "UNSUPPORTED_OUTPUT_TYPE";
    throw error;
  }

  if (outputType === "explanation") {
    const concept = typeof options.concept === "string" ? options.concept.trim() : "";

    if (concept.length === 0) {
      const error = new Error("A concept is required for an explanation");
      error.code = "MISSING_CONCEPT";
      throw error;
    }

    if (options.level && !LEVELS.includes(options.level)) {
      const error = new Error(`Level must be one of: ${LEVELS.join(", ")}`);
      error.code = "INVALID_LEVEL";
      throw error;
    }
  }

  // Truncate on a whitespace boundary so the prompt does not end mid-word
  let input = text;

  if (input.length > MAX_INPUT_CHARS) {
    const cut = input.slice(0, MAX_INPUT_CHARS);
    const lastBreak = cut.lastIndexOf(" ");
    input = (lastBreak > 0 ? cut.slice(0, lastBreak) : cut) + "\n\n[Material truncated for length.]";
  }

  return template(input, {
    concept: typeof options.concept === "string" ? options.concept.trim() : "",
    level: options.level || "beginner"
  });
};

// SR-AI1 to SR-AI3 - send the prompt to Gemini and return the generated text
const generate = async (text, outputType, options = {}) => {
  const prompt = buildPrompt(text, outputType, options);
  const ai = getClient();

  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error("Gemini request timed out");
      error.code = "AI_TIMEOUT";
      reject(error);
    }, REQUEST_TIMEOUT_MS);
  });

  const isStructured = Boolean(STRUCTURED[outputType]);

  const request = ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    // Asking the API for JSON directly is more reliable than parsing prose,
    // but the response is still validated below rather than trusted.
    config: isStructured ? { responseMimeType: "application/json" } : {}
  });

  const response = await Promise.race([request, timeout]);

  const generated = (response.text || "").trim();

  // An empty completion is a failure, not a valid result. Treated as retryable
  // so the caller keeps the upload and offers a retry (NFR5).
  if (generated.length === 0) {
    const error = new Error("Gemini returned an empty response");
    error.code = "AI_EMPTY_RESPONSE";
    throw error;
  }

  if (!isStructured) {
    return generated;
  }

  // Models sometimes wrap JSON in a markdown fence despite the mime type, so
  // strip one if present before parsing.
  const unfenced = generated
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(unfenced);
  } catch {
    const error = new Error("Gemini response was not valid JSON");
    error.code = "AI_MALFORMED_RESPONSE";
    throw error;
  }

  return STRUCTURED[outputType](parsed);
};

module.exports = {
  buildPrompt,
  generate,
  LEVELS,
  MAX_INPUT_CHARS,
  MODEL
};
