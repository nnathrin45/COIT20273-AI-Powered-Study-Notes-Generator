/*
 * Shared helpers for the integration tests.
 *
 * Responsibilities:
 *   - start and stop the backend on a dedicated test port
 *   - create a throwaway user and return an authenticated request helper
 *   - remove every row and uploaded file the tests created
 *
 * Test data uses a recognisable e-mail prefix so clean-up can never touch real
 * development data.
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const BACKEND = path.join(
  __dirname,
  "..",
  ".."
);

require("dotenv").config({
  path: path.join(BACKEND, ".env")
});

// Deliberately not 5000 (macOS AirPlay) or 5099 (used for manual testing), so a
// test run cannot interfere with a server someone is using by hand.
const PORT =
  process.env.TEST_PORT || 5098;

const BASE =
  `http://localhost:${PORT}`;

// Every account the suite creates carries this prefix
const TEST_EMAIL_PREFIX =
  "autotest-";

let serverProcess = null;

const wait = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

const startServer = async () => {
  serverProcess = spawn(
    "node",
    ["src/server.js"],
    {
      cwd: BACKEND,
      env: {
        ...process.env,
        PORT: String(PORT)
      },
      stdio: "ignore"
    }
  );

  // Poll the health endpoint rather than guessing at a fixed delay
  for (
    let attempt = 0;
    attempt < 40;
    attempt += 1
  ) {
    try {
      const res = await fetch(
        `${BASE}/api/health`
      );

      if (res.ok) {
        return;
      }
    } catch {
      // not listening yet
    }

    await wait(250);
  }

  throw new Error(
    `Test server did not start on port ${PORT} within 10 seconds`
  );
};

const stopServer = async () => {
  if (!serverProcess) {
    return;
  }

  serverProcess.kill();
  serverProcess = null;

  await wait(200);
};

// Minimal request helper. Mirrors how the frontend calls the API: JSON by
// default, multipart when a form is supplied, bearer token when given.
const request = async (
  method,
  endpoint,
  {
    token,
    body,
    form
  } = {}
) => {
  const headers = {};

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] =
      "application/json";
  }

  const res = await fetch(
    `${BASE}${endpoint}`,
    {
      method,
      headers,
      body:
        form ||
        (
          body !== undefined
            ? JSON.stringify(body)
            : undefined
        )
    }
  );

  let data = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return {
    status: res.status,
    data
  };
};

const connect = async () => {
  const mysql =
    require("mysql2/promise");

  return mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password:
      process.env.DB_PASSWORD,
    database:
      process.env.DB_NAME
  });
};

// Creates a verified throwaway account and returns a normal authenticated JWT.
//
// Test fixtures intentionally bypass real e-mail verification and login 2FA so
// automated tests remain deterministic and never send external e-mails.
const createUser = async () => {
  const email =
    `${TEST_EMAIL_PREFIX}${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}@example.invalid`;

  const password =
    "Passw0rd!";

  const hashedPassword =
    await bcrypt.hash(
      password,
      10
    );

  const conn =
    await connect();

  let userId;

  try {
    const [result] =
      await conn.execute(
        `INSERT INTO users (
          full_name,
          email,
          email_verified,
          password
        )
        VALUES (?, ?, 1, ?)`,
        [
          "Automated Test",
          email,
          hashedPassword
        ]
      );

    userId =
      result.insertId;
  } finally {
    await conn.end();
  }

  const token =
    jwt.sign(
      {
        user_id: userId,
        email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

  return {
    email,
    token
  };
};

// Uploads a file from a Buffer without writing a temporary file to disk
const uploadBuffer = async (
  token,
  filename,
  contents
) => {
  const form =
    new FormData();

  form.append(
    "file",
    new Blob([contents]),
    filename
  );

  return request(
    "POST",
    "/api/upload",
    {
      token,
      form
    }
  );
};

// Deletes every account created by the suite. Files, consent records, AI
// outputs and quiz attempts follow through ON DELETE CASCADE; the uploaded
// files are removed from disk first, since the database does not track them.
const cleanup = async () => {
  const conn =
    await connect();

  const [rows] =
    await conn.execute(
      `SELECT f.file_path
       FROM uploaded_files f
       JOIN users u
         ON u.user_id = f.user_id
       WHERE u.email LIKE ?`,
      [
        `${TEST_EMAIL_PREFIX}%`
      ]
    );

  const [result] =
    await conn.execute(
      `DELETE FROM users
       WHERE email LIKE ?`,
      [
        `${TEST_EMAIL_PREFIX}%`
      ]
    );

  await conn.end();

  for (const row of rows) {
    const full =
      path.join(
        BACKEND,
        row.file_path
      );

    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
    }
  }

  return {
    usersRemoved:
      result.affectedRows,
    filesRemoved:
      rows.length
  };
};

module.exports = {
  BASE,
  PORT,
  TEST_EMAIL_PREFIX,
  startServer,
  stopServer,
  request,
  createUser,
  uploadBuffer,
  cleanup
};