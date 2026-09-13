/*
 * Extraction accuracy against source documents with known content (T-25, FR8).
 *
 * The fixtures in testing/fixtures/ were generated from the plain-text sources
 * in testing/fixtures/source/, so each source is exact ground truth for its
 * fixture rather than an approximation of it. That makes the metric — no
 * sections missing — checkable automatically rather than by reading.
 *
 * Comparison ignores whitespace. A PDF is laid out in wrapped lines and a DOCX
 * in paragraphs, so line breaks legitimately differ from the source; the
 * characters themselves must not. Whitespace-insensitive equality is the
 * strongest assertion the formats permit, and it is stronger than checking
 * section by section: it detects a single dropped word.
 *
 * Calls the extraction services directly — no server, no database and no
 * Gemini quota (risk R3).
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const { extractTextFromPDF } = require("../../src/services/pdf.service");
const { extractTextFromDOCX } = require("../../src/services/docx.service");
const { extractTextFromTXT } = require("../../src/services/txt.service");

const FIXTURES = path.join(__dirname, "..", "..", "..", "testing", "fixtures");
const SOURCES = path.join(FIXTURES, "source");

const DOCUMENTS = [
  {
    format: "TXT",
    fixture: "known-doc1-software-testing.txt",
    source: "doc1-software-testing.txt",
    extract: extractTextFromTXT
  },
  {
    format: "DOCX",
    fixture: "known-doc2-database-design.docx",
    source: "doc2-database-design.txt",
    extract: extractTextFromDOCX
  },
  {
    format: "PDF",
    fixture: "known-doc3-computer-networks.pdf",
    source: "doc3-computer-networks.txt",
    extract: extractTextFromPDF
  }
];

const withoutWhitespace = (text) => text.replace(/\s/g, "");

// Reports where two texts first diverge, so a failure names the passage that
// went missing instead of only reporting that two large strings are unequal.
const describeFirstDifference = (expected, actual) => {
  const limit = Math.min(expected.length, actual.length);

  for (let i = 0; i < limit; i += 1) {
    if (expected[i] !== actual[i]) {
      return (
        `first difference at character ${i}\n` +
        `  source:    ...${expected.slice(Math.max(0, i - 60), i + 60)}...\n` +
        `  extracted: ...${actual.slice(Math.max(0, i - 60), i + 60)}...`
      );
    }
  }

  return expected.length > actual.length
    ? `extraction stopped ${expected.length - actual.length} characters early; ` +
      `the source continues: ...${expected.slice(limit, limit + 120)}...`
    : `extraction produced ${actual.length - expected.length} characters that are ` +
      `not in the source: ...${actual.slice(limit, limit + 120)}...`;
};

for (const doc of DOCUMENTS) {
  test(`${doc.format} extraction recovers the source in full (FR8, T-25)`, async () => {
    const source = fs.readFileSync(path.join(SOURCES, doc.source), "utf-8");
    const extracted = await doc.extract(path.join(FIXTURES, doc.fixture));

    const expected = withoutWhitespace(source);
    const actual = withoutWhitespace(extracted);

    assert.strictEqual(
      actual,
      expected,
      `${doc.format} extraction does not match its source.\n` +
        describeFirstDifference(expected, actual)
    );
  });

  test(`${doc.format} extraction recovers every section heading (FR8, T-25)`, async () => {
    const source = fs.readFileSync(path.join(SOURCES, doc.source), "utf-8");
    const extracted = await doc.extract(path.join(FIXTURES, doc.fixture));

    // Headings are checked separately from the character comparison above. If
    // a future change alters spacing rather than content, this still confirms
    // the document's structure survived extraction.
    const flattened = extracted.replace(/\s+/g, " ");

    const headings = source
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^SECTION \d+:/.test(line));

    assert.ok(headings.length > 0, "the source should contain section headings");

    for (const heading of headings) {
      assert.ok(
        flattened.includes(heading),
        `heading not found in extracted text: ${heading}`
      );
    }
  });
}
