/*
 * Integration tests for quiz attempt submission and scoring (FR11.2).
 *
 * The quiz is inserted directly into ai_outputs rather than generated, so these
 * tests verify the marking logic without calling the Gemini API and without
 * consuming quota (risk R3). Marking is the part that must be correct on every
 * change; generation is verified separately when quota allows.
 *
 * Converted from manual cases T-34 to T-38 in
 * testing/test-log-document-processing-ai.md.
 */

const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

const {
  startServer, stopServer, request, createUser, uploadBuffer, cleanup
} = require("../helpers/api");

const mysql = require(path.join(__dirname, "..", "..", "node_modules", "mysql2", "promise"));

const QUIZ = [
  {
    type: "multiple_choice",
    question: "Which organelle produces most of the cell's ATP?",
    options: ["Mitochondrion", "Nucleus", "Ribosome", "Golgi body"],
    correct_answer: "Mitochondrion"
  },
  {
    type: "true_false",
    question: "Glycolysis occurs in the mitochondrial matrix.",
    options: ["True", "False"],
    correct_answer: "False"
  },
  {
    type: "multiple_choice",
    question: "Where does the Krebs cycle take place?",
    options: ["Cytoplasm", "Mitochondrial matrix", "Cell membrane", "Nucleus"],
    correct_answer: "Mitochondrial matrix"
  }
];

let user;
let quizOutputId;
let summaryOutputId;

// Inserts a stored output directly, bypassing generation
const seedOutput = async (email, fileId, type, content) => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [users] = await conn.execute(
    "SELECT user_id FROM users WHERE email = ?", [email]
  );

  const [result] = await conn.execute(
    `INSERT INTO ai_outputs (file_id, user_id, output_type, content, is_ai_generated)
     VALUES (?, ?, ?, ?, TRUE)`,
    [fileId, users[0].user_id, type, content]
  );

  await conn.end();
  return result.insertId;
};

test.before(async () => {
  await startServer();
  user = await createUser();

  const upload = await uploadBuffer(user.token, "biology.txt",
    "Cellular respiration converts glucose into ATP across three stages.");
  const fileId = upload.data.file.file_id;

  quizOutputId = await seedOutput(user.email, fileId, "quiz", JSON.stringify(QUIZ));
  summaryOutputId = await seedOutput(user.email, fileId, "summary", "A stored summary.");
});

test.after(async () => {
  await stopServer();
  const removed = await cleanup();
  console.log(
    `  clean-up: ${removed.usersRemoved} test user(s), ${removed.filesRemoved} file(s) removed`
  );
});

const submit = (token, outputId, answers) =>
  request("POST", `/api/ai/quiz/${outputId}/attempt`, { token, body: { answers } });

// ------------------------------------------------------------ scoring
test("a fully correct attempt scores every question (FR11.2, T-34)", async () => {
  const answers = QUIZ.map((q) => q.correct_answer);
  const res = await submit(user.token, quizOutputId, answers);

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.attempt.score, 3);
  assert.strictEqual(res.data.attempt.total, 3);
  assert.strictEqual(res.data.attempt.percentage, 100);
});

test("a wholly incorrect attempt scores zero (FR11.2)", async () => {
  const res = await submit(user.token, quizOutputId, ["wrong", "wrong", "wrong"]);

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.attempt.score, 0);
  assert.strictEqual(res.data.attempt.percentage, 0);
});

test("a partial attempt records unanswered questions as incorrect (FR11.2, T-35)", async () => {
  const answers = [QUIZ[0].correct_answer, null, null];
  const res = await submit(user.token, quizOutputId, answers);

  assert.strictEqual(res.data.attempt.score, 1);
  assert.strictEqual(res.data.attempt.total, 3);
});

test("per-question results identify which answers were correct (FR11.2)", async () => {
  const answers = [QUIZ[0].correct_answer, "wrong", QUIZ[2].correct_answer];
  const res = await submit(user.token, quizOutputId, answers);

  const results = res.data.attempt.results;
  assert.strictEqual(results.length, 3);
  assert.strictEqual(results[0].is_correct, true);
  assert.strictEqual(results[1].is_correct, false);
  assert.strictEqual(results[2].is_correct, true);
  assert.strictEqual(results[1].correct_answer, QUIZ[1].correct_answer);
});

// ------------------------------------------------------------ retakes
test("each attempt is stored separately so retakes are preserved (FR11.2, T-36)", async () => {
  const fresh = await createUser();
  const upload = await uploadBuffer(fresh.token, "retake.txt", "Some study material here.");
  const outputId = await seedOutput(
    fresh.email, upload.data.file.file_id, "quiz", JSON.stringify(QUIZ)
  );

  await submit(fresh.token, outputId, QUIZ.map((q) => q.correct_answer));
  await submit(fresh.token, outputId, ["wrong", "wrong", "wrong"]);

  const history = await request("GET", `/api/ai/quiz/${outputId}/attempts`, {
    token: fresh.token
  });

  assert.strictEqual(history.status, 200);
  assert.strictEqual(history.data.attempts.length, 2, "both attempts should be retained");
  assert.strictEqual(
    history.data.attempts[0].score, 0,
    "history should be newest first"
  );
});

// --------------------------------------------------------- validation
test("the number of answers must match the number of questions (FR11.2, T-37)", async () => {
  const res = await submit(user.token, quizOutputId, ["only one answer"]);

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.data.code, "ANSWER_COUNT_MISMATCH");
  assert.match(res.data.message, /3/, "message should state how many were expected");
});

test("answers must be supplied as an array (FR11.2)", async () => {
  const res = await request("POST", `/api/ai/quiz/${quizOutputId}/attempt`, {
    token: user.token,
    body: { answers: "not an array" }
  });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.data.code, "INVALID_ANSWERS");
});

test("an attempt cannot be submitted against a non-quiz output (T-38)", async () => {
  const res = await submit(user.token, summaryOutputId, []);

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.data.code, "NOT_A_QUIZ");
});

// ------------------------------------------------------------- privacy
test("a quiz belonging to another user cannot be attempted (NFR3)", async () => {
  const other = await createUser();
  const res = await submit(other.token, quizOutputId, QUIZ.map((q) => q.correct_answer));

  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.data.code, "OUTPUT_NOT_FOUND");
});

test("quiz attempt endpoints require authentication (NFR2)", async () => {
  const res = await request("POST", `/api/ai/quiz/${quizOutputId}/attempt`, {
    body: { answers: [] }
  });

  assert.strictEqual(res.status, 401);
});
