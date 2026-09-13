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
| T-26 | FR8.4, SR-DP4 | Upload a scanned, image-only PDF | 422 `NO_READABLE_TEXT`, with advice to upload a text-based document | **Pass** — rejected after a defect in the guard was fixed, see below | 10 Sep |
| T-25 | FR8 | Extracted text compared against three source documents of known content, one per format | Extraction succeeds with no missing sections | **Pass** — character-exact recovery for all three; no omissions | 13 Sep |

**Defect found and fixed during T-06.** Validation originally checked the MIME type, which caused valid `.docx` uploads from curl to be rejected because curl sends `application/octet-stream`. Changed to extension-based validation (commit `f80c2f4`) and documented in `docs/api-spec.md`.


**Defect found and fixed during T-26, 10 September 2026.** The scanned-PDF case was executed for the first time using a new fixture, `testing/fixtures/scanned-no-text.pdf` — three pages of study notes rasterised to bilevel images with no text layer at all. The upload was **accepted with 201** instead of being rejected.

The cause was not the guard itself but what reached it. `pdf-parse` appends a page boundary marker to the text of every page by default, of the form `-- 1 of 3 --`. For the scanned document those markers were the *entire* extracted result:

```
"\n\n-- 1 of 3 --\n\n\n\n-- 2 of 3 --\n\n\n\n-- 3 of 3 --\n\n"
```

44 characters of text, none of it from the document. The FR8.4 check in `upload.controller.js` tests `extracted_text.trim().length === 0`, which could therefore never be true for any PDF, however empty. Had this reached the demonstration, a student uploading a photographed or scanned handout would have received a successful upload followed by a summary generated from nothing.

The same markers were also being stored in `extracted_text` and sent to Gemini as part of the study material for every text-based PDF.

Fixed by passing an empty `pageJoiner` to `getText()` in `pdf.service.js`, which is the library's supported way to disable the markers; pages remain separated by a blank line. The scanned fixture now extracts 0 characters and is rejected with 422 `NO_READABLE_TEXT`, and extracted text from a real PDF is unchanged apart from the markers being gone.

Two regression tests were added to `backend/tests/integration/upload.test.js`: one uploading the scanned fixture and asserting the 422, and one asserting that no page marker survives into stored text. The suite now stands at 55 tests, all passing.

This is the clearest argument so far for the automated framework introduced under issue #21: the manual `.pdf` case T-03 passed on 11 August and would have gone on passing, because a PDF with a text layer never exposes the fault.

**Extraction accuracy verified, 13 September 2026 (T-25).** The metric for FR8 requires extraction to succeed across three source documents with no sections missing. Three fixtures were compared against the plain-text sources they were generated from, one per supported format.

| Fixture | Format | Source characters | Lines recovered | Headings recovered |
|---|---|---|---|---|
| `known-doc1-software-testing.txt` | TXT | 27,912 | 123/123 | 18/18 |
| `known-doc2-database-design.docx` | DOCX | 24,949 | 114/114 | 15/15 |
| `known-doc3-computer-networks.pdf` | PDF | 23,754 | 101/101 | 13/13 |

**No omissions were found in any of the three.** The result is stronger than the metric asks for: ignoring whitespace, the extracted text is *character-identical* to its source in every case — TXT byte-for-byte, DOCX 20,861 characters against 20,861, PDF 19,949 against 19,949. Nothing was dropped, reordered or altered, down to the individual character.

**The character-count differences were investigated rather than accepted.** Each fixture reports a raw length differing slightly from its source, and the metric would have been satisfied without explaining why. Both differences are line-break formatting and neither involves content:

- **DOCX, +226 characters.** `textutil` renders each source line as a paragraph and Mammoth separates paragraphs with an additional newline, so the extracted text carries exactly 452 newlines against the source's 226 — one extra per paragraph. Non-whitespace characters are identical.
- **PDF, −91 characters.** The source is stored as one long line per paragraph, while the PDF is laid out in wrapped lines, so runs of spaces become single line breaks. Non-whitespace characters are identical.

This is why the comparison is made on whitespace-stripped text. A PDF is laid out in wrapped lines and a DOCX in paragraphs, so line breaks legitimately differ from a plain-text source; the characters themselves must not.

**Manual comparison.** Alongside the automated check, each document was compared by eye at three points — the opening, the midpoint and the closing lines. All three matched their sources exactly in all three documents, confirming the automated result was not an artefact of the comparison method.

**Now an automated test rather than a one-off result.** `backend/tests/unit/extraction-accuracy.test.js` performs this comparison on every run: for each format it asserts character-exact recovery and the presence of every section heading. Six assertions, executing in well under a second, requiring no server, no database and no Gemini quota. The suite now stands at 61 tests, all passing.

The test was confirmed non-vacuous by deleting a single sentence from the extracted text and checking that it failed, reporting the position and surrounding context of the divergence.

The reason for automating a case the issue only asked to be performed manually is the `pageJoiner` defect found six days earlier under T-26. That fault sat in the extraction path from the first PDF upload in August and survived a manual test that passed, because a PDF with a text layer never exposes it. A manual comparison confirms extraction is correct on the day it is run and says nothing about the day after.
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
| T-24 | NFR1 | End-to-end summary generation timed across three ~10-page documents | Average under 60 s, no single run over 90 s | **Pass** — six measurements over two rounds, mean 28.7 s, slowest 43.0 s | 10 & 12 Sep |
| T-30 | FR9–FR12, R1 | AI output accuracy reviewed against documents with known content | At least 4 of 5 outputs accurate, no invented facts | **Pass** — 5 of 5 accurate, no invented facts in any output | 12 Sep |
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
| T-49 | NFR3 | `GET /api/uploaded` (Member 1's endpoint) returns only the authenticated user's documents | Other user sees an empty list | **Pass** — verified while documenting the endpoint; not my code | 25 Aug |
| T-50 | FR11.2 | Quiz attempt request sizes its answer array to the generated quiz | Attempt accepted without manual editing | **Pass** — after fixing a defect in the Postman collection (see below) | 2 Sep |
| T-51 | FR11.2 | Partial attempt via the collection's `quizAnswersPartial` variable | Recorded, unanswered questions score zero | **Pass** — 1 of 6 | 2 Sep |
| T-52 | NFR5, R3 | Gemini daily quota exhausted during generation | 429 `AI_QUOTA_EXCEEDED` with a retry hint, not a generic 500 | **Pass** — verified against a real quota error; `retry_after_seconds: 33` | 3 Sep |
| T-53 | NFR5 | Error classifier applied to upstream failures | 429 daily, 429 rate-limit, 503, own errors and unknown errors each classified correctly | **Pass** — 5 cases | 3 Sep |
| T-54 | All above | Full Postman collection run, 26 requests across 6 folders | All assertions pass | **Pass** — 35 of 35 assertions, 0 failures | 7 Sep |

**Independent verification by Member 1, 2 September 2026.** Christian Jeff imported the shared Postman collection and independently confirmed authentication, upload and extraction, the uploaded-files list, consent, all four AI content types, quiz scoring and history, and all eight error cases. This is the first verification of these endpoints by someone other than their author.

**Defect found by Member 1 in the Postman collection.** The quiz-attempt request carried a fixed three-entry answers array, while generated quizzes contain five to ten questions, so the request failed with `400 ANSWER_COUNT_MISMATCH`. The API behaved correctly — the fault was in the collection, not the endpoint. Fixed on 2 September: the quiz generation step now builds an answer array sized to that quiz and stores it in the `quizAnswers` variable, so the attempt request works without editing. A `quizAnswersPartial` variable was added to demonstrate partial scoring, and the deliberate mismatch case in folder 5 remains fixed-length by design.

**Transient failure observed by Member 1.** One explanation request returned `500 AI_GENERATION_FAILED` and succeeded immediately on retry. This is the documented behaviour for a retryable failure (NFR5) and the uploaded file was retained, so no work was lost. The underlying cause was not captured because the server log was on Member 1's machine. Recorded as an observation; if it recurs, mapping transient upstream errors to a more specific code than the generic catch-all would improve diagnostics.

**Project risk R3 materialised on 3 September 2026.** During a full Postman collection run, all four AI generation requests failed. Investigation showed the cause was HTTP 429 from Gemini: the free tier permits 20 generation requests per day per model, and the day's allowance had been consumed by earlier testing. The quiz-attempt failures in the same run were a downstream consequence, as the quiz output ID was never set.

The application code was not at fault, but the error handling was inadequate: a rate limit surfaced as a generic `500 AI_GENERATION_FAILED`, giving no indication that waiting would resolve it. This also explains the single transient failure reported by Member 1 on 2 September, which succeeded on retry.

Fixed the same day. Upstream errors are now classified: 429 returns `AI_QUOTA_EXCEEDED` with `retry_after_seconds` and a message distinguishing a short rate-limit pause from the daily quota being exhausted; Gemini 5xx returns `AI_UNAVAILABLE`. Both are marked retryable and neither discards the uploaded document (NFR5).

**Practical constraint recorded for planning:** a full collection run consumes 4 requests, so approximately 5 runs per day are available on the free tier. Validation failures do not consume quota. This should be considered when scheduling the final demonstration.

**First fully clean end-to-end run, 7 September 2026.** The complete Postman collection executed with all 35 assertions passing: authentication, upload and extraction, the uploaded-files list, consent grant/revoke/restore, all four AI content types, quiz scoring and history, and all eight error cases. This is the first run in which every endpoint and every documented error code was verified in a single pass.

Two collection defects were found and fixed to reach this point, neither of them faults in the API:

1. **Run-order dependency.** Three folder 5 cases — `MISSING_CONCEPT`, `INVALID_LEVEL` and `FILE_NOT_FOUND` — are evaluated after the consent guard in the controller, so they require consent to be granted. The `CONSENT_REQUIRED` case ran before them and restored consent through an asynchronous call, which is not guaranteed to complete before the next request begins. `CONSENT_REQUIRED` was moved to the end of the folder so nothing following it depends on consent state.

2. **File access from the Collection Runner.** Selecting the upload fixture directly from the repository appeared to work — the filename was shown in the request — but the Runner could not read it and returned `400 NO_FILE`, which cascaded into every request depending on `fileId`. Enabling *Read files outside working directory* was not sufficient. Copying the fixture into the Postman working directory resolved it. The collection now documents this, and the upload request reports the cause explicitly rather than a bare status mismatch.


**NFR1 measured, 10 and 12 September 2026 (T-24).** Three fixtures of approximately ten pages were prepared, one per supported format, each generated from a plain-text source held in `testing/fixtures/source/`: `known-doc1-software-testing.txt` (9 pages, 27,912 characters), `known-doc2-database-design.docx` (8 pages, 25,175 characters) and `known-doc3-computer-networks.pdf` (8 pages, 23,663 characters). Summary generation was timed end to end — upload, extraction, storage, generation and response — by `testing/run-verification-suite.js`.

| Document | Format | Round 1, 10 Sep | Round 2, 12 Sep |
|---|---|---|---|
| doc1 software testing | TXT | 25.7 s | 20.2 s |
| doc2 database design | DOCX | 30.5 s | 27.5 s |
| doc3 computer networks | PDF | 25.1 s | 43.0 s |
| **Average** | | **27.1 s** | **30.2 s** |

Across all six measurements the mean is 28.7 s, the median 26.6 s, the range 20.2 s to 43.0 s and the standard deviation 7.8 s. **NFR1 is met**: both rounds average well under the 60 s metric, and no single run approached the 90 s ceiling.

Two observations worth carrying into the report.

**Extraction is not the cost; the model is.** Upload and extraction completed in 0.0–0.1 s for every document, including the 27,912-character TXT. End-to-end time is therefore Gemini's response time almost in its entirety, and document size within this range is a weak predictor of it — the largest document was the fastest in round 2, and the same PDF took 25.1 s in one round and 43.0 s in the other. The variation is upstream load, not anything the application controls.

**The 90 s ceiling cannot actually be reached.** `ai.service.js` abandons a request at `REQUEST_TIMEOUT_MS` = 60 s and returns `AI_TIMEOUT` (NFR5). Any generation that would have breached the 90 s ceiling is therefore aborted at 60 s and surfaces as a failure rather than as a slow success. The ceiling is structurally satisfied, but the metric that matters in practice is the 60 s timeout, and the slowest observed run of 43.0 s sits only about 1.4 times below it. Given a standard deviation of 7.8 s, an occasional `AI_TIMEOUT` under upstream load is plausible and should be expected rather than treated as a defect. This is the same boundary T-23 is written against and strengthens the case for executing it.

Two rounds were run on separate dates deliberately. Round 1 preceded the `pageJoiner` fix of 10 September, so its PDF figure was measured against extraction that still carried page markers; round 2 confirms the result on the current code. Raw timings for each round are retained in `testing/verification-results-2026-09-10.json` and `testing/verification-results-2026-09-12.json`.

**AI output accuracy reviewed, 12 September 2026 (T-30, risk R1).** The quality metric for R1 requires at least 4 of 5 generated outputs to be verified accurate against source material with no invented facts. Five outputs were generated from the three known-content fixtures — a summary from each, plus flashcards from the DOCX and a practice quiz from the PDF — and each was read against its source in full. The outputs, the automated signals and the written verdict for each are retained in `testing/ai-accuracy-review-2026-09-12.md`.

| Output | Format | Length | Verdict |
|---|---|---|---|
| doc1 summary | TXT | 1,056 words | Accurate |
| doc2 summary | DOCX | 935 words | Accurate |
| doc3 summary | PDF | 1,064 words | Accurate |
| doc2 flashcards | DOCX | 11 cards | Accurate |
| doc3 quiz | PDF | 7 questions | Accurate |

**5 of 5 accurate, against a metric of 4 of 5.** No output asserted a fact absent from its source. Verification concentrated on the details most likely to be got wrong rather than on general impressions: in doc3, the 48-bit MAC address, 32-bit IPv4 and 128-bit IPv6, the eight-byte UDP header, and the host-address formula; in doc2, the SQL logical evaluation order, aggregate functions ignoring nulls except `COUNT(*)`, and the BCNF determinant rule; in doc1, all seven testing principles and the direction of the coverage implication. All correct. Every quiz answer was verifiable from the source and every `correct_answer` repeated one of its own options word for word, so all seven questions were scoreable.

**The one deviation found, recorded because it qualifies the result.** The doc3 summary introduced standard terminology that appears nowhere in its source — CSMA/CA, WPA2, WPA3, WEP and CDN — as labels for mechanisms the source describes only in longhand. Every label is correctly applied, so no statement is false, and a student would be helped rather than misled. But the prompt instructs the model to use only information present in the material, and this vocabulary comes from the model's own knowledge. The useful conclusion for the report is narrow and worth stating plainly: the grounding instruction constrained *claims* reliably across all five outputs, and constrained *vocabulary* less reliably. R1 is therefore mitigated rather than eliminated, which is also why the AI-generated disclaimer (FR16.1) remains necessary.

**On the automated signals.** The suite reports a vocabulary-overlap percentage and a key-concept count beside each output. These proved useful only for directing attention, not for judging quality. Overlap sits between 55.7% and 80.7% across the five outputs, and the terms counted as absent from the source are overwhelmingly ordinary paraphrase — *determine*, *providing*, *whereas* — which is exactly what a good summary in the model's own words should produce. Concept coverage is length-sensitive: the quiz scored 2 of 10 because seven questions address seven points of a whole document, which is correct behaviour rather than a defect. Both figures are retained as evidence of what was checked, but the verdict in every case rests on reading the output against the source.

A defect in the signal itself was found and fixed before the review: flashcards and quizzes were being stringified as raw JSON, so keys and values ran together into tokens such as `typemultiple` and `choicequestion`, none of which occur in any source. The first quiz measured 51.6% overlap for this reason alone; comparing only the human-readable string values raised it to 80.7%. The earlier figure was an artefact of the measurement, not of the output.
---

## 5. Not yet verified

Recorded explicitly so that untested behaviour is not mistaken for working behaviour.

| ID | Test | Blocked by |
|---|---|---|
| T-23 | `AI_TIMEOUT` returned when Gemini exceeds 60 s | Hard to trigger deliberately; needs an induced slow response. T-24 showed the slowest real run at 43.0 s, so the boundary is closer than assumed |

**Consent enforcement metric now met.** T-20, T-21 and T-22 were executed on 20 August via `testing/verify-ai-generation.js`. Both refusal paths — never consented, and consent revoked — returned 403 `CONSENT_REQUIRED`, and generation succeeded only while consent was granted. The quality metric requiring 100% of unconsented generation attempts to be refused is therefore satisfied for the summary output type, and will need re-running as each further output type is added.

---

## 6. Actions arising

1. ~~Obtain a Gemini API key and execute T-19 to T-22.~~ Completed 20 August. ~~T-24 measured against NFR1.~~ ~~T-30 accuracy reviewed against R1.~~ Completed 12 September. T-23 remains.
2. ~~Prepare a scanned PDF as a fixture and execute T-26.~~ Completed 10 September; a defect was found and fixed, see section 2.
3. ~~Assemble three source documents with known content for the extraction-accuracy metric (T-25).~~ Completed 13 September; character-exact recovery across all three formats, now covered by an automated test.
4. ~~Introduce an automated test framework so these cases run on every change rather than manually.~~ Completed 10 September (issue #21); extended to 61 tests as each remaining case was executed.
5. Create `backend/src/uploads/` on any new machine before testing uploads — the directory is gitignored and does not arrive with a clone, so the first upload otherwise fails with `ENOENT`.
