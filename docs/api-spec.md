# API Specification

Living document. Member 3 maintains the upload, consent and AI generation endpoints; Member 2 maintains authentication and notes. Please update your own sections.

## Base URL

```
http://localhost:5000
```

The port is configurable via `PORT` in `backend/.env`, defaulting to 5000.

> **macOS note:** AirPlay Receiver occupies port 5000 and will silently intercept requests, returning `403` with a `Server: AirTunes` header. If you see that, set `PORT=5001` in your `.env`, or disable AirPlay Receiver in System Settings → General → AirDrop & Handoff.

## Authentication

All endpoints except `/api/health`, `/api/users/register` and `/api/users/login` require a JWT:

```
Authorization: Bearer <token>
```

Obtain the token from `POST /api/users/login`. Missing or invalid tokens return `401`.

---

## Upload — `POST /api/upload`

*Owner: Member 3 · Verified 11 Aug 2026 · `file_id` added to the response 25 Aug 2026*

Uploads a document, extracts its text, and stores both.

> `file_id` is returned so it can be passed directly to `POST /api/ai/generate` without a second lookup.

**Request:** `multipart/form-data`, field name **`file`**

| Constraint | Value |
|---|---|
| Accepted types | `.pdf`, `.docx`, `.txt` |
| Validation method | **File extension**, not mimetype |
| Maximum size | 15 MB |

> Validation is by extension because mimetype is client-supplied and inconsistent — curl sends `application/octet-stream` for `.docx` while browsers send the correct Word type.

**Success — `201`**

```json
{
  "status": "success",
  "message": "File uploaded and text extracted successfully",
  "file": {
    "file_id": 12,
    "file_name": "lecture-week3.docx",
    "file_path": "src/uploads/1786433871694.docx"
  },
  "text_length": 10703
}
```

**Errors**

| Status | `code` | When |
|---|---|---|
| 400 | `NO_FILE` | No file in the request |
| 413 | `FILE_TOO_LARGE` | Over 15 MB |
| 415 | `UNSUPPORTED_FILE_TYPE` | Extension not allowed |
| 422 | `NO_READABLE_TEXT` | No text layer (e.g. scanned PDF) |
| 500 | `PROCESSING_FAILED` | Extraction or database failure |

All errors share the same shape:

```json
{ "status": "error", "code": "FILE_TOO_LARGE", "message": "..." }
```

Switch on `code`, not `message` — messages may be reworded.

---

## Consent — `POST /api/consent`

*Owner: Member 3 · Verified 11 Aug 2026*

Records a consent decision. Consent is per-user and independent of any upload; every change is stored as a new audit row (FR17, NFR11).

**Request**

```json
{ "status": "granted" }
```

`status` must be exactly `"granted"` or `"revoked"`.

**Success — `201`**

```json
{
  "status": "success",
  "message": "Consent granted successfully",
  "consent": { "status": "granted" }
}
```

**Errors**

| Status | `code` | When |
|---|---|---|
| 400 | `INVALID_CONSENT_STATUS` | Not `granted` or `revoked` |
| 500 | `CONSENT_ERROR` | Database failure |

---

## Consent status — `GET /api/consent`

*Owner: Member 3 · Verified 11 Aug 2026*

Returns the user's current consent state (most recent record).

**When consent has been recorded — `200`**

```json
{
  "status": "success",
  "consent": {
    "status": "granted",
    "recorded_at": "2026-08-11T07:22:38.000Z"
  }
}
```

**When the user has never decided — `200`**

```json
{
  "status": "success",
  "consent": null,
  "message": "No consent record found for this user"
}
```

> `consent` is `null`, not an error. Treat it as "not yet decided" and show the consent prompt.

> `recorded_at` is **UTC** in ISO 8601 format. Convert to local time for display.

**Suggested frontend flow**

1. On load, call `GET /api/consent`
2. `null` or `"revoked"` → checkbox unchecked, block AI actions
3. `"granted"` → checkbox checked, allow AI actions
4. On toggle, `POST /api/consent` with the new status

Uploading a file does **not** require consent — only sending content to Gemini does. Users can upload before deciding.

---

## AI generation — `POST /api/ai/generate`

*Owner: Member 3 · Added 14 Aug 2026 · Verified against the live Gemini API 20 Aug 2026 (model `gemini-3.6-flash`)*

Generates AI content from a previously uploaded document and stores it. **Consent is enforced here, not in the interface** — the request is refused server-side if the user's most recent consent decision is not `granted` (FR17.1).

**Request**

```json
{ "file_id": 12, "output_type": "summary" }
```

| Field | Value |
|---|---|
| `file_id` | ID of a document owned by the authenticated user |
| `output_type` | `"summary"` or `"explanation"` (prose); `"flashcards"` or `"quiz"` (structured) |
| `concept` | **Required for `explanation` only** — the topic to explain (FR12.1) |
| `level` | `explanation` only — `beginner` (default), `intermediate` or `advanced` (FR12.1) |

**Success — `201`**

```json
{
  "status": "success",
  "message": "Content generated successfully",
  "output": {
    "output_id": 4,
    "file_id": 12,
    "file_name": "lecture-week3.docx",
    "output_type": "summary",
    "content": "...",
    "is_ai_generated": true
  },
  "disclaimer": "This content was generated by AI and may contain errors or omissions. Please check it against your original study material."
}
```

> `is_ai_generated` and `disclaimer` must both be surfaced in the interface (FR16.1). The label is not dismissible.

**Flashcards — `content` is an array, not a string**

For `output_type: "flashcards"` the `content` field is an array of records rather than prose (FR10.1):

```json
{
  "status": "success",
  "output": {
    "output_id": 7,
    "output_type": "flashcards",
    "content": [
      { "question": "Which organelle is the site of aerobic respiration?", "answer": "The mitochondrion." },
      { "question": "What is the folded inner membrane called?", "answer": "Cristae." }
    ],
    "is_ai_generated": true
  }
}
```

Between 5 and 15 cards are returned depending on how much distinct content the document holds. `GET /api/ai/outputs/:fileId` returns the same parsed array, so the storage format never reaches the interface.

**Quiz — `content` is an array of questions**

For `output_type: "quiz"` each record carries its options and the marked correct answer (FR11.1):

```json
{
  "type": "multiple_choice",
  "question": "What process converts liquid water into vapour?",
  "options": ["Evaporation", "Condensation", "Precipitation", "Transpiration"],
  "correct_answer": "Evaporation"
}
```

`type` is `"multiple_choice"` (4 options) or `"true_false"` (options exactly `["True","False"]`). `correct_answer` always repeats one of the options word for word — questions where it does not are discarded server-side rather than returned. Between 5 and 10 questions are produced.

> `correct_answer` is included in the response so the interface can mark answers locally, but scoring should use the attempt endpoint below so the result is recorded. Hide it until the student has answered.

> Switch on `output_type` before reading `content`: it is a **string** for `summary` and an **array** for `flashcards` and `quiz`.

**Explanation — requires a concept and accepts a level**

```json
{ "file_id": 12, "output_type": "explanation", "concept": "recursion", "level": "beginner" }
```

The response echoes both back alongside the prose content:

```json
{ "output_type": "explanation", "content": "...", "concept": "recursion", "level": "beginner", "is_ai_generated": true }
```

`level` materially changes the output: `beginner` defines every term and uses an analogy, `intermediate` assumes the basics and uses proper terminology, `advanced` is concise and covers mechanisms and limitations. Omitting `level` defaults to `beginner`.

> If the concept does not appear in the document, the response says so rather than inventing an explanation. That is correct behaviour, not a failure — display it as returned.

**Errors**

| Status | `code` | When | Retryable |
|---|---|---|---|
| 400 | `MISSING_FILE_ID` | No `file_id` supplied | no |
| 400 | `MISSING_CONCEPT` | `explanation` requested with no `concept` | no |
| 400 | `INVALID_LEVEL` | `level` not one of the three permitted values | no |
| 400 | `UNSUPPORTED_OUTPUT_TYPE` | `output_type` not supported | no |
| 403 | `CONSENT_REQUIRED` | No consent, or most recent decision is `revoked` | no — prompt for consent |
| 404 | `FILE_NOT_FOUND` | No such file **for this user** | no |
| 422 | `NO_READABLE_TEXT` | Stored file has no extracted text | no |
| 502 | `AI_EMPTY_RESPONSE` | Gemini returned nothing, or no usable flashcards | **yes** |
| 502 | `AI_MALFORMED_RESPONSE` | Structured output could not be parsed | **yes** |
| 503 | `AI_NOT_CONFIGURED` | `GEMINI_API_KEY` not set on the server | no |
| 504 | `AI_TIMEOUT` | No response within 60 s (NFR1) | **yes** |
| 500 | `AI_GENERATION_FAILED` | Unexpected failure | **yes** |

Retryable errors carry `"retryable": true`. The uploaded file and its extracted text are never deleted by a failed generation, so a retry needs no re-upload (NFR5).

> **`403 CONSENT_REQUIRED` is expected, not a bug.** Consent is re-checked on every request because it can be revoked at any time (FR17.2). Prompt the user, `POST /api/consent`, then retry.

Input longer than 50,000 characters is truncated on a word boundary before being sent, consistent with the NFR1 test scope.

---

## Generated content — `GET /api/ai/outputs/:fileId`

*Owner: Member 3 · Added 14 Aug 2026*

Returns content already generated for a document, newest first, so it can be re-accessed without regenerating (FR15). Scoped to the authenticated user.

**Success — `200`**

```json
{
  "status": "success",
  "outputs": [
    {
      "output_id": 4,
      "file_id": 12,
      "output_type": "summary",
      "content": "...",
      "is_ai_generated": 1,
      "generated_at": "2026-08-14T09:15:02.000Z"
    }
  ]
}
```

An empty `outputs` array means nothing has been generated yet — not an error.

| Status | `code` | When |
|---|---|---|
| 500 | `AI_OUTPUT_FETCH_ERROR` | Database failure |

---

## Quiz attempt — `POST /api/ai/quiz/:outputId/attempt`

*Owner: Member 3 · Added 20 Aug 2026*

Submits answers to a generated quiz and records the score (FR11.2). **Marking happens on the server** against the stored quiz, so the client cannot influence the result.

**Request** — one entry per question, in order. Use `null` for unanswered.

```json
{ "answers": ["Evaporation", "True", null] }
```

**Success — `201`**

```json
{
  "status": "success",
  "message": "Quiz attempt recorded",
  "attempt": {
    "attempt_id": 1,
    "output_id": 3,
    "score": 2,
    "total": 3,
    "percentage": 67,
    "results": [
      { "question": "...", "submitted": "Evaporation", "correct_answer": "Evaporation", "is_correct": true }
    ]
  }
}
```

Every attempt is a new row, so a quiz can be retaken and the history is preserved for the progress dashboard (FR14).

**Errors**

| Status | `code` | When |
|---|---|---|
| 400 | `INVALID_ANSWERS` | `answers` is not an array |
| 400 | `ANSWER_COUNT_MISMATCH` | Fewer or more answers than questions |
| 400 | `NOT_A_QUIZ` | The output exists but is a summary or flashcard set |
| 404 | `OUTPUT_NOT_FOUND` | No such output **for this user** |
| 500 | `QUIZ_ATTEMPT_FAILED` | Database failure |

---

## Quiz attempt history — `GET /api/ai/quiz/:outputId/attempts`

*Owner: Member 3 · Added 20 Aug 2026*

Previous attempts at one quiz, newest first. Scoped to the authenticated user.

```json
{
  "status": "success",
  "attempts": [
    { "attempt_id": 3, "output_id": 3, "score": 1, "total": 6, "percentage": 17, "attempted_at": "2026-08-20T..." }
  ]
}
```

An empty array means the quiz has not been attempted yet — not an error.

---

## Authentication — Member 2

Observed from the code and confirmed working during testing on 11 Aug 2026. **to confirm the error responses.**

### `POST /api/users/register`

```json
{ "full_name": "...", "email": "...", "password": "..." }
```

- `201` → `{"status":"success","message":"User Registered Successfully"}`
- `400` → `{"status":"error","message":"Email already exists"}`

### `POST /api/users/login`

```json
{ "email": "...", "password": "..." }
```

- `200` → `{"status":"success","token":"eyJhbGci..."}`
- `400` → `{"status":"error","message":"Invalid Email or Password"}`

Other endpoints owned by Member 2: `GET /api/health`, `GET /api/profile`, `/api/notes` (CRUD), `GET /api/uploaded/:id`.

---

## Local setup notes

1. **Node 20.16+ required** (Node 22 recommended). `pdf-parse` needs ≥20.16 and Express 5 needs ≥18. Node 16 crashes on startup.
2. Copy `backend/.env.example` to `backend/.env` and set your own `DB_PASSWORD`.
3. Create `backend/src/uploads/` — it is gitignored, so it does not arrive with a fresh clone. Uploads fail with `ENOENT` without it.
4. Create the database and load the schema:

```
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS study_notes_db;"
mysql -u root -p study_notes_db < database/schema.sql
```