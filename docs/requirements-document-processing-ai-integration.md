# Requirements — Document Processing & AI Integration Subsystems
**Owner:** Member 3 (Natthapong Rinsakul) — refined from Assessment 1 Part A, Week 4 Workshop

## System Requirements

- **SR-DP1:** The system shall provide an interface for accepting file uploads in PDF, DOCX and TXT formats.
- **SR-DP2:** The system shall verify uploaded file type and size against defined limits before processing.
- **SR-DP3:** The system shall extract readable text content from accepted files for downstream AI processing.
- **SR-DP4:** The system shall reject or flag files that do not contain a machine-readable text layer (e.g. scanned images), consistent with the project's decision to exclude OCR from scope.
- **SR-AI1:** The system shall construct a request to the Gemini API using the extracted document text and a task-specific prompt (summary, flashcards, quiz, or explanation).
- **SR-AI2:** The system shall only transmit content to the Gemini API after the user has given explicit consent.
- **SR-AI3:** The system shall parse the Gemini API response into the structured format required by each feature.
- **SR-AI4:** The system shall label all AI-generated output and record which requirement type generated it.

## Functional Requirements (refined from FR6, FR8–FR12, FR16, FR17)

- **FR6.1:** On upload, check the file extension against an allow-list (.pdf, .docx, .txt) and reject any other extension with a clear error message.
- **FR6.2:** Reject files larger than 15 MB before the upload completes, using Multer's `fileSize` limit.
- **FR8.1:** For PDF files, use `pdf-parse` to extract text from all text-bearing pages.
- **FR8.2:** For DOCX files, use `Mammoth.js` to extract text, discarding formatting not needed for AI processing.
- **FR8.3:** For TXT files, read the file content directly using Node.js File System (`fs`).
- **FR8.4:** If text extraction returns an empty or near-empty result, notify the user the file could not be processed and suggest re-uploading a text-based document.
- **FR9.1:** Send extracted text to Gemini with a prompt requesting a concise summary of key concepts and definitions.
- **FR10.1:** Send extracted text with a prompt requesting question-answer pairs, and parse the response into individual flashcard records.
- **FR11.1:** Send extracted text with a prompt requesting multiple-choice and true/false questions, each with a marked correct answer.
- **FR11.2:** Store quiz questions, correct answers and, once attempted, the user's submitted answers and score.
- **FR12.1:** Accept a user-selected explanation level (beginner, intermediate, advanced) and include it in the prompt sent to Gemini.
- **FR16.1:** Every generated summary, flashcard set, quiz and explanation shall carry a visible "AI-generated" label with a short disclaimer.
- **FR17.1:** Before the first transmission of a user's document content to Gemini, display the data-handling conditions and require an explicit "I agree" action before proceeding.
- **FR17.2:** Allow the user to revoke consent, stopping further AI processing of their existing content.

## Non-Functional Requirements (refined from NFR1, NFR3, NFR5, NFR11)

- **NFR1 refinement (Performance):** within the overall 60-second budget, upload and validation should complete within 5 seconds for files up to 15 MB; text extraction within 5 seconds for a 10-page document; remaining time is the Gemini API round-trip.
- **NFR3 refinement (Privacy):** extracted text and uploaded files must be associated only with the uploading user's account, and access-controlled so no other user or unauthenticated request can retrieve them.
- **NFR5 refinement (Reliability):** if the Gemini API call fails or times out, retain the uploaded file and extracted text, display a clear retry option, and do not require the user to re-upload the file.
- **NFR11 refinement (AI data handling):** consent must be recorded as a timestamped flag before any transmission, and this record must be available in audit form.

## Quality Standards & Metrics

- **Extraction accuracy (FR8):** text extraction must succeed with no missing sections, verified by manually comparing extracted text against at least 3 source documents.
- **Performance (NFR1):** end-to-end time for summary generation across 3 test documents must average under 60 seconds, with no individual run exceeding 90 seconds.
- **AI output accuracy (FR9–FR12, risk R1):** across 3–5 test documents with known content, at least 4 of 5 generated summaries/quizzes must be verified accurate — no invented facts, key concepts represented — by manual review against the source.
- **Consent enforcement (FR17/NFR11):** 100% of test attempts to trigger AI generation without recorded consent must be refused.
- **AI-output labelling (FR16):** 100% of AI-generated content shown in the interface must carry the AI-generated label and disclaimer, verified by inspection across all four content types.
