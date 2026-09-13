# JWT Security and User Ownership Testing

**Date:** 26 August 2026  
**Task:** JWT security, uploaded-file ownership and deletion testing

## Objective

Verify that protected backend endpoints require authentication and that users can only access and delete their own uploaded files.

## Test Results

| Test | Expected Result | Result |
|---|---|---|
| Access protected API without JWT | 401 Unauthorized | PASS |
| User A login with valid credentials | 200 OK with JWT | PASS |
| User A accesses protected progress API | 200 OK | PASS |
| User A retrieves uploaded files | 200 OK | PASS |
| User B login with valid credentials | 200 OK with JWT | PASS |
| User B accesses User A's uploaded file | Access denied / 404 | PASS |
| User B attempts to delete User A's file | Access denied / 404 | PASS |
| User B retrieves own uploaded files | 200 OK | PASS |
| User A deletes own uploaded file | 200 OK | PASS |
| Deleted file is requested again | 404 Not Found | PASS |

## Security Verification

The uploaded-file queries use both the file ID and authenticated user ID when retrieving or deleting files. This prevents an authenticated user from accessing or deleting another user's uploaded file.

The JWT authentication middleware validates the token and places the authenticated user's ID in `req.user`.

## Conclusion

All JWT authentication and uploaded-file ownership tests completed on 26 August 2026 passed successfully. User-to-user access isolation and owner-only deletion were verified using separate User A and User B accounts.