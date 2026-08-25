# Test Log — Document Processing & AI Integration

**Owner:** Member 3 (Natthapong Rinsakul, 12290114)
**Scope:** upload validation, text extraction, consent recording and enforcement, AI generation
**Period covered:** 10–20 Aug 2026

This log records what has actually been executed against running code. Tests that have not been run are listed as such in section 5 rather than omitted, so the gap between verified and unverified behaviour stays visible.

Testing is currently manual. The project has no automated test framework yet; adding one is recorded as an action in section 6.

---

## 1. Environment

| Item | Value |
|---|---|
| Runtime | Node.js v22.23.2 |
| AI model | `gemini-3.6-flash` (set via `GEMINI_MODEL`) |
| Database | MySQL, local instance, schema from `database/schema.sql` |
| Backend port | 5099 used for testing to avoid the macOS AirPlay conflict on 5000 |
| Method | `curl` against the running server, and `testing/verify-ai-generation.js` for the AI and consent cases; results confirmed in MySQL |

---

## 2. Upload and text extraction (FR6, FR8)

| ID | Requirement | Test | Expected | Result | Date |
|---|---|---|---|---|---|
| T-01 | FR8.3 | Upload a `.txt` file | 201, text extracted and stored | **Pass** — row created, `extracted_text` populated | 11 Aug |
| T-02 | FR8.2 | Upload a `.docx` file | 201, text extracted via Mammoth | **Pass** — 10,703 characters extracted | 11 Aug |
| T-03 | FR8.1 | Upload a `.pdf` file with a text layer | 201, text extracted via pdf-parse | **Pass** | 11 Aug |
| T-04 | FR6.1 | Upload a `.exe` file | 415 `UNSUPPORTED_FILE_TYPE` | **Pass** — rejected before storage | 11 Aug |
| T-05 | FR6.2 | Upload a file over 15 MB | 413 `FILE_TOO_LARGE` | **Pass** — rejected by Multer limit | 11 Aug |
| T-06 | FR6.1 | Upload `.docx` via curl (`application/octet-stream`) | 201 — accepted | **Pass** — confirms extension-based validation was the correct choice | 11 Aug |
| T-07 | NFR5 | Send a request with no file attached | 400 `NO_FILE`, no crash | **Pass** | 11 Aug |
| T-08 | NFR3 | Request another user's file via `GET /api/uploaded/:id` | 404 | **Pass** — query is scoped by `user_id` | 11 Aug |

**Defect found and fixed during T-06.** Validation originally checked the MIME type, which caused valid `.docx` uploads from curl to be rejected because curl sends `application/octet-stream`. Changed to extension-based validation (commit `f80c2f4`) and documented in `docs/api-spec.md`.

---

## 3. Authentication and security (supporting NFR2)

| ID | Test | Expected | Result | Date |
|---|---|---|---|---|
| T-09 | Access a protected route with no token | 401 | **Pass** | 12 Aug |
| T-10 | Register, log in, call `/api/profile` with the returned token | 200 with correct user | **Pass** | 12 Aug |
| T-11 | Call a protected route with a token signed using the previous hardcoded secret | 401 | **Pass** — old tokens correctly rejected | 12 Aug |

**Critical defect found and fixed.** During code review before merging, the JWT secret was found to be written as the quoted string `"process.env.JWT_SECRET"` rather than the environment variable. Because the same literal was used to both sign and verify, all functional tests passed and nothing failed at runtime — the flaw was only visible by reading the code. Any party reading the public repository could have forged a valid token for any user. Fixed in commit `8ed25b5`, and T-11 was written specifically to prove old tokens no longer validate.

---

## 4. AI generation, quiz attempts and consent enforcement (FR9–FR12, FR17)

| ID | Requirement | Test | Expected | Result | Date |
|---|---|---|---|---|---|
| T-12 | — | Server starts with `/api/ai` routes mounted | Starts, health check 200 | **Pass** | 14 Aug |
| T-13 | NFR2 | `POST /api/ai/generate` with no token | 401 | **Pass** | 14 Aug |
| T-14 | NFR2 | `GET /api/ai/outputs/:fileId` with no token | 401 | **Pass** | 14 Aug |
| T-15 | FR9.1 | `buildPrompt` includes the source text and the grounding instruction | Prompt contains both | **Pass** | 14 Aug |
| T-16 | — | `buildPrompt` with an unsupported output type | Throws `UNSUPPORTED_OUTPUT_TYPE` | **Pass** | 14 Aug |
| T-17 | NFR1 | 100,000-character input | Truncated at 50,000 on a word boundary | **Pass** — no mid-word cut | 14 Aug |
| T-18 | NFR5 | `generate()` with no API key configured | Throws `AI_NOT_CONFIGURED`; server does not crash | **Pass** | 14 Aug |
| T-19 | FR9.1 | Live Gemini call returns a usable summary | Non-empty summary, `is_ai_generated` true, disclaimer present | **Pass** — 514 characters, grounded in the source text with no invented facts | 20 Aug |
| T-20 | FR17.1 | Generation refused when no consent has been recorded | 403 `CONSENT_REQUIRED` | **Pass** | 20 Aug |
| T-21 | FR17.1 | Generation permitted once consent is granted | 201 with generated content | **Pass** | 20 Aug |
| T-22 | FR17.2 | Generation refused again after consent is revoked | 403 `CONSENT_REQUIRED` | **Pass** | 20 Aug |
| T-27 | FR10.1 | Generate flashcards from an uploaded document | 201 with an array of question/answer records | **Pass** — 6 cards, all answerable from the source text | 20 Aug |
| T-28 | FR10.1 | Flashcard content stored as JSON and returned parsed by `GET /api/ai/outputs/:fileId` | Array returned, not a string | **Pass** | 20 Aug |
| T-29 | FR17.2 | Flashcard generation refused after consent is revoked | 403 `CONSENT_REQUIRED` | **Pass** — consent applies to every output type | 20 Aug |
| T-30 | — | Request an output type that is not yet implemented | 400 `UNSUPPORTED_OUTPUT_TYPE` | **Pass** — tested with `quiz` before it was implemented | 20 Aug |
| T-31 | FR11.1 | Generate a practice quiz from an uploaded document | 201 with questions, options and marked answers | **Pass** — 6 questions | 20 Aug |
| T-32 | FR11.1 | Quiz contains both multiple-choice and true/false questions | Both types present | **Pass** — 3 multiple-choice, 3 true/false | 20 Aug |
| T-33 | FR11.1 | Every `correct_answer` appears in that question's own options | 0 mismatches | **Pass** — unscoreable questions are discarded server-side | 20 Aug |
| T-34 | FR11.2 | Submit quiz answers and receive a score | 201 with score, total and per-question results | **Pass** — 3 of 6 scored correctly | 20 Aug |
| T-35 | FR11.2 | Partial submission with unanswered questions | Recorded, unanswered scored 0 | **Pass** — 1 of 6 | 20 Aug |
| T-36 | FR11.2 | Retake a quiz | Each attempt stored separately | **Pass** — 3 attempts retained in history | 20 Aug |
| T-37 | FR11.2 | Submit the wrong number of answers | 400 `ANSWER_COUNT_MISMATCH` | **Pass** | 20 Aug |
| T-38 | FR11.2 | Submit an attempt against a summary output | 400 `NOT_A_QUIZ` | **Pass** | 20 Aug |
| T-39 | NFR3 | Another user submits an attempt to my quiz | 404 | **Pass** — query scoped by `user_id` | 20 Aug |
| T-40 | NFR2 | Quiz attempt endpoints without a token | 401 | **Pass** | 20 Aug |
| T-41 | FR12.1 | Generate a concept explanation at beginner level | 201, prose pitched for a beginner | **Pass** — 1,267 characters, defines terms and uses an analogy | 20 Aug |
| T-42 | FR12.1 | Generate the same concept at advanced level | Noticeably different, more concise treatment | **Pass** — 722 characters, mechanism-focused, no analogy | 20 Aug |
| T-43 | FR12.1 | Omit `level` | Defaults to `beginner` | **Pass** | 20 Aug |
| T-44 | FR12.1 | Request an explanation with no concept | 400 `MISSING_CONCEPT` | **Pass** — blank/whitespace also rejected | 20 Aug |
| T-45 | FR12.1 | Request an invalid level (`expert`) | 400 `INVALID_LEVEL` | **Pass** | 20 Aug |
| T-46 | FR12.1, R1 | Request a concept absent from the document | States the concept is not present rather than inventing an explanation | **Pass** — key mitigation for risk R1 | 20 Aug |
| T-47 | FR17.2 | Explanation refused after consent is revoked | 403 `CONSENT_REQUIRED` | **Pass** | 20 Aug |
| T-48 | FR6 | Upload response returns `file_id` | `file.file_id` present and usable directly in `POST /api/ai/generate` | **Pass** — removes a lookup step for the frontend | 25 Aug |

---

## 5. Not yet verified

Recorded explicitly so that untested behaviour is not mistaken for working behaviour.

| ID | Test | Blocked by |
|---|---|---|
| T-23 | `AI_TIMEOUT` returned when Gemini exceeds 60 s | Hard to trigger deliberately; needs an induced slow response |
| T-24 | End-to-end time under 60 s for a 10-page document (NFR1) | Needs three 10-page fixtures; a short document measured 27.3 s on 20 Aug |
| T-25 | Extraction accuracy against 3 known source documents (FR8 metric) | Not yet performed |
| T-26 | Scanned/image-only PDF returns 422 `NO_READABLE_TEXT` (FR8.4) | No scanned test document prepared |

**Consent enforcement metric now met.** T-20, T-21 and T-22 were executed on 20 August via `testing/verify-ai-generation.js`. Both refusal paths — never consented, and consent revoked — returned 403 `CONSENT_REQUIRED`, and generation succeeded only while consent was granted. The quality metric requiring 100% of unconsented generation attempts to be refused is therefore satisfied for the summary output type, and will need re-running as each further output type is added.

---

## 6. Actions arising

1. ~~Obtain a Gemini API key and execute T-19 to T-22.~~ Completed 20 August. T-23 and T-24 remain.
2. Prepare a scanned PDF as a fixture and execute T-26.
3. Assemble three source documents with known content for the extraction-accuracy metric (T-25).
4. Introduce an automated test framework so these cases run on every change rather than manually.
5. Create `backend/src/uploads/` on any new machine before testing uploads — the directory is gitignored and does not arrive with a clone, so the first upload otherwise fails with `ENOENT`.
