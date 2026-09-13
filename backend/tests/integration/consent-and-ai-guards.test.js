/*
 * Integration tests for consent enforcement and the AI request guards.
 *
 * Every case here is rejected before the Gemini API is called, so the suite
 * consumes no quota (risk R3). That is deliberate: it means the requirement
 * most central to this subsystem — that consent is enforced by the server —
 * can be verified on every change, not only when quota is available.
 *
 * Converted from manual cases T-13, T-20, T-22, T-29, T-30, T-38, T-39, T-44,
 * T-45 and T-47 in testing/test-log-document-processing-ai.md.
 */

const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

const {
  startServer, stopServer, request, createUser, uploadBuffer, cleanup
} = require("../helpers/api");

const mysql = require(path.join(__dirname, "..", "..", "node_modules", "mysql2", "promise"));

const STUDY_TEXT =
  "Newton's second law states that force equals mass multiplied by acceleration.";

// Set up once: a user with a document, so each test can focus on one behaviour
let user;
let fileId;

test.before(async () => {
  await startServer();
  user = await createUser();
  const upload = await uploadBuffer(user.token, "physics.txt", STUDY_TEXT);
  fileId = upload.data.file.file_id;
});

test.after(async () => {
  await stopServer();
  const removed = await cleanup();
  console.log(
    `  clean-up: ${removed.usersRemoved} test user(s), ${removed.filesRemoved} file(s) removed`
  );
});

const setConsent = (token, status) =>
  request("POST", "/api/consent", { token, body: { status } });

const generate = (token, body) =>
  request("POST", "/api/ai/generate", { token, body });

// ------------------------------------------------- consent record (FR17.1)
test("consent starts unrecorded and is not an error (FR17.1)", async () => {
  const fresh = await createUser();
  const res = await request("GET", "/api/consent", { token: fresh.token });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.consent, null, "no decision yet should read as null");
});

test("consent is recorded and retrievable (FR17.1, NFR11)", async () => {
  const fresh = await createUser();

  const recorded = await setConsent(fresh.token, "granted");
  assert.strictEqual(recorded.status, 201);

  const status = await request("GET", "/api/consent", { token: fresh.token });
  assert.strictEqual(status.data.consent.status, "granted");
});

test("consent history is append-only, so the latest decision wins (NFR11)", async () => {
  const fresh = await createUser();

  await setConsent(fresh.token, "granted");
  await setConsent(fresh.token, "revoked");
  await setConsent(fresh.token, "granted");

  const status = await request("GET", "/api/consent", { token: fresh.token });
  assert.strictEqual(
    status.data.consent.status, "granted",
    "the most recent decision should be reported"
  );
});

test("an invalid consent value is rejected (FR17.1)", async () => {
  const fresh = await createUser();
  const res = await setConsent(fresh.token, "maybe");

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.data.code, "INVALID_CONSENT_STATUS");
});

// --------------------------------------- consent enforcement (FR17.1, 17.2)
test("generation is refused when consent has never been given (FR17.1, T-20)", async () => {
  const fresh = await createUser();
  const upload = await uploadBuffer(fresh.token, "notes.txt", STUDY_TEXT);

  const res = await generate(fresh.token, {
    file_id: upload.data.file.file_id,
    output_type: "summary"
  });

  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.data.code, "CONSENT_REQUIRED");
});

test("generation is refused again after consent is revoked (FR17.2, T-22)", async () => {
  const fresh = await createUser();
  const upload = await uploadBuffer(fresh.token, "notes.txt", STUDY_TEXT);
  const id = upload.data.file.file_id;

  await setConsent(fresh.token, "granted");
  await setConsent(fresh.token, "revoked");

  const res = await generate(fresh.token, { file_id: id, output_type: "summary" });

  assert.strictEqual(res.status, 403);
  assert.strictEqual(
    res.data.code, "CONSENT_REQUIRED",
    "consent must be re-checked on every request, not cached"
  );
});

test("consent is enforced for every output type, not only summaries (FR17)", async () => {
  const fresh = await createUser();
  const upload = await uploadBuffer(fresh.token, "notes.txt", STUDY_TEXT);
  const id = upload.data.file.file_id;

  for (const type of ["summary", "flashcards", "quiz"]) {
    const res = await generate(fresh.token, { file_id: id, output_type: type });
    assert.strictEqual(res.data.code, "CONSENT_REQUIRED", `${type} should be refused`);
  }

  const explanation = await generate(fresh.token, {
    file_id: id, output_type: "explanation", concept: "force"
  });
  assert.strictEqual(explanation.data.code, "CONSENT_REQUIRED");
});

// ------------------------------------------------------- request validation
test("an unsupported output type is rejected before consent is considered (T-30)", async () => {
  const res = await generate(user.token, { file_id: fileId, output_type: "podcast" });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.data.code, "UNSUPPORTED_OUTPUT_TYPE");
});

test("a missing file_id is rejected", async () => {
  const res = await generate(user.token, { output_type: "summary" });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.data.code, "MISSING_FILE_ID");
});

test("an explanation without a concept is rejected (FR12.1, T-44)", async () => {
  await setConsent(user.token, "granted");
  const res = await generate(user.token, { file_id: fileId, output_type: "explanation" });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.data.code, "MISSING_CONCEPT");
});

test("an explanation with an unrecognised level is rejected (FR12.1, T-45)", async () => {
  await setConsent(user.token, "granted");
  const res = await generate(user.token, {
    file_id: fileId, output_type: "explanation", concept: "force", level: "expert"
  });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.data.code, "INVALID_LEVEL");
});

// -------------------------------------------------------------- ownership
test("a document belonging to another user is reported as not found (NFR3, T-39)", async () => {
  const other = await createUser();
  await setConsent(other.token, "granted");

  const res = await generate(other.token, { file_id: fileId, output_type: "summary" });

  assert.strictEqual(res.status, 404);
  assert.strictEqual(
    res.data.code, "FILE_NOT_FOUND",
    "the API should not reveal that the file exists"
  );
});

// ------------------------------------------------- no readable text (FR8.4)
test("generation against a file with no extracted text advises re-uploading (FR8.4)", async () => {
  await setConsent(user.token, "granted");

  // This state cannot be produced through the upload endpoint: since the
  // extraction guard was corrected on 10 Sep 2026 a file with no readable text
  // is rejected at 422 before it is ever stored. The row is therefore seeded
  // directly, which is exactly how it would arise in practice — a document
  // stored before that fix, or written by some route other than the upload
  // controller.
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [users] = await conn.execute(
    "SELECT user_id FROM users WHERE email = ?", [user.email]
  );

  const [inserted] = await conn.execute(
    `INSERT INTO uploaded_files (user_id, file_name, file_path, extracted_text)
     VALUES (?, ?, ?, ?)`,
    [users[0].user_id, "scanned-handout.pdf", "src/uploads/seeded-empty.pdf", "   \n\t  "]
  );

  await conn.end();

  const res = await generate(user.token, {
    file_id: inserted.insertId,
    output_type: "summary"
  });

  assert.strictEqual(res.status, 422);
  assert.strictEqual(res.data.code, "NO_READABLE_TEXT");
  assert.match(
    res.data.message,
    /text-based document/i,
    "the message should tell the student what to do, as the upload path does"
  );
});

// --------------------------------------------------- authentication (NFR2)
test("the AI endpoints require authentication (NFR2, T-13)", async () => {
  const generateRes = await request("POST", "/api/ai/generate", {
    body: { file_id: fileId, output_type: "summary" }
  });
  assert.strictEqual(generateRes.status, 401);

  const outputsRes = await request("GET", `/api/ai/outputs/${fileId}`);
  assert.strictEqual(outputsRes.status, 401);

  const consentRes = await request("GET", "/api/consent");
  assert.strictEqual(consentRes.status, 401);
});
