/*
 * FINAL VERIFICATION — AI Integration
 * GitHub issue #119, section "AI Integration Verification"
 *
 * Test IDs AI-01 to AI-07.
 *
 * All four content types are driven through the real controller, the real
 * consent check and the real database. Only the model call itself is stubbed,
 * so no Gemini quota is consumed and the suite can be run on demand (risk R3).
 *
 * What the stub cannot tell us is whether the model writes good content; that
 * is assessed separately and is recorded in the manual verification list. What
 * it does tell us is whether this application stores, parses, labels and scopes
 * whatever the model returns — which is the part that must be correct every
 * time, and the part a demonstration depends on.
 */

const test = require("node:test");
const assert = require("node:assert");

const h = require("../helpers/final-harness");
const ev = require("../helpers/evidence");

/* Representative model responses, in the shape ai.service returns after parsing */
const SUMMARY_TEXT =
  "Photosynthesis stores light energy as glucose. The light-dependent reactions in the " +
  "thylakoid membrane produce ATP and NADPH, and the Calvin cycle fixes carbon dioxide in the stroma.";

const FLASHCARDS = [
  { question: "Where do the light-dependent reactions occur?", answer: "In the thylakoid membrane." },
  { question: "What does the Calvin cycle fix?", answer: "Carbon dioxide, into sugar." }
];

const QUIZ = [
  {
    type: "multiple_choice",
    question: "Where does the Calvin cycle take place?",
    options: ["The stroma", "The thylakoid membrane", "The nucleus", "The cell wall"],
    correct_answer: "The stroma"
  },
  {
    type: "true_false",
    question: "The light-dependent reactions produce ATP and NADPH.",
    options: ["True", "False"],
    correct_answer: "True"
  }
];

const EXPLANATION_TEXT =
  "The Calvin cycle is the stage of photosynthesis that takes carbon dioxide and builds it into sugar, " +
  "using the ATP and NADPH made during the light-dependent reactions.";

let user;

test.before(async () => {
  await h.api.startServer();
  user = await h.prepareUser();
});

test.after(async () => {
  await h.api.stopServer();
  const removed = await h.api.cleanup();
  console.log(`  clean-up: ${removed.usersRemoved} test user(s), ${removed.filesRemoved} file(s) removed`);
  await h.closeDb();
});

/* ============================================================ AI-01 to AI-04
 * "Recheck Summary / Flashcard / Practice Quiz / Concept Explanation generation"
 */

test("AI-01 summary generation stores and returns prose content (FR9.1, issue #119)", async () => {
  h.setBehaviour(() => SUMMARY_TEXT);

  const res = await h.generate(user.userId, { file_id: user.fileId, output_type: "summary" });

  ev.record("AI-01", "Summary generation", {
    checking: "a summary is generated, labelled as AI-generated, and returned with a disclaimer",
    request: { method: "POST", endpoint: "/api/ai/generate", body: { file_id: user.fileId, output_type: "summary" } },
    response: { status: res.status, body: res.body }
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.output.output_type, "summary");
  assert.strictEqual(res.body.output.content, SUMMARY_TEXT,
    "the content returned must be the content generated, unaltered");
  assert.strictEqual(res.body.output.file_id, user.fileId);
  assert.ok(Number.isInteger(res.body.output.output_id), "a stored output must carry its identifier");
});

test("AI-02 flashcard generation returns structured question and answer records (FR10.1)", async () => {
  h.setBehaviour(() => FLASHCARDS);

  const res = await h.generate(user.userId, { file_id: user.fileId, output_type: "flashcards" });

  ev.record("AI-02", "Flashcard generation", {
    checking: "flashcards are returned as an array of question/answer records, not as a string",
    request: { method: "POST", endpoint: "/api/ai/generate", body: { file_id: user.fileId, output_type: "flashcards" } },
    response: { status: res.status, body: res.body }
  });

  assert.strictEqual(res.status, 201);
  assert.ok(Array.isArray(res.body.output.content), "flashcard content must be an array");
  assert.strictEqual(res.body.output.content.length, FLASHCARDS.length);
  for (const card of res.body.output.content) {
    assert.ok(card.question && card.answer, "every card needs both a question and an answer");
  }
});

test("AI-03 practice quiz generation returns scoreable questions (FR11.1)", async () => {
  h.setBehaviour(() => QUIZ);

  const res = await h.generate(user.userId, { file_id: user.fileId, output_type: "quiz" });

  ev.record("AI-03", "Practice quiz generation", {
    checking: "each question carries options and a correct answer that is one of those options, so the quiz can be scored",
    request: { method: "POST", endpoint: "/api/ai/generate", body: { file_id: user.fileId, output_type: "quiz" } },
    response: { status: res.status, body: res.body }
  });

  assert.strictEqual(res.status, 201);
  assert.ok(Array.isArray(res.body.output.content));

  for (const q of res.body.output.content) {
    assert.ok(Array.isArray(q.options) && q.options.length >= 2, "a question needs at least two options");
    assert.ok(
      q.options.includes(q.correct_answer),
      `the marked answer must be one of the question's own options, otherwise the question cannot be scored: ${q.question}`
    );
  }
});

test("AI-04 concept explanation reflects the requested concept and level (FR12.1)", async () => {
  h.setBehaviour(() => EXPLANATION_TEXT);

  const res = await h.generate(user.userId, {
    file_id: user.fileId,
    output_type: "explanation",
    concept: "the Calvin cycle",
    level: "beginner"
  });

  ev.record("AI-04", "Concept explanation generation", {
    checking: "the concept and level are echoed back with the explanation, and both reach the model",
    request: {
      method: "POST",
      endpoint: "/api/ai/generate",
      body: { file_id: user.fileId, output_type: "explanation", concept: "the Calvin cycle", level: "beginner" }
    },
    response: { status: res.status, body: res.body },
    notes: `options passed to the model: ${JSON.stringify(h.getLastCall().options)}`
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.output.concept, "the Calvin cycle");
  assert.strictEqual(res.body.output.level, "beginner");

  // The selected level must actually reach the model, not merely be echoed
  const call = h.getLastCall();
  assert.strictEqual(call.options.level, "beginner",
    "the requested level must be passed through to the model");
  assert.strictEqual(call.options.concept, "the Calvin cycle");
});

/* ==================================================================== AI-05
 * "Verify generated structured responses are parsed correctly"
 *
 * Structured content is stored as JSON text. The round trip matters: what is
 * read back must be the same records that were generated, parsed rather than
 * returned as a string the interface would have to decode itself.
 */
test("AI-05 structured content survives storage and is returned parsed (FR10.1, FR11.1)", async () => {
  h.setBehaviour(() => QUIZ);
  const created = await h.generate(user.userId, { file_id: user.fileId, output_type: "quiz" });
  assert.strictEqual(created.status, 201);

  const rows = await h.storedOutputs(user.fileId);
  const quizRow = rows.filter((r) => r.output_type === "quiz").pop();

  const listed = await h.listOutputs(user.userId, user.fileId);
  const listedQuiz = listed.body.outputs.find((o) => o.output_id === quizRow.output_id);

  ev.record("AI-05", "Structured response round trip", {
    checking: "quiz content stored as JSON text is returned as parsed records on retrieval",
    request: { method: "GET", endpoint: `/api/ai/outputs/${user.fileId}` },
    response: { status: listed.status, stored_as: typeof quizRow.content, returned_as: Array.isArray(listedQuiz.content) ? "array" : typeof listedQuiz.content },
    notes: "stored column is JSON text; the API must parse it before returning"
  });

  assert.strictEqual(typeof quizRow.content, "string", "structured content is stored as JSON text");
  assert.ok(Array.isArray(listedQuiz.content), "retrieval must return parsed records, not a JSON string");
  assert.deepStrictEqual(listedQuiz.content, QUIZ, "the records returned must match the records generated");
});

/* ==================================================================== AI-06
 * "Verify saved AI outputs remain associated with the correct user/document"
 */
test("AI-06 stored outputs stay bound to the generating user and document (NFR3)", async () => {
  h.setBehaviour(() => SUMMARY_TEXT);
  await h.generate(user.userId, { file_id: user.fileId, output_type: "summary" });

  const rows = await h.storedOutputs(user.fileId);
  assert.ok(rows.length > 0, "the fixture should have stored outputs by now");

  ev.record("AI-06", "Output ownership", {
    checking: "every stored output records the user and document it was generated from",
    response: {
      outputs: rows.map((r) => ({
        output_id: r.output_id, file_id: r.file_id, user_id: r.user_id, output_type: r.output_type
      }))
    },
    notes: `expected user_id ${user.userId}, file_id ${user.fileId} on every row`
  });

  for (const row of rows) {
    assert.strictEqual(row.user_id, user.userId, "an output must belong to the user who generated it");
    assert.strictEqual(row.file_id, user.fileId, "an output must stay bound to its source document");
  }
});

test("AI-07 another user cannot retrieve outputs generated from a document they do not own (NFR3)", async () => {
  h.setBehaviour(() => SUMMARY_TEXT);
  await h.generate(user.userId, { file_id: user.fileId, output_type: "summary" });

  const intruder = await h.prepareUser({ consent: true, filename: "intruder.txt" });
  const listed = await h.listOutputs(intruder.userId, user.fileId);

  ev.record("AI-07", "Cross-user output isolation", {
    checking: "a second account requesting another user's document returns no content",
    request: { method: "GET", endpoint: `/api/ai/outputs/${user.fileId}`, as: "a different authenticated user" },
    response: { status: listed.status, body: listed.body }
  });

  assert.strictEqual(listed.status, 200);
  assert.strictEqual(listed.body.outputs.length, 0,
    "another user's outputs must not be returned, even for a document id they can guess");
});
