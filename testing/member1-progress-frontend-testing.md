# Member 1 – Progress Dashboard Frontend Integration Testing

**Project:** AI-Powered Study Notes Generator
**Unit:** COIT20273
**Member:** Christian Jeff Labaddan
**Testing Date:** September 2026
**Related Issue:** #52 – Progress Dashboard live integration

---

## 1. Purpose

This testing verifies that the Progress Dashboard frontend retrieves and displays live, user-specific study activity from the backend and MySQL database.

The previous temporary mock data has been removed and replaced with authenticated API data.

---

## 2. Integration

The frontend retrieves Progress data using:

`GET /api/progress?period=<period>`

Supported periods are:

- `all`
- `week`
- `month`

Requests use the shared authenticated API helper and the logged-in user's JWT.

---

## 3. All-Time Progress Test

The Progress page was opened using the same authenticated test account used during backend testing.

The frontend displayed:

- Uploaded Materials: 3
- Flashcards Generated: 2
- Quizzes Completed: 2
- Average Quiz Score: 36%
- Summaries: 2
- Study Plans: 1
- Quizzes Generated: 3
- Explanations: 3
- Correct Answers: 5
- Total Quiz Questions: 14
- Quiz Question Accuracy: 36%

These values matched the live backend response.

**Result: PASS**

---

## 4. Quiz Performance

The Quiz Performance table displayed two real quiz attempts.

The displayed results included:

- `NR-CX02 - In-Store Customer Service & Staff Training Upgrade Project Charter.docx`
  - Score: 1/7
  - Result: 14%

- `sample-study-material.txt`
  - Score: 4/7
  - Result: 57%

The data matched the backend response.

**Result: PASS**

---

## 5. Recent Activity

The Recent Activity section displayed live database activity including:

- study plan creation;
- summary generation;
- flashcard generation;
- quiz generation;
- explanation generation;
- quiz attempts;
- uploaded study materials.

Activity descriptions and dates were displayed successfully.

**Result: PASS**

---

## 6. Weekly Filter

The Time Period selector was changed to `This Week`.

The frontend refreshed automatically.

Uploaded Materials changed from 3 to 2, matching the backend weekly response.

Quiz statistics and recent activity also matched the weekly backend data.

**Result: PASS**

---

## 7. Monthly Filter

The Time Period selector was changed to `This Month`.

Uploaded Materials returned to 3.

The remaining Progress statistics matched the current-month backend response.

**Result: PASS**

---

## 8. Refresh Persistence

The browser was refreshed while viewing the Progress page.

The live database values loaded again successfully and did not revert to the previous temporary sample data.

**Result: PASS**

---

## 9. Mock Data Removal

The previous hard-coded Progress statistics, quiz history, recent activity and sample 72% progress value were removed.

The previous Development Preview notice was also removed because the page now uses live backend data.

The previous `Flashcards Reviewed` label was changed to `Flashcards Generated` because the current database records generated flashcard outputs rather than individual review events.

**Result: PASS**

---

## 10. Loading and Error Handling

The Progress page includes:

- loading feedback while retrieving progress;
- authenticated API requests;
- backend error feedback;
- login-session error feedback;
- empty states for quiz history and recent activity.

**Result: PASS**

---

## 11. Conclusion

The Progress Dashboard frontend is successfully integrated with the live backend and database.

All-time, weekly and monthly statistics, quiz performance, recent activity and browser-refresh persistence were verified successfully.

Issue #52 is complete.