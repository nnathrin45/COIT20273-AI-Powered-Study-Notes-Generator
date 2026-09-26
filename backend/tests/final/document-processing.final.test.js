/*
 * FINAL VERIFICATION — Document Processing
 * GitHub issue #119, section "Document Processing Verification"
 *
 * Test IDs DP-01 to DP-07. Each one corresponds to a checklist item in that
 * issue, and each writes an evidence artefact to testing/evidence/ so the
 * result can be checked rather than taken on trust.
 *
 * These tests exercise the real upload endpoint, the real extraction services
 * and the real database. None of them reach the Gemini API, so the suite can be
 * run at any time without consuming the shared daily quota (risk R3).
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const h = require("../helpers/final-harness");
const ev = require("../helpers/evidence");

const { extractTextFromPDF } = require("../../src/services/pdf.service");
const { extractTextFromDOCX } = require("../../src/services/docx.service");
const { extractTextFromTXT } = require("../../src/services/txt.service");

const FIXTURES = path.join(__dirname, "..", "..", "..", "testing", "fixtures");
const SOURCES = path.join(FIXTURES, "source");

test.before(async () => {
  await h.api.startServer();
});

test.after(async () => {
  await h.api.stopServer();
  const removed = await h.api.cleanup();
  console.log(`  clean-up: ${removed.usersRemoved} test user(s), ${removed.filesRemoved} file(s) removed`);
  await h.closeDb();
});

/* ============================================================ DP-01 to DP-03
 * "Recheck PDF extraction" / "Recheck DOCX extraction" / "Recheck TXT processing"
 *
 * The fixtures were generated from the plain-text sources in
 * testing/fixtures/source/, so each source is exact ground truth for its
 * fixture. The assertion is character equality ignoring whitespace, which
 * detects a single dropped word — not merely that some text came back.
 */
const FORMATS = [
  { id: "DP-01", format: "PDF",  fixture: "known-doc3-computer-networks.pdf",  source: "doc3-computer-networks.txt",  extract: extractTextFromPDF },
  { id: "DP-02", format: "DOCX", fixture: "known-doc2-database-design.docx",   source: "doc2-database-design.txt",    extract: extractTextFromDOCX },
  { id: "DP-03", format: "TXT",  fixture: "known-doc1-software-testing.txt",   source: "doc1-software-testing.txt",   extract: extractTextFromTXT }
];

for (const doc of FORMATS) {
  test(`${doc.id} ${doc.format} extraction recovers the source document in full (FR8, issue #119)`, async () => {
    const source = fs.readFileSync(path.join(SOURCES, doc.source), "utf-8");
    const extracted = await doc.extract(path.join(FIXTURES, doc.fixture));

    const expected = source.replace(/\s/g, "");
    const actual = extracted.replace(/\s/g, "");

    ev.text(doc.id, `${doc.format}-extracted-text`, extracted, {
      Fixture: doc.fixture,
      Source: `testing/fixtures/source/${doc.source}`,
      "Source chars": expected.length,
      "Extracted chars": actual.length,
      Match: actual === expected ? "character-identical ignoring whitespace" : "DIFFERS"
    });

    assert.strictEqual(
      actual,
      expected,
      `${doc.format} extraction does not match its source document`
    );

    // Every section heading must survive extraction, so structure is not lost
    const flattened = extracted.replace(/\s+/g, " ");
    const headings = source.split("\n").map((l) => l.trim()).filter((l) => /^SECTION \d+:/.test(l));
    assert.ok(headings.length > 0, "the source should contain section headings");
    for (const heading of headings) {
      assert.ok(flattened.includes(heading), `heading lost during extraction: ${heading}`);
    }
  });
}

/* ==================================================================== DP-04
 * "Verify unreadable/scanned/no-text document handling"
 */
test("DP-04 a scanned, image-only PDF is rejected with actionable advice (FR8.4, SR-DP4)", async () => {
  const { token } = await h.api.createUser();
  const file = path.join(FIXTURES, "scanned-no-text.pdf");

  // Confirmed at the service level first: the document genuinely has no text
  const extracted = await extractTextFromPDF(file);
  const usable = extracted ? extracted.trim().length : 0;

  const res = await h.api.uploadBuffer(token, "scanned-no-text.pdf", fs.readFileSync(file));

  ev.record("DP-04", "Scanned PDF rejected", {
    checking: "an image-only document is refused rather than accepted with empty content",
    request: { method: "POST", endpoint: "/api/upload", file: "scanned-no-text.pdf (3 pages, no text layer)" },
    response: { status: res.status, body: res.data },
    notes: `Text recoverable by the extraction service: ${usable} characters`
  });

  assert.strictEqual(usable, 0, "the fixture must genuinely contain no readable text");
  assert.strictEqual(res.status, 422);
  assert.strictEqual(res.data.code, "NO_READABLE_TEXT");
  assert.match(res.data.message, /text-based document/i,
    "the message must tell the student what to do, not only that it failed");
});

/* ==================================================================== DP-05
 * "Verify extracted text is stored and processed correctly"
 *
 * Checks the full path rather than the response alone: what the endpoint
 * reported, what the database holds, and what the retrieval endpoint returns
 * must all be the same text.
 */
test("DP-05 extracted text is stored intact and retrievable (FR8, issue #119)", async () => {
  const user = await h.prepareUser({ consent: false });

  const stored = await h.storedFile(user.fileId);
  const fetched = await h.api.request("GET", `/api/uploaded/${user.fileId}`, { token: user.token });

  ev.record("DP-05", "Extracted text storage", {
    checking: "the text reported at upload, the text in the database and the text returned on retrieval are identical",
    request: { method: "GET", endpoint: `/api/uploaded/${user.fileId}` },
    response: { status: fetched.status, body: fetched.data },
    notes: `upload reported ${user.textLength} chars; database holds ${stored.extracted_text.length} chars`
  });

  assert.strictEqual(stored.extracted_text, h.STUDY_TEXT, "the database must hold the source text unaltered");
  assert.strictEqual(user.textLength, h.STUDY_TEXT.length, "the reported length must match what was stored");
  assert.strictEqual(fetched.status, 200);
  assert.strictEqual(fetched.data.file.extracted_text, h.STUDY_TEXT,
    "retrieval must return the same text that was stored");
  assert.strictEqual(stored.user_id, user.userId, "the document must be owned by the uploading user");
});

/* ==================================================================== DP-06
 * "Recheck malformed or unsupported document behaviour"
 */
test("DP-06 an unsupported file type is rejected before any processing (FR6.1)", async () => {
  const { token } = await h.api.createUser();
  const res = await h.api.uploadBuffer(token, "malware.exe", "MZ\x90\x00not a document");

  ev.record("DP-06", "Unsupported file type rejected", {
    checking: "an extension outside the allow-list is refused",
    request: { method: "POST", endpoint: "/api/upload", file: "malware.exe" },
    response: { status: res.status, body: res.data }
  });

  assert.strictEqual(res.status, 415);
  assert.strictEqual(res.data.code, "UNSUPPORTED_FILE_TYPE");
});

test("DP-07 a corrupt file with an accepted extension fails safely (FR6.1, NFR5)", async () => {
  const { token } = await h.api.createUser();

  // A .pdf extension on content that is not a PDF at all. The extraction
  // library will throw; the requirement is that the API answers with a
  // structured error and the server stays up, rather than crashing.
  const res = await h.api.uploadBuffer(token, "corrupt.pdf", "this is not a PDF file at all");

  ev.record("DP-07", "Corrupt document handled safely", {
    checking: "a file that passes extension validation but cannot be parsed returns a structured error and does not crash the server",
    request: { method: "POST", endpoint: "/api/upload", file: "corrupt.pdf (plain text with a .pdf extension)" },
    response: { status: res.status, body: res.data }
  });

  assert.ok(res.status >= 400 && res.status < 600, "a corrupt document must be reported as an error");
  assert.ok(res.data && res.data.code, "the error must carry a machine-readable code");
  assert.strictEqual(res.data.status, "error");

  // The server must still be answering after the failure
  const health = await h.api.request("GET", "/api/health");
  assert.strictEqual(health.status, 200, "the server must survive a corrupt upload");
});
