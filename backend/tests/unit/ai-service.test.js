/*
 * Unit tests for the AI service's pure functions.
 *
 * These require no server, no database and no call to the Gemini API, so they
 * run in milliseconds and consume none of the 20 requests per day the free tier
 * allows (risk R3).
 *
 * Converted from manual cases T-15, T-16, T-17 and T-53 in
 * testing/test-log-document-processing-ai.md.
 */

const test = require("node:test");
const assert = require("node:assert");

const {
  buildPrompt,
  parseStructured,
  classifyUpstreamError,
  LEVELS,
  MAX_INPUT_CHARS
} = require("../../src/services/ai.service");

const SAMPLE = "Photosynthesis converts light energy into chemical energy in plants.";

// ---------------------------------------------------------------- buildPrompt
test("buildPrompt includes the source material (T-15)", () => {
  const prompt = buildPrompt(SAMPLE, "summary");
  assert.ok(prompt.includes(SAMPLE), "prompt should contain the study material");
});

test("buildPrompt instructs the model not to invent facts (T-15, risk R1)", () => {
  for (const type of ["summary", "flashcards", "quiz"]) {
    const prompt = buildPrompt(SAMPLE, type);
    assert.match(
      prompt,
      /Do not add facts from outside it/,
      `${type} prompt should carry the grounding rule`
    );
  }
});

test("buildPrompt rejects an unsupported output type (T-16)", () => {
  assert.throws(
    () => buildPrompt(SAMPLE, "podcast"),
    (err) => err.code === "UNSUPPORTED_OUTPUT_TYPE"
  );
});

test("buildPrompt truncates long input on a word boundary (T-17, NFR1)", () => {
  const long = "word ".repeat(20000);
  const prompt = buildPrompt(long, "summary");

  assert.ok(prompt.includes("[Material truncated for length.]"), "should note truncation");
  assert.ok(
    !/wor\n\n\[Material/.test(prompt),
    "should not cut in the middle of a word"
  );
});

test("buildPrompt leaves short input untouched", () => {
  const prompt = buildPrompt(SAMPLE, "summary");
  assert.ok(!prompt.includes("truncated"), "short material should not be truncated");
  assert.ok(SAMPLE.length < MAX_INPUT_CHARS);
});

// ------------------------------------------------------- explanation (FR12.1)
test("explanation requires a concept (FR12.1)", () => {
  assert.throws(
    () => buildPrompt(SAMPLE, "explanation", { level: "beginner" }),
    (err) => err.code === "MISSING_CONCEPT"
  );
});

test("explanation rejects a blank concept (FR12.1)", () => {
  assert.throws(
    () => buildPrompt(SAMPLE, "explanation", { concept: "   " }),
    (err) => err.code === "MISSING_CONCEPT"
  );
});

test("explanation rejects an unrecognised level (FR12.1)", () => {
  assert.throws(
    () => buildPrompt(SAMPLE, "explanation", { concept: "light", level: "expert" }),
    (err) => err.code === "INVALID_LEVEL"
  );
});

test("explanation accepts each documented level, and they differ (FR12.1)", () => {
  const prompts = LEVELS.map((level) =>
    buildPrompt(SAMPLE, "explanation", { concept: "photosynthesis", level })
  );

  assert.strictEqual(prompts.length, 3);
  assert.strictEqual(
    new Set(prompts).size,
    3,
    "each level should produce a different prompt"
  );
});

// ------------------------------------------------ flashcard parsing (FR10.1)
test("flashcard parser accepts a well-formed response (FR10.1)", () => {
  const cards = parseStructured.flashcards({
    cards: [
      { question: "What is ATP?", answer: "The energy molecule of the cell." },
      { question: "Where is chlorophyll?", answer: "In the chloroplasts." }
    ]
  });

  assert.strictEqual(cards.length, 2);
  assert.strictEqual(cards[0].question, "What is ATP?");
});

test("flashcard parser discards incomplete cards", () => {
  const cards = parseStructured.flashcards({
    cards: [
      { question: "Kept", answer: "Has both parts" },
      { question: "Dropped — no answer" },
      { answer: "Dropped — no question" },
      { question: "  ", answer: "Dropped — blank question" }
    ]
  });

  assert.strictEqual(cards.length, 1);
  assert.strictEqual(cards[0].question, "Kept");
});

test("flashcard parser rejects a non-array response", () => {
  assert.throws(
    () => parseStructured.flashcards({ cards: "not an array" }),
    (err) => err.code === "AI_MALFORMED_RESPONSE"
  );
});

test("flashcard parser rejects a response with no usable cards", () => {
  assert.throws(
    () => parseStructured.flashcards({ cards: [{ question: "", answer: "" }] }),
    (err) => err.code === "AI_EMPTY_RESPONSE"
  );
});

// ----------------------------------------------------- quiz parsing (FR11.1)
test("quiz parser labels question types correctly (FR11.1)", () => {
  const questions = parseStructured.quiz({
    questions: [
      {
        question: "Which organelle makes ATP?",
        options: ["Mitochondrion", "Nucleus", "Ribosome", "Vacuole"],
        correct_answer: "Mitochondrion"
      },
      {
        question: "Chlorophyll absorbs green light.",
        options: ["True", "False"],
        correct_answer: "False"
      }
    ]
  });

  assert.strictEqual(questions.length, 2);
  assert.strictEqual(questions[0].type, "multiple_choice");
  assert.strictEqual(questions[1].type, "true_false");
});

test("quiz parser discards a question whose answer is not among its options (FR11.1)", () => {
  const questions = parseStructured.quiz({
    questions: [
      {
        question: "Kept",
        options: ["A", "B"],
        correct_answer: "A"
      },
      {
        question: "Dropped — answer is not an option, so it cannot be scored",
        options: ["A", "B"],
        correct_answer: "C"
      }
    ]
  });

  assert.strictEqual(questions.length, 1);
  assert.strictEqual(questions[0].question, "Kept");
});

test("quiz parser rejects a response with no usable questions", () => {
  assert.throws(
    () => parseStructured.quiz({ questions: [{ question: "x", options: [], correct_answer: "" }] }),
    (err) => err.code === "AI_EMPTY_RESPONSE"
  );
});

// ------------------------------------- upstream error classification (T-53)
test("a daily quota error is classified as AI_QUOTA_EXCEEDED (T-53, risk R3)", () => {
  const raw = new Error(
    '{"error":{"code":429,"message":"Quota exceeded for metric: ' +
      'generate_content_free_tier_requests, limit: 20","status":"RESOURCE_EXHAUSTED",' +
      '"details":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}],' +
      '"retryDelay":"22s"}}'
  );
  raw.status = 429;

  const classified = classifyUpstreamError(raw);

  assert.strictEqual(classified.code, "AI_QUOTA_EXCEEDED");
  assert.strictEqual(classified.retryAfterSeconds, 22);
  assert.strictEqual(classified.quotaExhausted, true);
});

test("a short rate limit is distinguished from the daily quota (T-53)", () => {
  const raw = new Error(
    '{"error":{"status":"RESOURCE_EXHAUSTED","message":"too many requests",' +
      '"retryDelay":"5s"}}'
  );
  raw.status = 429;

  const classified = classifyUpstreamError(raw);

  assert.strictEqual(classified.code, "AI_QUOTA_EXCEEDED");
  assert.strictEqual(classified.retryAfterSeconds, 5);
  assert.strictEqual(
    classified.quotaExhausted,
    false,
    "a per-minute limit should not be reported as the daily quota"
  );
});

test("an upstream 5xx is classified as AI_UNAVAILABLE (T-53)", () => {
  const raw = new Error("service unavailable");
  raw.status = 503;

  assert.strictEqual(classifyUpstreamError(raw).code, "AI_UNAVAILABLE");
});

test("our own errors pass through unchanged (T-53)", () => {
  const own = new Error("timed out");
  own.code = "AI_TIMEOUT";

  assert.strictEqual(classifyUpstreamError(own).code, "AI_TIMEOUT");
});

test("an unrecognised error is not disguised as a capacity problem (T-53)", () => {
  const bug = new TypeError("cannot read properties of undefined");

  const classified = classifyUpstreamError(bug);

  assert.strictEqual(
    classified.code,
    undefined,
    "a genuine fault should fall through to the generic handler, not look retryable"
  );
});
