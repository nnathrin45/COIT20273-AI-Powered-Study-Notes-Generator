# Member 2 — Report 2 Evidence Mapping

**Member:** Nitish Rayapati  
**Role:** Member 2 — Backend / Database  
**Branch:** `feature/member2-backend-database`

## Backend Implementation Evidence

| Report 2 Area | Member 2 Contribution | Evidence |
|---|---|---|
| Backend API Development | Implemented authenticated REST APIs for Study Planner, Progress Dashboard and uploaded-file management | `backend/src/controllers/`, `backend/src/routes/` |
| Authentication | Implemented BCrypt password protection and JWT-based authentication | `backend/src/controllers/user.controller.js`, `backend/src/middleware/auth.middleware.js` |
| Study Planner | Implemented create, list, individual retrieval and deletion of study plans with user ownership | Study Planner controller, routes and MySQL `study_plans` table |
| Progress Dashboard | Implemented user-specific aggregation of uploaded files, AI outputs and quiz performance | `backend/src/controllers/progress.controller.js` |
| Uploaded-File Management | Implemented authenticated owner-only deletion | `DELETE /api/uploaded/:id` |
| Database Integration | Implemented MySQL-backed persistence and user ownership relationships | `database/schema.sql` |
| Security Testing | Verified JWT protection and cross-user ownership restrictions | `docs/security-testing.md` |
| API Documentation | Documented endpoint behaviour, authentication and error responses | `docs/api-spec.md` |

## Key Security Evidence

The backend uses the authenticated user's ID from the verified JWT when processing user-specific operations.

Testing covered:

- Unauthenticated access to protected endpoints
- Valid authenticated requests
- User-specific uploaded-file retrieval
- Cross-user file access prevention
- Cross-user file deletion prevention
- Owner-only deletion
- Verification that deleted files cannot be retrieved

## GitHub Evidence

Member 2 maintained the backend/database work on:

`feature/member2-backend-database`

Documentation was submitted through:

**PR #115 — Member 2: Backend API and Security Documentation**

The pull request was reviewed and merged into `main`.

## Report 2 Supporting Documents

- `docs/member2-backend-contribution.md`
- `docs/api-spec.md`
- `docs/security-testing.md`
- `database/schema.sql`

This document provides a concise mapping between Member 2's completed backend/database work and the evidence available in the project repository.
