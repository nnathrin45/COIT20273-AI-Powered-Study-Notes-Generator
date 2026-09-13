/*
 * What the student experiences when a generation times out (T-23, NFR5).
 *
 * The unit tests alongside this file prove the race produces AI_TIMEOUT. These
 * cover what happens next, which is what actually matters to a user:
 *
 *   - the request is reported as 504 AI_TIMEOUT and marked retryable
 *   - the uploaded document survives, so nothing has to be uploaded again
 *   - a retry then succeeds
 *
 * The timeout is provoked by replacing ai.service.generate rather than by
 * waiting for a real one, so no Gemini call is made and no quota is consumed
 * (risk R3). The stub is installed before the controller is required, so the
 * controller captures it when it destructures the service.
 *
 * The document is uploaded over HTTP through the running test server, and read
 * back the same way, so retention is verified against the real database rather
 * than against a fixture.
 */

const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

// The controller is used in this process, not only in the spawned server, so
// its database pool is built here — and the pool reads its credentials when
// config/database is first required. The environment therefore has to be loaded
// before anything below pulls that module in.
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const db = require("../../src/config/database");
const aiService = require("../../src/services/ai.service");

// Installed before ai.controller is required below
let generateBehaviour = null;

aiService.generate = async (...args) => {
  if (typeof generateBehaviour !== "function") {
    throw new Error("the test did not say how generate should behave");
  }
  return generateBehaviour(...args);
};

const { generateOutput } = require("../../src/controllers/ai.controller");

const {
  startServer, stopServer, request, createUser, uploadBuffer, cleanup
} = require("../helpers/api");

const STUDY_TEXT =
  "Photosynthesis converts light energy into chemical energy stored as glucose. " +
  "The Calvin cycle fixes carbon dioxide into sugar in the stroma.";

const timesOut = () => {
  const error = new Error("Gemini request timed out");
  error.code = "AI_TIMEOUT";
  throw error;
};

// Minimal stand-ins for Express's req and res, capturing what the controller
// sends so it can be asserted on.
const fakeRequest = (userId, body) => ({ user: { user_id: userId }, body });

const fakeResponse = () => {
  const captured = { status: null, body: null };

  return {
    captured,
    status(code) {
      captured.status = code;
      return this;
    },
    json(payload) {
      captured.body = payload;
      return this;
    }
  };
};

// The controller reads req.user from the token the middleware decoded, so the
// test needs the same user_id the server would have supplied.
const userIdFromToken = (token) =>
  JSON.parse(Buffer.from(token.split(".")[1], "base64").toString()).user_id;

const prepare = async () => {
  const { token } = await createUser();
  const userId = userIdFromToken(token);

  await request("POST", "/api/consent", { token, body: { status: "granted" } });

  const upload = await uploadBuffer(token, "photosynthesis.txt", STUDY_TEXT);
  assert.strictEqual(upload.status, 201, "the fixture upload should succeed");

  return { token, userId, fileId: upload.data.file.file_id };
};

test.before(async () => {
  await startServer();
});

test.after(async () => {
  await stopServer();
  const removed = await cleanup();
  console.log(
    `  clean-up: ${removed.usersRemoved} test user(s), ${removed.filesRemoved} file(s) removed`
  );

  // Unlike the other integration tests, this file uses the controller in its
  // own process, so it holds a connection pool of its own. Left open, the pool
  // keeps the event loop alive and the run never finishes.
  await db.end();
});

test("a timeout is reported as 504 AI_TIMEOUT and marked retryable (T-23, NFR5)", async () => {
  const { userId, fileId } = await prepare();

  generateBehaviour = timesOut;

  const res = fakeResponse();
  await generateOutput(fakeRequest(userId, { file_id: fileId, output_type: "summary" }), res);

  assert.strictEqual(res.captured.status, 504);
  assert.strictEqual(res.captured.body.code, "AI_TIMEOUT");
  assert.strictEqual(
    res.captured.body.retryable,
    true,
    "the student needs to be told that trying again is worthwhile"
  );
  assert.match(res.captured.body.message, /try again/i);
});

test("the uploaded document survives a timeout (NFR5, T-23)", async () => {
  const { token, userId, fileId } = await prepare();

  generateBehaviour = timesOut;

  await generateOutput(
    fakeRequest(userId, { file_id: fileId, output_type: "summary" }),
    fakeResponse()
  );

  // Read back over HTTP: the row and its extracted text must be untouched, so
  // the student does not have to upload the document a second time.
  const fetched = await request("GET", `/api/uploaded/${fileId}`, { token });

  assert.strictEqual(fetched.status, 200);
  assert.strictEqual(fetched.data.file.file_id, fileId);
  assert.ok(
    fetched.data.file.extracted_text.includes("Calvin cycle"),
    "the extracted text should be intact after a timeout"
  );
});

test("no partial output is stored when a generation times out (T-23)", async () => {
  const { token, userId, fileId } = await prepare();

  generateBehaviour = timesOut;

  await generateOutput(
    fakeRequest(userId, { file_id: fileId, output_type: "summary" }),
    fakeResponse()
  );

  const outputs = await request("GET", `/api/ai/outputs/${fileId}`, { token });

  assert.strictEqual(outputs.status, 200);
  assert.strictEqual(
    outputs.data.outputs.length,
    0,
    "a failed generation must not leave a record behind"
  );
});

test("a retry after a timeout succeeds against the same document (NFR5, T-23)", async () => {
  const { token, userId, fileId } = await prepare();

  generateBehaviour = timesOut;

  const first = fakeResponse();
  await generateOutput(fakeRequest(userId, { file_id: fileId, output_type: "summary" }), first);
  assert.strictEqual(first.captured.status, 504);

  // Same request again, this time with the service responding
  generateBehaviour = async () => "Photosynthesis stores light energy as glucose.";

  const second = fakeResponse();
  await generateOutput(fakeRequest(userId, { file_id: fileId, output_type: "summary" }), second);

  assert.strictEqual(second.captured.status, 201);
  assert.strictEqual(second.captured.body.output.output_type, "summary");
  assert.match(second.captured.body.output.content, /Photosynthesis/);
  assert.strictEqual(second.captured.body.output.is_ai_generated, true);

  // And the retry is the only stored output, so the timeout left nothing behind
  const outputs = await request("GET", `/api/ai/outputs/${fileId}`, { token });
  assert.strictEqual(outputs.data.outputs.length, 1);
});
