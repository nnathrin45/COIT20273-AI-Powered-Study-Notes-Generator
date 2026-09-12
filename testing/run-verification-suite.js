/*
 * Verification suite for the Member 3 quality metrics.
 *
 * Covers four test cases that could not previously be executed because no
 * suitable fixtures existed:
 *
 *   T-25 (#25) extraction accuracy across PDF, DOCX and TXT
 *   T-26 (#22) scanned / image-only PDF is rejected, not silently accepted
 *   T-24 (#23) end-to-end generation time against NFR1
 *   #24        AI output accuracy against documents with known content
 *
 * The fixtures in testing/fixtures/ are generated from the plain-text sources
 * in testing/fixtures/source/, so those sources are exact ground truth for the
 * extraction comparison rather than an approximation of it.
 *
 * Run from the repository root:  node testing/run-verification-suite.js
 *
 * Consumes five Gemini generation requests. The free tier allows twenty per
 * day, so this cannot be run more than about four times in a day (risk R3).
 */

const fs = require("fs");
const path = require("path");

const REPO = path.join(__dirname, "..");
const BACKEND = path.join(REPO, "backend");
const FIXTURES = path.join(__dirname, "fixtures");
const SOURCES = path.join(FIXTURES, "source");

const api = require(path.join(BACKEND, "tests", "helpers", "api.js"));
const { extractTextFromPDF } = require(path.join(BACKEND, "src", "services", "pdf.service.js"));
const { extractTextFromDOCX } = require(path.join(BACKEND, "src", "services", "docx.service.js"));
const { extractTextFromTXT } = require(path.join(BACKEND, "src", "services", "txt.service.js"));

// NFR1 - average end-to-end generation under 60 s, no single run over 90 s
const NFR1_AVERAGE_MS = 60000;
const NFR1_MAXIMUM_MS = 90000;

const DOCUMENTS = [
  {
    id: "doc1",
    format: "TXT",
    file: "known-doc1-software-testing.txt",
    source: "doc1-software-testing.txt",
    extract: extractTextFromTXT,
    // Concepts the source states explicitly. Used as a coverage signal for the
    // accuracy review; the review itself is still performed by hand.
    concepts: [
      "defect", "failure", "verification", "validation", "exhaustive",
      "regression", "boundary", "coverage", "quality assurance", "review"
    ]
  },
  {
    id: "doc2",
    format: "DOCX",
    file: "known-doc2-database-design.docx",
    source: "doc2-database-design.txt",
    extract: extractTextFromDOCX,
    concepts: [
      "relation", "primary key", "foreign key", "normal form", "dependency",
      "integrity", "transaction", "index", "entity", "junction"
    ]
  },
  {
    id: "doc3",
    format: "PDF",
    file: "known-doc3-computer-networks.pdf",
    source: "doc3-computer-networks.txt",
    extract: extractTextFromPDF,
    concepts: [
      "layer", "address", "domain name", "transmission control protocol",
      "hypertext transfer protocol", "encapsulation", "subnet", "latency",
      "certificate", "stateless"
    ]
  }
];

const SCANNED = "scanned-no-text.pdf";

const results = {
  startedAt: new Date().toISOString(),
  extraction: [],
  scanned: null,
  timing: [],
  outputs: []
};

const log = (...args) => console.log(...args);
const section = (title) => log(`\n${"=".repeat(72)}\n${title}\n${"=".repeat(72)}`);

// Whitespace, case and punctuation differ between a plain-text source and the
// same text recovered from a PDF or DOCX. Comparison is therefore made on
// normalised word sequences rather than on the raw strings.
const normalise = (text) =>
  text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9'"\s.,;:()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const words = (text) => normalise(text).split(" ").filter(Boolean);

// pdf-parse inserts its own page separator, of the form "-- 2 of 8 --", into
// the text it returns. It is an artefact of the library rather than content of
// the document, so it is removed before comparison. It is reported separately,
// because the markers are stored in extracted_text and are sent to the model.
const PAGE_MARKER = /^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gm;

const countPageMarkers = (text) => (text.match(PAGE_MARKER) || []).length;

const stripPageMarkers = (text) => text.replace(PAGE_MARKER, "");

// A source line counts as recovered when its normalised word sequence appears
// in the normalised extracted text. This detects a dropped paragraph, a
// truncated page or a lost heading, which is what the metric asks about.
const compareExtraction = (sourceText, rawExtracted) => {
  const pageMarkers = countPageMarkers(rawExtracted);
  const extractedText = stripPageMarkers(rawExtracted);
  const haystack = normalise(extractedText);

  const sourceLines = sourceText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const missing = [];
  let recovered = 0;

  for (const line of sourceLines) {
    const needle = normalise(line);
    if (needle.length === 0) continue;

    if (haystack.includes(needle)) {
      recovered += 1;
    } else {
      missing.push(line);
    }
  }

  const headings = sourceLines.filter((line) => /^SECTION \d+:/.test(line));
  const missingHeadings = headings.filter((h) => !haystack.includes(normalise(h)));

  return {
    pageMarkers,
    sourceLines: sourceLines.length,
    recovered,
    missing,
    headings: headings.length,
    missingHeadings,
    sourceWords: words(sourceText).length,
    extractedWords: words(extractedText).length,
    sourceChars: sourceText.length,
    extractedChars: extractedText.length
  };
};

/* ------------------------------------------------------------------ *
 * T-25 - extraction accuracy against three known source documents
 * ------------------------------------------------------------------ */
const runExtractionAccuracy = async () => {
  section("T-25 (#25)  Extraction accuracy - PDF, DOCX and TXT against source");

  for (const doc of DOCUMENTS) {
    const sourceText = fs.readFileSync(path.join(SOURCES, doc.source), "utf-8");
    const extracted = await doc.extract(path.join(FIXTURES, doc.file));
    const cmp = compareExtraction(sourceText, extracted);

    const pct = ((cmp.recovered / cmp.sourceLines) * 100).toFixed(1);
    const pass = cmp.missing.length === 0;

    log(`\n${doc.format.padEnd(4)} ${doc.file}`);
    log(`  source        ${cmp.sourceLines} lines, ${cmp.sourceWords} words, ${cmp.sourceChars} chars`);
    log(`  extracted     ${cmp.extractedWords} words, ${cmp.extractedChars} chars`);
    log(`  lines matched ${cmp.recovered}/${cmp.sourceLines} (${pct}%)`);
    log(`  headings      ${cmp.headings - cmp.missingHeadings.length}/${cmp.headings} recovered`);
    if (cmp.pageMarkers) {
      log(`  note          ${cmp.pageMarkers} pdf-parse page marker(s) removed before comparison`);
    }
    log(`  result        ${pass ? "PASS - no sections missing" : `FAIL - ${cmp.missing.length} line(s) not recovered`}`);

    for (const line of cmp.missing.slice(0, 5)) {
      log(`    missing: ${line.slice(0, 90)}${line.length > 90 ? "..." : ""}`);
    }
    if (cmp.missing.length > 5) log(`    ...and ${cmp.missing.length - 5} more`);

    results.extraction.push({ doc: doc.id, format: doc.format, pass, ...cmp });
  }
};

/* ------------------------------------------------------------------ *
 * T-26 - scanned PDF rejected with NO_READABLE_TEXT
 * ------------------------------------------------------------------ */
const runScannedRejection = async (token) => {
  section("T-26 (#22)  Scanned / image-only PDF returns 422 NO_READABLE_TEXT");

  const filePath = path.join(FIXTURES, SCANNED);
  const extracted = await extractTextFromPDF(filePath);
  const extractedLength = extracted ? extracted.trim().length : 0;

  log(`\nservice level  extracted ${extractedLength} characters of usable text`);

  const upload = await api.uploadBuffer(token, SCANNED, fs.readFileSync(filePath));

  const pass =
    extractedLength === 0 &&
    upload.status === 422 &&
    upload.data &&
    upload.data.code === "NO_READABLE_TEXT";

  log(`api level      HTTP ${upload.status} ${upload.data ? upload.data.code : "(no body)"}`);
  log(`message        ${upload.data ? upload.data.message : "(none)"}`);
  log(`result         ${pass ? "PASS - rejected with a clear message" : "FAIL"}`);

  results.scanned = {
    pass,
    extractedLength,
    status: upload.status,
    code: upload.data && upload.data.code,
    message: upload.data && upload.data.message
  };
};

/* ------------------------------------------------------------------ *
 * T-24 - end-to-end generation time, and the outputs used for accuracy
 * ------------------------------------------------------------------ */
const runTimingAndGeneration = async (token) => {
  section("T-24 (#23)  End-to-end generation time against NFR1");

  const uploaded = [];

  for (const doc of DOCUMENTS) {
    const filePath = path.join(FIXTURES, doc.file);
    const started = Date.now();
    const upload = await api.uploadBuffer(token, doc.file, fs.readFileSync(filePath));
    const uploadMs = Date.now() - started;

    if (upload.status !== 201) {
      throw new Error(`Upload of ${doc.file} failed: ${upload.status} ${JSON.stringify(upload.data)}`);
    }

    log(`\n${doc.format.padEnd(4)} ${doc.file}`);
    log(`  upload + extraction  ${(uploadMs / 1000).toFixed(1)} s, ${upload.data.text_length} chars stored`);

    uploaded.push({ doc, fileId: upload.data.file.file_id, uploadMs });
  }

  // One summary per document - the measurement NFR1 is written against
  for (const item of uploaded) {
    const started = Date.now();
    const res = await api.request("POST", "/api/ai/generate", {
      token,
      body: { file_id: item.fileId, output_type: "summary" }
    });
    const generateMs = Date.now() - started;

    if (res.status !== 201) {
      throw new Error(
        `Generation for ${item.doc.file} failed: ${res.status} ${JSON.stringify(res.data)}`
      );
    }

    const endToEndMs = item.uploadMs + generateMs;

    log(`\n${item.doc.format.padEnd(4)} ${item.doc.file} - summary`);
    log(`  generation           ${(generateMs / 1000).toFixed(1)} s`);
    log(`  end to end           ${(endToEndMs / 1000).toFixed(1)} s  ${endToEndMs <= NFR1_MAXIMUM_MS ? "(within the 90 s ceiling)" : "(EXCEEDS the 90 s ceiling)"}`);

    results.timing.push({
      doc: item.doc.id,
      format: item.doc.format,
      uploadMs: item.uploadMs,
      generateMs,
      endToEndMs
    });

    results.outputs.push({
      doc: item.doc.id,
      outputType: "summary",
      content: res.data.output.content,
      concepts: item.doc.concepts
    });
  }

  const total = results.timing.reduce((sum, t) => sum + t.endToEndMs, 0);
  const average = total / results.timing.length;
  const slowest = Math.max(...results.timing.map((t) => t.endToEndMs));

  log(`\naverage end to end   ${(average / 1000).toFixed(1)} s   (metric: under 60 s)`);
  log(`slowest single run   ${(slowest / 1000).toFixed(1)} s   (metric: no run over 90 s)`);
  log(`result               ${average < NFR1_AVERAGE_MS && slowest < NFR1_MAXIMUM_MS ? "PASS - NFR1 met" : "FAIL - NFR1 not met"}`);

  results.nfr1 = {
    averageMs: average,
    slowestMs: slowest,
    pass: average < NFR1_AVERAGE_MS && slowest < NFR1_MAXIMUM_MS
  };

  // The two further output types below belong to the accuracy metric (#24),
  // not to the timing one, so a timing-only re-run stops here and spends three
  // Gemini requests rather than five.
  if (process.env.SUITE_PHASE === "timing") {
    log("\nSUITE_PHASE=timing - stopping before the flashcard and quiz generations.");
    return;
  }

  // Two further output types so the accuracy review covers five outputs, as
  // the metric for #24 requires
  const extras = [
    { item: uploaded[1], type: "flashcards" },
    { item: uploaded[2], type: "quiz" }
  ];

  for (const extra of extras) {
    const res = await api.request("POST", "/api/ai/generate", {
      token,
      body: { file_id: extra.item.fileId, output_type: extra.type }
    });

    if (res.status !== 201) {
      throw new Error(
        `Generation of ${extra.type} failed: ${res.status} ${JSON.stringify(res.data)}`
      );
    }

    log(`\n${extra.item.doc.format.padEnd(4)} ${extra.item.doc.file} - ${extra.type}: generated`);

    results.outputs.push({
      doc: extra.item.doc.id,
      outputType: extra.type,
      content: res.data.output.content,
      concepts: extra.item.doc.concepts
    });
  }
};

/* ------------------------------------------------------------------ *
 * #24 - grounding signals, then a written record for manual review
 * ------------------------------------------------------------------ */
const asText = (content) =>
  typeof content === "string" ? content : JSON.stringify(content);

// Proportion of the output's substantive vocabulary that also occurs in the
// source. This is a signal, not a verdict: a low figure points the reviewer at
// an output to read closely, it does not by itself prove invention.
const STOPWORDS = new Set(
  ("a an the and or but if then than that this these those of to in on for with as by from at is are was were be been " +
   "being it its it's they them their there here which who whom whose what when where why how not no nor so such can " +
   "could should would may might must will shall do does did done have has had having you your we our us i me my more " +
   "most other others some any all each both few many much one two three also into over under between within without " +
   "about against during before after above below up down out off again further once because while until unless " +
   "question answer options correct true false type").split(" ")
);

const groundingSignals = (output, sourceText) => {
  const sourceWordSet = new Set(words(sourceText));
  const outputWords = words(asText(output.content));

  const substantive = outputWords.filter(
    (w) => w.length > 3 && !STOPWORDS.has(w.replace(/[^a-z0-9']/g, ""))
  );

  const unique = [...new Set(substantive.map((w) => w.replace(/[^a-z0-9']/g, "")))].filter(Boolean);
  const notInSource = unique.filter((w) => !sourceWordSet.has(w));

  const conceptsCovered = output.concepts.filter((c) =>
    normalise(asText(output.content)).includes(normalise(c))
  );

  return {
    outputWords: outputWords.length,
    uniqueTerms: unique.length,
    termsNotInSource: notInSource,
    vocabularyOverlap: unique.length ? (unique.length - notInSource.length) / unique.length : 0,
    conceptsCovered,
    conceptCoverage: conceptsCovered.length / output.concepts.length
  };
};

const runAccuracyReview = () => {
  section("#24  AI output accuracy - grounding signals for manual review");

  const lines = [];
  lines.push("# AI output accuracy review (#24)");
  lines.push("");
  lines.push(`Generated ${new Date().toISOString()} by \`testing/run-verification-suite.js\`.`);
  lines.push("");
  lines.push(
    "Each output below was produced from a source document whose content is known " +
    "exactly, because the fixture was generated from the plain-text source held in " +
    "`testing/fixtures/source/`. The automated signals point the reviewer at anything " +
    "worth reading closely; the verdict is recorded by hand."
  );
  lines.push("");

  for (const output of results.outputs) {
    const doc = DOCUMENTS.find((d) => d.id === output.doc);
    const sourceText = fs.readFileSync(path.join(SOURCES, doc.source), "utf-8");
    const signals = groundingSignals(output, sourceText);

    output.signals = signals;

    log(`\n${doc.format} ${doc.id} - ${output.outputType}`);
    log(`  length              ${signals.outputWords} words`);
    log(`  vocabulary overlap  ${(signals.vocabularyOverlap * 100).toFixed(1)}% of substantive terms occur in the source`);
    log(`  key concepts        ${signals.conceptsCovered.length}/${doc.concepts.length} represented`);
    if (signals.termsNotInSource.length) {
      log(`  terms not in source ${signals.termsNotInSource.slice(0, 20).join(", ")}`);
      if (signals.termsNotInSource.length > 20) {
        log(`                      ...and ${signals.termsNotInSource.length - 20} more`);
      }
    }

    lines.push(`## ${doc.id} (${doc.format}) - ${output.outputType}`);
    lines.push("");
    lines.push(`- Source: \`testing/fixtures/source/${doc.source}\``);
    lines.push(`- Output length: ${signals.outputWords} words`);
    lines.push(`- Vocabulary overlap with source: ${(signals.vocabularyOverlap * 100).toFixed(1)}%`);
    lines.push(`- Key concepts represented: ${signals.conceptsCovered.length}/${doc.concepts.length} (${signals.conceptsCovered.join(", ")})`);
    lines.push(
      `- Terms not appearing in the source: ${
        signals.termsNotInSource.length ? signals.termsNotInSource.join(", ") : "none"
      }`
    );
    lines.push("");
    lines.push("**Manual verdict:** _to be completed by the reviewer_");
    lines.push("");
    lines.push("<details><summary>Generated output</summary>");
    lines.push("");
    lines.push("```");
    lines.push(
      typeof output.content === "string"
        ? output.content
        : JSON.stringify(output.content, null, 2)
    );
    lines.push("```");
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  const target = path.join(__dirname, "ai-accuracy-review.md");
  fs.writeFileSync(target, lines.join("\n"));
  log(`\nOutputs written to ${path.relative(REPO, target)} for manual review.`);
};

/* ------------------------------------------------------------------ */
const main = async () => {
  log(`Verification suite started ${results.startedAt}`);

  await runExtractionAccuracy();

  // Extraction needs no server, no account and no Gemini quota, so it can be
  // re-run freely while the fixtures are being adjusted.
  if (process.env.SUITE_PHASE === "extraction") {
    log("\nSUITE_PHASE=extraction - stopping before the server and AI phases.");
    return;
  }

  try {
    await api.startServer();
    log("\nTest server started.");

    const user = await api.createUser();

    await runScannedRejection(user.token);

    // T-26 reaches no further than extraction, so it too can be re-run without
    // consuming Gemini quota.
    if (process.env.SUITE_PHASE === "scanned") {
      log("\nSUITE_PHASE=scanned - stopping before the AI phases.");
      return;
    }

    // FR17.1 - generation is refused without consent, so it is granted before
    // the timing run rather than being measured as a failure
    const consent = await api.request("POST", "/api/consent", {
      token: user.token,
      body: { status: "granted" }
    });
    log(`\nConsent recorded: HTTP ${consent.status}`);

    await runTimingAndGeneration(user.token);

    // The review reads the flashcard and quiz outputs, which a timing-only run
    // does not produce, so it would otherwise overwrite the recorded review
    // with a partial one.
    if (process.env.SUITE_PHASE !== "timing") {
      runAccuracyReview();
    }
  } finally {
    await api.stopServer();
    const removed = await api.cleanup();
    log(`\nCleanup: ${removed.usersRemoved} test account(s), ${removed.filesRemoved} uploaded file(s) removed.`);
  }

  // Dated, so successive runs accumulate as evidence rather than replacing one
  // another. NFR1 is claimed from more than a single measurement.
  const stamp = results.startedAt.slice(0, 10);
  const resultsPath = path.join(__dirname, `verification-results-${stamp}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`Raw results written to ${path.relative(REPO, resultsPath)}`);
};

main().catch((error) => {
  console.error("\nVerification suite failed:", error.message);
  process.exitCode = 1;
});
