# COIT20273 – AI-Powered Study Notes Generator

## Project Overview

The **AI-Powered Study Notes Generator** is a capstone project developed for **COIT20273 – Software Design and Development Project** at Central Queensland University.

The application is designed to help university students transform uploaded study materials into reusable and interactive learning resources.

Students can upload study documents and use the system to access features such as:

- AI-generated summaries
- Flashcards
- Practice quizzes
- Concept explanations
- Personalised study planning
- Saved study materials
- Uploaded-material management
- Study progress tracking

The project also incorporates user authentication, responsive UI design, document processing, responsible use of Generative AI, and explicit AI consent.

---

## Team

| Member | Primary Responsibility |
|---|---|
| Member 1 – Christian Jeff Labaddan | Business Analysis / Research + UI/UX and Frontend Development |
| Member 2 – Nitish Rayapati | Requirements / Solution Architecture + Backend and Database Development |
| Member 3 – Natthapong Rinsakul | Project Planning / Risk / QA + Document Processing and AI Integration |

---

## Technology Stack

### Frontend
- React.js
- Tailwind CSS
- React Router

### Backend
- Node.js
- Express.js

### Database
- MySQL

### AI
- Google Gemini API

### Authentication
- JSON Web Token (JWT)
- BCrypt

### Development and Testing
- GitHub
- Visual Studio Code
- Postman
- Node.js automated test runner
- Vite production build verification
- npm dependency security audit
- Chrome DevTools
- Google Chrome
- Microsoft Edge
- Mozilla Firefox

## Testing and Verification
The project is progressively verified through automated and manual testing.
Current verification includes:
- 71 / 71 backend automated tests passing
- Frontend production build passing
- Backend dependency audit reporting 0 known vulnerabilities after remediation
- Authentication and protected-route testing
- Cross-user data-isolation testing
- Upload validation and document-processing error testing
- Uploaded-material deletion testing
- AI failure and retry testing
- Usability testing
- Accessibility testing
- Responsive and cross-browser testing
Detailed testing evidence is maintained in the `testing/` directory.

---

## Main System Features

### Authentication and User Security
- Student registration and login
- JWT-based authentication
- Protected application routes and APIs
- Sign Out and session clearing
- Invalid/missing authentication handling
- User-specific data isolation
- Cross-user access protection

### Study Material
- PDF upload
- DOCX upload
- TXT upload
- File-type validation
- 15 MB file-size validation
- Empty and unreadable document detection
- Authenticated uploaded-material listing
- Secure uploaded-material deletion
- User-specific uploaded-document ownership

### AI Study Features
- AI-generated summaries
- AI-generated flashcards
- Practice quiz generation and scoring
- Concept explanations
- Loading and generation states
- Retry handling for temporary failures
- AI timeout and service-unavailable handling
- AI rate-limit and daily-quota feedback

### Student Tools
- Personalised Study Planner
- Saved Materials
- Progress Tracking

### Responsible AI
- Explicit AI processing consent
- Separation between document upload and AI processing consent
- Consent grant and revoke workflow
- AI-generated content labelling
- Accuracy and verification warnings
- Uploaded documents retained when AI generation fails
- Clear AI rate-limit, timeout and quota feedback
- Privacy guidance for uploaded documents

### Security and Error Handling
- Password hashing with bcrypt
- JWT-protected backend endpoints
- Invalid authentication session handling
- Automatic removal of invalid frontend authentication tokens
- User ownership checks for protected resources
- Parameterised database queries
- Secure uploaded-file deletion
- Unsupported file-type handling
- Oversized-file handling
- Empty/unreadable-document handling
- Missing-resource handling
- Temporary backend/network failure recovery
- AI rate-limit and quota handling
- 
---

## Project Structure

```text
COIT20273-AI-Powered-Study-Notes-Generator/
│
├── backend/
│   └── Express backend and REST API
│
├── database/
│   └── Database scripts and schema
│
├── docs/
│   └── Project documentation
│
├── frontend/
│   └── React frontend application
│
├── meeting-notes/
│   └── Team meeting records
│
├── testing/
│   └── Testing documentation and results
│
└── README.md

