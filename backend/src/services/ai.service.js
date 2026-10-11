const { GoogleGenAI } = require("@google/genai");

// Model is configurable so it can be changed without a code edit (NFR8).
// Google retires model versions periodically: gemini-2.0-flash returned 404
// "no longer available" on 20 Aug 2026 and was replaced via .env alone.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// Guard against sending an unbounded document to the API. Part A scopes
// testing to documents of up to 10 pages or 50,000 characters (NFR1).
const MAX_INPUT_CHARS = 50000;

// Beyond this the request is abandoned so the caller can offer a retry (NFR5).
// Configurable so the timeout path can be exercised in a test without waiting a
// real minute (T-23); production behaviour is unchanged unless it is set.
const REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 60000;

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
  flashcards: (text, { level = "intermediate" }) =>
    `You are helping a university student revise from their own study material.

Create revision flashcards from the study material below.

Difficulty requirement: ${FLASHCARD_LEVEL_GUIDANCE[level]}

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
  quiz: (text, { level = "intermediate" }) =>
    `You are helping a university student test themselves on their own study material.

Create a practice quiz from the study material below.

Difficulty requirement: ${QUIZ_LEVEL_GUIDANCE[level]}

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
  explanation: (text, { concept, level, history = "" }) =>
    `You are helping a university student understand a concept from their own study material.

Explain this concept: ${concept}

Pitch the explanation at ${LEVEL_GUIDANCE[level]}

Rules:
- Base the explanation only on the source material below. Do not add facts from outside it.
- The source may contain a PRIMARY STUDY MATERIAL section followed by a SUPPLEMENTARY CHAT MATERIAL section.
- PRIMARY STUDY MATERIAL is the student's main selected document and remains the main source for the explanation.
- SUPPLEMENTARY CHAT MATERIAL is supporting context only. Use it when it helps answer the student's question, but do not treat it as replacing or changing the primary study material.
- If supplementary material conflicts with the primary study material, prefer the primary study material and clearly avoid silently combining conflicting claims.
- If the concept does not appear in either the primary material or relevant supplementary material, say so plainly instead of inventing content.
- Use previous conversation messages to understand follow-up questions and references to earlier discussions.
- Treat previous answers as conversational context, not authoritative evidence. The primary study material remains the main source of truth.
- If no previous messages are provided, do not invent earlier discussions.
- Write in clear prose with short paragraphs. Do not use markdown headings.

Previous conversation in this chat:
---
${history || "No previous conversation messages."}
---

Source material:
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
    "an intermediate learner: assume familiarity with the basics and explain " +
    "how concepts work together through a concrete application or decision flow. " +
    "Use proper terminology, show causes and consequences, and provide one " +
    "source-grounded example or a clearly labelled hypothetical illustration. " +
    "Go beyond definitions without requiring specialist background knowledge.",
  advanced:
    "an advanced learner: assume solid background knowledge and deliver a " +
    "substantive critical analysis, not simply more jargon or a shorter summary. " +
    "Explain mechanisms, decision rights, dependencies, trade-offs, risks and " +
    "limitations where supported by the material. Apply the framework to a " +
    "source-grounded scenario or a clearly labelled hypothetical scenario, " +
    "evaluate alternative decisions and their implications, and distinguish " +
    "established source facts from illustrative reasoning. If evidence is " +
    "missing, state the limitation instead of inventing conclusions."
};

const QUIZ_LEVEL_GUIDANCE = {
  beginner:
    "BEGINNER. Focus on foundational concepts, definitions, " +
    "terminology and straightforward understanding. Ask direct " +
    "questions that can be answered by recalling or recognising " +
    "information in the material. Avoid complex multi-step scenarios " +
    "and unnecessarily tricky distractors.",
  intermediate:
    "INTERMEDIATE. Test understanding and application rather than " +
    "simple recall alone. Include practical situations, relationships " +
    "between concepts and cause-and-effect reasoning. Require the " +
    "student to select appropriate actions or conclusions supported " +
    "by the material. Keep scenarios manageable and unambiguous.",
  advanced:
    "ADVANCED. Emphasise analytical reasoning, complex applications, " +
    "dependencies, risks, trade-offs and evaluation of alternatives. " +
    "Use challenging but answerable scenarios requiring students " +
    "to combine multiple facts or principles from the material. " +
    "At least two-thirds of the questions should require applying " +
    "multiple source-supported concepts to a situation, evaluating " +
    "competing decisions, or reasoning about consequences. " +
    "Before constructing questions, silently identify distinct " +
    "substantive concepts and meaningful relationships in the " +
    "source material. Do not include this planning in the JSON. " +
    "When enough material exists, target six questions: five " +
    "scenario-based multiple-choice questions and one true/false " +
    "question testing a meaningful scenario-based implication. " +
    "For each scenario question, provide at least two relevant " +
    "considerations, such as objectives, risks, resource constraints, " +
    "dependencies or consequences supported by the source. " +
    "Require the learner to evaluate those considerations together " +
    "to select the best justified decision or conclusion. " +
    "Use distinct substantive topics across the quiz rather than " +
    "repeatedly testing the same straightforward principle. " +
    "Avoid questions whose answers can be obtained simply by " +
    "recognising one definition, item in a list, or assessment rule. " +
    "For most multiple-choice questions, describe a realistic " +
    "decision or competing constraints and ask for the best " +
    "justified action, outcome or evaluation. Do not merely " +
    "turn a simple definition or rule into a longer question. " +
    "When substantive subject content is available, avoid " +
    "basic recall about assessment logistics, mark weightings, " +
    "group arrangements, AI-use rules and meeting counts. " +
    "Prioritise application of the material's actual management " +
    "principles and relationships instead. Make incorrect options " +
    "plausible, closely competing, and clearly distinguishable " +
    "using the source, with exactly one defensible correct answer. " +
    "True/false questions should test meaningful relationships " +
    "or implications instead of isolated factual recall. " +
    "Do not invent facts, unsupported assumptions or ambiguity merely " +
    "to make questions harder. Hypothetical scenarios may illustrate " +
    "source principles, but the correct answer must follow from " +
    "the material rather than invented organizational rules. " +
    "If the source lacks enough information for a complex scenario, " +
    "ask a rigorous source-supported question."
};
const FLASHCARD_LEVEL_GUIDANCE = {
  beginner:
    "BEGINNER. Test definitions, fundamental terminology, " +
    "basic facts and straightforward comprehension. " +
    "Ask direct questions with short and clear answers.",
  intermediate:
    "INTERMEDIATE. Test how concepts relate, how processes " +
    "work and how knowledge applies in practical situations. " +
    "Use cause-and-effect reasoning and manageable examples.",
  advanced:
    "ADVANCED. Create challenging application and analysis " +
    "flashcards, not merely longer factual explanations. " +
    "When sufficient material exists, at least two-thirds of " +
    "the cards must require an actual decision, recommendation, " +
    "comparison of consequences, or evaluation of constraints. " +
    "Use hypothetical scenarios that ask learners to connect multiple concepts " +
    "from the source and justify a choice with source-grounded reasons. " +
    "Do not simply prefix a definition or factual list with Scenario. " +
    "Weak card: What is portfolio capacity management? Stronger " +
    "card: Two components compete for scarce specialists; how " +
    "should capacity analysis and strategic priority guide resource " +
    "allocation, and why? Use only examples relevant to the " +
    "uploaded material. Each answer should explain the " +
    "recommendation and trade-offs rather than list facts. " +
    "Avoid simple definitions, lists and assessment logistics " +
    "when substantive subject content is available. " +
    "Do not invent unsupported source facts, policies, numbers " +
    "or decision rights. If the source is insufficient for " +
    "a scenario, use a rigorous source-grounded comparison."
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
const truncateOnWhitespace = (
  value,
  maxChars,
  truncationNotice
) => {
  if (
    typeof value !== "string" ||
    value.length <= maxChars
  ) {
    return value;
  }

  const notice =
    truncationNotice || "";

  const contentBudget =
    Math.max(
      0,
      maxChars - notice.length
    );

  const cut =
    value.slice(
      0,
      contentBudget
    );

  const lastBreak =
    cut.lastIndexOf(" ");

  const truncated =
    lastBreak > 0
      ? cut.slice(0, lastBreak)
      : cut;

  return (
    truncated +
    notice
  );
};


const prepareInputForPrompt = (
  text,
  outputType
) => {
  /*
   * Summary, Flashcards and Quiz retain the
   * original first-50,000-character behaviour.
   */
  if (
    outputType !== "explanation"
  ) {
    return truncateOnWhitespace(
      text,
      MAX_INPUT_CHARS,
      "\n\n[Material truncated for length.]"
    );
  }

  const supplementaryMarker =
    "\n\nSUPPLEMENTARY CHAT MATERIAL\n";

  const supplementaryIndex =
    text.indexOf(
      supplementaryMarker
    );

  /*
   * Explanations without chat attachments use
   * the same behaviour they had previously.
   */
  if (supplementaryIndex < 0) {
    return truncateOnWhitespace(
      text,
      MAX_INPUT_CHARS,
      "\n\n[Material truncated for length.]"
    );
  }

  /*
   * The controller places PRIMARY STUDY MATERIAL
   * first, then SUPPLEMENTARY CHAT MATERIAL.
   *
   * Reserve up to 30% of the total input budget
   * for supplementary context so a large primary
   * document cannot push attachments completely
   * out of the prompt.
   *
   * Unused space automatically flows to the other
   * section rather than being wasted.
   */
  const separator =
    "\n\n";

  const availableBudget =
    MAX_INPUT_CHARS -
    separator.length;

  const primarySection =
    text.slice(
      0,
      supplementaryIndex
    );

  const supplementarySection =
    text.slice(
      supplementaryIndex +
        separator.length
    );

  const preferredSupplementaryBudget =
    Math.floor(
      MAX_INPUT_CHARS * 0.3
    );

  let supplementaryBudget =
    Math.min(
      preferredSupplementaryBudget,
      supplementarySection.length
    );

  let primaryBudget =
    availableBudget -
    supplementaryBudget;

  /*
   * If the primary material is shorter than its
   * allocation, give all unused room to the
   * supplementary section.
   */
  if (
    primarySection.length <
    primaryBudget
  ) {
    primaryBudget =
      primarySection.length;

    supplementaryBudget =
      availableBudget -
      primaryBudget;
  }

  const preparedPrimary =
    truncateOnWhitespace(
      primarySection,
      primaryBudget,
      "\n\n[Primary study material truncated for length.]"
    );

  const preparedSupplementary =
    truncateOnWhitespace(
      supplementarySection,
      supplementaryBudget,
      "\n\n[Supplementary chat material truncated for length.]"
    );

  return [
    preparedPrimary,
    preparedSupplementary
  ].join(separator);
};

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

  if (
    ["quiz", "flashcards"].includes(outputType) &&
    options.level &&
    !LEVELS.includes(options.level)
  ) {
    const error = new Error(
      `Difficulty must be one of: ${LEVELS.join(", ")}`
    );
    error.code = "INVALID_LEVEL";
    throw error;
  }

  /*
   * Apply the shared 50,000-character input ceiling.
   * Concept Explanation preserves a guaranteed share
   * for supplementary chat material when present.
   */
  const input =
    prepareInputForPrompt(
      text,
      outputType
    );

  return template(input, {
    concept: typeof options.concept === "string" ? options.concept.trim() : "",
    level: options.level || (["quiz", "flashcards"].includes(outputType) ? "intermediate" : "beginner"),
    history:
      outputType === "explanation" && typeof options.history === "string"
        ? options.history.slice(0, 6000)
        : ""
  });
};

// SR-AI1 to SR-AI3 - send the prompt to Gemini and return the generated text
// Translate an error from the Gemini SDK into one of our own codes.
// Without this, a rate limit and a genuine bug both surface as a generic
// failure, so the interface cannot tell the user that waiting will help.
// Added 3 Sep 2026 after the free-tier daily quota (20 requests) was reached
// during Postman testing — project risk R3.
const classifyUpstreamError = (error) => {
  // Errors we raised ourselves already carry a code; pass them straight through
  if (error.code) {
    return error;
  }

  const status = error.status || (error.response && error.response.status);
  const text = String(error.message || "");

  // 429 - rate limited or daily quota exhausted. Both clear with time, so the
  // retry delay is extracted where the API supplies one.
  if (status === 429 || text.includes("RESOURCE_EXHAUSTED")) {
    const seconds = readRetryDelay(text);
    const quotaExhausted = text.includes("PerDay") || text.includes("per day");

    const err = new Error("Gemini quota or rate limit reached");
    err.code = "AI_QUOTA_EXCEEDED";
    err.retryAfterSeconds = seconds;
    err.quotaExhausted = quotaExhausted;
    return err;
  }

  // 5xx from Google - the service is unavailable rather than our request being
  // wrong, so a retry is worth offering
  if (status >= 500 && status < 600) {
    const err = new Error("Gemini service is unavailable");
    err.code = "AI_UNAVAILABLE";
    return err;
  }

  return error;
};

// The API reports a retry delay as e.g. "retryDelay":"22s" or
// "Please retry in 22.8s". Returns whole seconds, or null if absent.
const readRetryDelay = (text) => {
  const match =
    text.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/) ||
    text.match(/retry in (\d+(?:\.\d+)?)\s*s/i);

  return match ? Math.ceil(Number(match[1])) : null;
};

// NFR5 - abandon a request that is taking too long so the caller can offer a
// retry, rather than leaving the student waiting indefinitely. Extracted from
// generate() so the race can be verified directly, without a Gemini call and
// without waiting for the real timeout to elapse (T-23).
//
// The timer is cleared once the race settles. Left running it would hold the
// event loop open for the remainder of the timeout, which in a test suite means
// the process does not exit when the tests finish.
const raceAgainstTimeout = (request, timeoutMs = REQUEST_TIMEOUT_MS) => {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("Gemini request timed out");
      error.code = "AI_TIMEOUT";
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([request, timeout]).finally(() => clearTimeout(timer));
};

const generate = async (text, outputType, options = {}) => {
  const prompt = buildPrompt(text, outputType, options);
  const ai = getClient();

  const isStructured = Boolean(STRUCTURED[outputType]);

  const request = ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    // Asking the API for JSON directly is more reliable than parsing prose,
    // but the response is still validated below rather than trusted.
    config: isStructured ? { responseMimeType: "application/json" } : {}
  });

  let response;
  try {
    response = await raceAgainstTimeout(request);
  } catch (error) {
    throw classifyUpstreamError(error);
  }

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
  MODEL,

  // Exposed for automated testing.
  prepareInputForPrompt,

  // Exposed for automated testing. These are pure functions, so they can be
  // verified without a server, a database or a call to the Gemini API — which
  // matters because the free tier allows only 20 requests per day (risk R3).
  parseStructured: STRUCTURED,
  classifyUpstreamError,
  raceAgainstTimeout,
  REQUEST_TIMEOUT_MS
};
