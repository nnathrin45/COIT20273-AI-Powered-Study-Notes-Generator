@'
# Member 2 — Backend and Database Contribution

**Member:** Nitish Rayapati  
**Role:** Member 2 — Backend / Database  
**Branch:** `feature/member2-backend-database`

## Contribution Scope

Member 2 was responsible for backend and database work supporting the study-notes application, including authenticated REST APIs, database-backed functionality, user ownership controls, and backend testing documentation.

## Completed Backend Deliverables

### Authentication and User Security

- Implemented user registration and login support.
- Passwords are protected using BCrypt hashing.
- JWT tokens are generated after successful authentication.
- Protected endpoints validate the JWT before processing requests.
- The authenticated user ID is extracted from the verified token and used for user-specific operations.

### Study Planner

Implemented the Study Planner backend and database support for:

- Creating study plans
- Retrieving a user's study plans
- Retrieving an individual study plan
- Deleting a study plan
- Storing subject, topic, deadline, available study hours, study days, and plan data
- Enforcing authenticated user ownership

### Progress Dashboard

Implemented the backend aggregation required for the Progress Dashboard, including:

- Total uploaded files
- Total AI-generated outputs
- Total quiz attempts
- Total correct answers
- Total questions
- Average quiz percentage
- Recent quiz attempts

The dashboard data is filtered using the authenticated user's ID.

### Uploaded-File Management

Implemented and documented authenticated uploaded-file deletion through:

`DELETE /api/uploaded/:id`

The endpoint verifies the authenticated user's ownership before deletion and returns a not-found response when the requested file does not belong to the authenticated user.

## Database Contribution

The backend uses MySQL for persistent application data.

Member 2 backend work includes database support for:

- Users
- Uploaded files
- Notes
- AI outputs
- Quiz attempts
- Study plans
- AI consent records

Study Planner database support includes user ownership through `user_id` and an index supporting user/deadline queries.

## Security Testing

Backend security testing covered:

- Protected API access without a JWT
- Successful authenticated access
- User-specific uploaded-file retrieval
- Cross-user uploaded-file access prevention
- Cross-user uploaded-file deletion prevention
- Owner-only uploaded-file deletion
- Verification that a deleted file can no longer be retrieved

The documented security tests using separate User A and User B accounts passed successfully.

## API Documentation

The backend API specification documents authentication requirements, endpoint behaviour, request/response formats, and relevant error responses.

Member 2 documentation covers authentication and backend ownership/security behaviour alongside the other team members' API sections.

## GitHub Contribution

The Member 2 branch was maintained separately:

`feature/member2-backend-database`

Member 2 documentation was submitted through:

**PR #115 — Member 2: Backend API and Security Documentation**

The pull request was reviewed and merged into `main`.

## Report 2 Evidence Areas

This contribution supports evidence for:

- Backend implementation
- Database design and integration
- REST API development
- Authentication and authorization
- User ownership and data isolation
- Study Planner functionality
- Progress Dashboard functionality
- Uploaded-file management
- Backend security testing
- GitHub branch and pull-request workflow
'@ | Set-Content docs/member2-backend-contribution.md