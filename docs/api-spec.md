# API Specification

Living document. Member 3 maintains the upload and consent endpoints; Member 2 maintains authentication and notes. Please update your own sections.

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

*Owner: Member 3 · Verified 11 Aug 2026*

Uploads a document, extracts its text, and stores both.

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