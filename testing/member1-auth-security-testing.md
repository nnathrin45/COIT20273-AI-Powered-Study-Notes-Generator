# Member 1 – Authentication and Security Testing

**Project:** AI-Powered Study Notes Generator  
**Unit:** COIT20273  
**Member:** Christian Jeff Labaddan  
**Role:** UI/UX and Frontend Integration  
**Testing Date:** 2 September 2026  
**Related Issue:** #56 – Conduct authentication and security testing

---

## 1. Purpose

The purpose of this testing was to verify that the frontend and backend authentication, authorisation, AI consent, protected API access, uploaded-material access, and quiz-attempt functionality operate securely and correctly.

Testing was performed using the shared Postman collection together with the locally running Node.js/Express backend and MySQL database.

The shared Postman collection used was:

`testing/COIT20273-API.postman_collection.json`

No passwords, JWT tokens, Gemini API keys, database passwords, or other secrets are recorded in this document.

---

## 2. Test Environment

- Frontend: React
- Backend: Node.js / Express
- Database: MySQL
- Authentication: JWT
- Password protection: bcrypt
- API testing: Postman Desktop
- Backend test URL: `http://localhost:5099`
- AI service: Gemini API
- Test document: `postman-test-notes.txt`

The test document contained only non-sensitive sample study material.

---

## 3. Authentication Tests

| ID | Test | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| AUTH-01 | Backend health check | Backend responds successfully | Backend returned `200 OK` and `"Backend is Running"` | PASS |
| AUTH-02 | Register a new test user | New user account is created | Registration returned `201 Created` with success response | PASS |
| AUTH-03 | Login using valid credentials | Login succeeds and JWT is returned | Login returned `200 OK` and a JWT token | PASS |
| AUTH-04 | Capture JWT in Postman | JWT is stored for later authenticated requests | Collection successfully captured and reused the token | PASS |
| AUTH-05 | Access profile using valid JWT | Protected profile endpoint allows access | Profile returned `200 OK` | PASS |
| AUTH-06 | Access protected endpoint without JWT | Request is rejected | Backend returned `"Access Denied. No Token Provided."` | PASS |

### Authentication Result

The authentication workflow successfully protected restricted endpoints. A valid JWT allowed access to authenticated resources, while requests without authentication were rejected.

---

## 4. Uploaded Material Access Tests

| ID | Test | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| FILE-01 | Upload authenticated TXT document | File is accepted and text is extracted | Upload succeeded and returned `file_id`, filename, path and extracted text length | PASS |
| FILE-02 | Retrieve uploaded document by ID | Authenticated user can retrieve the uploaded document | File details and extracted text were returned successfully | PASS |
| FILE-03 | List authenticated user's uploaded documents | Only the authenticated user's document records are returned | `GET /api/uploaded` returned the user's uploaded files | PASS |
| FILE-04 | Verify uploaded-file list does not expose extracted text | List response should contain metadata only | Response contained `file_id`, `file_name` and `uploaded_at`; `extracted_text` was not included | PASS |
| FILE-05 | Request inaccessible or nonexistent file | Backend should not return document content | Backend returned `FILE_NOT_FOUND` | PASS |

### Uploaded File List Verification

The Member 1 endpoint:

`GET /api/uploaded`

returned documents in newest-first order.

Observed response structure:

```json
{
  "status": "success",
  "files": [
    {
      "file_id": 5,
      "file_name": "postman-test-notes.txt",
      "uploaded_at": "2026-09-01T17:27:58.000Z"
    }
  ]
}

---

## 5. AI Consent Security Tests

| ID         | Test                                         | Expected Result                              | Actual Result                                     | Status |
| ---------- | -------------------------------------------- | -------------------------------------------- | ------------------------------------------------- | ------ |
| CONSENT-01 | Check consent before any record exists       | System reports that no consent record exists | Response contained `consent: null`                | PASS   |
| CONSENT-02 | Grant AI processing consent                  | Consent status changes to granted            | Backend returned `"Consent granted successfully"` | PASS   |
| CONSENT-03 | Retrieve granted consent status              | Current consent status is returned           | Status returned as `granted`                      | PASS   |
| CONSENT-04 | Revoke AI processing consent                 | Consent status changes to revoked            | Backend returned `"Consent revoked successfully"` | PASS   |
| CONSENT-05 | Generate AI content while consent is revoked | AI generation must be blocked                | Backend returned `CONSENT_REQUIRED`               | PASS   |
| CONSENT-06 | Grant consent again                          | AI functionality becomes available again     | Consent returned to `granted`                     | PASS   |

Consent Result :
AI processing was successfully prevented when the authenticated user had revoked consent.

Observed error:
{
  "status": "error",
  "code": "CONSENT_REQUIRED",
  "message": "AI processing requires your consent. Please review and accept the data handling conditions before generating content."
}

This confirms that AI consent is enforced by the backend rather than relying only on frontend controls.

---

## 6. AI Generation Validation Tests

The following AI functions were successfully tested after authentication and consent were confirmed:

| ID    | Function                            | Result                                                                                              | Status |
| ----- | ----------------------------------- | --------------------------------------------------------------------------------------------------- | ------ |
| AI-01 | Summary generation                  | AI summary generated and stored successfully                                                        | PASS   |
| AI-02 | Flashcard generation                | Structured question/answer flashcards returned                                                      | PASS   |
| AI-03 | Practice Quiz generation            | Multiple-choice and true/false questions generated                                                  | PASS   |
| AI-04 | Concept Explanation                 | Explanation generated successfully                                                                  | PASS   |
| AI-05 | Concept absent from source material | AI identified that the requested concept was not present instead of presenting it as source content | PASS   |

All successful AI responses contained:
• is_ai_generated: true
• source file information
• Responsible AI disclaimer

One Explanation request temporarily returned AI_GENERATION_FAILED with retryable: true. Retrying the same request succeeded. This demonstrated the backend's retryable AI-error handling.

---

## 7. AI Input Validation and Error Handling

| ID     | Test                        | Expected Result                    | Actual Result             | Status |
| ------ | --------------------------- | ---------------------------------- | ------------------------- | ------ |
| VAL-01 | Unsupported AI output type  | Unsupported request is rejected    | `UNSUPPORTED_OUTPUT_TYPE` | PASS   |
| VAL-02 | Invalid explanation level   | Invalid level is rejected          | `INVALID_LEVEL`           | PASS   |
| VAL-03 | Missing explanation concept | Explanation generation is rejected | `MISSING_CONCEPT`         | PASS   |
| VAL-04 | Missing/inaccessible file   | AI request is rejected             | `FILE_NOT_FOUND`          | PASS   |
| VAL-05 | AI request without consent  | AI generation is rejected          | `CONSENT_REQUIRED`        | PASS   |

Supported AI output types were confirmed as:
• summary
• flashcards
• quiz
• explanation

Supported Concept Explanation levels were confirmed as:
• beginner
• intermediate
• advanced

---

## 8. Quiz Security and Validation Tests

A generated quiz containing six questions was used for quiz-attempt testing.

Successful Attempt
The first valid attempt produced:
• Output ID: 13
• Score: 6/6
• Percentage: 100%
• Separate attempt record created
• Per-question submitted and correct answers returned after submission

Partial / Retake Attempt
A second attempt contained:
• correct answers
• incorrect answers
• unanswered questions represented as null

The result was:
• Score: 2/6
• Percentage: 33%
• Separate attempt record created

The previous attempt remained available in quiz history.

| ID      | Test                                     | Expected Result                                            | Actual Result                    | Status |
| ------- | ---------------------------------------- | ---------------------------------------------------------- | -------------------------------- | ------ |
| QUIZ-01 | Submit valid quiz answers                | Server calculates and records score                        | 6/6 and 100% returned            | PASS   |
| QUIZ-02 | Retake same quiz                         | New attempt is stored without replacing previous attempt   | Second attempt stored separately | PASS   |
| QUIZ-03 | Submit unanswered questions using `null` | Request is accepted and unanswered questions are incorrect | 2/6 and 33% returned             | PASS   |
| QUIZ-04 | Retrieve attempt history                 | All attempts remain available                              | Both attempts returned           | PASS   |
| QUIZ-05 | Submit answers to a non-quiz AI output   | Request is rejected                                        | `NOT_A_QUIZ`                     | PASS   |
| QUIZ-06 | Submit wrong number of answer entries    | Request is rejected                                        | `ANSWER_COUNT_MISMATCH`          | PASS   |

Observed validation response:

{
  "status": "error",
  "code": "ANSWER_COUNT_MISMATCH",
  "message": "Expected 6 answers but received 1"
}

This confirms that scoring is performed and validated by the backend rather than trusted from frontend calculations.

---

## 9. Postman Collection Observation

During manual execution of the shared Postman collection, one issue was identified.

The normal quiz-attempt request originally contained three submitted answers, while the AI-generated quiz contained six questions.

This produced:

ANSWER_COUNT_MISMATCH
Expected 6 answers but received 3

After changing the request to provide six answer entries, the quiz attempt was accepted and scored correctly.

This finding was reported to Member 3 because the shared collection is intended to run automatically from top to bottom. The quiz-attempt request may need to dynamically generate an answer array that matches the number of questions returned by Gemini.

This was a Postman collection/test-data issue rather than a failure of the quiz backend validation.

---

## 10. Security Observations

The testing confirmed that:
• protected routes require JWT authentication;
• requests without a JWT are rejected;
• AI generation requires explicit AI-processing consent;
• revoked consent prevents AI generation;
• uploaded-document retrieval uses authenticated requests;
• inaccessible or nonexistent files are not returned;
• quiz attempts are associated with an existing quiz output;
• non-quiz outputs cannot be submitted as quizzes;
• quiz answer counts are validated by the backend;
• quiz scores are calculated by the backend;
• retakes are stored independently rather than overwriting previous attempts;
• sensitive authentication credentials and API keys are not required in frontend request bodies.

---

## 11. Testing Limitation

Cross-account ownership isolation was not independently repeated as part of this Member 1 manual Postman run.

The current test run verified authenticated access, inaccessible-file handling and authenticated document listing. Separate cross-user ownership testing should remain part of the backend/security test evidence where applicable.

---

## 12. Conclusion

Authentication and security testing completed by Member 1 confirmed that the main frontend-to-backend workflows are protected by JWT authentication and appropriate backend validation.

AI consent is enforced server-side, uploaded-material access requires authentication, AI inputs are validated, and quiz scoring and retake history are controlled by the backend.

All manually tested authentication, consent, uploaded-material, AI-validation and quiz-security cases produced the expected results.

The only issue identified during testing concerned static answer data in the shared Postman collection. The backend correctly rejected the invalid quiz submission, demonstrating that the validation mechanism itself was functioning correctly.