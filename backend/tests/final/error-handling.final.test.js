/*
 * FINAL VERIFICATION — AI Error Handling and Security
 * GitHub issue #119, section "AI Error Handling and Security"
 *
 * Test IDs ERR-01 to ERR-07.
 *
 * Every failure mode the system can meet is provoked deliberately through the
 * stubbed model, so each error path runs rather than being assumed correct.
 * Three properties are checked for every failure: the right status and code are
 * returned, the response has the same shape as every other error, and the
 * student's uploaded document is still intact afterwards (NFR5).
 *
 * No Gemini quota is consumed.
 */

const test = require("node:test");
const assert = require("node:assert");

const h = require("../helpers/final-harness");
const ev = require("../helpers/evidence");

let user;

test.before(async () => {
  await h.api.startServer();
  user = await h.prepareUser({ consent: true });
});

test.after(async () => {
  await h.api.stopServer();
  const removed = await h.api.cleanup();
  console.log(`  clean-up: ${removed.usersRemoved} test user(s), ${removed.filesRemoved} file(s) removed`);
  await h.closeDb();
});

/*
 * Each failure mode, the behaviour that provokes it, and what the API is
 * required to answer. Driving these from one table is deliberate: it is what
 * makes "every AI error is reported consistently" checkable rather than a
 * claim, because the same assertions run against all of them.
 */
const FAILURES = [
  {
    id: "ERR-01",
    name: "Gemini timeout",
    behaviour: h.failsWith("AI_TIMEOUT"),
    status: 504,
    code: "AI_TIMEOUT",
    retryable: true
  },
  {
    id: "ERR-02",
    name: "Daily quota exhausted",
    behaviour: h.failsWith("AI_QUOTA_EXCEEDED", { quotaExhausted: true, retryAfterSeconds: 42 }),
    status: 429,
    code: "AI_QUOTA_EXCEEDED",
    retryable: true,
    extra: (body) => {
      assert.strictEqual(body.retry_after_seconds, 42,
        "a retry delay supplied by the provider must be passed to the client");
      assert.match(body.message, /tomorrow/i,
        "an exhausted daily quota must be distinguished from a short rate limit");
    }
  },
  {
    id: "ERR-03",
    name: "Short rate limit",
    behaviour: h.failsWith("AI_QUOTA_EXCEEDED", { quotaExhausted: false, retryAfterSeconds: 8 }),
    status: 429,
    code: "AI_QUOTA_EXCEEDED",
    retryable: true,
    extra: (body) => {
      assert.match(body.message, /wait a moment|too many requests/i,
        "a short rate limit must advise a brief wait rather than a day");
    }
  },
  {
    id: "ERR-04",
    name: "Malformed AI response",
    behaviour: h.failsWith("AI_MALFORMED_RESPONSE"),
    status: 502,
    code: "AI_MALFORMED_RESPONSE",
    retryable: true
  },
  {
    id: "ERR-05",
    name: "Empty AI response",
    behaviour: h.failsWith("AI_EMPTY_RESPONSE"),
    status: 502,
    code: "AI_EMPTY_RESPONSE",
    retryable: true
  },
  {
    id: "ERR-06",
    name: "Upstream service unavailable",
    behaviour: h.failsWith("AI_UNAVAILABLE"),
    status: 503,
    code: "AI_UNAVAILABLE",
    retryable: true
  }
];

for (const f of FAILURES) {
  test(`${f.id} ${f.name} returns ${f.status} ${f.code} and preserves the document (NFR5, issue #119)`, async () => {
    const outputsBefore = await h.storedOutputs(user.fileId);

    h.setBehaviour(f.behaviour);
    const res = await h.generate(user.userId, { file_id: user.fileId, output_type: "summary" });

    const fileAfter = await h.storedFile(user.fileId);
    const outputsAfter = await h.storedOutputs(user.fileId);

    ev.record(f.id, f.name, {
      checking: `the ${f.name.toLowerCase()} path returns a consistent, actionable error and leaves the uploaded document untouched`,
      request: { method: "POST", endpoint: "/api/ai/generate", body: { file_id: user.fileId, output_type: "summary" } },
      response: { status: res.status, body: res.body },
      notes: `document intact after failure: ${fileAfter && fileAfter.extracted_text === h.STUDY_TEXT}; outputs stored before ${outputsBefore.length}, after ${outputsAfter.length}`
    });

    // 1 — the documented status and code
    assert.strictEqual(res.status, f.status, `${f.name} should return HTTP ${f.status}`);
    assert.strictEqual(res.body.code, f.code);

    // 2 — the shape every error shares, so a client can handle them uniformly
    assert.strictEqual(res.body.status, "error");
    assert.ok(typeof res.body.message === "string" && res.body.message.trim().length > 0,
      "every error must carry a human-readable message");
    assert.strictEqual(res.body.retryable, f.retryable,
      `${f.name} must be marked ${f.retryable ? "retryable" : "not retryable"} so the interface knows whether to offer a retry`);

    if (f.extra) f.extra(res.body);

    // 3 — NFR5: the student must not lose their upload because generation failed
    assert.ok(fileAfter, "the uploaded document must still exist after a failed generation");
    assert.strictEqual(fileAfter.extracted_text, h.STUDY_TEXT,
      "the extracted text must be unchanged after a failed generation");
    assert.strictEqual(outputsAfter.length, outputsBefore.length,
      "a failed generation must not leave a partial output behind");
  });
}

/* ================================================================== ERR-07
 * "Verify AI errors return consistent API responses"
 *
 * Asserted across the whole set rather than one at a time, because consistency
 * is a property of the group.
 */
test("ERR-07 every AI failure mode shares one response contract (NFR5, issue #119)", async () => {
  const collected = [];

  for (const f of FAILURES) {
    h.setBehaviour(f.behaviour);
    const res = await h.generate(user.userId, { file_id: user.fileId, output_type: "summary" });
    collected.push({ mode: f.name, status: res.status, body: res.body });
  }

  ev.record("ERR-07", "Consistent AI error contract", {
    checking: "all AI failure modes return the same response shape with distinct, machine-readable codes",
    response: { modes: collected.map((c) => ({ mode: c.mode, status: c.status, code: c.body.code, retryable: c.body.retryable })) }
  });

  const codes = collected.map((c) => c.body.code);
  for (const c of collected) {
    assert.strictEqual(c.body.status, "error", `${c.mode} must use the shared error envelope`);
    assert.ok(c.body.code, `${c.mode} must carry a code`);
    assert.ok(c.body.message, `${c.mode} must carry a message`);
    assert.ok(c.status >= 400, `${c.mode} must use an error status`);
  }

  // Distinct causes must be distinguishable by the client, which is the point
  // of classifying them at all
  assert.ok(codes.includes("AI_TIMEOUT") && codes.includes("AI_QUOTA_EXCEEDED") &&
            codes.includes("AI_MALFORMED_RESPONSE") && codes.includes("AI_EMPTY_RESPONSE") &&
            codes.includes("AI_UNAVAILABLE"),
    "each failure cause must have its own code rather than a shared generic one");
});

/* ================================================================== ERR-08
 * "Review AI/document-processing endpoints for invalid input handling"
 */
test("ERR-08 invalid input is rejected before the model is reached (FR12.1, issue #119)", async () => {
  const cases = [
    { name: "missing file_id", body: { output_type: "summary" }, status: 400, code: "MISSING_FILE_ID" },
    { name: "unsupported output type", body: { file_id: user.fileId, output_type: "poem" }, status: 400, code: "UNSUPPORTED_OUTPUT_TYPE" },
    { name: "explanation without a concept", body: { file_id: user.fileId, output_type: "explanation" }, status: 400, code: "MISSING_CONCEPT" },
    { name: "explanation with an invalid level", body: { file_id: user.fileId, output_type: "explanation", concept: "x", level: "expert" }, status: 400, code: "INVALID_LEVEL" },
    { name: "document that does not exist", body: { file_id: 99999999, output_type: "summary" }, status: 404, code: "FILE_NOT_FOUND" }
  ];

  const observed = [];

  for (const c of cases) {
    h.resetCall();
    h.setBehaviour(() => "should never be reached");

    const res = await h.generate(user.userId, c.body);
    observed.push({ case: c.name, status: res.status, code: res.body.code, model_called: h.getLastCall() !== null });

    assert.strictEqual(res.status, c.status, `${c.name} should return ${c.status}`);
    assert.strictEqual(res.body.code, c.code, `${c.name} should return ${c.code}`);
    assert.strictEqual(h.getLastCall(), null,
      `${c.name}: invalid input must be rejected before any request is sent to the model`);
  }

  ev.record("ERR-08", "Invalid input handling", {
    checking: "each invalid request is rejected with its own code, and none reaches the model",
    response: { cases: observed }
  });
});
