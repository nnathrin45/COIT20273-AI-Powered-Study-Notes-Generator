# Member 1 – Final Lecturer Feedback Verification

**Project:** AI-Powered Study Notes Generator  
**Member:** Christian Jeff Labaddan  
**Student ID:** 12272982  
**Role:** Member 1 – Business Analysis/Research + UI/UX Lead  
**Verification Stage:** Final Project Verification  
**Purpose:** Final frontend, authentication-integration, error-handling, security-related integration and regression verification following lecturer feedback.

---

## 1. Lecturer Feedback Addressed

The final verification was performed in response to lecturer feedback to:

- recheck authentication
- check application errors
- make sure the system is not easily compromised
- double-check functionality that may have been missed

This Member 1 verification primarily focuses on frontend behaviour, UI/UX, frontend/backend integration, authentication behaviour visible from the client, error handling and final regression testing.

Backend implementation security, database security and authentication enforcement remain primarily associated with Member 2 responsibilities. AI and document-processing security remain primarily associated with Member 3 responsibilities.

Where whole-system behaviour affects the frontend, Member 1 also performs integration verification to confirm that the user-facing application behaves correctly.

---

## 2. Test Environment

- Frontend: React
- Styling: Tailwind CSS
- Backend: Node.js / Express
- Database: MySQL
- Authentication: JWT / Bcrypt
- AI Service: Google Gemini
- Frontend URL: `http://localhost:5173`
- Backend URL: `http://localhost:5000`
- Primary Browser: Google Chrome
- Additional Browser Testing: Microsoft Edge and Mozilla Firefox

---

# 3. Security and Dependency Verification

## SEC-FINAL-01 – Backend Dependency Vulnerability Review

**Objective:**  
Review installed backend dependencies for known security vulnerabilities as part of the final lecturer-feedback security verification.

**Initial Result:**  
The initial `npm audit` identified 3 known dependency vulnerabilities:

- 2 High severity
- 1 Moderate severity

Affected packages:

- `@xmldom/xmldom` 0.8.13
- `multer` 2.2.0
- `qs` 6.15.3

The Multer findings were particularly relevant because Multer is used by the application for uploaded-file handling.

**Action Taken:**  
Executed:

`npm audit fix`

The dependency lock file was updated to use patched versions:

- `@xmldom/xmldom` 0.8.15
- `multer` 2.4.0
- `qs` 6.16.0

**Post-Fix Security Result:**  
Executed:

`npm audit`

Result:

`found 0 vulnerabilities`

**Regression Testing:**  
Executed the complete backend automated test suite after the dependency updates.

Result:

- Tests: 71
- Passed: 71
- Failed: 0
- Skipped: 0

The timeout messages produced during the automated test run were intentional simulated AI timeout scenarios. The corresponding timeout-handling tests passed successfully.

**Backend Startup Verification:**  
The backend was started after the dependency updates.

Result:

- Server successfully started on `http://localhost:5000`
- MySQL database connection succeeded
- No dependency-related startup failure occurred

**Result:**  
PASS

**Conclusion:**  
Known backend dependency vulnerabilities identified during the final security review were remediated without introducing regression failures. The backend passed all 71 automated tests and started successfully after the dependency updates.

---

# 4. Final Authentication Verification

## AUTH-FINAL-01 – Valid Login

**Objective:**  
Verify that a registered user can successfully log in using valid credentials.

**Preconditions:**

- Backend is running.
- Frontend is running.
- MySQL database is available.
- A valid registered test user exists.

**Steps:**

1. Opened the Login page.
2. Entered a valid registered email address.
3. Entered the correct password.
4. Selected Login.
5. Observed the resulting page and authentication state.
6. Opened a protected page.
7. Reviewed the browser console for unexpected errors.

**Expected Result:**

- Login succeeds.
- User is redirected to the Dashboard.
- Protected frontend functionality becomes available.
- No unexpected frontend error is displayed.
- No unexpected JavaScript console error occurs.

**Actual Result:**  

- Login completed successfully.
- User was redirected to the Dashboard.
- Protected frontend pages were accessible.
- Browser console showed no unexpected application errors.
- The only console message displayed was the standard React DevTools development information message.
- Chrome DevTools reported no issues.

**Result:**  
PASS

---

## AUTH-FINAL-02 – Invalid Login

**Objective:**  
Verify that incorrect credentials do not allow access to the authenticated application.

**Steps:**

1. Opened the Login page.
2. Entered a valid registered email address.
3. Entered an intentionally incorrect password.
4. Selected Login.
5. Observed the authentication response.
6. Reviewed the browser console.

**Expected Result:**

- Authentication is rejected.
- User remains unauthenticated.
- Protected pages are not opened.
- A clear error message is displayed.
- No sensitive technical information is exposed.

**Actual Result:**

- Login was rejected.
- User remained unauthenticated.
- Protected pages were not opened.
- The frontend displayed: `Invalid Email or Password`.
- The browser console showed a `400 (Bad Request)` response for the deliberately invalid authentication request.
- The application remained stable and no sensitive technical information was displayed to the user.

**Result:**  
PASS

**Evidence / Notes:**  
The HTTP 400 response was generated by the intentionally invalid login request and was handled by the frontend through a clear user-facing error message. No application crash or protected-page access occurred.

---

## AUTH-FINAL-03 – Protected Route Without Authentication

**Objective:**  
Verify that an unauthenticated user cannot directly access protected frontend pages.

**Steps:**

1. Signed out of the application.
2. Entered the protected Dashboard URL directly in the browser:
   `http://localhost:5173/dashboard`
3. Observed the application response.
4. Checked whether protected or private information was displayed.
5. Reviewed the browser console.

**Expected Result:**

- Protected content is not displayed.
- User is redirected to the Login page or otherwise denied access.
- No protected user information is exposed.

**Actual Result:**

- Test started while signed out.
- Direct access to `/dashboard` was attempted.
- Dashboard content was not displayed.
- User was redirected to the Login page.
- No private or user-specific information was visible.
- No unexpected console errors occurred.

**Result:**  
PASS

**Evidence / Notes:**  
The frontend route protection successfully prevented direct unauthenticated access to the Dashboard and redirected the user to Login without exposing protected information.

---

## AUTH-FINAL-04 – Missing or Invalid Authentication Token

**Objective:**  
Verify frontend and backend behaviour when the stored authentication token is invalid.

**Steps:**

1. Logged in using valid credentials.
2. Located the stored authentication token.
3. Manually modified the token to make it invalid.
4. Attempted to access a protected page.
5. Observed the frontend authentication behaviour.
6. Retested after implementing corrective frontend session handling.

**Expected Result:**

- Protected backend requests are rejected.
- Invalid authentication state is detected.
- Invalid token is removed.
- User is redirected to Login.
- Protected content is no longer accessible.
- No private data is freshly returned.

**Initial Result:**

- Backend correctly rejected the corrupted JWT.
- The frontend displayed an invalid-session warning.
- However, the protected frontend route remained displayed and the invalid token remained stored.

**Initial Result:**  
FAIL – Frontend session handling required correction.

**Corrective Action:**

Updated the shared frontend API request handler so that when an authenticated request receives HTTP `401 Unauthorized`:

- the invalid authentication token is removed from local storage
- the user is redirected to `/login`

**Retest Result:**

- Invalid token inserted: Yes
- Backend authentication rejection detected: Yes
- Invalid token automatically removed: Yes
- User redirected to Login: Yes
- Protected page remained accessible: No
- Private data freshly returned: No
- Application crash: No

**Final Result:**  
PASS – After corrective action

**Evidence / Notes:**  
The backend continued to reject the corrupted JWT correctly. The frontend was updated to clear invalid authentication state and redirect the user to Login when an authenticated API request returns HTTP 401.

| DEF-FINAL-01 | Authentication | Invalid JWT was rejected by backend, but frontend initially did not clear the invalid session or redirect to Login | High | Updated shared API handler to remove invalid token and redirect on authenticated HTTP 401 responses | PASS |

---

## AUTH-FINAL-05 – Sign Out

**Objective:**  
Verify that Sign Out correctly ends the frontend authenticated session.

**Steps:**

1. Logged in using valid credentials.
2. Confirmed that the authentication token was present in Local Storage.
3. Selected Sign Out.
4. Observed the resulting application state.
5. Rechecked Local Storage.
6. Reviewed the browser console.

**Expected Result:**

- Authentication information is removed from the frontend.
- User is redirected away from protected functionality.
- Protected pages are no longer accessible through normal navigation.

**Actual Result:**

- Valid login completed successfully before Sign Out.
- Authentication token was present before Sign Out.
- Sign Out completed successfully.
- Authentication token was removed from Local Storage.
- User was redirected to the Login page.
- Protected content did not remain visible.
- No unexpected console errors occurred.

**Result:**  
PASS

**Evidence / Notes:**  
The Sign Out function correctly removed the stored authentication token and returned the user to the Login page without exposing protected content or generating unexpected frontend errors.

---

## AUTH-FINAL-06 – Protected Route After Sign Out

**Objective:**  
Verify that a user cannot return to protected functionality after signing out.

**Steps:**

1. Logged in using valid credentials.
2. Signed out successfully.
3. Attempted direct access to `/dashboard`.
4. Used the browser Back button.
5. Attempted direct access to `/progress`.
6. Checked for private data and unexpected console errors.

**Expected Result:**

- Protected application content remains inaccessible after Sign Out.
- Direct protected-route access redirects to Login.
- Browser history does not restore protected functionality.
- No private user information is exposed.

**Actual Result:**

- Test started while signed out.
- Direct `/dashboard` access was blocked.
- User was redirected to Login.
- Browser Back did not restore protected content.
- Direct `/progress` access was blocked.
- No private user data was visible.
- No unexpected console errors occurred.

**Result:**  
PASS

**Evidence / Notes:**  
The application correctly prevented access to protected frontend routes after Sign Out, including direct URL access and browser-history navigation.

---

## AUTH-FINAL-07 – Cross-User Data Visibility

**Objective:**  
Verify that the frontend does not expose one user's private study data to another authenticated user.

**Preconditions:**

- Test User A exists.
- Test User B exists.
- User A has private study data stored in the application.

**Steps:**

1. Logged in as User A.
2. Confirmed that User A had private application data.
3. Signed out User A.
4. Logged in as User B.
5. Reviewed Uploaded Materials.
6. Reviewed Saved Materials.
7. Reviewed Study Planner.
8. Reviewed Progress.
9. Checked the browser console for unexpected errors.

**Expected Result:**

- User B cannot see User A's uploaded files.
- User B cannot see User A's saved materials.
- User B cannot see User A's study plans.
- User B cannot see User A's progress data.
- No cross-user private information is exposed.

**Actual Result:**

- User A had private application data.
- User A was successfully signed out.
- User B successfully logged in.
- User A uploaded files were not visible to User B.
- User A saved materials were not visible to User B.
- User A study plans were not visible to User B.
- User A progress data was not visible to User B.
- No unexpected console errors occurred.

**Result:**  
PASS

**Evidence / Notes:**  
The application maintained user-specific data isolation across the tested frontend workflows. User B could not view private resources belonging to User A.

---

# 5. Final Error-Handling Verification

## ERR-FINAL-01 – Invalid Form Input

**Objective:**  
Verify that registration form validation prevents invalid or insecure user input.

**Initial Findings:**

Initial testing identified two frontend validation gaps:

- An email containing consecutive dots, such as `test..user@example.com`, was accepted.
- A three-character password (`123`) was accepted and registration could proceed.

**Corrective Action:**

The Registration interface was updated to:

- validate email structure more strictly
- reject email addresses containing invalid consecutive-dot formatting
- require passwords to contain at least 8 characters
- apply the minimum length requirement to both Password and Confirm Password fields
- clear stale validation errors when the user edits form fields

**Retest Result:**

- `invalid-email` was rejected.
- `test..user@example.com` was rejected.
- Password `123` was rejected.
- The stale email validation message disappeared after the email field was corrected.
- A valid email with a password of at least 8 characters was accepted.
- Registration continued to operate correctly for valid input.
- No unexpected frontend errors occurred.

**Final Result:**  
PASS – After corrective action

**Evidence / Notes:**  
Final testing confirmed that the Registration interface now prevents the invalid email and short-password cases identified during lecturer-feedback verification while continuing to accept valid registration input.

| DEF-FINAL-02 | Registration Validation | Registration initially accepted a very short password (`123`) | Medium | Added minimum 8-character password validation and HTML input constraint | PASS |
| DEF-FINAL-03 | Registration Validation | Email containing consecutive dots such as `test..user@example.com` was initially accepted | Medium | Added stricter frontend email validation | PASS |

---

## ERR-FINAL-02 – Unsupported Upload File Type

**Objective:**  
Verify frontend behaviour when a user attempts to upload an unsupported file type.

**Expected Result:**

- Unsupported file is rejected.
- User receives clear feedback.
- Upload cannot proceed.
- Application remains functional.

**Actual Result:**

- An unsupported file type was selected.
- The application displayed:
  `Unsupported file type. Please select a PDF, DOCX or TXT file.`
- The Upload Material button remained disabled.
- The unsupported file could not be submitted.
- The page remained usable.

**Result:**  
PASS

**Evidence / Notes:**  
Screenshot evidence confirms that unsupported file types are blocked before upload and the user receives clear validation feedback.

---

## ERR-FINAL-03 – Oversized Upload

**Objective:**  
Verify frontend behaviour when a supported file exceeds the configured 15 MB upload limit.

**Expected Result:**

- Oversized file is rejected.
- Clear validation feedback is displayed.
- Upload cannot proceed.
- Application remains usable.

**Actual Result:**

- A supported TXT file larger than the configured 15 MB limit was selected.
- The application displayed:
  `The selected file is larger than the 15 MB limit.`
- The Upload Material button remained disabled.
- The oversized file could not be submitted.
- The page remained stable and usable.

**Result:**  
PASS

**Evidence / Notes:**  
Screenshot evidence confirms that the frontend correctly prevents files larger than 15 MB from being uploaded and provides clear feedback to the user.

---

## ERR-FINAL-04 – Unreadable or Empty Document

**Objective:**  
Verify application behaviour when a supported document contains no readable study content.

**Test Cases:**

1. Empty TXT document
2. Empty DOCX document

**Expected Result:**

- Supported file type may be selected.
- Document processing detects that no usable text is available.
- The document is not accepted as usable study material.
- A clear error message is displayed.
- Application remains stable.

**Actual Result:**

### Empty TXT

- An empty TXT file was selected.
- The application detected that no readable text could be extracted.
- The following error message was displayed:

  `No readable text could be extracted from this document. Scanned or image-only documents are not supported.`

### Empty DOCX

- An empty DOCX file was selected.
- The application detected that no readable text could be extracted.
- The following error message was displayed:

  `No readable text could be extracted from this document. Scanned or image-only documents are not supported.`

- The application remained stable during both tests.

**Result:**  
PASS

**Evidence / Notes:**  
Both TXT and DOCX documents with no readable content were correctly identified as unusable study material. Screenshot evidence was captured for both supported file formats.

---

## ERR-FINAL-05 – Missing Resource / Uploaded File Deletion

**Objective:**  
Verify that an authenticated user can delete one of their uploaded study documents and that the deleted resource does not remain available in the frontend after refresh.

**Steps:**

1. Opened the Upload Material page.
2. Loaded the authenticated user's existing uploaded materials.
3. Selected an uploaded document for deletion.
4. Confirmed the deletion.
5. Observed the frontend response.
6. Refreshed the uploaded-material list.
7. Refreshed the browser page.
8. Reviewed the browser console for unexpected errors.

**Expected Result:**

- The selected file is deleted successfully.
- The deleted file disappears from the uploaded-material list.
- The deleted file does not return after list refresh.
- The deleted file does not return after browser refresh.
- The application remains stable.
- No unrelated user data is displayed or affected.

**Actual Result:**

- The delete operation completed successfully.
- The backend deletion request returned HTTP 200.
- A successful deletion message was displayed.
- The deleted file disappeared immediately from the uploaded-material list.
- The deleted file did not return after selecting Refresh.
- The deleted file did not return after browser refresh.
- No unexpected console errors occurred.

**Result:**  
PASS

**Evidence / Notes:**  
The Upload Material page was extended with a live `Your Uploaded Materials` section using the existing authenticated uploaded-file API. Users can now review their own uploaded source documents and securely delete them through the existing backend deletion endpoint.

---

## ERR-FINAL-06 – Temporary AI Failure / Retry

**Objective:**  
Verify the retryable error behaviour for temporary AI or network failures.

**Expected Result:**

- Loading state ends correctly after failure.
- Clear error feedback is displayed.
- Retry functionality is available where implemented.
- Existing uploaded documents remain available.
- No partial or misleading AI output is displayed.

**Actual Result:**  
Pending

**Result:**  
Pending

---

## ERR-FINAL-07 – Browser Console Error Review

**Objective:**  
Check major workflows for unexpected frontend JavaScript errors.

**Pages / Workflows to Review:**

- Login
- Dashboard
- Upload Material
- Summary
- Flashcards
- Practice Quiz
- Concept Explanation
- Study Planner
- Saved Materials
- Progress
- Sign Out

**Expected Result:**

- No unexpected application-breaking JavaScript errors.
- No recurring frontend integration errors during normal use.

**Actual Result:**  
Pending

**Result:**  
Pending

---

# 6. Final UI/UX and Integration Gap Review

## GAP-FINAL-01 – Remaining Prototype or Mock Data

**Objective:**  
Verify that student-facing pages use live integrated information rather than outdated prototype/mock values.

**Pages to Review:**

- Dashboard
- Upload Material
- Summary
- Flashcards
- Practice Quiz
- Concept Explanation
- Study Planner
- Saved Materials
- Progress

**Expected Result:**

- No inappropriate prototype content remains.
- Live values are used where backend integration is available.

**Actual Result:**  
Pending

**Result:**  
Pending

---

## GAP-FINAL-02 – Hard-Coded Frontend Values

**Objective:**  
Identify user-facing values that should come from live backend data but remain hard-coded.

**Expected Result:**

- Dynamic information is sourced from live application data where required.
- No misleading hard-coded statistics or user records remain.

**Actual Result:**  
Pending

**Result:**  
Pending

---

## GAP-FINAL-03 – Unfinished Buttons, Links or Controls

**Objective:**  
Verify that visible interactive controls have a working and appropriate purpose.

**Expected Result:**

- No visible button or link leads to unfinished functionality.
- Disabled functionality is not misleading.
- Navigation is consistent.

**Actual Result:**  
Pending

**Result:**  
Pending

---

## GAP-FINAL-04 – Loading, Success and Error States

**Objective:**  
Verify that asynchronous workflows provide appropriate interface feedback.

**Areas to Review:**

- Login
- Registration
- Upload
- Summary generation
- Flashcard generation
- Quiz generation/submission
- Concept Explanation generation
- Study Planner operations
- Saved Materials operations
- Progress loading
- File deletion

**Expected Result:**

- Loading states are visible when appropriate.
- Successful actions provide appropriate feedback or state changes.
- Failed actions display understandable errors.
- Repeated actions do not create confusing interface states.

**Actual Result:**  
Pending

**Result:**  
Pending

---

# 7. Final End-to-End Workflow Verification

## E2E-FINAL-01 – Complete Student Workflow

**Objective:**  
Verify the main student workflow from account access through study activities and Sign Out.

**Workflow:**

1. Register or use an existing account.
2. Login.
3. View Dashboard.
4. Upload supported study material.
5. Review AI consent.
6. Grant AI consent.
7. Generate Summary.
8. Generate Flashcards.
9. Generate Practice Quiz.
10. Submit Quiz and review score.
11. Generate Concept Explanation.
12. Review Saved Materials.
13. Use Study Planner.
14. Review Progress.
15. Delete an uploaded file where appropriate.
16. Sign Out.

**Expected Result:**

- Each stage works without an application-breaking error.
- User remains correctly authenticated during protected workflows.
- User-specific information remains isolated.
- AI consent is respected.
- Appropriate loading/error/success behaviour is presented.
- Sign Out successfully ends the session.

**Actual Result:**  
Pending

**Result:**  
Pending

---

# 8. Final Accessibility and Responsive Recheck

## UI-FINAL-01 – Keyboard Navigation Recheck

**Objective:**  
Confirm that final integrated changes have not introduced keyboard-navigation regressions.

**Expected Result:**

- Major controls remain keyboard accessible.
- Focus remains visible.
- Navigation order remains usable.

**Actual Result:**  
Pending

**Result:**  
Pending

---

## UI-FINAL-02 – Responsive Layout Recheck

**Objective:**  
Confirm that final integrated pages remain usable across representative screen sizes.

**Expected Result:**

- Layout remains usable on desktop and smaller viewport sizes.
- Navigation remains accessible.
- Content does not become unusable due to overflow or overlap.

**Actual Result:**  
Pending

**Result:**  
Pending

---

## UI-FINAL-03 – Cross-Browser Recheck

**Browsers:**

- Google Chrome
- Microsoft Edge
- Mozilla Firefox

**Expected Result:**

- Main student workflow remains functional across all three browsers.
- No major browser-specific layout or interaction defects are observed.

**Actual Result:**  
Pending

**Result:**  
Pending

---

# 9. Final Regression Verification

## REG-FINAL-01 – Frontend Production Build

**Objective:**  
Verify that the final frontend can still build successfully after final security and authentication changes.

**Command:**

`npm run build`

**Expected Result:**

- Production build completes successfully.
- No build-blocking errors occur.

**Actual Result:**

Vite production build completed successfully.

- Modules transformed: 96
- Build completed without errors
- Production assets were generated successfully

**Result:**  
PASS

---

## REG-FINAL-02 – Backend Automated Regression Suite

**Objective:**  
Verify that backend functionality remains stable after final dependency and authentication-integration changes.

**Command:**

`npm test`

**Actual Result:**

- Tests: 71
- Passed: 71
- Failed: 0
- Cancelled: 0
- Skipped: 0

The AI timeout messages produced during the test run were intentional simulated timeout scenarios and their associated tests passed successfully.

**Result:**  
PASS

---

## REG-FINAL-03 – Final Frontend Regression Pass

**Objective:**  
Retest major frontend functionality after all final fixes have been completed.

**Areas:**

- Authentication
- Dashboard
- Upload
- Consent
- Summary
- Flashcards
- Quiz
- Concept Explanation
- Study Planner
- Saved Materials
- Progress
- File deletion
- Sign Out

**Actual Result:**  
Pending

**Result:**  
Pending

---

# 10. Defects Identified During Final Verification

This section records defects discovered during the final lecturer-feedback verification.

| Defect ID | Area | Description | Severity | Resolution | Retest |
|---|---|---|---|---|---|
| Pending | Pending | No additional defect recorded yet | Pending | Pending | Pending |

---

# 11. Final Verification Summary

## Completed So Far

- Backend dependency vulnerability audit performed
- 3 dependency vulnerabilities identified
- 2 High severity findings remediated
- 1 Moderate severity finding remediated
- Post-fix `npm audit` returned 0 vulnerabilities
- Backend regression suite executed
- 71 of 71 automated backend tests passed
- Backend startup successfully verified
- MySQL database connection successfully verified

## Remaining Verification

- Final authentication workflow tests
- Frontend error-handling tests
- Cross-user frontend integration verification
- Remaining prototype/mock-data review
- Unfinished UI/control review
- Complete end-to-end student workflow
- Final accessibility/responsive recheck
- Cross-browser recheck
- Frontend production build
- Final frontend regression pass

---

# 12. Final Conclusion

Pending completion of the remaining final-verification tests.

The purpose of this verification is to provide traceable evidence that lecturer feedback relating to authentication, error handling, security and missed functionality was actively reviewed before final project submission.

Only tests that have actually been performed are marked as PASS. Pending tests will be updated with their actual results, evidence and any required corrective action as final verification continues.