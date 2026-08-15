# Test Log — Document Processing & AI Integration

**Owner:** Member 3 (Natthapong Rinsakul, 12290114)
**Scope:** upload validation, text extraction, consent recording and enforcement, AI generation
**Period covered:** 10–14 Aug 2026

This log records what has actually been executed against running code. Tests that have not been run are listed as such in section 5 rather than omitted, so the gap between verified and unverified behaviour stays visible.

Testing is currently manual. The project has no automated test framework yet; adding one is recorded as an action in section 6.

---

## 1. Environment

| Item | Value |
|---|---|
| Runtime | Node.js v22.23.2 |
| Database | MySQL, local instance, schema from `database/schema.sql` |
| Backend port | 5099 used for testing to avoid the macOS AirPlay conflict on 5000 |
| Method | `curl` against the running server, results confirmed in MySQL |

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

## 4. AI generation and consent enforcement (FR9, FR17)

| ID | Requirement | Test | Expected | Result | Date |
|---|---|---|---|---|---|
| T-12 | — | Server starts with `/api/ai` routes mounted | Starts, health check 200 | **Pass** | 14 Aug |
| T-13 | NFR2 | `POST /api/ai/generate` with no token | 401 | **Pass** | 14 Aug |
| T-14 | NFR2 | `GET /api/ai/outputs/:fileId` with no token | 401 | **Pass** | 14 Aug |
| T-15 | FR9.1 | `buildPrompt` includes the source text and the grounding instruction | Prompt contains both | **Pass** | 14 Aug |
| T-16 | — | `buildPrompt` with an unsupported output type | Throws `UNSUPPORTED_OUTPUT_TYPE` | **Pass** | 14 Aug |
| T-17 | NFR1 | 100,000-character input | Truncated at 50,000 on a word boundary | **Pass** — no mid-word cut | 14 Aug |
| T-18 | NFR5 | `generate()` with no API key configured | Throws `AI_NOT_CONFIGURED`; server does not crash | **Pass** | 14 Aug |

---

## 5. Not yet verified

Recorded explicitly so that untested behaviour is not mistaken for working behaviour.

| ID | Test | Blocked by |
|---|---|---|
| T-19 | Live Gemini call returns a usable summary | No `GEMINI_API_KEY` yet |
| T-20 | Generation refused with 403 `CONSENT_REQUIRED` when consent is absent | Needs a seeded user, file and consent row |
| T-21 | Generation succeeds after consent is granted | As above |
| T-22 | Generation refused again after consent is revoked (FR17.2) | As above |
| T-23 | `AI_TIMEOUT` returned when Gemini exceeds 60 s | Requires a live key and a slow response |
| T-24 | End-to-end time under 60 s for a 10-page document (NFR1) | Requires a live key |
| T-25 | Extraction accuracy against 3 known source documents (FR8 metric) | Not yet performed |
| T-26 | Scanned/image-only PDF returns 422 `NO_READABLE_TEXT` (FR8.4) | No scanned test document prepared |

**T-20 to T-22 are the highest priority.** The project's own quality metric requires 100% of unconsented generation attempts to be refused, and that figure cannot be claimed until those three tests are executed.

---

## 6. Actions arising

1. Obtain a Gemini API key and execute T-19 to T-24.
2. Prepare a scanned PDF as a fixture and execute T-26.
3. Assemble three source documents with known content for the extraction-accuracy metric (T-25).
4. Introduce an automated test framework so these cases run on every change rather than manually.
5. Create `backend/src/uploads/` on any new machine before testing uploads — the directory is gitignored and does not arrive with a clone, so the first upload otherwise fails with `ENOENT`.
