# Automated tests — Document Processing & AI Integration

**Owner:** Member 3 (Natthapong Rinsakul) · Issue #21 · Objective O12, NFR8, risk R4

## Running them

```bash
cd backend
npm test                  # everything, 53 tests
npm run test:unit         # pure functions only, no server or database
npm run test:integration  # server and database
```

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
  helpers/api.js                        server lifecycle, request helper, clean-up
  unit/ai-service.test.js               21 tests — prompts, parsers, error classifier
  integration/upload.test.js            9 tests  — FR6, FR8, NFR3
  integration/consent-and-ai-guards.test.js  12 tests — FR17, request validation
  integration/quiz-scoring.test.js      11 tests — FR11.2
```

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
