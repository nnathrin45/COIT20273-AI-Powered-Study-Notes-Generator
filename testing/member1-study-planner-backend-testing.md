# Member 1 – Study Planner Backend Takeover Testing

**Project:** AI-Powered Study Notes Generator  
**Unit:** COIT20273  
**Member:** Christian Jeff Labaddan  
**Testing Date:** 12 September 2026  

## Purpose

This testing verifies the Study Planner backend functionality after the existing backend implementation was ported onto the latest main branch to unblock frontend integration.

The implementation provides authenticated persistence and ownership protection for student study plans.

## API Endpoints Tested

| Method | Endpoint | Purpose | Result |
|---|---|---|---|
| POST | `/api/study-plans` | Create study plan | PASS |
| GET | `/api/study-plans` | Retrieve logged-in user's study plans | PASS |
| GET | `/api/study-plans/:id` | Retrieve a specific owned study plan | PASS |
| DELETE | `/api/study-plans/:id` | Delete an owned study plan | PASS |

## Create Study Plan Test

A valid authenticated request was submitted containing:

- subject;
- topic;
- deadline;
- available study hours;
- selected study days;
- optional plan data.

The API returned HTTP 201 and created the study plan successfully.

**Result: PASS**

## Retrieve Study Plans Test

The authenticated user's study plans were retrieved using:

`GET /api/study-plans`

Only plans belonging to the logged-in user were returned.

**Result: PASS**

## Retrieve Study Plan by ID

The created plan was retrieved through:

`GET /api/study-plans/:id`

The API returned the correct subject, topic, deadline, available hours, study days and plan data.

**Result: PASS**

## JWT Ownership Test

A second registered user logged in and attempted to retrieve another user's study plan.

The API returned HTTP 404 with:

`Study plan not found`

This confirms that study plans are restricted using both the requested `plan_id` and authenticated `user_id`.

**Result: PASS**

## Delete Study Plan Test

The original owner deleted the study plan using:

`DELETE /api/study-plans/:id`

The API returned a successful deletion response.

A subsequent request for the deleted plan returned HTTP 404.

**Result: PASS**

## Security Result

All Study Planner routes require JWT authentication.

Individual study-plan retrieval and deletion are restricted to the authenticated owner.

A different authenticated user could not access another user's study plan.

## Conclusion

The Study Planner backend functionality passed create, list, retrieve, ownership and deletion testing.

The backend is ready for frontend Study Planner integration.