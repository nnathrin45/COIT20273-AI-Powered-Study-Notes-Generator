# Member 1 – Uploaded File Deletion Backend Testing

**Project:** AI-Powered Study Notes Generator
**Unit:** COIT20273
**Member:** Christian Jeff Labaddan
**Testing Date:** September 2026

---

## 1. Purpose

This testing verifies the authenticated uploaded-file deletion API.

The implementation allows a student to delete an uploaded study material while ensuring that users cannot access or delete files belonging to another account.

---

## 2. Endpoint

`DELETE /api/uploaded/:id`

The endpoint requires JWT authentication.

The authenticated user's ID is taken from the JWT rather than supplied by the client.

---

## 3. Owner Deletion Test

A disposable TXT document was uploaded using the owner account.

The uploaded file was assigned a database file ID and stored physically under:

`backend/src/uploads`

The owner then requested:

`DELETE /api/uploaded/:id`

The API returned:

```json
{
  "status": "success",
  "message": "Uploaded file deleted successfully"
}