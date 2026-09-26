/*
 * Shared setup for the final verification suite (tests/final/).
 *
 * The problem this solves: the Gemini free tier allows 20 generation requests
 * per day for the whole team (project risk R3), so a suite that called the real
 * model could not be run on demand, and could not be run at all on the day of
 * the demonstration. Every behaviour that depends on what the model returns is
 * therefore exercised against a stubbed model, while the controller, the
 * database, the consent check and the HTTP server all remain real.
 *
 * ai.controller destructures generate() from ai.service when it is first
 * required, so the stub has to be installed before that require runs. Requiring
 * this file first is what guarantees the ordering.
 */

const path = require("path");
const assert = require("node:assert");

const BACKEND = path.join(__dirname, "..", "..");

// The controller is used in this process, not only in the spawned test server,
// so its connection pool is built here and reads its credentials on first
// require. The environment must be loaded before anything pulls that module in.
require("dotenv").config({ path: path.join(BACKEND, ".env") });

const db = require("../../src/config/database");
const aiService = require("../../src/services/ai.service");

// What the stubbed model should do on the next call. Each test sets this.
let behaviour = null;

// Records the arguments the controller passed to generate(), so a test can
// assert on what would have been sent to Gemini — used by the privacy checks.
let lastCall = null;

aiService.generate = async (text, outputType, options = {}) => {
  // The real service builds the prompt before it opens a connection, and that
  // is where per-type input validation lives — an explanation with no concept,
  // or an unrecognised level, is rejected here rather than by the model. The
  // stub therefore runs the real prompt builder first, so validation behaves
  // exactly as it does in production and invalid input never counts as a call.
  const prompt = aiService.buildPrompt(text, outputType, options);

  lastCall = { text, outputType, options, prompt };

  if (typeof behaviour !== "function") {
    throw new Error(
      "final-harness: the test did not say how the stubbed model should behave"
    );
  }

  return behaviour(text, outputType, options);
};

// Required only after the stub is in place
const aiController = require("../../src/controllers/ai.controller");

const api = require("./api");

const setBehaviour = (fn) => { behaviour = fn; };
const getLastCall = () => lastCall;
const resetCall = () => { lastCall = null; };

// Makes the stub fail the way a real upstream failure would
const failsWith = (code, extra = {}) => () => {
  const error = new Error(`stubbed upstream failure: ${code}`);
  error.code = code;
  Object.assign(error, extra);
  throw error;
};

/* ---------------------------------------------------------------- fake req/res
 * Minimal stand-ins for Express's objects, capturing what the controller sends
 * so it can be asserted on and written to an evidence file.
 */
const fakeRequest = (userId, body = {}, params = {}) => ({
  user: { user_id: userId },
  body,
  params
});

const fakeResponse = () => {
  const captured = { status: 200, body: null };

  return {
    captured,
    status(code) { captured.status = code; return this; },
    json(payload) { captured.body = payload; return this; }
  };
};

// Calls POST /api/ai/generate through the real controller
const generate = async (userId, body) => {
  const res = fakeResponse();
  await aiController.generateOutput(fakeRequest(userId, body), res);
  return res.captured;
};

// Calls GET /api/ai/outputs/:fileId through the real controller
const listOutputs = async (userId, fileId) => {
  const res = fakeResponse();
  await aiController.getOutputsForFile(fakeRequest(userId, {}, { fileId: String(fileId) }), res);
  return res.captured;
};

/* ------------------------------------------------------------------- fixtures */

const STUDY_TEXT =
  "Photosynthesis converts light energy into chemical energy stored as glucose. " +
  "The light-dependent reactions occur in the thylakoid membrane and produce ATP and NADPH. " +
  "The Calvin cycle occurs in the stroma and fixes carbon dioxide into sugar.";

// The user_id the middleware would have decoded from the token
const userIdFromToken = (token) =>
  JSON.parse(Buffer.from(token.split(".")[1], "base64").toString()).user_id;

/*
 * Creates a user, grants consent and uploads a document over real HTTP, then
 * returns everything a test needs to drive the AI endpoints against it.
 */
const prepareUser = async ({ consent = true, studyText = STUDY_TEXT, filename = "photosynthesis.txt" } = {}) => {
  const { token, email } = await api.createUser();
  const userId = userIdFromToken(token);

  if (consent) {
    const granted = await api.request("POST", "/api/consent", {
      token,
      body: { status: "granted" }
    });
    assert.strictEqual(granted.status, 201, "consent setup should succeed");
  }

  const upload = await api.uploadBuffer(token, filename, studyText);
  assert.strictEqual(upload.status, 201, `fixture upload should succeed: ${JSON.stringify(upload.data)}`);

  return {
    token,
    email,
    userId,
    fileId: upload.data.file.file_id,
    fileName: upload.data.file.file_name,
    textLength: upload.data.text_length
  };
};

// Reads the stored row directly, for assertions about what persistence did
const storedFile = async (fileId) => {
  const [rows] = await db.execute(
    "SELECT file_id, user_id, file_name, extracted_text FROM uploaded_files WHERE file_id = ?",
    [fileId]
  );
  return rows[0] || null;
};

const storedOutputs = async (fileId) => {
  const [rows] = await db.execute(
    `SELECT output_id, file_id, user_id, output_type, content, is_ai_generated
     FROM ai_outputs WHERE file_id = ? ORDER BY output_id`,
    [fileId]
  );
  return rows;
};

// Closes the pool this process opened, so the run exits instead of hanging
const closeDb = () => db.end();

module.exports = {
  api,
  db,
  setBehaviour,
  failsWith,
  getLastCall,
  resetCall,
  generate,
  listOutputs,
  prepareUser,
  storedFile,
  storedOutputs,
  closeDb,
  STUDY_TEXT
};
