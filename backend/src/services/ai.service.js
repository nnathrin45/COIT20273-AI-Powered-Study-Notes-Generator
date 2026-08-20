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
---`
};

// FR9.1 - build the prompt for the requested output type
const buildPrompt = (text, outputType) => {
  const template = PROMPTS[outputType];

  if (!template) {
    const error = new Error(`Unsupported output type: ${outputType}`);
    error.code = "UNSUPPORTED_OUTPUT_TYPE";
    throw error;
  }

  // Truncate on a whitespace boundary so the prompt does not end mid-word
  let input = text;

  if (input.length > MAX_INPUT_CHARS) {
    const cut = input.slice(0, MAX_INPUT_CHARS);
    const lastBreak = cut.lastIndexOf(" ");
    input = (lastBreak > 0 ? cut.slice(0, lastBreak) : cut) + "\n\n[Material truncated for length.]";
  }

  return template(input);
};

// SR-AI1 to SR-AI3 - send the prompt to Gemini and return the generated text
const generate = async (text, outputType) => {
  const prompt = buildPrompt(text, outputType);
  const ai = getClient();

  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error("Gemini request timed out");
      error.code = "AI_TIMEOUT";
      reject(error);
    }, REQUEST_TIMEOUT_MS);
  });

  const request = ai.models.generateContent({
    model: MODEL,
    contents: prompt
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

  return generated;
};

module.exports = {
  buildPrompt,
  generate,
  MAX_INPUT_CHARS,
  MODEL
};
