/*
 * FINAL VERIFICATION — AI Consent, Privacy and Responsible AI
 * GitHub issue #119, section "AI Consent and Privacy"
 *
 * Test IDs PRIV-01 to PRIV-07.
 *
 * These cover the obligations that make the system defensible rather than
 * merely functional: that nothing is sent to a third-party model without
 * recorded consent, that only the study material is sent, that generated
 * content is labelled, and that no credential is exposed through the API or
 * the repository.
 *
 * No Gemini quota is consumed.
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const h = require("../helpers/final-harness");
const ev = require("../helpers/evidence");

const { buildPrompt } = require("../../src/services/ai.service");

const REPO = path.join(__dirname, "..", "..", "..");
const SUMMARY_TEXT = "Photosynthesis stores light energy as glucose.";

test.before(async () => {
  await h.api.startServer();
});

test.after(async () => {
  await h.api.stopServer();
  const removed = await h.api.cleanup();
  console.log(`  clean-up: ${removed.usersRemoved} test user(s), ${removed.filesRemoved} file(s) removed`);
  await h.closeDb();
});

/* ================================================================= PRIV-01
 * "Verify AI requests cannot proceed without active consent"
 */
test("PRIV-01 generation is refused when consent has never been recorded (FR17.1)", async () => {
  const user = await h.prepareUser({ consent: false });

  // If the guard fails, this records that the model was reached
  h.resetCall();
  h.setBehaviour(() => SUMMARY_TEXT);

  const res = await h.generate(user.userId, { file_id: user.fileId, output_type: "summary" });

  ev.record("PRIV-01", "Consent required before processing", {
    checking: "no document content reaches the model when consent has never been given",
    request: { method: "POST", endpoint: "/api/ai/generate", body: { file_id: user.fileId, output_type: "summary" } },
    response: { status: res.status, body: res.body },
    notes: `model invoked during this test: ${h.getLastCall() ? "YES — guard failed" : "no"}`
  });

  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.code, "CONSENT_REQUIRED");
  assert.strictEqual(h.getLastCall(), null,
    "the model must not be called at all when consent is missing");
});

/* ================================================================= PRIV-02
 * "Verify revoked consent prevents new AI processing"
 */
test("PRIV-02 revoking consent blocks further processing immediately (FR17.2)", async () => {
  const user = await h.prepareUser({ consent: true });

  h.setBehaviour(() => SUMMARY_TEXT);
  const allowed = await h.generate(user.userId, { file_id: user.fileId, output_type: "summary" });
  assert.strictEqual(allowed.status, 201, "generation should succeed while consent stands");

  const revoked = await h.api.request("POST", "/api/consent", {
    token: user.token, body: { status: "revoked" }
  });
  assert.strictEqual(revoked.status, 201);

  h.resetCall();
  const refused = await h.generate(user.userId, { file_id: user.fileId, output_type: "summary" });

  ev.record("PRIV-02", "Revoked consent blocks processing", {
    checking: "consent is re-checked on every request, so revocation takes effect at once",
    request: { method: "POST", endpoint: "/api/ai/generate", body: { file_id: user.fileId, output_type: "summary" } },
    response: {
      before_revocation: { status: allowed.status },
      after_revocation: { status: refused.status, body: refused.body }
    },
    notes: `model invoked after revocation: ${h.getLastCall() ? "YES — guard failed" : "no"}`
  });

  assert.strictEqual(refused.status, 403);
  assert.strictEqual(refused.body.code, "CONSENT_REQUIRED");
  assert.strictEqual(h.getLastCall(), null, "the model must not be called after consent is revoked");
});

/* ================================================================= PRIV-03
 * "Verify only required study-material content is sent for AI processing"
 *
 * Checked at two levels: what the controller hands to the service, and what
 * the prompt builder actually produces.
 */
test("PRIV-03 only the study material is sent to the model, with no account data (NFR3, privacy)", async () => {
  const user = await h.prepareUser({ consent: true });

  h.resetCall();
  h.setBehaviour(() => SUMMARY_TEXT);
  await h.generate(user.userId, { file_id: user.fileId, output_type: "summary" });

  const call = h.getLastCall();
  assert.ok(call, "the model should have been called for this test");

  // The prompt that would have been transmitted
  const prompt = buildPrompt(call.text, call.outputType, call.options);

  const forbidden = [
    { label: "account e-mail", value: user.email },
    { label: "user id", value: `user_id` },
    { label: "bearer token", value: user.token },
    { label: "Gemini API key", value: process.env.GEMINI_API_KEY },
    { label: "database password", value: process.env.DB_PASSWORD },
    { label: "JWT secret", value: process.env.JWT_SECRET }
  ].filter((f) => f.value);

  const leaked = forbidden.filter((f) => prompt.includes(f.value));

  ev.text("PRIV-03", "prompt-sent-to-model", prompt, {
    "Study material chars": call.text.length,
    "Prompt chars": prompt.length,
    "Account data found": leaked.length === 0 ? "none" : leaked.map((l) => l.label).join(", ")
  });

  assert.strictEqual(call.text, h.STUDY_TEXT,
    "the service must receive the extracted study material exactly, and nothing else");
  assert.deepStrictEqual(leaked.map((l) => l.label), [],
    "no account data or credential may appear in the prompt sent to the model");
  assert.ok(prompt.includes(h.STUDY_TEXT), "the prompt must contain the study material it summarises");
});

/* ================================================================= PRIV-04
 * "Recheck responsible-AI labels/disclaimers in returned data" (FR16.1)
 */
test("PRIV-04 generated content is labelled and carries a disclaimer (FR16.1)", async () => {
  const user = await h.prepareUser({ consent: true });
  const types = [
    { type: "summary", stub: () => SUMMARY_TEXT },
    { type: "flashcards", stub: () => [{ question: "Q", answer: "A" }] },
    { type: "quiz", stub: () => [{ type: "true_false", question: "Q", options: ["True", "False"], correct_answer: "True" }] },
    { type: "explanation", stub: () => "An explanation.", body: { concept: "photosynthesis", level: "beginner" } }
  ];

  const observed = [];

  for (const t of types) {
    h.setBehaviour(t.stub);
    const res = await h.generate(user.userId, {
      file_id: user.fileId, output_type: t.type, ...(t.body || {})
    });

    assert.strictEqual(res.status, 201, `${t.type} should generate`);
    observed.push({
      output_type: t.type,
      is_ai_generated: res.body.output.is_ai_generated,
      disclaimer: res.body.disclaimer
    });

    assert.strictEqual(res.body.output.is_ai_generated, true,
      `${t.type} must be flagged as AI-generated (FR16.1)`);
    assert.ok(res.body.disclaimer && res.body.disclaimer.trim().length > 0,
      `${t.type} must be returned with a disclaimer (FR16.1)`);
    assert.match(res.body.disclaimer, /AI/i, "the disclaimer must say the content was AI-generated");
  }

  // The label must also survive retrieval, not only appear at generation time
  const listed = await h.listOutputs(user.userId, user.fileId);
  for (const output of listed.body.outputs) {
    assert.ok(
      output.is_ai_generated === 1 || output.is_ai_generated === true,
      `stored output ${output.output_id} lost its AI-generated label on retrieval`
    );
  }

  ev.record("PRIV-04", "Responsible AI labelling", {
    checking: "all four content types are flagged as AI-generated and returned with a disclaimer, and the flag survives retrieval",
    response: { at_generation: observed, on_retrieval: listed.body.outputs.map((o) => ({ output_id: o.output_id, output_type: o.output_type, is_ai_generated: o.is_ai_generated })) },
    notes: "The interface half of the FR16 metric — that the label is visibly shown on screen — is a manual check; see the manual verification list."
  });
});

/* ================================================================= PRIV-05
 * "Confirm sensitive credentials/API keys are not exposed"
 */
test("PRIV-05 no credential is exposed in a successful API response (security)", async () => {
  const user = await h.prepareUser({ consent: true });

  h.setBehaviour(() => SUMMARY_TEXT);
  const generated = await h.generate(user.userId, { file_id: user.fileId, output_type: "summary" });
  const fetched = await h.api.request("GET", `/api/uploaded/${user.fileId}`, { token: user.token });
  const profile = await h.api.request("GET", "/api/profile", { token: user.token });

  const bodies = JSON.stringify([generated.body, fetched.data, profile.data]);

  const secrets = [
    { label: "GEMINI_API_KEY", value: process.env.GEMINI_API_KEY },
    { label: "JWT_SECRET", value: process.env.JWT_SECRET },
    { label: "DB_PASSWORD", value: process.env.DB_PASSWORD }
  ].filter((s) => s.value && s.value.length >= 4);

  const exposed = secrets.filter((s) => bodies.includes(s.value));

  ev.record("PRIV-05", "No credentials in API responses", {
    checking: "generation, document retrieval and profile responses contain no configured secret",
    response: { endpoints_checked: ["/api/ai/generate", "/api/uploaded/:id", "/api/profile"], secrets_checked: secrets.map((s) => s.label), exposed: exposed.map((s) => s.label) }
  });

  assert.deepStrictEqual(exposed.map((s) => s.label), [],
    "a configured secret was returned in an API response");

  // A password hash must never leave the server either
  assert.ok(!bodies.includes("$2b$") && !bodies.includes("$2a$"),
    "a bcrypt password hash appeared in an API response");
});

test("PRIV-06 an upstream failure does not leak the API key into the error response (security, NFR5)", async () => {
  const user = await h.prepareUser({ consent: true });

  // Upstream libraries sometimes include the request URL, and therefore the
  // key, in an error message. The API must not pass that through to the client.
  const fakeKey = "AIzaSyTEST-FAKE-KEY-0000000000000000000";
  h.setBehaviour(() => {
    throw new Error(`Request failed: https://generativelanguage.googleapis.com/v1/models?key=${fakeKey}`);
  });

  const res = await h.generate(user.userId, { file_id: user.fileId, output_type: "summary" });

  ev.record("PRIV-06", "Upstream error does not leak credentials", {
    checking: "an upstream error message containing an API key is not passed through to the client",
    request: { method: "POST", endpoint: "/api/ai/generate", simulated_upstream_error: "error message containing a key query parameter" },
    response: { status: res.status, body: res.body }
  });

  const body = JSON.stringify(res.body);
  assert.ok(!body.includes(fakeKey), "the API key must not appear in the error returned to the client");
  assert.ok(!body.includes("googleapis.com"), "upstream request details must not be passed through to the client");
  assert.strictEqual(res.body.status, "error");
  assert.ok(res.body.code, "the error must carry a machine-readable code");
});

test("PRIV-07 the environment file is excluded from version control (security)", async () => {
  const envPath = path.join(REPO, "backend", ".env");
  assert.ok(fs.existsSync(envPath), "this check assumes a local .env is present");

  // git check-ignore exits 0 when the path is ignored
  let ignored = true;
  try {
    execFileSync("git", ["check-ignore", "-q", "backend/.env"], { cwd: REPO });
  } catch {
    ignored = false;
  }

  // And no tracked file may contain the live key
  const key = process.env.GEMINI_API_KEY;
  let trackedLeak = "";
  if (key && key.length >= 8) {
    try {
      trackedLeak = execFileSync("git", ["grep", "-l", "--", key], { cwd: REPO, encoding: "utf8" }).trim();
    } catch {
      trackedLeak = ""; // git grep exits non-zero when there are no matches
    }
  }

  ev.record("PRIV-07", "Secrets excluded from version control", {
    checking: "backend/.env is gitignored and no tracked file contains the live API key",
    response: { env_gitignored: ignored, tracked_files_containing_key: trackedLeak ? trackedLeak.split("\n") : [] }
  });

  assert.ok(ignored, "backend/.env must be excluded from version control");
  assert.strictEqual(trackedLeak, "", "the live API key must not appear in any tracked file");
});
