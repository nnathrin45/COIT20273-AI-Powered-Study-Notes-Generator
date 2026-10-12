# StudyAI — AI-Powered Study Notes Generator

**COIT20273 Capstone Project · CQUniversity Australia**

StudyAI (also referred to as **StudyA** in parts of the application) is a web-based, AI-assisted study platform. It helps students transform their own learning documents into **summaries, flashcards, practice quizzes and concept explanations** while supporting study planning, progress tracking and responsible AI use.

**Live application:** https://studyai-deployment.vercel.app  
**Source repository:** https://github.com/nnathrin45/COIT20273-AI-Powered-Study-Notes-Generator

> **Project status:** The frontend and backend have been deployed, the public login page is accessible, and the core document-upload and AI study workflows have been manually tested on the hosted system. StudyAI is an academic capstone application, not a commercially validated or fully load-tested service. See [Deployment and demonstration notes](#deployment-and-demonstration-notes) for current restrictions.

---

## Project overview and objectives

University students often need to review extensive lecture notes and readings, prepare revision resources, and revisit difficult concepts. Doing this manually can be time-consuming.

StudyAI aims to:

- Accept student-provided study materials in supported document formats.
- Generate several complementary revision resources from the uploaded content.
- Support different levels of study through difficulty/complexity settings.
- Help students organise study sessions and monitor their activity.
- Provide a responsive interface with account protection and responsible AI consent controls.

The system is intended to **support**, not replace, original course materials, independent reasoning or academic judgement. Generated content must be checked for accuracy.

## Project team

| Team member | Main responsibilities |
| --- | --- |
| **Christian Jeff Labaddan** | Business analysis and research; UI/UX and frontend development |
| **Nitish Rayapati** | Requirements and solution architecture; backend and database development |
| **Natthapong Rinsakul** | Project planning, risk and QA; document processing and AI integration |

Development and integration were collaborative, including frontend/backend communication, testing, documentation and final deployment preparation.

---

## Main features

### Authentication and account security

- Student registration and email-address verification.
- Email/password login with a verification-code (two-step authentication) workflow.
- Forgot-password and verification-code-based password reset.
- Password hashing with `bcrypt` and authentication with JSON Web Tokens (JWT).
- Protected React routes and authenticated backend endpoints.
- Invalid or expired session handling, sign-out and account-specific resource access checks.
- Theme-aware verification and password-reset email templates.

The email service supports **Nodemailer/SMTP** and **Resend's HTTPS API**, selected through environment configuration. See [Email and demonstration limitations](#email-and-demonstration-limitations).

### Study material upload and management

Students can upload **PDF, DOCX and TXT** documents. Backend processing includes supported-file and size validation, text extraction, detection of unreadable or image-only documents, and user-specific access controls. Uploaded materials can be retrieved or deleted by their owning account.

The application includes a **Study Material Details** page for viewing information about an uploaded file and its generated study resources.

### AI-powered learning tools

| Feature | Purpose |
| --- | --- |
| **AI Summary** | Produces a structured summary of uploaded study content. |
| **Flashcards** | Generates question-and-answer revision cards. |
| **Practice Quiz** | Generates multiple-choice questions, accepts answers, calculates scores, displays results and supports retakes. |
| **Concept Explanation** | Explains a selected concept using the student's source material, with follow-up questions and conversation history. |

**Flashcards, Practice Quiz and Concept Explanation** provide **Beginner, Intermediate and Advanced** levels. These levels change how content is requested from the AI; they are not formally validated assessments of a student's proficiency.

Concept Explanation also includes conversation creation, retrieval, renaming and deletion, plus support for supplementary documents associated with an explanation conversation. Availability and results depend on the uploaded material and the external AI service.

### Study productivity tools

- **Dashboard:** Overview of user activity and study-related information.
- **Study Planner:** Create and manage study plans, with individual plan-detail pages and backend persistence.
- **Study session notifications:** Backend notification routes and reminder-processing logic are implemented. Reminder email and worker operation depend on deployment configuration.
- **Progress:** Displays activity and quiz-performance information from application data.
- **Profile:** User profile and related account controls.
- **Saved Materials:** The page and related code are present, but **the navigation/route is currently disabled** in `frontend/src/featureFlags.js` (`SHOW_SAVED_MATERIALS = false`). It should not be presented as an active page in the current build.

### Responsive interface and appearance

- Responsive layouts for desktop and mobile use.
- **Dark Mode** as the default, with a **Light Mode** option.
- Theme support across principal app screens, authentication flows and supported email templates.
- Work on keyboard accessibility, feedback messages and usable loading/error states.

### Responsible AI and privacy

StudyAI includes explicit AI-processing consent, the ability to grant or revoke consent, user-specific ownership checks, and labelling that identifies AI-generated content. Uploaded documents are handled separately from permission to send their contents for AI processing.

AI outputs can contain mistakes or omissions. Students should compare generated content with their original materials. Do not upload sensitive information without understanding the applicable data-processing and privacy implications.

### Reliability and error handling

The backend and frontend provide handling for invalid inputs or verification codes, expired sessions, unsupported or unreadable files, missing resources, malformed AI responses, Gemini service failures, rate limits, quota limits and request timeouts. Where supported, the interface presents understandable errors and retry opportunities.

---

## Technology stack

| Layer | Main technologies |
| --- | --- |
| Frontend | React 19, Vite, JavaScript, Tailwind CSS, React Router, Recharts |
| Backend | Node.js, Express 5, REST APIs, Multer, JWT, bcrypt |
| Database | MySQL, `mysql2` |
| Document extraction | `pdf-parse`, Mammoth (DOCX), native TXT processing |
| AI | Google Gemini through the Google GenAI SDK |
| Email | Nodemailer (SMTP) or Resend (HTTPS API) |
| Hosting | Vercel (frontend), Railway (backend and MySQL) |
| Development and QA | Git, GitHub, Issues, Pull Requests, Node.js test runner, Postman, browser developer tools, Lighthouse |

## High-level architecture

```text
Student's browser
       |
       v
Vercel — React / Vite frontend
       |
       | HTTPS requests to REST API
       v
Railway — Node.js / Express backend
       |             |                |
       v             v                v
Railway MySQL   Persistent file    Google Gemini
  database      storage volume       AI service
                     |
                 Uploads and
                 profile images

Backend email delivery: SMTP (Nodemailer) or Resend HTTPS API
```

- The frontend is a client-side single-page application. `frontend/vercel.json` rewrites frontend routes to `index.html`, allowing direct links and refreshes without the former 404 error.
- The backend uses `FRONTEND_URL` to restrict the accepted frontend origin in production.
- In production, `STUDYAI_STORAGE_DIR` points to a persistent storage directory, so uploads are not dependent on an ephemeral container filesystem.
- The production MySQL database is separate from any developer's local MySQL database.

---

## Run locally

**Prerequisites:** A compatible Node.js installation, npm, a running MySQL server, and credentials for the email/AI workflows you intend to test. A Gemini API key is required for live AI generation.

### 1. Clone the repository

```bash
git clone https://github.com/nnathrin45/COIT20273-AI-Powered-Study-Notes-Generator.git
cd COIT20273-AI-Powered-Study-Notes-Generator
```

### 2. Prepare the database

Create a local MySQL database matching the configured `DB_NAME` (the sample configuration uses `study_notes_db`), then import the tables in [`database/schema.sql`](database/schema.sql). For example, from the MySQL interactive client:

```sql
CREATE DATABASE IF NOT EXISTS study_notes_db;
USE study_notes_db;
SOURCE /absolute/path/to/COIT20273-AI-Powered-Study-Notes-Generator/database/schema.sql;
```

Replace the example path with the actual location of `schema.sql` and use the path syntax supported by your MySQL client.

### 3. Configure and start the backend

```bash
cd backend
npm ci
```

Copy `backend/.env.example` to `backend/.env` and provide valid values for at least the database settings, `JWT_SECRET`, `FRONTEND_URL`, and any AI/email functionality you plan to test.

```bash
npm run dev
```

The sample backend listens on `http://localhost:5000` unless `PORT` is configured differently. Do **not** commit the `.env` file, API keys, passwords or other secrets.

### 4. Start the frontend

In a separate terminal from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

The frontend uses `http://localhost:5000` as the fallback API base URL. If needed, configure `VITE_API_BASE_URL` in a local frontend environment file to point to the backend you are using.

### 5. Run checks

```bash
# From backend/
npm run test:unit       # backend unit tests
npm test                # regression tests; integration cases need local test prerequisites

# From frontend/
npm run build           # production frontend build
```

For additional integration/final-verification instructions, see [`backend/tests/README.md`](backend/tests/README.md). **Caution:** `npm run test:final` generates or updates evidence and reports under `testing/`; do not run it merely to inspect existing assessment evidence.

---

## Deployment and demonstration notes

### Live deployment

| Service | Address / configuration |
| --- | --- |
| **Frontend** | https://studyai-deployment.vercel.app |
| **Backend API** | https://studya-backend-production.up.railway.app |
| **Frontend host** | Vercel project `studyai-deployment`; root directory `frontend`; Vite build output `dist` |
| **Backend host** | Railway service `studya-backend` |
| **Database** | Railway-hosted MySQL |
| **Persistent storage** | Railway backend volume mounted at `/data`; `STUDYAI_STORAGE_DIR=/data` |

The app was manually checked on its live deployment for account login, document upload, AI Summary, Flashcards, Practice Quiz and Concept Explanation. The three difficulty levels were exercised for Flashcards, Practice Quiz and Concept Explanation, and a Vercel route-refresh problem was fixed and retested. The public login page was checked in a private/incognito browser session.

These checks demonstrate functioning core workflows, **not** guaranteed uptime, comprehensive penetration testing or tested support for large numbers of simultaneous users. Availability is subject to the hosting providers' plans, credits, resource limits and external services.

### Deployment configuration overview

**Frontend (Vercel):**

- Build from the `frontend` root directory with `npm run build` and publish `dist`.
- Set `VITE_API_BASE_URL` to the deployed backend API origin.
- Keep `frontend/vercel.json` for client-side route refreshes.

**Backend (Railway):**

- Start with `npm start` (`node src/server.js`).
- Supply MySQL connection settings (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) using the Railway database configuration.
- Set `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL` and `STUDYAI_STORAGE_DIR`.
- Configure `GEMINI_API_KEY` and, when needed, `GEMINI_MODEL`.
- Configure either SMTP email variables or `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` and `RESEND_FROM_ADDRESS`.
- The deployed demonstration environment uses `STUDY_REMINDER_WORKER_ENABLED=false`; automatic reminder processing should not be represented as active there.

Environment settings and credentials belong in the hosting providers' protected variable settings, **not in the Git repository**. The tracked `backend/.env.example` primarily illustrates the local SMTP setup and does not list every production-only option mentioned above.

### Email and demonstration limitations

The current production email provider uses Resend's testing sender (`onboarding@resend.dev`). This is suitable for the configured test-recipient workflow but generally **does not support sending verification emails to arbitrary new users** without verifying an appropriate sending domain.

For the capstone evaluation, prepare an **existing demonstration account** and share its credentials privately with the assessors. Confirm in advance how any login verification code will be obtained. Do not put demo credentials, verification codes or API keys in this README.

### Known limitations and future improvements

- AI-generated content is not guaranteed to be factually correct; larger evaluations of educational effectiveness are still needed.
- The present Resend test sender limits independent registration by other email addresses.
- The **Saved Materials** frontend route is disabled by a feature flag in the uploaded source snapshot.
- Study reminder worker execution is disabled in the demonstrated Railway environment.
- No large-scale load/performance results are claimed.
- After the critical `proxy-addr` issue was patched, the production dependency audit still reported **three moderate findings** in the `mammoth` / `argparse` / `sprintf-js` dependency chain. These require further review without forcing an incompatible downgrade.

---

## Testing and verification

Testing evidence is stored in [`testing/`](testing/) and [`backend/tests/`](backend/tests/).

| Check | Recorded result | Scope |
| --- | --- | --- |
| Automated regression suite | **71 / 71 passed** | Historical verification record in `testing/reports/summary.json` (26 September 2026) |
| Final verification suite | **33 / 33 passed** | Same report; evidence covering AI, document processing, privacy/consent, errors and quality pipeline |
| Backend unit tests after security patch | **64 / 64 passed** | Local verification during the October 2026 deployment work |
| Frontend production build | **Passed** | Development verification and subsequent Vercel production deployment |
| Production smoke tests | **Core workflows succeeded** | Login, document upload, summary, flashcards, quiz, concept explanation and route refresh |

The regression and unit results refer to **different test selections and verification runs**; they should not be added together or presented as one single run. The archived reports document their own recorded dates and scope.

Testing areas also included authentication, consent enforcement, input and upload validation, cross-user access protection, PDF/DOCX/TXT extraction, AI timeouts and quotas, quiz scoring, responsive behaviour, accessibility and error handling. See the files under `testing/` for the available evidence; not every functionality has been independently reverified on the current production deployment.

The tests do not prove that generated text is always accurate. The application also relies on the availability and behaviour of Google Gemini.

---

## Repository structure

The following is a **condensed view** of the uploaded repository snapshot (rather than an exhaustive listing of every file):

```text
COIT20273-AI-Powered-Study-Notes-Generator/
├── backend/
│   ├── src/
│   │   ├── config/             # MySQL and storage configuration
│   │   ├── controllers/        # Auth, upload, AI, planner, notifications, progress
│   │   ├── middleware/         # Authentication and upload handling
│   │   ├── routes/             # REST endpoint definitions
│   │   ├── services/           # Gemini, email, extraction, reminders and activity
│   │   └── server.js
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── final/
│   │   └── helpers/
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
├── database/
│   └── schema.sql
├── docs/                    # API, architecture, requirements and project reports
├── frontend/
│   ├── public/               # Icons and illustration media
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/            # Auth, dashboard, learning tools and details pages
│   │   ├── services/         # Frontend API clients
│   │   ├── featureFlags.js   # Saved Materials toggle
│   │   └── App.jsx           # Frontend routes
│   ├── vercel.json           # React/Vite route rewrite
│   ├── package.json
│   └── package-lock.json
├── meeting-notes/
├── testing/
│   ├── evidence/
│   ├── fixtures/
│   ├── manual-verification/
│   ├── reports/
│   └── *.md                  # Test logs and member verification notes
├── .gitignore
└── README.md
```

The repository separates the frontend, backend, schema, documentation and testing assets. Local environment files, dependency folders, runtime uploads and deployment credentials must remain outside version control.

## Main student workflow

```text
Existing account / registration (where email delivery is available)
    ↓
Sign in and complete login verification
    ↓
Dashboard → Upload PDF / DOCX / TXT
    ↓
Review AI-processing consent
    ↓
Choose a study activity:
    AI Summary | Flashcards | Practice Quiz | Concept Explanation
    ↓
Review generated content and, where relevant, answer quiz questions
    ↓
Use study plans, progress tracking and available material-management pages
    ↓
Sign out
```

## Collaboration and project history

The team used feature branches, incremental commits, GitHub Issues, Pull Requests, review and testing before merging into the shared `main` branch. The cloud-deployment changes were merged through **Pull Request #137**, including persistent backend storage configuration, the Resend email integration, the `proxy-addr` security patch and Vercel route rewrites.

The repository's Git history, technical documentation and testing artefacts provide additional evidence of the development and integration process.

## Academic context

Developed for **COIT20273 — Capstone Project**, **CQUniversity Australia**, as a collaborative academic application. Its functionality demonstrates requirements analysis, UI/UX design, software implementation, database and API integration, AI-assisted content generation, testing, and cloud deployment.

**Source code:** https://github.com/nnathrin45/COIT20273-AI-Powered-Study-Notes-Generator  
**Live application:** https://studyai-deployment.vercel.app
