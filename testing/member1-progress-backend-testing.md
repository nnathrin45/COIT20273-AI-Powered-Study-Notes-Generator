# Member 1 – Progress Dashboard Backend Testing

**Project:** AI-Powered Study Notes Generator
**Unit:** COIT20273
**Member:** Christian Jeff Labaddan
**Testing Date:** September 2026

---

## 1. Purpose

This testing verifies the authenticated Progress Dashboard backend API.

The Progress API retrieves user-specific study activity from the MySQL database, including uploaded materials, generated study resources, quiz performance, study plans and recent activity.

---

## 2. Endpoint

The Progress Dashboard uses:

`GET /api/progress`

Supported period filters are:

- `all`
- `week`
- `month`

Examples:

`GET /api/progress`

`GET /api/progress?period=week`

`GET /api/progress?period=month`

The endpoint requires JWT authentication.

---

## 3. All-Time Progress Test

Request:

`GET /api/progress`

The authenticated test user returned:

- 3 uploaded materials
- 10 AI-generated outputs
- 2 summaries
- 2 flashcard outputs
- 3 generated quizzes
- 3 explanations
- 2 quiz attempts
- 5 correct answers
- 14 total quiz questions
- 36% average quiz score
- 1 study plan

Recent quiz attempts and recent study activity were also returned successfully.

**Result: PASS**

---

## 4. Weekly Period Test

Request:

`GET /api/progress?period=week`

The weekly result returned:

- 2 uploaded materials
- 10 AI outputs
- 2 quiz attempts
- 1 study plan

The result differed from the all-time uploaded-material count, confirming that the weekly date filter was applied.

Recent activity was also restricted to matching activity records.

**Result: PASS**

---

## 5. Monthly Period Test

Request:

`GET /api/progress?period=month`

The monthly result returned the user's activity for the current month.

The current test data was created during the same month, so most monthly statistics matched the all-time statistics.

**Result: PASS**

---

## 6. Invalid Period Validation

Request:

`GET /api/progress?period=year`

Response:

```json
{
  "status": "error",
  "message": "Invalid progress period"
}