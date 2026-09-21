# Automated tests — Document Processing & AI Integration

**Owner:** Member 3 (Natthapong Rinsakul) · Issue #21 · Objective O12, NFR8, risk R4

## Running them

```bash
cd backend
npm test                  # regression suite, 71 tests
npm run test:unit         # pure functions only, no server or database
npm run test:integration  # server and database

npm run test:final        # FINAL VERIFICATION: regression + final suite,
                          # writes evidence and an HTML report
```

`npm run test:final` is the command to use when producing assessment evidence.
It runs both suites, writes artefacts to `testing/evidence/`, and generates
`testing/reports/final-verification-report.html`. It exits non-zero if any test
fails.

Requires a running MySQL with the schema from `database/schema.sql`, and a
`backend/.env` (copy `.env.example`). The integration tests start and stop the
server themselves on port **5098**, so nothing needs to be running first.

## Why these tests avoid the Gemini API

The free tier allows **20 generation requests per day** across the whole project
(risk R3). A suite that called the API would exhaust the quota in five runs and
could not be run on every change.

Every test here therefore avoids it, without giving up meaningful coverage:

| Area | How it is tested without Gemini |
|---|---|
| Prompt construction | `buildPrompt` is a pure function |
| Response parsing | The flashcard and quiz parsers are fed recorded responses |
| Error classification | `classifyUpstreamError` is fed recorded API errors, including a real 429 |
| Consent enforcement | Refusals happen **before** the API is called |
| Request validation | Rejected before the API is called |
| Quiz scoring | A quiz is inserted directly into `ai_outputs`, then marked |

What is **not** covered here is the live call itself — whether Gemini returns
usable content. That is verified separately by `testing/verify-ai-generation.js`
and the Postman collection, when quota allows.

## Layout

```
tests/
  run-final.js                          final verification runner and report generator
  helpers/api.js                        server lifecycle, request helper, clean-up
  helpers/evidence.js                   writes evidence artefacts named by Test ID
  helpers/final-harness.js              stubbed model + real controller/database

  # regression suite — 71 tests, run by `npm test`
  unit/ai-service.test.js               21 tests — prompts, parsers, error classifier
  unit/ai-timeout.test.js               5 tests  — the 60-second request timeout
  unit/extraction-accuracy.test.js      6 tests  — extraction against known sources
  integration/upload.test.js            11 tests — FR6, FR8, NFR3
  integration/consent-and-ai-guards.test.js  14 tests — FR17, request validation
  integration/quiz-scoring.test.js      10 tests — FR11.2
  integration/ai-timeout-handling.test.js    4 tests — 504 path and NFR5 retention

  # final verification suite — 33 tests, traced to GitHub issue #119
  final/document-processing.final.test.js    7 tests — DP-01 to DP-07
  final/ai-integration.final.test.js         7 tests — AI-01 to AI-07
  final/privacy-consent.final.test.js        7 tests — PRIV-01 to PRIV-07
  final/error-handling.final.test.js         8 tests — ERR-01 to ERR-08
  final/quality-pipeline.final.test.js       4 tests — QA-01 to QA-04
```

## The final verification suite

Each test in `tests/final/` carries a **Test ID** that traces to a checklist
item in GitHub issue #119, and writes an evidence artefact to
`testing/evidence/` named after that ID. The mapping is held in
`tests/run-final.js` and rendered into the HTML report, and the report flags a
gap if any mapped Test ID produced no result.

| Prefix | Area | Issue #119 section |
|---|---|---|
| `DP-` | Document processing | Document Processing Verification |
| `AI-` | AI integration | AI Integration Verification |
| `PRIV-` | Consent, privacy, credentials | AI Consent and Privacy |
| `ERR-` | Error handling and invalid input | AI Error Handling and Security |
| `QA-` | Pipeline, scoring, evidence completeness | AI Quality and Testing |

These tests drive the **real** controller, consent check, database and HTTP
server; only the model call itself is stubbed, through
`helpers/final-harness.js`. The stub runs the real `buildPrompt` first, so
per-type input validation behaves exactly as it does in production — an
explanation with no concept is rejected by the same code path either way.

Two things the suite deliberately does **not** claim:

- **Content quality.** Whether the model writes accurate study material is a
  judgement, recorded in `testing/ai-accuracy-review-2026-09-12.md`. `QA-04`
  checks that review exists and is complete; it does not re-judge it.
- **The interface half of FR16.** `PRIV-04` proves the API returns the
  AI-generated label and disclaimer. That they are visibly shown on all four
  screens must be confirmed by looking at the running application.

## Design decisions

**Node's built-in test runner, not Jest or Vitest.** It ships with Node 22,
which the project already requires, so there is no new dependency to install or
maintain. This supports NFR8 (maintainability).

**Test files run one at a time** (`--test-concurrency=1`). They share port 5098
and a clean-up scope, so running them in parallel causes port conflicts and one
file deleting another's test data. This was observed during development: the
suite failed 6 of 32 in parallel and passed 32 of 32 serially.

**The server is started as a child process** rather than imported. Importing it
would require splitting `app` out of `src/server.js`, a file Member 1 also
edits. Spawning keeps the tests self-contained and touches no shared code.

**Test accounts use the `autotest-` e-mail prefix.** Clean-up deletes only
accounts with that prefix, so it can never remove real development data.
Uploaded files are deleted from disk first, then the accounts — the rest
(documents, consent records, AI outputs, quiz attempts) follows through
`ON DELETE CASCADE`.

## Relationship to the manual test log

These are converted from cases recorded in
`testing/test-log-document-processing-ai.md`. Each test names the case it came
from, for example `(FR8.3, T-01)`. The manual log remains the wider record,
including the cases that still require a live API call and are listed there as
outstanding.
