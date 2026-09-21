/*
 * Evidence capture for the final verification suite.
 *
 * Every test in tests/final/ carries a Test ID (DP-01, AI-03, PRIV-02 ...)
 * that traces back to a checklist item in GitHub issue #119. This helper
 * writes what the test actually observed to testing/evidence/, named by that
 * Test ID, so a claim in the assessment report can be checked against the
 * request, the response or the extracted text that produced it.
 *
 * Evidence is written only where it is worth reading. A test that asserts a
 * status code needs no artefact of its own; a test that asserts the content of
 * an AI response, an extracted document or an error body does.
 *
 * The directory is cleared at the start of each run by the report generator,
 * so what is present always belongs to the most recent run.
 */

const fs = require("fs");
const path = require("path");

const EVIDENCE_DIR = path.join(__dirname, "..", "..", "..", "testing", "evidence");

const ensureDir = () => {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
};

// Anything that could carry a credential is masked before it is written to
// disk, because the evidence files are attached to an academic submission.
const SENSITIVE_KEYS = /^(authorization|token|password|gemini_api_key|jwt_secret|db_password)$/i;

const redact = (value) => {
  if (Array.isArray(value)) return value.map(redact);

  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.test(k) ? "[REDACTED]" : redact(v);
    }
    return out;
  }

  if (typeof value === "string" && value.length > 4000) {
    return value.slice(0, 4000) + `\n... [truncated, ${value.length} characters total]`;
  }

  return value;
};

const slug = (text) =>
  String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/*
 * Records an API exchange as JSON: what was sent, what came back, and a short
 * note on what the test was checking.
 *
 *   record("AI-01", "Summary generation", {
 *     request: { method, endpoint, body },
 *     response: { status, body },
 *     checking: "content is stored and returned with the AI-generated label"
 *   })
 */
const record = (testId, title, { request, response, checking, notes } = {}) => {
  ensureDir();

  const payload = {
    test_id: testId,
    title,
    issue: "#119",
    captured_at: new Date().toISOString(),
    checking: checking || null,
    request: request ? redact(request) : null,
    response: response ? redact(response) : null,
    notes: notes || null
  };

  const file = path.join(EVIDENCE_DIR, `${testId}-${slug(title)}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
};

/*
 * Writes a plain-text artefact — extracted document text, a generated summary,
 * a prompt — where reading the content itself is the point.
 */
const text = (testId, name, content, header = {}) => {
  ensureDir();

  const lines = [
    `Test ID   : ${testId}`,
    `Artefact  : ${name}`,
    `Issue     : #119`,
    `Captured  : ${new Date().toISOString()}`
  ];

  for (const [k, v] of Object.entries(header)) {
    lines.push(`${k.padEnd(10)}: ${v}`);
  }

  lines.push("-".repeat(72), "");

  const file = path.join(EVIDENCE_DIR, `${testId}-${slug(name)}.txt`);
  fs.writeFileSync(file, lines.join("\n") + String(content));
  return file;
};

module.exports = { record, text, EVIDENCE_DIR };
