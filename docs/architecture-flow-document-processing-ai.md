# Architecture Flow — Document Processing & AI Integration
**Owner:** Member 3 (Natthapong Rinsakul)

The overall system is a client/server architecture: browser client, Express backend, external Gemini API, with MySQL and Firebase Cloud Storage as backend-side data stores. This documents Member 3's portion of that flow, contributing to the overall architecture led by Member 2.

1. The browser sends the file via an authenticated request to the Express backend.
2. Multer receives the multipart upload, checks type and size, and passes the file on for processing.
3. The Document Processing module selects a parser by file type (`pdf-parse` / `Mammoth.js` / `fs`) and extracts the text.
4. Extracted text is stored in MySQL; the original file is stored in Firebase Cloud Storage.
5. When a student requests a summary, flashcards, quiz or explanation, the AI Integration module checks for recorded consent, then builds a prompt from the extracted text and the requested content type.
6. The prompt is sent to the Gemini API; the response is parsed into the structured format for that feature and stored in MySQL, linked to the source document and user.
7. The backend returns the structured result to the frontend for display, with the AI-generated label applied.
