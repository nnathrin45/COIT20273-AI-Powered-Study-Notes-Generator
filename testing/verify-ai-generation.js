/*
 * Verification harness — AI generation and consent enforcement
 * Owner: Member 3 (Natthapong Rinsakul)
 *
 * Covers test cases T-19 to T-22 from testing/test-log-document-processing-ai.md:
 *   T-19  live Gemini call returns a usable summary          (requires GEMINI_API_KEY)
 *   T-20  generation refused when no consent recorded        (no key required)
 *   T-21  generation succeeds once consent is granted        (requires GEMINI_API_KEY)
 *   T-22  generation refused again after consent is revoked  (no key required)
 *
 * T-20 and T-22 run without an API key because the consent check in
 * ai.controller.js precedes the Gemini call — a refusal never reaches the API.
 *
 * Usage, with the backend already running:
 *   node testing/verify-ai-generation.js [baseUrl]
 * Default baseUrl is http://localhost:5099
 *
 * The script creates a temporary user, uploads a document, then deletes both
 * on completion so no test data is left in the database.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

// Dependencies live in backend/node_modules, so resolve them from there
const BACKEND = path.join(__dirname, "..", "backend");
const fromBackend = (mod) => require(path.join(BACKEND, "node_modules", mod));

fromBackend("dotenv").config({ path: path.join(BACKEND, ".env") });

const BASE = process.argv[2] || "http://localhost:5099";
const EMAIL = `verify-ai-${Date.now()}@example.invalid`;
const PASSWORD = "Passw0rd!";
const HAS_KEY = Boolean(process.env.GEMINI_API_KEY);

const results = [];

const record = (id, requirement, description, expected, actual, pass, note) => {
  results.push({ id, requirement, description, expected, actual, pass, note });
  const mark = pass === null ? "SKIP" : pass ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${id}  ${description}`);
  if (expected !== undefined) console.log(`         expected: ${expected}`);
  if (actual !== undefined) console.log(`         actual:   ${actual}`);
  if (note) console.log(`         note:     ${note}`);
};

const call = async (method, endpoint, { token, body, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers,
    body: form || (body ? JSON.stringify(body) : undefined)
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
};

const main = async () => {
  console.log(`\nVerification harness — AI generation and consent enforcement`);
  console.log(`Target:  ${BASE}`);
  console.log(`API key: ${HAS_KEY ? "present" : "NOT SET — T-19 and T-21 will be skipped"}\n`);

  // ---- health check --------------------------------------------------------
  try {
    const health = await call("GET", "/api/health");
    if (health.status !== 200) throw new Error(`health returned ${health.status}`);
  } catch (err) {
    console.error(`Cannot reach the backend at ${BASE}. Start it first:`);
    console.error(`  cd backend && PORT=5099 node src/server.js\n`);
    process.exit(1);
  }

  // ---- set-up: user, token, uploaded document -----------------------------
  await call("POST", "/api/users/register", {
    body: { full_name: "AI Verify", email: EMAIL, password: PASSWORD }
  });

  const login = await call("POST", "/api/users/login", {
    body: { email: EMAIL, password: PASSWORD }
  });
  const token = login.data && login.data.token;
  if (!token) {
    console.error("Could not obtain a token; aborting.");
    process.exit(1);
  }

  const fixture = path.join(os.tmpdir(), `verify-ai-${Date.now()}.txt`);
  fs.writeFileSync(
    fixture,
    "Photosynthesis is the process by which green plants convert light energy " +
      "into chemical energy stored as glucose. Chlorophyll, the pigment in " +
      "chloroplasts, absorbs light most strongly in the blue and red wavelengths " +
      "and reflects green. The light-dependent reactions occur in the thylakoid " +
      "membranes and produce ATP and NADPH. The Calvin cycle then uses those " +
      "products to fix carbon dioxide into carbohydrate.\n"
  );

  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(fixture)]), path.basename(fixture));
  const upload = await call("POST", "/api/upload", { token, form });

  if (upload.status !== 201) {
    console.error(`Set-up upload failed (${upload.status}). Ensure backend/src/uploads/ exists.`);
    process.exit(1);
  }

  // The upload response does not return the row id, so read it from the
  // database. Scoped to this run's e-mail so it cannot pick up another row.
  const mysql = fromBackend("mysql2/promise");
  const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  };

  let fileId = null;
  {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT f.file_id FROM uploaded_files f
       JOIN users u ON u.user_id = f.user_id
       WHERE u.email = ? ORDER BY f.file_id DESC LIMIT 1`,
      [EMAIL]
    );
    await conn.end();
    if (rows.length > 0) fileId = rows[0].file_id;
  }
  if (fileId === null) {
    console.error("Could not resolve the uploaded file id; aborting.");
    process.exit(1);
  }

  console.log(`Set-up complete — user created, file_id ${fileId} uploaded.\n`);
  console.log("Running test cases:\n");

  // ---- T-20: refused with no consent recorded ------------------------------
  {
    const r = await call("POST", "/api/ai/generate", {
      token,
      body: { file_id: fileId, output_type: "summary" }
    });
    const code = r.data && r.data.code;
    record(
      "T-20",
      "FR17.1",
      "Generation refused when no consent has been recorded",
      "403 CONSENT_REQUIRED",
      `${r.status} ${code || "(no code)"}`,
      r.status === 403 && code === "CONSENT_REQUIRED"
    );
  }

  // ---- T-19 / T-21: succeeds once consent is granted -----------------------
  await call("POST", "/api/consent", { token, body: { status: "granted" } });

  if (HAS_KEY) {
    const started = Date.now();
    const r = await call("POST", "/api/ai/generate", {
      token,
      body: { file_id: fileId, output_type: "summary" }
    });
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    const out = r.data && r.data.output;
    const content = out && out.content ? out.content : "";

    record(
      "T-21",
      "FR17.1",
      "Generation permitted once consent is granted",
      "201 with generated content",
      `${r.status}${content ? `, ${content.length} characters` : ""}`,
      r.status === 201 && content.length > 0
    );

    record(
      "T-19",
      "FR9.1",
      "Live Gemini call returns a usable summary",
      "non-empty summary, is_ai_generated true, disclaimer present",
      out
        ? `is_ai_generated=${out.is_ai_generated}, disclaimer=${Boolean(
            r.data.disclaimer
          )}, ${elapsed}s`
        : "no output returned",
      Boolean(out && content.length > 0 && out.is_ai_generated && r.data.disclaimer)
    );

    // NFR1 observation, recorded rather than asserted (full test is T-24)
    record(
      "T-24 (partial)",
      "NFR1",
      "End-to-end generation time for this document",
      "under 60 s",
      `${elapsed}s`,
      Number(elapsed) < 60,
      "single short document; the full NFR1 metric needs three 10-page documents"
    );

    if (content) {
      console.log("\n  ---- generated summary ----");
      console.log(
        content
          .split("\n")
          .map((l) => `  ${l}`)
          .join("\n")
      );
      console.log("  ---------------------------\n");
    }
  } else {
    record("T-21", "FR17.1", "Generation permitted once consent is granted",
      "201 with generated content", "skipped", null, "GEMINI_API_KEY not set");
    record("T-19", "FR9.1", "Live Gemini call returns a usable summary",
      "non-empty summary", "skipped", null, "GEMINI_API_KEY not set");

    // Without a key the request should fail cleanly rather than crash (T-18 path)
    const r = await call("POST", "/api/ai/generate", {
      token,
      body: { file_id: fileId, output_type: "summary" }
    });
    const code = r.data && r.data.code;
    record(
      "T-18 (re-check)",
      "NFR5",
      "With consent granted but no API key, the request fails cleanly",
      "503 AI_NOT_CONFIGURED",
      `${r.status} ${code || "(no code)"}`,
      r.status === 503 && code === "AI_NOT_CONFIGURED"
    );
  }

  // ---- T-22: refused again after revocation --------------------------------
  await call("POST", "/api/consent", { token, body: { status: "revoked" } });
  {
    const r = await call("POST", "/api/ai/generate", {
      token,
      body: { file_id: fileId, output_type: "summary" }
    });
    const code = r.data && r.data.code;
    record(
      "T-22",
      "FR17.2",
      "Generation refused again after consent is revoked",
      "403 CONSENT_REQUIRED",
      `${r.status} ${code || "(no code)"}`,
      r.status === 403 && code === "CONSENT_REQUIRED"
    );
  }

  // ---- clean-up ------------------------------------------------------------
  const conn = await mysql.createConnection(dbConfig);

  const [paths] = await conn.execute(
    `SELECT f.file_path FROM uploaded_files f
     JOIN users u ON u.user_id = f.user_id WHERE u.email = ?`,
    [EMAIL]
  );
  await conn.execute("DELETE FROM users WHERE email = ?", [EMAIL]);
  await conn.end();

  for (const row of paths) {
    const p = path.join(BACKEND, row.file_path);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  fs.unlinkSync(fixture);

  // ---- summary -------------------------------------------------------------
  const executed = results.filter((r) => r.pass !== null);
  const passed = executed.filter((r) => r.pass);
  const failed = executed.filter((r) => !r.pass);
  const skipped = results.filter((r) => r.pass === null);

  console.log(`\nSummary: ${passed.length} passed, ${failed.length} failed, ${skipped.length} skipped`);
  console.log("Clean-up complete — test user, uploaded file and fixture removed.\n");

  if (skipped.length > 0) {
    console.log("To run the skipped cases, add to backend/.env:");
    console.log("  GEMINI_API_KEY=<your key from aistudio.google.com>");
    console.log("  GEMINI_MODEL=gemini-2.0-flash\n");
  }

  process.exit(failed.length > 0 ? 1 : 0);
};

main().catch((err) => {
  console.error("\nHarness error:", err.message);
  process.exit(1);
});
