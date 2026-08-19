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

---

## Main System Features

### Authentication
- Student registration
- Student login
- JWT-based authentication
- Protected application routes
- Sign Out

### Study Material
- PDF upload
- DOCX upload
- TXT upload
- File-type and file-size validation

### AI Study Features
- Summary generation
- Flashcard generation
- Practice quiz generation
- Concept explanation

### Student Tools
- Personalised Study Planner
- Saved Materials
- Progress Tracking

### Responsible AI
- Explicit AI consent
- AI-generated content labelling
- Accuracy / verification warnings
- Separation between document upload and AI processing consent

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

