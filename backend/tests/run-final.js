/*
 * Final verification runner.
 *
 *   npm run test:final
 *
 * Runs the regression suite and the final verification suite, collects machine-
 * readable results, and writes a single HTML report that links every Test ID to
 * the GitHub issue #119 checklist item it verifies and to the evidence the test
 * produced.
 *
 * Exits non-zero if any test fails, so the result cannot be misread.
 *
 * Neither suite calls the Gemini API. The run consumes no quota and can be
 * repeated as often as needed, including on the day of the demonstration.
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BACKEND = path.join(__dirname, "..");
const REPO = path.join(BACKEND, "..");
const TESTING = path.join(REPO, "testing");
const EVIDENCE = path.join(TESTING, "evidence");
const REPORTS = path.join(TESTING, "reports");

/* Test ID -> the issue #119 checklist item it verifies. This is the
 * traceability spine: every final test must appear here, and the report fails
 * loudly if one does not. */
const TRACEABILITY = {
  "DP-01": ["Document Processing", "Recheck PDF extraction"],
  "DP-02": ["Document Processing", "Recheck DOCX extraction"],
  "DP-03": ["Document Processing", "Recheck TXT processing"],
  "DP-04": ["Document Processing", "Verify unreadable/scanned/no-text document handling"],
  "DP-05": ["Document Processing", "Verify extracted text is stored and processed correctly"],
  "DP-06": ["Document Processing", "Recheck malformed or unsupported document behaviour"],
  "DP-07": ["Document Processing", "Recheck malformed or unsupported document behaviour"],

  "AI-01": ["AI Integration", "Recheck Summary generation"],
  "AI-02": ["AI Integration", "Recheck Flashcard generation"],
  "AI-03": ["AI Integration", "Recheck Practice Quiz generation"],
  "AI-04": ["AI Integration", "Recheck Concept Explanation generation"],
  "AI-05": ["AI Integration", "Verify generated structured responses are parsed correctly"],
  "AI-06": ["AI Integration", "Verify saved AI outputs remain associated with the correct user/document"],
  "AI-07": ["AI Integration", "Verify saved AI outputs remain associated with the correct user/document"],

  "PRIV-01": ["Consent and Privacy", "Verify AI requests cannot proceed without active consent"],
  "PRIV-02": ["Consent and Privacy", "Verify revoked consent prevents new AI processing"],
  "PRIV-03": ["Consent and Privacy", "Verify only required study-material content is sent for AI processing"],
  "PRIV-04": ["Consent and Privacy", "Recheck responsible-AI labels/disclaimers in returned data"],
  "PRIV-05": ["Consent and Privacy", "Confirm sensitive credentials/API keys are not exposed"],
  "PRIV-06": ["Consent and Privacy", "Confirm sensitive credentials/API keys are not exposed"],
  "PRIV-07": ["Consent and Privacy", "Confirm sensitive credentials/API keys are not exposed"],

  "ERR-01": ["Error Handling and Security", "Recheck Gemini timeout handling"],
  "ERR-02": ["Error Handling and Security", "Recheck quota/rate-limit handling"],
  "ERR-03": ["Error Handling and Security", "Recheck quota/rate-limit handling"],
  "ERR-04": ["Error Handling and Security", "Verify malformed AI responses are handled safely"],
  "ERR-05": ["Error Handling and Security", "Verify empty AI responses are handled safely"],
  "ERR-06": ["Error Handling and Security", "Verify AI errors return consistent API responses"],
  "ERR-07": ["Error Handling and Security", "Verify AI errors return consistent API responses"],
  "ERR-08": ["Error Handling and Security", "Review AI/document-processing endpoints for invalid input handling"],

  "QA-01": ["Quality and Testing", "Confirm Member 3 subsystem readiness"],
  "QA-02": ["Quality and Testing", "Recheck quiz scoring tests"],
  "QA-03": ["Quality and Testing", "Recheck consent and AI guard tests"],
  "QA-04": ["Quality and Testing", "Review AI output accuracy against source documents"]
};

/* Checklist items that cannot be settled by an automated assertion. Listed in
 * the report so the gap is visible rather than implied by absence. */
const MANUAL = [
  ["Consent and Privacy", "Recheck responsible-AI labels/disclaimers in returned data",
   "PRIV-04 proves the API returns the label and disclaimer. That they are visibly displayed on all four screens is the interface half of the FR16 metric and must be confirmed by looking at the running application."],
  ["Quality and Testing", "Review AI output accuracy against source documents",
   "Whether generated content is factually faithful is a judgement, not an assertion, and each check consumes Gemini quota. QA-04 confirms the recorded review exists and is complete; the review itself is in testing/ai-accuracy-review-2026-09-12.md."],
  ["Quality and Testing", "Record final test results",
   "Produced by this runner, but attaching the report and evidence to the submission is a manual step."]
];

const log = (...a) => console.log(...a);
const rule = () => log("-".repeat(72));

const reset = () => {
  for (const dir of [EVIDENCE, REPORTS]) {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }
  // Gitignored, so absent on a fresh clone; the first upload fails without it
  const uploads = path.join(BACKEND, "src", "uploads");
  if (!fs.existsSync(uploads)) fs.mkdirSync(uploads, { recursive: true });
};

const runSuite = (name, patterns, junitFile) => {
  log(`\nRunning ${name} ...`);

  const result = spawnSync(
    process.execPath,
    [
      "--test",
      "--test-concurrency=1",
      "--test-reporter=junit", `--test-reporter-destination=${junitFile}`,
      "--test-reporter=spec", "--test-reporter-destination=stdout",
      ...patterns
    ],
    { cwd: BACKEND, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );

  // Surface only the summary lines; the full spec output is in the report
  const summary = (result.stdout || "").split("\n")
    .filter((l) => /^# (tests|pass|fail|duration_ms)/.test(l));
  summary.forEach((l) => log("  " + l.replace(/^# /, "")));

  if (result.stderr && result.stderr.trim()) {
    log("  stderr:", result.stderr.trim().split("\n").slice(0, 3).join(" | "));
  }

  return { name, status: result.status, junitFile };
};

/* Minimal JUnit parse. Node's reporter emits one <testcase> per test, with a
 * nested <failure> element when it fails. */
const parseJunit = (file) => {
  if (!fs.existsSync(file)) return [];
  const xml = fs.readFileSync(file, "utf8");

  const cases = [];
  const re = /<testcase\s+name="([^"]*)"\s+time="([^"]*)"[^>]*?(\/>|>([\s\S]*?)<\/testcase>)/g;

  let m;
  while ((m = re.exec(xml)) !== null) {
    const body = m[4] || "";
    const failed = /<failure|<error/.test(body);
    let message = "";
    if (failed) {
      const fm = body.match(/<(?:failure|error)[^>]*message="([^"]*)"/);
      message = fm ? fm[1] : "assertion failed";
    }
    cases.push({
      name: m[1].replace(/\\#/g, "#").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
      time: Number(m[2]) || 0,
      failed,
      message: message.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#10;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    });
  }
  return cases;
};

const testIdOf = (name) => {
  const m = name.match(/\b((?:DP|AI|PRIV|ERR|QA)-\d{2})\b/);
  return m ? m[1] : null;
};

const evidenceFor = (testId) => {
  if (!fs.existsSync(EVIDENCE)) return [];
  return fs.readdirSync(EVIDENCE).filter((f) => f.startsWith(testId + "-"));
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const buildHtml = ({ regression, final, startedAt, durationMs }) => {
  const allFinal = final.filter((c) => testIdOf(c.name));
  const totals = {
    regression: { total: regression.length, failed: regression.filter((c) => c.failed).length },
    final: { total: final.length, failed: final.filter((c) => c.failed).length }
  };
  const ok = totals.regression.failed === 0 && totals.final.failed === 0;

  const covered = new Set(allFinal.map((c) => testIdOf(c.name)));
  const missing = Object.keys(TRACEABILITY).filter((id) => !covered.has(id));

  const sections = {};
  for (const c of allFinal) {
    const id = testIdOf(c.name);
    const [section, item] = TRACEABILITY[id] || ["Unmapped", "—"];
    (sections[section] = sections[section] || []).push({ ...c, id, item });
  }

  const row = (c) => `
      <tr class="${c.failed ? "fail" : "pass"}">
        <td class="id">${esc(c.id)}</td>
        <td>${esc(c.name.replace(/^\S+-\d{2}\s*/, ""))}</td>
        <td class="item">${esc(c.item)}</td>
        <td class="status">${c.failed ? "FAIL" : "PASS"}</td>
        <td class="num">${c.time.toFixed(3)}s</td>
        <td class="ev">${evidenceFor(c.id).map((f) => `<a href="../evidence/${encodeURIComponent(f)}">${esc(f)}</a>`).join("<br>") || "—"}</td>
      </tr>${c.failed ? `
      <tr class="detail"><td colspan="6"><strong>Failure:</strong> ${esc(c.message)}</td></tr>` : ""}`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Final Verification Report — Member 3</title>
<style>
 body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:2rem auto;max-width:1100px;padding:0 1rem;color:#1a1a1a;line-height:1.5}
 h1{margin-bottom:.25rem} h2{margin-top:2.5rem;border-bottom:2px solid #eee;padding-bottom:.3rem}
 .sub{color:#666;margin-top:0}
 .banner{padding:1rem 1.25rem;border-radius:8px;font-weight:600;margin:1.5rem 0}
 .ok{background:#e7f6ec;border:1px solid #9ad3ae;color:#14532d}
 .bad{background:#fdeaea;border:1px solid #e79a9a;color:#7f1d1d}
 table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:.9rem}
 th,td{border:1px solid #e3e3e3;padding:.5rem .6rem;text-align:left;vertical-align:top}
 th{background:#f7f7f8}
 .id{font-family:ui-monospace,Menlo,monospace;font-weight:600;white-space:nowrap}
 .status{font-weight:700;white-space:nowrap}
 tr.pass .status{color:#14532d} tr.fail .status{color:#7f1d1d}
 tr.fail{background:#fff6f6} tr.detail td{background:#fff1f1;font-size:.85rem}
 .num{text-align:right;white-space:nowrap} .item{color:#555}
 .ev a{display:inline-block;font-size:.8rem;font-family:ui-monospace,Menlo,monospace}
 .cards{display:flex;gap:1rem;flex-wrap:wrap;margin:1rem 0}
 .card{flex:1;min-width:180px;border:1px solid #e3e3e3;border-radius:8px;padding:.9rem}
 .card .n{font-size:1.8rem;font-weight:700} .card .l{color:#666;font-size:.85rem}
 .note{background:#f7f9fc;border-left:4px solid #9ab;padding:.8rem 1rem;margin:1rem 0;font-size:.92rem}
 code{background:#f2f2f4;padding:.1rem .3rem;border-radius:3px;font-size:.88em}
</style></head><body>

<h1>Final Verification Report</h1>
<p class="sub">Member 3 — Document Processing &amp; AI Integration · COIT20273 AI-Powered Study Notes Generator</p>
<p class="sub">Run started ${esc(startedAt)} · duration ${(durationMs / 1000).toFixed(1)}s · traced to GitHub issue #119</p>

<div class="banner ${ok ? "ok" : "bad"}">
  ${ok ? "ALL TESTS PASSED" : `FAILURES PRESENT — ${totals.regression.failed + totals.final.failed} test(s) failed`}
</div>

<div class="cards">
  <div class="card"><div class="n">${totals.regression.total}</div><div class="l">Regression tests</div></div>
  <div class="card"><div class="n">${totals.final.total}</div><div class="l">Final verification tests</div></div>
  <div class="card"><div class="n">${totals.regression.total + totals.final.total}</div><div class="l">Total executed</div></div>
  <div class="card"><div class="n">${totals.regression.failed + totals.final.failed}</div><div class="l">Failures</div></div>
</div>

<div class="note">
  <strong>No Gemini quota was consumed by this run.</strong> Every behaviour that depends on the model is
  exercised against a stubbed model, while the controller, consent check, database and HTTP server remain real.
  Content quality is assessed separately — see Manual Verification below.
</div>

<h2>Final verification — traced to issue #119</h2>
${Object.entries(sections).map(([section, rows]) => `
<h3>${esc(section)}</h3>
<table>
 <thead><tr><th>Test ID</th><th>Test</th><th>Issue #119 checklist item</th><th>Status</th><th>Time</th><th>Evidence</th></tr></thead>
 <tbody>${rows.map(row).join("")}</tbody>
</table>`).join("")}

${missing.length ? `<div class="banner bad">Traceability gap: no result recorded for ${missing.map(esc).join(", ")}</div>` : ""}

<h2>Regression suite</h2>
<p>The 71 pre-existing tests, unchanged. These are the tests reported in Progress Report 2 and are re-run here to confirm nothing has regressed.</p>
<table>
 <thead><tr><th>Test</th><th>Status</th><th>Time</th></tr></thead>
 <tbody>${regression.map((c) => `
  <tr class="${c.failed ? "fail" : "pass"}">
   <td>${esc(c.name)}</td><td class="status">${c.failed ? "FAIL" : "PASS"}</td><td class="num">${c.time.toFixed(3)}s</td>
  </tr>${c.failed ? `<tr class="detail"><td colspan="3"><strong>Failure:</strong> ${esc(c.message)}</td></tr>` : ""}`).join("")}
 </tbody>
</table>

<h2>Manual verification required</h2>
<p>These checklist items cannot be settled by an automated assertion. They are listed so the boundary of the automated evidence is explicit.</p>
<table>
 <thead><tr><th>Issue #119 section</th><th>Checklist item</th><th>Why it is manual</th></tr></thead>
 <tbody>${MANUAL.map(([s, i, w]) => `<tr><td>${esc(s)}</td><td>${esc(i)}</td><td>${esc(w)}</td></tr>`).join("")}</tbody>
</table>

<h2>Reproducing this run</h2>
<p>From the <code>backend</code> directory, with MySQL running and <code>backend/.env</code> present:</p>
<p><code>npm run test:final</code></p>
<p>Raw results: <a href="regression.junit.xml">regression.junit.xml</a> · <a href="final.junit.xml">final.junit.xml</a> ·
   <a href="summary.json">summary.json</a>. Evidence artefacts are in <code>testing/evidence/</code>.</p>

</body></html>`;
};

/* ------------------------------------------------------------------ main */
const main = () => {
  const started = new Date();
  log("=".repeat(72));
  log("FINAL VERIFICATION RUN — Member 3 subsystem (GitHub issue #119)");
  log("=".repeat(72));

  reset();

  const regressionXml = path.join(REPORTS, "regression.junit.xml");
  const finalXml = path.join(REPORTS, "final.junit.xml");

  const r1 = runSuite("regression suite (71 pre-existing tests)",
    ["tests/unit/**/*.test.js", "tests/integration/**/*.test.js"], regressionXml);

  const r2 = runSuite("final verification suite (issue #119)",
    ["tests/final/**/*.test.js"], finalXml);

  const regression = parseJunit(regressionXml);
  const final = parseJunit(finalXml);
  const durationMs = Date.now() - started.getTime();

  const html = buildHtml({ regression, final, startedAt: started.toISOString(), durationMs });
  const reportPath = path.join(REPORTS, "final-verification-report.html");
  fs.writeFileSync(reportPath, html);

  const summary = {
    started_at: started.toISOString(),
    duration_ms: durationMs,
    issue: "#119",
    gemini_quota_consumed: 0,
    regression: { total: regression.length, failed: regression.filter((c) => c.failed).length },
    final: { total: final.length, failed: final.filter((c) => c.failed).length },
    failures: [...regression, ...final].filter((c) => c.failed).map((c) => ({ name: c.name, message: c.message })),
    evidence_files: fs.existsSync(EVIDENCE) ? fs.readdirSync(EVIDENCE).sort() : []
  };
  fs.writeFileSync(path.join(REPORTS, "summary.json"), JSON.stringify(summary, null, 2));

  rule();
  log(`Regression : ${summary.regression.total - summary.regression.failed}/${summary.regression.total} passed`);
  log(`Final      : ${summary.final.total - summary.final.failed}/${summary.final.total} passed`);
  log(`Evidence   : ${summary.evidence_files.length} artefact(s) in testing/evidence/`);
  log(`Report     : ${path.relative(REPO, reportPath)}`);
  rule();

  const failed = summary.regression.failed + summary.final.failed;
  if (failed > 0 || r1.status !== 0 || r2.status !== 0) {
    log(`RESULT: FAILED — ${failed} test(s) failed. See the report for detail.`);
    process.exit(1);
  }

  log("RESULT: PASSED — all tests green. No Gemini quota consumed.");
  process.exit(0);
};

// Guarded so the parsing and report-building helpers can be exercised on their
// own without triggering a full run.
if (require.main === module) {
  main();
}

module.exports = { parseJunit, buildHtml, testIdOf, TRACEABILITY, MANUAL };
