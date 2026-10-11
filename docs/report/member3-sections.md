# Assessment 3 — Member 3 sections (draft)

**Author:** Natthapong Rinsakul (Member 3) — Document Processing & AI Integration
**Date:** 6 October 2026
**Status:** Draft for team review. Not yet in the Word document.

> **For CJ and Nitish:** this covers only my subsystem — document upload and text
> extraction, the four AI features, consent enforcement, AI error handling, and
> the testing evidence. It does not cover registration, email verification, 2FA,
> profile settings, theming, the Study Planner, Progress, Saved Materials or the
> password reset flow. Those are yours.
>
> Figure numbers are placeholders (M3-1, M3-2 …). They will be renumbered when
> the three sets of sections are merged.

---

## Item 1 — Features implemented (my subsystem)

### 1.1 Document upload and text extraction

The system accepts study material in three formats: PDF, Word (`.docx`) and
plain text (`.txt`). When a file is uploaded, the server validates it, extracts
the readable text, and stores that text in the database alongside the file
record. Only the extracted text is used for AI processing; the original file is
never sent anywhere.

Validation happens in two stages before any processing begins. The file
extension is checked against an allow-list, and the file size is capped at 15 MB.
Documents that pass validation but contain no readable text — scanned or
image-only PDFs — are rejected rather than accepted and processed into an empty
result. The upload screen names the rejected file and explains why it cannot be
used: that no readable text could be extracted, and that scanned or image-only
documents are not supported.

> **Insert Figure M3-1:** `testing/final-test-v1/16. 3 types of file upload.png`
> *Annotate:* the library listing all three supported formats — a `.docx`, a
> `.pdf` and a `.txt` — each with its upload timestamp. This is the primary
> evidence that all three formats are accepted.
>
> **Insert Figure M3-1a:** `testing/final-test-v1/14. PDF upload.png`
> **Insert Figure M3-1b:** `testing/final-test-v1/15. docx upload.png`
> *Annotate:* the confirmation message for each, which reports the number of
> characters extracted — 5,977 for the two-page PDF and 25,175 for the Word
> document. This shows extraction actually ran, not merely that the file was
> accepted. Both also show the stated limit, "Supported formats: PDF, DOCX and
> TXT. Maximum file size: 15 MB", and the "About AI Processing" and "Document
> Privacy" notices.

> **Insert Figure M3-1c:** `testing/final-test-v1/17. Deny scanned-no-text.png`
> *Annotate:* a scanned, image-only PDF (102.2 KB) is refused. The screen names
> the file and states why it cannot be used — no readable text could be
> extracted, and scanned or image-only documents are not supported. This is the
> FR8.4 rejection path described in section 4.1.

### 1.2 AI consent

No study material is sent to the AI service until the student has given explicit
consent. Consent is requested on first use, can be withdrawn at any time, and is
re-checked by the server on every generation request rather than once at sign-up.
Every decision is recorded with a timestamp, so the consent history is auditable.

> **Insert Figure M3-2:** `testing/final-test-v1/5. AI Consent pop-up.png`
> *Annotate:* the first-use consent dialogue; the statement that uploading does
> not by itself send a document to the AI service; and that declining still
> leaves the non-AI features available.

This addresses the tutor's feedback of 23 September, which asked for the consent
choice to be presented to a first-time user rather than being buried in settings.

### 1.3 The four AI study features

All four generate from the student's own uploaded document.

| Feature | What it produces |
|---|---|
| **Summary** | Prose summary of the key concepts in the document |
| **Flashcards** | Question-and-answer cards for active recall, navigated one at a time |
| **Practice Quiz** | Multiple-choice and true/false questions, marked on the server |
| **Concept Explanation** | A plain-language explanation of a chosen concept at beginner, intermediate or advanced level |

> **Insert Figure M3-3:** `testing/final-test-v1/8. Feature 1 Summary .png`
> **Insert Figure M3-4:** `testing/final-test-v1/9. Feature 2 Flashcard.png`
> **Insert Figure M3-5:** `testing/final-test-v1/10. Feature 3 Quiz .png`
> **Insert Figure M3-6a:** `testing/final-test-v1/12. Feature 4 Concept Explanation.png`
> **Insert Figure M3-6b:** `testing/final-test-v1/13. Feature 4 Concept Explantion 2.png`
>
> *Annotate on each:* the purple **"AI Generated"** badge beside the heading; the
> yellow **"AI-Generated Content"** disclaimer panel; and the **"Source:
> sample-study-material.txt"** line showing which document the content came from.
> On the Flashcards figure also note the card counter (*Card 2 of 10*).
>
> The Explanation needs **two** figures, because no single screenshot shows both
> elements. **M3-6a** shows the heading with the **"AI Generated"** and
> **"Beginner"** badges — the second badge demonstrates that the selected level
> was applied, not merely accepted — together with the **"AI Consent On"**
> indicator. **M3-6b** shows the explanation itself and the disclaimer panel.

### 1.4 Responsible AI labelling

Every piece of generated content carries a visible "AI Generated" label and a
disclaimer stating that it may contain errors and should be checked against the
original study material. This matters for a study tool in particular, because a
student revising for an exam is vulnerable to trusting content that is
confidently worded and wrong.

### 1.5 Quiz marking

Quiz answers are marked on the server, not in the browser. The correct answers
are not sent to the page before submission, so the result cannot be altered by
the user. Each attempt is stored separately, so retakes build a history rather
than overwriting the previous score.

> **Insert Figure M3-7:** `testing/final-test-v1/11. Feature 3 Submit Quiz.png`
> *Annotate:* the per-question feedback showing the correct answer, and the Quiz
> Result panel (3 / 7, 43%) with "Your result has been recorded for this quiz
> attempt."

---

## Item 2 — Implementation details

Five parts of the implementation are worth showing, because each reflects a
design decision rather than routine code.

### 2.1 File type validation by extension, not MIME type

**File:** `backend/src/middleware/upload.middleware.js`, line 23

```js
const allowedExtensions = [".pdf", ".docx", ".txt"];
```

> **Insert Figure M3-8:** screenshot of `upload.middleware.js`, lines 20–40
> (the allow-list, the `fileFilter`, and the 15 MB limit).

Validation originally checked the MIME type the browser reports. Testing with
curl showed that valid `.docx` files were rejected, because curl labels them
`application/octet-stream`. The deeper problem was that a security decision was
being based on a value supplied by the client, which can be set to anything.
Checking the extension against an allow-list is simpler and trusts nothing the
client sends.

### 2.2 Consent is enforced before the document is read

**File:** `backend/src/controllers/ai.controller.js`, lines 34–50

> **Insert Figure M3-9:** screenshot of `ai.controller.js`, lines 34–56 — the
> consent check and the user-scoped `SELECT` immediately after it.

The consent check runs *before* the document is loaded from the database. If the
student has not consented, their document is never read into memory, let alone
transmitted. The check runs on every request, because consent can be withdrawn at
any time. The query that follows is scoped by `user_id` as well as `file_id`, so
one student cannot generate content from another student's document.

### 2.3 Prompt construction and grounding

**File:** `backend/src/services/ai.service.js`, line 43

```
- Use only information present in the material. Do not add facts from outside it.
```

> **Insert Figure M3-10:** screenshot of `ai.service.js`, lines 38–52 (the summary
> prompt template, showing the grounding rules and where the study material is
> inserted).

The prompt contains our instructions and the extracted document text — and
nothing else about the student. No email address, no account identifier, no
authentication token. Every prompt carries the same instruction not to add facts
from outside the material, and to say so plainly if the material is too short or
unclear rather than inventing content. Input is capped at 50,000 characters and
truncated on a word boundary.

### 2.4 Validating the model's structured output

**File:** `backend/src/services/ai.service.js`, line 196

```js
q.options.includes(q.correct_answer)
```

> **Insert Figure M3-11:** screenshot of `ai.service.js`, lines 185–200 (the quiz
> parser's filter).

Flashcards and quizzes are requested as structured data rather than prose, and
the response is validated rather than trusted. A quiz question whose marked
correct answer is not one of its own options cannot be scored, so it is discarded
rather than displayed to the student. Incomplete flashcards are discarded the
same way.

### 2.5 The request timeout

**File:** `backend/src/services/ai.service.js`, line 308

> **Insert Figure M3-12:** screenshot of `ai.service.js`, lines 300–325
> (`raceAgainstTimeout`).

Each request to the AI service is raced against a 60-second timer. If the timer
wins, the request is abandoned and reported as a timeout, so the student is never
left waiting indefinitely. The uploaded document is retained, and a retry is
offered.

---

## Item 3 — Test results

### 3.1 Automated test suite

The subsystem is covered by **104 automated tests, all passing**: 71 regression
tests and 33 final verification tests. Each of the 33 carries a Test ID that
traces to a specific requirement, and writes an evidence file recording the
request and response that produced the result.

**No test calls the Gemini API.** The free tier allows 20 generation requests per
day across the whole team, so a suite that used them could not be run on every
change. Instead only the model call is replaced; the controller, the consent
check, the database and the HTTP server are all real. The suite runs in about
fifteen seconds and consumes no quota, which means it can be run immediately
before a demonstration.

| Area | Test IDs | Tests |
|---|---|---|
| Document processing | DP-01 – DP-07 | 7 |
| AI integration | AI-01 – AI-07 | 7 |
| Consent, privacy, credentials | PRIV-01 – PRIV-07 | 7 |
| Error handling and invalid input | ERR-01 – ERR-08 | 8 |
| Pipeline, scoring, evidence | QA-01 – QA-04 | 4 |
| Regression suite | — | 71 |
| **Total** | | **104** |

> **Insert Figure M3-13:** screenshot of `testing/reports/final-verification-report.html`
> opened in a browser — the summary cards (104 tests, 0 failures) and one traced
> section showing Test IDs against requirements.
> **Insert Figure M3-14:** terminal screenshot of `npm run test:final` showing
> `Regression : 71/71 passed`, `Final : 33/33 passed`, `RESULT: PASSED`.
>
> *Annotate M3-13:* each Test ID maps to a requirement and links to the evidence
> file that test produced.

**To reproduce:** `cd backend && npm run test:final` (requires MySQL and
`backend/.env`).

### 3.2 Manual verification

Automated tests cannot confirm what appears on screen, so the full journey was
tested by hand on 5 October against the real Gemini API: registration, email
verification, two-step sign-in, consent, upload, and all four AI features in both
light and dark themes. All passed. The screenshots are in
`testing/final-test-v1/`.

### 3.3 Manual test log

`testing/test-log-document-processing-ai.md` records **56 test cases** covering
upload and extraction, authentication, AI generation, quiz marking, consent
enforcement and every documented error code. Its "not yet verified" section is
empty — every documented behaviour has been executed at least once.

### 3.4 Quality standards met

| Metric | Target | Result |
|---|---|---|
| Extraction accuracy | No sections missing across 3 documents | Met — ignoring whitespace, extracted text is character-identical to source for PDF, DOCX and TXT |
| Generation performance | Average under 60 s, no run over 90 s | Met — six measurements, mean 28.7 s, slowest 43.0 s |
| AI output accuracy | At least 4 of 5 outputs accurate, no invented facts | Met — 5 of 5 accurate |
| Consent enforcement | 100% of unconsented attempts refused | Met, across all four content types |
| AI-output labelling | Label and disclaimer on all four types in the interface | Met — verified by inspection, 5 October |

---

## Item 4 — Errors and problems encountered

Three defects were found in my subsystem during testing. All were fixed, and each
has a regression test so it cannot return unnoticed.

### 4.1 A rejection check that could never succeed

The requirement to reject scanned documents had been implemented since August and
looked correct. When a scanned, image-only PDF was finally built as a test
fixture, **the upload was accepted.**

The check itself was correct; the problem was what reached it. The PDF library
adds a page marker to the text of every page — "page 1 of 3" and so on — so for a
document containing no text at all, the extracted text was 44 characters of page
markers. The check asked whether the extracted text was empty, and it could never
be empty for any PDF.

Two consequences: a student uploading a photographed handout would have received
a successful upload and then content generated from nothing, and those markers
were also being sent to the AI service as part of the study material on every PDF.

**Fixed** in `backend/src/services/pdf.service.js`, line 24, by disabling the
markers using the library's supported option. Two regression tests were added.

This is the clearest justification for the automated suite: the manual test for
PDF upload had passed in Week 5 and would have kept passing indefinitely, because
a PDF *with* a text layer never exposes the fault.

### 4.2 A timer that was never cleared

Every successful generation left a timer pending for the remainder of the
60-second window. Harmless on a long-running server, but it would prevent any
short-lived process from exiting. It was found only while refactoring that
function in order to test it, and is now cleared when the request completes.

### 4.3 Inconsistent error messages

The same error code returned two different messages depending on which endpoint
was reached — one explaining what to do, one merely stating the problem. The
messages were aligned so the advice is the same either way.

### 4.4 A timeout observed in live use

During manual testing on 5 October, one Concept Explanation request exceeded the
60-second limit. The system returned the correct message, **retained the uploaded
document**, and the retry succeeded without re-uploading.

This is not a defect — it is the error handling working as designed, and the
first time that path has been exercised against the real service rather than a
test. Generation time is almost entirely the AI service's response time; our own
upload and extraction take about 0.1 seconds.

> **Insert Figure M3-15:** `testing/manual-verification/ERR-01-live-timeout.png`
> *Annotate:* the error message, the Retry button, and that the form above is
> unchanged — the document and the entered concept were both retained.

---

## Project tracking evidence (marking criterion 2.1 — my contribution)

Work on my subsystem was tracked as GitHub issues, each stating the requirement it
addressed and the conditions for completion, and closed against the evidence
produced.

- **Issue #119** — *Final Document Processing / AI Tasks*, a 33-item checklist
  covering document processing, AI integration, consent and privacy, error
  handling, and quality. **Closed 21 September**, with every item evidenced.
- **44 commits** authored on this subsystem, merged through pull requests from a
  feature branch rather than committed directly to `main`.
- **Issue #120** — *Shared Final System Verification*, still open, covering the
  cross-member end-to-end workflow.

> **Insert Figure M3-16:** screenshot of closed issue #119 showing the completed
> checklist.
> **Insert Figure M3-17:** screenshot of the GitHub project board.
>
> *Note for whoever assembles the tracking evidence:* the board covers all three members, so
> one shared screenshot is probably better than three.

---

## Item 6 — GitHub repository

**Repository:** https://github.com/nnathrin45/COIT20273-AI-Powered-Study-Notes-Generator

The repository contains the complete history of all source code changes,
including every branch and pull request. Individual contributions are traceable
through commit authorship and through the issues assigned to each member.

---

## Evidence gaps — things I still need

Listed honestly so the team knows what is not yet in hand.

| # | Gap | Who | Notes |
|---|---|---|---|
| 1 | **Code screenshots not yet taken** (Figures M3-8 to M3-12) | Me | Five screenshots from VS Code. File and line numbers are given above. Needed for item 2, which asks for "screenshots of critical parts of your code". |
| 2 | **Test report screenshot** (M3-13, M3-14) | Me | Open `testing/reports/final-verification-report.html` in a browser and screenshot; plus the terminal after `npm run test:final`. |
| 3 | **Issue #119 and project board screenshots** (M3-16, M3-17) | Me | For marking criterion 2.1. |
| 4 | **Personal data in `testing/final-test-v1/`** | Me | My email address appears in screenshots 1–4 and my Gmail inbox in screenshot 2. The figures I reference above (5, 7–11, 13) do not show the email address, only my name in the page header. **I have not used screenshots 1–4 in this draft.** If CJ wants them for the registration section, he should blur the address first. |
| 5 | ~~No DOCX or PDF upload screenshot~~ | — | **Closed 6 October.** Figures M3-1, M3-1a and M3-1b now cover all three formats. |
| 6 | ~~No screenshot of a rejected upload~~ | — | **Closed 6 October.** Figure M3-1c covers the scanned-PDF rejection. An unsupported-type (`.jpg`) rejection is still not captured, but is optional. |
| 7 | **Divergence section** | CJ | Email verification, 2FA and profile settings were not in the original proposal. Item 5 carries a demerit if divergence is undocumented. |

---

## Notes for the compiler

- My sections assume figures are renumbered sequentially once merged.
- Two of my figures already exist as files and need no new work:
  `5. AI Consent pop-up.png` and `ERR-01-live-timeout.png`.
- Where my sections touch another member's area — the consent dialogue is CJ's
  UI, built against my API — I have described the behaviour, not claimed the
  implementation.
- Approximate length of my sections as drafted: **about 2,000 words plus 17
  figures.** If the report needs to be shorter, Item 2 (implementation details)
  can drop from five code excerpts to three: keep §2.2 consent, §2.3 grounding and
  §2.4 output validation, which are the design decisions rather than the routine
  parts.
