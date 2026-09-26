/*
 * FINAL VERIFICATION — Quality, and the complete Member 3 pipeline
 * GitHub issue #119, section "AI Quality and Testing", and the readiness check
 *
 * Test IDs QA-01 to QA-04.
 *
 * QA-01 is the one test that exercises the whole subsystem in a single pass:
 * upload, extraction, storage, consent, generation, parsing, output storage and
 * retrieval. It writes a stage-by-stage artefact, so the evidence shows the
 * chain rather than a set of disconnected results.
 *
 * Content quality — whether the model writes accurate study material — is not
 * assessed here. It cannot be settled by assertion, it consumes quota, and it
 * is recorded instead in the manual verification list and in
 * testing/ai-accuracy-review-2026-09-12.md. QA-04 checks that this evidence is
 * present and complete, not that the content is good.
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const h = require("../helpers/final-harness");
const ev = require("../helpers/evidence");

const REPO = path.join(__dirname, "..", "..", "..");

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
  },
  {
    type: "multiple_choice",
    question: "What is stored as glucose?",
    options: ["Light energy", "Sound energy", "Nuclear energy", "Kinetic energy"],
    correct_answer: "Light energy"
  }
];

test.before(async () => {
  await h.api.startServer();
});

test.after(async () => {
  await h.api.stopServer();
  const removed = await h.api.cleanup();
  console.log(`  clean-up: ${removed.usersRemoved} test user(s), ${removed.filesRemoved} file(s) removed`);
  await h.closeDb();
});

/* ================================================================== QA-01
 * The complete Member 3 flow, stage by stage.
 */
test("QA-01 the full document-to-AI-output pipeline completes end to end (issue #119 readiness)", async () => {
  const stages = [];
  const record = (stage, detail) => stages.push({ stage, ...detail });

  // 1 — account and consent
  const { token, email } = await h.api.createUser();
  const userId = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString()).user_id;
  record("1. Registration and login", { result: "token issued", user_id: userId });

  const consent = await h.api.request("POST", "/api/consent", { token, body: { status: "granted" } });
  assert.strictEqual(consent.status, 201);
  record("2. Consent granted (FR17.1)", { status: consent.status });

  // 2 — upload and extraction
  const upload = await h.api.uploadBuffer(token, "photosynthesis.txt", h.STUDY_TEXT);
  assert.strictEqual(upload.status, 201, "upload must succeed");
  const fileId = upload.data.file.file_id;
  record("3. Upload and text extraction (FR6, FR8)", {
    status: upload.status, file_id: fileId, characters_extracted: upload.data.text_length
  });

  // 3 — storage
  const stored = await h.storedFile(fileId);
  assert.strictEqual(stored.extracted_text, h.STUDY_TEXT, "stored text must match the document");
  assert.strictEqual(stored.user_id, userId);
  record("4. Extracted text stored (FR8)", {
    stored_characters: stored.extracted_text.length, owned_by: stored.user_id
  });

  // 4 — generation through the real controller, with the model stubbed
  h.setBehaviour(() => QUIZ);
  const generated = await h.generate(userId, { file_id: fileId, output_type: "quiz" });
  assert.strictEqual(generated.status, 201, "generation must succeed");
  const outputId = generated.body.output.output_id;
  record("5. AI request and response parsing (FR11.1)", {
    status: generated.status, output_id: outputId,
    questions_returned: generated.body.output.content.length,
    labelled_ai_generated: generated.body.output.is_ai_generated
  });

  // 5 — output storage
  const outputs = await h.storedOutputs(fileId);
  const quizRow = outputs.find((o) => o.output_id === outputId);
  assert.ok(quizRow, "the generated output must be stored");
  record("6. AI output stored (FR16.1)", {
    output_type: quizRow.output_type, is_ai_generated: quizRow.is_ai_generated,
    stored_as: typeof quizRow.content
  });

  // 6 — retrieval and display shape
  const listed = await h.listOutputs(userId, fileId);
  const retrieved = listed.body.outputs.find((o) => o.output_id === outputId);
  assert.ok(Array.isArray(retrieved.content), "retrieval must return parsed records");
  record("7. Retrieval for display (FR15)", {
    status: listed.status, returned_as: "array", questions: retrieved.content.length
  });

  // 7 — the failure path, on the same document
  h.setBehaviour(h.failsWith("AI_TIMEOUT"));
  const failed = await h.generate(userId, { file_id: fileId, output_type: "summary" });
  const fileAfter = await h.storedFile(fileId);
  assert.strictEqual(failed.status, 504);
  assert.strictEqual(fileAfter.extracted_text, h.STUDY_TEXT, "the document must survive a failure");
  record("8. Error handling without data loss (NFR5)", {
    status: failed.status, code: failed.body.code, document_intact: true
  });

  ev.record("QA-01", "Full pipeline end to end", {
    checking: "every stage of the Member 3 subsystem, from upload to retrieval, including the failure path",
    request: { account: email, document: "photosynthesis.txt" },
    response: { stages }
  });

  assert.strictEqual(stages.length, 8, "every pipeline stage must be recorded");
});

/* ================================================================== QA-02
 * "Recheck quiz scoring tests" — scored through the real endpoint against a
 * quiz whose correct answers are known in advance, so the expected score is
 * known exactly rather than inferred from the response.
 */
test("QA-02 quiz marking is objectively correct against a known answer key (FR11.2)", async () => {
  const user = await h.prepareUser({ consent: true });

  h.setBehaviour(() => QUIZ);
  const generated = await h.generate(user.userId, { file_id: user.fileId, output_type: "quiz" });
  const outputId = generated.body.output.output_id;

  // Two right, one wrong — an expected score of 2 out of 3
  const answers = [QUIZ[0].correct_answer, QUIZ[1].correct_answer, "Sound energy"];

  const attempt = await h.api.request("POST", `/api/ai/quiz/${outputId}/attempt`, {
    token: user.token, body: { answers }
  });

  ev.record("QA-02", "Quiz marking against a known key", {
    checking: "the score returned matches the answer key exactly, including which questions were marked correct",
    request: { method: "POST", endpoint: `/api/ai/quiz/${outputId}/attempt`, body: { answers } },
    response: { status: attempt.status, body: attempt.data },
    notes: "answer key: " + QUIZ.map((q) => q.correct_answer).join(" | ") + "; expected score 2/3"
  });

  assert.strictEqual(attempt.status, 201);
  assert.strictEqual(attempt.data.attempt.score, 2, "two correct answers must score 2");
  assert.strictEqual(attempt.data.attempt.total, 3);

  const results = attempt.data.attempt.results;
  assert.strictEqual(results[0].is_correct, true, "question 1 was answered correctly");
  assert.strictEqual(results[1].is_correct, true, "question 2 was answered correctly");
  assert.strictEqual(results[2].is_correct, false, "question 3 was answered incorrectly");
});

/* ================================================================== QA-03
 * "Recheck consent and AI guard tests" at the boundary that matters most:
 * consent must be enforced for every content type, not only for summaries.
 */
test("QA-03 consent is enforced for all four content types (FR17, issue #119)", async () => {
  const user = await h.prepareUser({ consent: false });

  const types = [
    { output_type: "summary" },
    { output_type: "flashcards" },
    { output_type: "quiz" },
    { output_type: "explanation", concept: "photosynthesis", level: "beginner" }
  ];

  const observed = [];

  for (const body of types) {
    h.resetCall();
    h.setBehaviour(() => "should never be reached");

    const res = await h.generate(user.userId, { file_id: user.fileId, ...body });
    observed.push({
      output_type: body.output_type,
      status: res.status,
      code: res.body.code,
      model_called: h.getLastCall() !== null
    });

    assert.strictEqual(res.status, 403, `${body.output_type} must be refused without consent`);
    assert.strictEqual(res.body.code, "CONSENT_REQUIRED");
    assert.strictEqual(h.getLastCall(), null,
      `${body.output_type}: no content may reach the model without consent`);
  }

  ev.record("QA-03", "Consent enforced across all content types", {
    checking: "all four content types are refused without consent, and none reaches the model",
    response: { types: observed },
    notes: "quality metric: 100% of unconsented generation attempts refused"
  });
});

/* ================================================================== QA-04
 * "Review AI output accuracy against source documents"
 *
 * The review itself is manual and was carried out on 12 September. This test
 * does not re-judge the content; it confirms that the evidence for that review
 * is present, complete and covers the number of outputs the metric requires, so
 * the claim in the report is supported by an artefact that actually exists.
 */
test("QA-04 the recorded AI accuracy review is present and complete (risk R1, FR9–FR12)", async () => {
  const reviewPath = path.join(REPO, "testing", "ai-accuracy-review-2026-09-12.md");

  assert.ok(fs.existsSync(reviewPath),
    "the AI accuracy review artefact is missing; the R1 metric would be unsupported");

  const review = fs.readFileSync(reviewPath, "utf-8");
  const verdicts = (review.match(/\*\*Manual verdict/g) || []).length;

  // Each reviewed output is a section headed "## doc<n> (FORMAT) - <type>".
  // The closing "## Review outcome" section is the summary, not an output, so
  // it is matched out rather than counted.
  const outputs = (review.match(/^## doc\d+ \(.+?\) - .+$/gm) || []).length;

  ev.record("QA-04", "AI accuracy review artefact", {
    checking: "the manual review recorded for the R1 metric exists and carries a verdict for every output reviewed",
    response: {
      artefact: "testing/ai-accuracy-review-2026-09-12.md",
      outputs_reviewed: outputs,
      verdicts_recorded: verdicts,
      metric: "at least 4 of 5 outputs accurate, no invented facts"
    },
    notes: "This checks the completeness of the evidence, not the quality of the content. The judgement itself is manual."
  });

  assert.ok(outputs >= 5, `the metric requires 5 reviewed outputs; the artefact documents ${outputs}`);
  assert.strictEqual(verdicts, outputs,
    "every reviewed output must carry a recorded verdict");
});
