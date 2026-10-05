# StudyA — AI-Powered Study Notes Generator

StudyA is an AI-powered study support web application developed for the **COIT20273 Capstone Project** at CQUniversity.

The application is designed to help university students transform uploaded study materials into useful learning resources such as summaries, flashcards, practice quizzes and concept explanations. It also provides study planning, saved-material management and progress-tracking functionality within a single student-focused platform.

---

## Project Overview

University students often work with large amounts of lecture notes, readings and study documents. Reviewing and converting this material into useful revision resources can be time-consuming.

StudyA addresses this problem by allowing students to upload supported study documents and use AI-assisted tools to generate structured learning content.

The system combines:

- Document upload and text extraction
- AI-assisted study-content generation
- Authentication and account security
- Responsible AI consent controls
- Study planning and material management
- Student progress tracking
- Responsive and accessible user interfaces

StudyA is intended to support student learning rather than replace academic judgement or independent study.

---

## Project Team

| Team Member | Main Responsibilities |
| --- | --- |
| **Christian Jeff Labaddan** | Business Analysis / Research, UI/UX and Frontend Development |
| **Nitish Rayapati** | Requirements / Solution Architecture, Backend and Database Development |
| **Natthapong Rinsakul** | Project Planning / Risk / QA, Document Processing and AI Integration |

Development was completed collaboratively, with integration between the frontend, backend, database, document-processing and AI components.

---

## Main System Features

### Authentication and Account Security

StudyA includes a complete student authentication workflow:

- Student registration
- Email-address verification
- Secure login
- Login verification code / two-factor authentication workflow
- Forgot Password functionality
- Password-reset verification code
- Secure password-reset workflow
- Resend verification-code support
- JWT-based authentication
- Password hashing using bcrypt
- Protected frontend routes
- Protected backend API endpoints
- Sign Out and session clearing
- Invalid and expired authentication handling
- User-specific resource isolation
- Cross-user access protection

Authentication-related emails also support the application's Light and Dark themes.

---

### Study Material Management

Students can upload their own study documents for processing.

Supported document formats include:

- PDF
- DOCX
- TXT

The system provides:

- File-type validation
- File-size validation
- Text extraction
- Detection of unreadable or image-only documents
- User-specific uploaded-material storage
- Retrieval of previously uploaded materials
- Secure uploaded-file deletion
- Protection against accessing or deleting another user's uploaded documents

Uploaded study material remains associated with the authenticated student.

---

### AI-Powered Study Features

Students can generate multiple types of study content from their uploaded material.

#### AI Summary

Generates a structured summary of the selected study material to support revision and review.

#### AI Flashcards

Generates question-and-answer flashcards from uploaded study content.

#### Practice Quiz

Generates practice questions based on the student's uploaded material.

The quiz functionality includes:

- AI-generated questions
- Multiple-choice answers
- Quiz submission
- Automatic marking
- Score calculation
- Per-question results
- Support for quiz retakes

#### Concept Explanation

Allows students to request an AI-generated explanation of a particular concept from their uploaded material.

Different explanation levels can be selected to support different levels of understanding.

---

## Student Productivity Tools

### Study Planner

Students can create and manage study-planning activities through the Study Planner interface.

Study-planning information is connected to backend persistence rather than temporary frontend-only data.

### Saved Materials

Students can access study materials and generated learning content associated with their account.

### Progress Tracking

The Progress page presents student study activity and performance information using live application data.

### Dashboard

The Dashboard provides an overview of student activity and key study statistics.

---

## Light and Dark Theme

StudyA provides both **Dark Mode** and **Light Mode**.

Dark Mode is the default application theme, while students can switch between the two modes using the application theme control.

Theme support has been implemented across the major StudyA interfaces, including:

- Dashboard
- Upload Material
- Summary
- Flashcards
- Practice Quiz
- Concept Explanation
- Study Planner
- Saved Materials
- Progress
- Profile
- Privacy and AI Consent
- Login
- Registration
- Email Verification
- Login Verification
- Forgot Password

The selected theme is retained between sessions.

Authentication emails also preserve the selected StudyA theme where applicable, including:

- Registration verification emails
- Login verification-code emails
- Password-reset emails

---

## Responsible AI and Privacy

Responsible AI and student privacy are important parts of StudyA.

The application includes:

- Explicit AI-processing consent
- Consent checking before AI generation
- Support for granting and revoking AI consent
- Separation between document upload and AI-processing consent
- Responsible AI labelling
- Clear indication that generated content is AI-assisted
- User-specific document and AI-output isolation
- Protection against cross-user resource access
- Secure handling of authentication information
- Prevention of credentials being exposed through API responses
- Controlled handling of upstream AI errors

Students remain responsible for reviewing AI-generated study content for accuracy and suitability.

---

## Error Handling and Reliability

StudyA includes error-handling behaviour across the major student workflows.

The application handles situations including:

- Invalid login credentials
- Missing or expired authentication
- Invalid verification codes
- Expired verification sessions
- Unsupported uploaded-file types
- Oversized uploaded files
- Empty or unreadable documents
- Image-only/scanned PDFs without readable text
- Missing application resources
- Temporary AI-service failures
- AI request timeouts
- AI rate limits
- AI daily quota limits
- Malformed or empty AI responses
- Backend or upstream service unavailability

Where appropriate, students receive clear feedback and retry options without losing their uploaded study document.

---

## Technology Stack

### Frontend

- React 19
- Vite
- JavaScript
- Tailwind CSS
- React Router
- Recharts

### Backend

- Node.js
- Express.js
- REST APIs
- JSON Web Tokens
- bcrypt
- Multer

### Database

- MySQL
- mysql2

### Document Processing

- pdf-parse
- Mammoth
- Native TXT processing

### AI Integration

- Google Gemini
- Google GenAI SDK

### Email and Authentication Services

- Nodemailer
- Email verification codes
- Login verification codes
- Password-reset verification codes

### Development and Quality Tools

- Git
- GitHub
- GitHub Issues
- GitHub Pull Requests
- Node.js automated testing
- Vite production build verification
- Browser developer tools
- Lighthouse accessibility evaluation

---

## Project Structure

```text
COIT20273-AI-Powered-Study-Notes-Generator/
|
|-- backend/
|   |-- src/
|   |-- tests/
|   |-- package.json
|
|-- database/
|   |-- schema.sql
|
|-- docs/
|
|-- frontend/
|   |-- src/
|   |   |-- assets/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- services/
|   |-- package.json
|
|-- meeting-notes/
|
|-- testing/
|   |-- evidence/
|   |-- reports/
|
|-- .gitignore
|-- README.md
```

The project separates frontend, backend, database, documentation and testing artefacts to support maintainability and team collaboration.

---

## Live Application

StudyA is being prepared for live deployment ahead of the final project demonstration.

**Live Application:** Deployment URL will be added here once the production deployment is available.

The deployed application will be used for the final StudyA demonstration and system evaluation.

---

## Testing and Verification

StudyA has been tested throughout development using automated testing, integration testing and manual frontend verification.

### Latest Verified Results

The latest verified checks include:

- **Backend automated regression tests: 71 / 71 passed**
- **Backend test failures: 0**
- **Frontend production build: passed**
- Registration and authentication workflows manually verified
- Login verification / 2FA workflow manually verified
- Forgot Password and password-reset workflow manually verified
- Light Mode password-reset email manually verified
- Light/Dark Theme behaviour manually verified
- Theme-aware authentication emails manually verified

The frontend production build completes successfully. The existing Vite large-chunk advisory is non-blocking and does not prevent successful production compilation.

---

## Testing Areas

Testing and evaluation performed during development includes:

- Authentication testing
- Registration validation
- Email verification
- Login verification / 2FA
- Forgot Password and password reset
- Protected-route testing
- Invalid and expired authentication handling
- User-specific data-isolation testing
- Cross-user resource-access testing
- Uploaded-file ownership testing
- Upload validation
- Unsupported-file testing
- File-size validation
- Unreadable-document handling
- PDF, DOCX and TXT processing
- AI consent enforcement
- AI Summary generation
- AI Flashcard generation
- Practice Quiz generation
- Quiz submission and scoring
- Concept Explanation generation
- Saved Materials integration
- Study Planner integration
- Progress integration
- Dashboard integration
- Uploaded-file deletion
- AI timeout handling
- AI retry and recovery behaviour
- Accessibility testing
- Keyboard-navigation testing
- Responsive-interface testing
- Cross-browser testing
- Usability testing
- Frontend regression testing
- Production frontend build verification

Testing evidence and generated reports are maintained in the repository's `testing/` directory.

---

## Current Final Testing Status

### Completed

- Frontend feature implementation
- Frontend/backend integration
- Frontend/AI integration
- Authentication interface integration
- Email verification workflow
- Login 2FA workflow
- Forgot Password workflow
- Light/Dark Theme implementation
- Theme-aware authentication emails
- Frontend production build verification
- Backend automated regression testing
- Major frontend usability testing
- Accessibility review
- Responsive-interface testing
- Cross-browser frontend testing
- Frontend regression testing
- AI error/recovery verification

### Final Team Stage

The project is currently in its final team integration and verification stage.

Remaining team activity focuses on:

- Final full-system testing across all application pages
- End-to-end workflow verification
- Final UI consistency review
- Testing the deployed production environment
- Recording and resolving any issues identified during final system testing
- Preparing the application for the final demonstration

This distinction ensures that completed subsystem testing is documented without representing the final whole-team system verification as complete before that activity has been performed.

---

## Main Student Workflow

A typical StudyA workflow is:

```text
Register
   |
Verify Email
   |
Login
   |
Login Verification
   |
Dashboard
   |
Upload Study Material
   |
AI Consent
   |
Generate Study Content
   |
Summary / Flashcards / Practice Quiz / Concept Explanation
   |
Saved Materials / Study Planner
   |
Progress
   |
Sign Out
```

Students can return to previously uploaded materials and generated study resources through their authenticated account.

---

## Git and Development Workflow

The project was developed collaboratively using Git and GitHub.

The team used:

- Separate feature branches
- Incremental commits
- GitHub Issues for task tracking
- Pull Requests for integration
- Code review before merging
- Testing before and after integration
- A shared `main` branch for completed work
- Repository documentation and testing artefacts for evidence

Completed feature branches were merged into `main` through Pull Requests. Obsolete branches may be removed after verification that their work has been safely merged, while the Git commit and Pull Request history remains preserved.

---

## Repository

**GitHub Repository:**  
https://github.com/nnathrin45/COIT20273-AI-Powered-Study-Notes-Generator

The repository contains the application source code, database schema, project documentation, meeting notes, testing evidence and verification reports.

---

## Academic Project

StudyA was developed as part of:

**COIT20273 — Capstone Project**

**CQUniversity Australia**

The project demonstrates the analysis, design, implementation, integration and evaluation of an AI-supported information technology solution.

The application was developed for academic purposes as a collaborative capstone project.
