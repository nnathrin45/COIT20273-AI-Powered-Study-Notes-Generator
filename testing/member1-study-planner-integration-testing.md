# Member 1 – Study Planner Frontend Integration Testing

**Project:** AI-Powered Study Notes Generator  
**Unit:** COIT20273  
**Member:** Christian Jeff Labaddan  
**Testing Date:** 12 September 2026  
**Related Issue:** #50 – Integrate Study Planner with backend functionality

---

## 1. Purpose

This testing verifies the frontend integration of the Study Planner with the live authenticated backend and MySQL database.

The integration replaces the previous frontend-only mock behaviour with persistent study-plan creation, retrieval and deletion.

---

## 2. Integration Scope

The frontend Study Planner now communicates with:

- `POST /api/study-plans`
- `GET /api/study-plans`
- `GET /api/study-plans/:id`
- `DELETE /api/study-plans/:id`

A dedicated frontend service was added to use the shared authenticated API helper.

---

## 3. Create Study Plan

A study plan was created through the frontend using:

- Subject: Software Engineering
- Topic: System Architecture
- Deadline: 30 September 2026
- Available study hours: 8 hours per week
- Study days: Monday, Wednesday and Friday

The frontend displayed a successful saved-plan result and returned a generated database plan ID.

Postman verification confirmed that the plan was stored in the backend database with the authenticated user ID.

**Result: PASS**

---

## 4. Retrieve Saved Plans

The frontend retrieved saved plans from:

`GET /api/study-plans`

Previously created plans were displayed under the Saved Study Plans section.

The following information was successfully restored:

- subject;
- topic;
- deadline;
- available study hours;
- selected study days.

Saved plans remained visible after refreshing the page.

**Result: PASS**

---

## 5. Deadline Display

The API returns the stored MySQL date using an ISO/UTC representation.

The frontend converts the stored value back to the user's local date for display.

A deadline entered as 30/09/2026 was displayed correctly as 30/09/2026 in the Study Planner interface.

**Result: PASS**

---

## 6. Immediate Refresh After Creation

After creating a new Study Plan, the Saved Study Plans section refreshes automatically.

The new plan becomes visible without manually refreshing the browser.

**Result: PASS**

---

## 7. Delete Study Plan

A saved plan was deleted through the frontend.

The frontend:

- requested confirmation before deletion;
- called the authenticated delete API;
- removed the deleted plan from the visible list;
- displayed a successful deletion message.

Postman verification using:

`GET /api/study-plans`

confirmed that the deleted plan no longer existed in the user's saved plans.

**Result: PASS**

---

## 8. Ownership and Security

Study Planner requests use JWT authentication.

Backend ownership testing previously confirmed that another authenticated user cannot retrieve another user's study plan.

The frontend therefore operates only on study plans associated with the logged-in user.

**Result: PASS**

---

## 9. UI Behaviour

The frontend now provides:

- study-plan creation;
- save confirmation;
- persistent saved-plan retrieval;
- saved-plan empty/loading/error states;
- saved-plan deletion;
- deletion confirmation;
- clear success and error feedback.

The previous misleading AI-generated label was removed because the current Study Planner backend stores predefined suggested sessions and does not call Gemini.

---

## 10. Conclusion

The Study Planner frontend is now integrated with the live backend and MySQL database.

Create, retrieve, refresh, persistent storage, ownership protection and deletion flows were successfully tested.

Issue #50 is considered complete for the current Study Planner implementation.