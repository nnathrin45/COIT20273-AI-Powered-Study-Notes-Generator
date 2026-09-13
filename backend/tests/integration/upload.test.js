/*
 * Integration tests for upload validation and text extraction.
 *
 * Runs against a real server and database, but never reaches the Gemini API,
 * so the suite consumes no quota (risk R3).
 *
 * Converted from manual cases T-01, T-04, T-05, T-07, T-08 and T-48 in
 * testing/test-log-document-processing-ai.md.
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const {
  startServer, stopServer, request, createUser, uploadBuffer, cleanup
} = require("../helpers/api");

const STUDY_TEXT =
  "Cellular respiration releases energy from glucose and converts it into ATP. " +
  "Glycolysis occurs in the cytoplasm and the Krebs cycle in the mitochondrial matrix.";

test.before(async () => {
  await startServer();
});

test.after(async () => {
  await stopServer();
  const removed = await cleanup();
  console.log(
    `  clean-up: ${removed.usersRemoved} test user(s), ${removed.filesRemoved} file(s) removed`
  );
});

// ------------------------------------------------------- extraction (FR8.3)
test("accepts a .txt upload and extracts its text (FR8.3, T-01)", async () => {
  const { token } = await createUser();
  const res = await uploadBuffer(token, "notes.txt", STUDY_TEXT);

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.file.file_name, "notes.txt");
  assert.ok(res.data.text_length > 0, "should report extracted characters");
});

test("returns file_id so the caller can generate without a second lookup (FR6, T-48)", async () => {
  const { token } = await createUser();
  const res = await uploadBuffer(token, "notes.txt", STUDY_TEXT);

  assert.ok(
    Number.isInteger(res.data.file.file_id),
    "upload response should carry a numeric file_id"
  );

  // and it should be usable immediately
  const fetched = await request("GET", `/api/uploaded/${res.data.file.file_id}`, { token });
  assert.strictEqual(fetched.status, 200);
  assert.ok(fetched.data.file.extracted_text.includes("Glycolysis"));
});

// ------------------------------------------------------- validation (FR6.1)
test("rejects a file whose extension is not allowed (FR6.1, T-04)", async () => {
  const { token } = await createUser();
  const res = await uploadBuffer(token, "malware.exe", "MZ\x90\x00not a document");

  assert.strictEqual(res.status, 415);
  assert.strictEqual(res.data.code, "UNSUPPORTED_FILE_TYPE");
});

test("accepts .pdf, .docx and .txt extensions at the validation stage (FR6.1)", async () => {
  const { token } = await createUser();

  // A .txt succeeds outright. The other two are checked only to confirm the
  // allow-list admits them — the content is not a real PDF or DOCX, so they are
  // expected to fail later during extraction rather than at validation.
  const txt = await uploadBuffer(token, "a.txt", STUDY_TEXT);
  assert.strictEqual(txt.status, 201);

  for (const name of ["a.pdf", "a.docx"]) {
    const res = await uploadBuffer(token, name, "not really this format");
    assert.notStrictEqual(
      res.status, 415,
      `${name} should pass extension validation, whatever happens during extraction`
    );
  }
});

test("rejects a file over the 15 MB limit (FR6.2, T-05)", async () => {
  const { token } = await createUser();
  const oversized = Buffer.alloc(16 * 1024 * 1024, "a");
  const res = await uploadBuffer(token, "big.txt", oversized);

  assert.strictEqual(res.status, 413);
  assert.strictEqual(res.data.code, "FILE_TOO_LARGE");
});

test("rejects a request with no file attached (T-07)", async () => {
  const { token } = await createUser();
  const form = new FormData();
  form.append("notafile", "x");

  const res = await request("POST", "/api/upload", { token, form });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.data.code, "NO_FILE");
});

// ------------------------------------------------- no readable text (FR8.4)
test("rejects a document with no readable text (FR8.4)", async () => {
  const { token } = await createUser();
  const res = await uploadBuffer(token, "blank.txt", "   \n\t  \n  ");

  assert.strictEqual(res.status, 422);
  assert.strictEqual(res.data.code, "NO_READABLE_TEXT");
  assert.match(
    res.data.message,
    /text-based document/i,
    "message should tell the student what to do about it"
  );
});

test("rejects a scanned, image-only PDF (FR8.4, SR-DP4, T-26)", async () => {
  const { token } = await createUser();

  // Three pages of scanned text as images, with no text layer at all. OCR is
  // out of scope per the Proposal, so rejection is the correct behaviour.
  const scanned = fs.readFileSync(
    path.join(__dirname, "..", "..", "..", "testing", "fixtures", "scanned-no-text.pdf")
  );

  const res = await uploadBuffer(token, "scanned-no-text.pdf", scanned);

  assert.strictEqual(res.status, 422);
  assert.strictEqual(res.data.code, "NO_READABLE_TEXT");
  assert.match(res.data.message, /text-based document/i);
});

test("extracted PDF text carries no pdf-parse page markers (T-26)", async () => {
  const { token } = await createUser();

  // Regression guard for the defect T-26 exposed: pdf-parse appends
  // "-- 1 of 3 --" to every page by default, which both defeated the FR8.4
  // check above and was sent to Gemini as part of the study material.
  const document = fs.readFileSync(
    path.join(__dirname, "..", "..", "..", "testing", "fixtures", "two-page-text.pdf")
  );

  const upload = await uploadBuffer(token, "two-page-text.pdf", document);
  assert.strictEqual(upload.status, 201);

  const fetched = await request("GET", `/api/uploaded/${upload.data.file.file_id}`, { token });
  assert.doesNotMatch(
    fetched.data.file.extracted_text,
    /--\s*\d+\s+of\s+\d+\s*--/,
    "page boundary markers should not appear in the stored text"
  );
});

// ------------------------------------------------------------ privacy (NFR3)
test("one user cannot read another user's document (NFR3, T-08)", async () => {
  const owner = await createUser();
  const other = await createUser();

  const upload = await uploadBuffer(owner.token, "private.txt", STUDY_TEXT);
  const fileId = upload.data.file.file_id;

  const asOwner = await request("GET", `/api/uploaded/${fileId}`, { token: owner.token });
  assert.strictEqual(asOwner.status, 200, "the owner should be able to read it");

  const asOther = await request("GET", `/api/uploaded/${fileId}`, { token: other.token });
  assert.strictEqual(asOther.status, 404, "another user should get 404, not 403");
});

// --------------------------------------------------- authentication (NFR2)
test("upload requires authentication (NFR2)", async () => {
  const form = new FormData();
  form.append("file", new Blob(["text"]), "notes.txt");

  const res = await request("POST", "/api/upload", { form });

  assert.strictEqual(res.status, 401);
});
