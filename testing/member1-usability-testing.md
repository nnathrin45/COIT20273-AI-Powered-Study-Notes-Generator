# Member 1 – Usability Testing

**Project:** AI-Powered Study Notes Generator  
**Unit:** COIT20273  
**Member:** Christian Jeff Labaddan  
**Role:** UI/UX and Frontend Integration  
**Testing Date:** 3 September 2026  
**Related Issue:** #53 – Conduct usability testing

---

## 1. Purpose

The purpose of this testing was to evaluate the usability of the AI-Powered Study Notes Generator from the perspective of a student using the application.

Testing focused on whether common tasks were understandable, navigation was clear, controls were easy to locate, messages were meaningful and users could move through the intended study workflow without unnecessary confusion.

---

## 2. Test Approach

A task-based usability walkthrough was performed using the current frontend implementation.

The application was used as if by a student completing common activities including:

- account registration;
- login;
- dashboard navigation;
- study material upload;
- AI consent management;
- AI study features;
- study planning;
- saved materials;
- progress review;
- sign out.

Testing also considered whether a newly registered student could complete the intended end-to-end workflow.

---

## 3. Usability Test Results

| Task | Result | Notes |
|---|---|---|
| Register | PASS | Registration fields, actions and navigation were clear. |
| Login | PASS | Email/password fields and Sign In action were easy to understand. |
| Dashboard | PASS | Main navigation and available features were easy to identify. |
| Upload Material | FINDING | File selection and validation were clear, but the upload action is not yet connected to the backend. |
| AI Consent | PASS | Consent information and controls were understandable. |
| Summary | BLOCKED for new-user end-to-end workflow | Requires an uploaded study material. |
| Flashcards | BLOCKED for new-user end-to-end workflow | Requires an uploaded study material. |
| Practice Quiz | BLOCKED for new-user end-to-end workflow | Requires an uploaded study material. |
| Concept Explanation | BLOCKED for new-user end-to-end workflow | Requires an uploaded study material. |
| Study Planner | PASS | Fields and study-planning controls were understandable. |
| Saved Materials | PASS for current UI | Search, filters and material controls were understandable. |
| Progress | PASS for current UI with finding | Information layout was understandable, but temporary sample data is currently displayed. |
| Sign Out | PASS | Sign Out was easy to locate and use. |

---

## 4. Usability Findings

### USABILITY-01 – Progress Page Displays Temporary Sample Data

**Observed behaviour**

A newly registered user immediately sees existing progress information such as uploaded materials, quiz results, generated resources and recent activity.

This information is currently hard-coded sample data rather than data associated with the logged-in student.

**Usability impact**

A new user may believe that the activity belongs to their account, which can cause confusion and reduce confidence in the accuracy of the Progress page.

**Recommended improvement**

Replace the temporary sample data with user-specific data from the backend Progress API.

For a new account with no activity, the page should provide appropriate zero values and empty states.

**Related work**

This is expected to be resolved through the frontend integration work for Issue #52 – Integrate Progress page with live data.

---

### USABILITY-02 – Upload Material Does Not Complete Backend Upload

**Observed behaviour**

The Upload Material page allows a student to:

- select a PDF, DOCX or TXT file;
- validate the file type;
- validate the maximum file size;
- remove a selected file.

However, clicking **Upload Material** currently performs only frontend validation.

The page displays the development message:

> File validated successfully. Backend upload integration will be added once the updated API is merged into the main branch.

The selected document is not sent to the backend.

**Usability impact**

The Upload Material button suggests that the document will be uploaded. A student may therefore believe that the operation has completed successfully when no actual upload has occurred.

This also prevents a newly registered user from naturally continuing to study-material-dependent features including:

- Summary;
- Flashcards;
- Practice Quiz;
- Concept Explanation.

**Recommended improvement**

Connect the Upload Material page to the backend upload API.

After a successful upload, display a user-facing confirmation such as:

> Study material uploaded successfully.

Backend errors should also be presented using clear user-facing messages.

---

## 5. Positive Usability Observations

The following aspects of the current interface were found to be clear and understandable:

- registration and login forms;
- sidebar navigation;
- descriptive page headings;
- AI consent information;
- Study Planner controls;
- Saved Materials page structure;
- Progress page organisation;
- Sign Out control;
- consistent styling and placement of buttons and form controls.

Navigation labels clearly describe the major functions available within the application.

---

## 6. Blocked End-to-End Workflows

The following workflows could not be fully validated for a newly registered user:

| Workflow | Reason |
|---|---|
| Upload → Summary | Upload frontend does not currently send the file to the backend. |
| Upload → Flashcards | Upload frontend does not currently send the file to the backend. |
| Upload → Practice Quiz | Upload frontend does not currently send the file to the backend. |
| Upload → Concept Explanation | Upload frontend does not currently send the file to the backend. |

These workflows should be regression-tested after the Upload Material frontend is connected to the backend.

---

## 7. Testing Limitations

Testing was conducted against the current development implementation.

The Progress page currently contains temporary sample data.

The Saved Materials page may require additional regression testing after final backend integration.

The Upload Material frontend is not currently connected to the backend upload operation, which prevented complete end-to-end testing of study-material-dependent AI functionality for a newly registered user.

Further usability regression testing should be performed after these integrations are completed.

---

## 8. Conclusion

Usability testing confirmed that the majority of the current frontend navigation, forms and controls are understandable and straightforward to use.

Two important usability findings were identified:

1. The Progress page displays temporary sample data that may appear to belong to a newly registered user.
2. The Upload Material page currently validates selected files but does not complete the backend upload operation.

The second finding blocks a new user's natural end-to-end path from uploading study material to generating summaries, flashcards, quizzes and concept explanations.

These findings should be resolved during the remaining frontend/backend integration work and regression-tested before final system completion.

Issue #53 usability testing is considered completed for the current development version, with the identified findings recorded for follow-up.