const fs = require("fs");
const path = require("path");
const db = require("../config/database");
const { extractTextFromPDF } = require("../services/pdf.service");
const { extractTextFromDOCX } = require("../services/docx.service");
const { extractTextFromTXT } = require("../services/txt.service");
const { hasActiveConsent } = require("../services/consent.service");
const { generate } = require("../services/ai.service");
const { logActivity } = require("../services/activity.service");

const SUPPORTED_TYPES = ["summary", "flashcards", "quiz", "explanation"];

// Types whose content is a structured record set rather than prose. Stored as
// JSON text in ai_outputs.content and returned parsed so the interface does
// not have to know the storage format.
const STRUCTURED_TYPES = ["flashcards", "quiz"];
const removeExplanationSourceFile =
  async (storedPath) => {
    if (!storedPath) {
      return;
    }

    /*
     * Never trust a stored path directly when deleting.
     * Rebuild the location inside the known uploads folder
     * using only the stored basename.
     */
    const uploadDirectory =
      path.resolve(
        __dirname,
        "../uploads"
      );

    const physicalFilePath =
      path.resolve(
        uploadDirectory,
        path.basename(storedPath)
      );

    try {
      await fs.promises.unlink(
        physicalFilePath
      );
    } catch (fileError) {
      if (fileError.code !== "ENOENT") {
        console.error(
          "Explanation supplementary file cleanup error:",
          fileError
        );
      }
    }
  };


const extractExplanationSourceText =
  async (
    filePath,
    originalName
  ) => {
    const extension =
      path
        .extname(originalName)
        .toLowerCase();

    switch (extension) {
      case ".pdf":
        return extractTextFromPDF(
          filePath
        );

      case ".docx":
        return extractTextFromDOCX(
          filePath
        );

      case ".txt":
        return extractTextFromTXT(
          filePath
        );

      default: {
        const error =
          new Error(
            "Unsupported supplementary file type"
          );

        error.code =
          "UNSUPPORTED_FILE_TYPE";

        throw error;
      }
    }
  };


// Generate AI content from a previously uploaded document (FR9-FR12, FR16, FR17)
const generateOutput = async (req, res) => {
  try {
    const { file_id, output_type, concept, level, chat_id } = req.body;

    if (!file_id) {
      return res.status(400).json({
        status: "error",
        code: "MISSING_FILE_ID",
        message: "A file_id is required"
      });
    }

    if (!SUPPORTED_TYPES.includes(output_type)) {
      return res.status(400).json({
        status: "error",
        code: "UNSUPPORTED_OUTPUT_TYPE",
        message: `output_type must be one of: ${SUPPORTED_TYPES.join(", ")}`
      });
    }

    // FR17.1 - consent is checked before the document is read, so no content is
    // loaded into memory for a user who has not agreed. Checked on every request
    // because consent can be revoked at any time (FR17.2).
    const consented = await hasActiveConsent(req.user.user_id);

    if (!consented) {
      return res.status(403).json({
        status: "error",
        code: "CONSENT_REQUIRED",
        message:
          "AI processing requires your consent. Please review and accept the " +
          "data handling conditions before generating content."
      });
    }

    // NFR3 - scoped to the requesting user, so one user cannot generate content
    // from another user's document
    const [files] = await db.execute(
      `SELECT file_id, file_name, extracted_text
       FROM uploaded_files
       WHERE file_id = ? AND user_id = ?`,
      [file_id, req.user.user_id]
    );

    if (files.length === 0) {
      return res.status(404).json({
        status: "error",
        code: "FILE_NOT_FOUND",
        message: "File not found"
      });
    }

    const file = files[0];

    if (!file.extracted_text || file.extracted_text.trim().length === 0) {
      return res.status(422).json({
        status: "error",
        code: "NO_READABLE_TEXT",
        // Worded to match the upload path (FR8.4). A file can only reach this
        // state if it was stored before the extraction guard was corrected on
        // 10 Sep 2026, or if it was written by some route other than the upload
        // controller. Either way the student needs the same advice they would
        // have been given at upload time, not a bare statement of the problem.
        message: "No readable text is available for this file. " +
                 "Scanned or image-only documents are not supported. " +
                 "Please upload a text-based document instead."
      });
    }

    let explanationChat = null;

    if (
      output_type === "explanation" &&
      chat_id !== undefined &&
      chat_id !== null &&
      chat_id !== ""
    ) {
      const numericChatId =
        Number(chat_id);

      if (
        !Number.isInteger(numericChatId) ||
        numericChatId <= 0
      ) {
        return res.status(400).json({
          status: "error",
          code: "INVALID_CHAT_ID",
          message:
            "A valid chat_id is required"
        });
      }

      const [chats] =
        await db.execute(
          `SELECT
             chat_id,
             main_file_id,
             title
           FROM explanation_chats
           WHERE chat_id = ?
             AND user_id = ?`,
          [
            numericChatId,
            req.user.user_id
          ]
        );

      if (chats.length === 0) {
        return res.status(404).json({
          status: "error",
          code: "CHAT_NOT_FOUND",
          message:
            "Concept Explanation chat not found"
        });
      }

      if (
        Number(chats[0].main_file_id) !==
        Number(file.file_id)
      ) {
        return res.status(400).json({
          status: "error",
          code: "CHAT_FILE_MISMATCH",
          message:
            "This chat belongs to a different main study material"
        });
      }

      explanationChat =
        chats[0];
    }
    let generationText =
      file.extracted_text;

    let supplementarySourceCount = 0;

    /*
     * The selected study material remains the primary source.
     * Files attached to the active Concept Explanation chat are
     * added only as supplementary supporting context.
     */
    if (
      output_type === "explanation" &&
      explanationChat
    ) {
      const [supplementarySources] =
        await db.execute(
          `SELECT
             source_id,
             file_name,
             extracted_text
           FROM explanation_chat_sources
           WHERE chat_id = ?
             AND user_id = ?
           ORDER BY
             uploaded_at ASC,
             source_id ASC`,
          [
            explanationChat.chat_id,
            req.user.user_id
          ]
        );

      supplementarySourceCount =
        supplementarySources.length;

      if (
        supplementarySources.length > 0
      ) {
        const supplementaryText =
          supplementarySources
            .map((source) => {
              const sourceName =
                String(
                  source.file_name ||
                    "Supplementary material"
                )
                  .replace(
                    /[\r\n]+/g,
                    " "
                  )
                  .trim();

              return [
                `SUPPLEMENTARY SOURCE: ${sourceName}`,
                "---",
                source.extracted_text,
                "---"
              ].join("\n");
            })
            .join("\n\n");

        generationText = [
          "PRIMARY STUDY MATERIAL",
          "---",
          file.extracted_text,
          "---",
          "",
          "SUPPLEMENTARY CHAT MATERIAL",
          "The following files provide additional supporting context for this chat.",
          supplementaryText
        ].join("\n");
      }
    }

    const content =
      await generate(
        generationText,
        output_type,
        {
          concept,
          level
        }
      );

    const isStructured = STRUCTURED_TYPES.includes(output_type);
    const stored = isStructured ? JSON.stringify(content) : content;

    // FR16.1 - stored with the AI-generated flag so the label travels with the
    // content wherever it is later displayed
    const [result] = await db.execute(
      `INSERT INTO ai_outputs
       (file_id, user_id, output_type, content, is_ai_generated)
       VALUES (?, ?, ?, ?, TRUE)`,
      [file.file_id, req.user.user_id, output_type, stored]
    );

    // Preserve the original Concept Explanation prompt and selected level so
    // the chat can be reconstructed when the user returns to this material.
    if (output_type === "explanation") {
      try {
        await db.execute(
          `INSERT INTO explanation_metadata
           (output_id, concept, explanation_level)
           VALUES (?, ?, ?)`,
          [result.insertId, concept.trim(), level || "beginner"]
        );
      } catch (metadataError) {
        // Avoid leaving an explanation without the metadata required to
        // reconstruct its chat entry.
        await db.execute(
          `DELETE FROM ai_outputs
           WHERE output_id = ? AND user_id = ?`,
          [result.insertId, req.user.user_id]
        );

        throw metadataError;
      }
    }

    if (
      output_type === "explanation" &&
      explanationChat
    ) {
      try {
        await db.execute(
          `INSERT INTO explanation_chat_outputs
           (chat_id, output_id)
           VALUES (?, ?)`,
          [
            explanationChat.chat_id,
            result.insertId
          ]
        );

        const generatedChatTitle =
          concept
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 80) ||
          "New chat";

        await db.execute(
          `UPDATE explanation_chats
           SET
             title =
               CASE
                 WHEN title = 'New chat'
                   THEN ?
                 ELSE title
               END,
             updated_at =
               CURRENT_TIMESTAMP
           WHERE chat_id = ?
             AND user_id = ?`,
          [
            generatedChatTitle,
            explanationChat.chat_id,
            req.user.user_id
          ]
        );
      } catch (chatMappingError) {
        /*
         * If the chat association fails, remove the new AI output.
         * Its explanation_metadata row is removed automatically
         * through the foreign-key cascade.
         */
        await db.execute(
          `DELETE FROM ai_outputs
           WHERE output_id = ?
             AND user_id = ?`,
          [
            result.insertId,
            req.user.user_id
          ]
        );

        throw chatMappingError;
      }
    }

    await logActivity({
      userId: req.user.user_id,
      activityType: `ai_${output_type}`,
      detail: file.file_name,
      sourceType: "ai_output",
      sourceId: result.insertId
    });

    res.status(201).json({
      status: "success",
      message: "Content generated successfully",
      output: {
        output_id: result.insertId,
        file_id: file.file_id,
        file_name: file.file_name,
        output_type,
        content,
        is_ai_generated: true,
        ...(output_type === "explanation"
          ? {
              concept: concept.trim(),
              level: level || "beginner",
              ...(explanationChat
                ? {
                    chat_id:
                      explanationChat.chat_id,
                    supplementary_source_count:
                      supplementarySourceCount
                  }
                : {})
            }
          : {})
      },
      disclaimer:
        "This content was generated by AI and may contain errors or omissions. " +
        "Please check it against your original study material."
    });

  } catch (error) {
    console.error("AI generation error:", error);

    // FR12.1 - explanation inputs are validated when the prompt is built, so
    // they surface here as 400s rather than as generation failures
    if (error.code === "MISSING_CONCEPT") {
      return res.status(400).json({
        status: "error",
        code: "MISSING_CONCEPT",
        message: "A concept is required for an explanation"
      });
    }

    if (error.code === "INVALID_LEVEL") {
      return res.status(400).json({
        status: "error",
        code: "INVALID_LEVEL",
        message: "level must be one of: beginner, intermediate, advanced"
      });
    }

    // NFR5 - the uploaded file and its extracted text are untouched by a failed
    // generation, so every branch below is safe to retry without re-uploading
    if (error.code === "AI_NOT_CONFIGURED") {
      return res.status(503).json({
        status: "error",
        code: "AI_NOT_CONFIGURED",
        message: "AI generation is not available. The service is not configured."
      });
    }

    if (error.code === "AI_TIMEOUT") {
      return res.status(504).json({
        status: "error",
        code: "AI_TIMEOUT",
        message: "The AI service took too long to respond. Please try again.",
        retryable: true
      });
    }

    // R3 - the free tier allows a limited number of requests per day. This is
    // retryable, but the wait may be minutes or until the quota resets, so it is
    // reported separately from a transient failure.
    if (error.code === "AI_QUOTA_EXCEEDED") {
      return res.status(429).json({
        status: "error",
        code: "AI_QUOTA_EXCEEDED",
        message: error.quotaExhausted
          ? "The daily AI usage limit has been reached. Your document has been " +
            "saved and you can generate content again tomorrow."
          : "The AI service is receiving too many requests right now. " +
            "Please wait a moment and try again.",
        retryable: true,
        ...(error.retryAfterSeconds
          ? { retry_after_seconds: error.retryAfterSeconds }
          : {})
      });
    }

    if (error.code === "AI_UNAVAILABLE") {
      return res.status(503).json({
        status: "error",
        code: "AI_UNAVAILABLE",
        message: "The AI service is temporarily unavailable. Please try again shortly.",
        retryable: true
      });
    }

    if (error.code === "AI_EMPTY_RESPONSE") {
      return res.status(502).json({
        status: "error",
        code: "AI_EMPTY_RESPONSE",
        message: "The AI service returned no content. Please try again.",
        retryable: true
      });
    }

    // The model returned something, but not in the structure this output type
    // requires. Retryable because a second attempt often parses correctly.
    if (error.code === "AI_MALFORMED_RESPONSE") {
      return res.status(502).json({
        status: "error",
        code: "AI_MALFORMED_RESPONSE",
        message: "The AI service returned content in an unexpected format. Please try again.",
        retryable: true
      });
    }

    res.status(500).json({
      status: "error",
      code: "AI_GENERATION_FAILED",
      message: "Unable to generate content. Your uploaded file has been kept.",
      retryable: true
    });
  }
};

// FR15 - re-access previously generated content without regenerating it
const getOutputsForFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const [rows] = await db.execute(
      `SELECT
         ao.output_id,
         ao.file_id,
         ao.output_type,
         ao.content,
         ao.is_ai_generated,
         ao.generated_at,
         em.concept,
         em.explanation_level AS level
       FROM ai_outputs ao
       LEFT JOIN explanation_metadata em
         ON em.output_id = ao.output_id
       WHERE ao.file_id = ? AND ao.user_id = ?
       ORDER BY ao.generated_at DESC, ao.output_id DESC`,
      [fileId, req.user.user_id]
    );

    // Structured types are stored as JSON text; return them parsed so the
    // interface receives the same shape it got when the content was generated.
    const outputs = rows.map((row) => {
      if (!STRUCTURED_TYPES.includes(row.output_type)) {
        return row;
      }
      try {
        return { ...row, content: JSON.parse(row.content) };
      } catch {
        return row;
      }
    });

    res.json({
      status: "success",
      outputs
    });

  } catch (error) {
    console.error("AI output fetch error:", error);

    res.status(500).json({
      status: "error",
      code: "AI_OUTPUT_FETCH_ERROR",
      message: "Unable to fetch generated content"
    });
  }
};

// Delete one previously generated AI output belonging to the authenticated user
const deleteOutput = async (req, res) => {
  try {
    const { outputId } = req.params;

    const numericOutputId = Number(outputId);

    if (
      !Number.isInteger(numericOutputId) ||
      numericOutputId <= 0
    ) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_OUTPUT_ID",
        message: "A valid output ID is required"
      });
    }

    // NFR3 - confirm ownership before deletion.
    // Returning 404 for another user's output avoids revealing
    // whether that resource exists.
    const [rows] = await db.execute(
      `SELECT
        ao.output_id,
        ao.output_type,
        uf.file_name
      FROM ai_outputs ao
      INNER JOIN uploaded_files uf
        ON uf.file_id = ao.file_id
        AND uf.user_id = ao.user_id
      WHERE ao.output_id = ?
        AND ao.user_id = ?`,
      [numericOutputId, req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        code: "OUTPUT_NOT_FOUND",
        message: "Saved material not found"
      });
    }

    const output = rows[0];

    const [result] = await db.execute(
      `DELETE FROM ai_outputs
       WHERE output_id = ? AND user_id = ?`,
      [numericOutputId, req.user.user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        code: "OUTPUT_NOT_FOUND",
        message: "Saved material not found"
      });
    }

    await logActivity({
      userId: req.user.user_id,
      activityType: `ai_${output.output_type}_deleted`,
      detail: output.file_name,
      sourceType: "ai_output",
      sourceId: numericOutputId
    });

    return res.json({
      status: "success",
      message: "Saved material deleted successfully",
      output: {
        output_id: numericOutputId,
        output_type: output.output_type
      }
    });

  } catch (error) {
    console.error("AI output delete error:", error);

    return res.status(500).json({
      status: "error",
      code: "AI_OUTPUT_DELETE_ERROR",
      message: "Unable to delete saved material"
    });
  }
};

// FR11.2 - record a quiz attempt and return the score.
// Marking happens on the server against the stored quiz, so a submitted answer
// cannot be scored against anything the client supplies.
const submitQuizAttempt = async (req, res) => {
  try {
    const { outputId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_ANSWERS",
        message: "answers must be an array, one entry per question in order"
      });
    }

    // NFR3 - scoped to the requesting user
    const [rows] = await db.execute(
      `SELECT
        ao.output_id,
        ao.output_type,
        ao.content,
        uf.file_name
      FROM ai_outputs ao
      INNER JOIN uploaded_files uf
        ON uf.file_id = ao.file_id
        AND uf.user_id = ao.user_id
      WHERE ao.output_id = ?
        AND ao.user_id = ?`,
      [outputId, req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        code: "OUTPUT_NOT_FOUND",
        message: "Quiz not found"
      });
    }

    if (rows[0].output_type !== "quiz") {
      return res.status(400).json({
        status: "error",
        code: "NOT_A_QUIZ",
        message: `Output ${outputId} is a ${rows[0].output_type}, not a quiz`
      });
    }

    let questions;
    try {
      questions = JSON.parse(rows[0].content);
    } catch {
      return res.status(500).json({
        status: "error",
        code: "QUIZ_UNREADABLE",
        message: "The stored quiz could not be read"
      });
    }

    if (answers.length !== questions.length) {
      return res.status(400).json({
        status: "error",
        code: "ANSWER_COUNT_MISMATCH",
        message: `Expected ${questions.length} answers but received ${answers.length}`
      });
    }

    // Unanswered questions are permitted and simply score zero, so a partial
    // attempt is still recorded rather than rejected.
    const results = questions.map((q, i) => {
      const submitted = typeof answers[i] === "string" ? answers[i].trim() : null;
      return {
        question: q.question,
        submitted,
        correct_answer: q.correct_answer,
        is_correct: submitted !== null && submitted === q.correct_answer
      };
    });

    const score = results.filter((r) => r.is_correct).length;
    const total = results.length;

    const [saved] = await db.execute(
      `INSERT INTO quiz_attempts (output_id, user_id, answers, score, total)
       VALUES (?, ?, ?, ?, ?)`,
      [rows[0].output_id, req.user.user_id, JSON.stringify(answers), score, total]
    );

    await logActivity({
      userId: req.user.user_id,
      activityType: "quiz_attempt",
      detail: rows[0].file_name,
      sourceType: "quiz_attempt",
      sourceId: saved.insertId
    });

    res.status(201).json({
      status: "success",
      message: "Quiz attempt recorded",
      attempt: {
        attempt_id: saved.insertId,
        output_id: rows[0].output_id,
        score,
        total,
        percentage: Math.round((score / total) * 100),
        results
      }
    });

  } catch (error) {
    console.error("Quiz attempt error:", error);

    res.status(500).json({
      status: "error",
      code: "QUIZ_ATTEMPT_FAILED",
      message: "Unable to record the quiz attempt"
    });
  }
};

// FR11.2 / FR14 - previous attempts at a quiz, newest first
const getQuizAttempts = async (req, res) => {
  try {
    const { outputId } = req.params;

    const [rows] = await db.execute(
      `SELECT
         qa.attempt_id,
         qa.output_id,
         qa.answers,
         qa.score,
         qa.total,
         qa.attempted_at,
         ao.content
       FROM quiz_attempts qa
       INNER JOIN ai_outputs ao
         ON ao.output_id = qa.output_id
         AND ao.user_id = qa.user_id
       WHERE qa.output_id = ?
         AND qa.user_id = ?
         AND ao.output_type = 'quiz'
       ORDER BY qa.attempted_at DESC, qa.attempt_id DESC`,
      [outputId, req.user.user_id]
    );

    const attempts = rows.map((row) => {
      let submittedAnswers = [];
      let questions = [];

      try {
        const parsedAnswers =
          typeof row.answers === "string"
            ? JSON.parse(row.answers)
            : row.answers;

        submittedAnswers =
          Array.isArray(parsedAnswers)
            ? parsedAnswers
            : [];

      } catch {
        submittedAnswers = [];
      }

      try {
        const parsedQuestions =
          typeof row.content === "string"
            ? JSON.parse(row.content)
            : row.content;

        questions =
          Array.isArray(parsedQuestions)
            ? parsedQuestions
            : [];

      } catch {
        questions = [];
      }

      const results = questions.map(
        (question, index) => {
          const submitted =
            typeof submittedAnswers[index] ===
            "string"
              ? submittedAnswers[index]
              : null;

          return {
            question:
              question.question,

            submitted,

            correct_answer:
              question.correct_answer,

            is_correct:
              submitted !== null &&
              submitted ===
                question.correct_answer
          };
        }
      );

      const score =
        Number(row.score);

      const total =
        Number(row.total);

      return {
        attempt_id:
          row.attempt_id,

        output_id:
          row.output_id,

        answers:
          submittedAnswers,

        score,

        total,

        percentage:
          total > 0
            ? Math.round(
                (score / total) * 100
              )
            : 0,

        attempted_at:
          row.attempted_at,

        results
      };
    });

    res.json({
      status: "success",
      attempts
    });

  } catch (error) {
    console.error(
      "Quiz attempts fetch error:",
      error
    );

    res.status(500).json({
      status: "error",
      code:
        "QUIZ_ATTEMPTS_FETCH_ERROR",
      message:
        "Unable to fetch quiz attempts"
    });
  }
};

/*
 * Concept Explanation chat sessions
 *
 * A chat belongs permanently to one authenticated user and one main uploaded
 * study material. Stored AI outputs remain in ai_outputs; the
 * explanation_chat_outputs table only groups those outputs into conversations.
 */

const createExplanationChat = async (req, res) => {
  try {
    const mainFileId =
      Number(req.body?.main_file_id);

    if (
      !Number.isInteger(mainFileId) ||
      mainFileId <= 0
    ) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_MAIN_FILE_ID",
        message:
          "A valid main_file_id is required"
      });
    }

    const [files] = await db.execute(
      `SELECT file_id, file_name
       FROM uploaded_files
       WHERE file_id = ? AND user_id = ?`,
      [
        mainFileId,
        req.user.user_id
      ]
    );

    if (files.length === 0) {
      return res.status(404).json({
        status: "error",
        code: "FILE_NOT_FOUND",
        message:
          "Main study material not found"
      });
    }

    const requestedTitle =
      typeof req.body?.title === "string"
        ? req.body.title.trim()
        : "";

    const title =
      requestedTitle.length > 0
        ? requestedTitle.slice(0, 255)
        : "New chat";

    const [result] = await db.execute(
      `INSERT INTO explanation_chats
       (user_id, main_file_id, title)
       VALUES (?, ?, ?)`,
      [
        req.user.user_id,
        mainFileId,
        title
      ]
    );

    return res.status(201).json({
      status: "success",
      message:
        "Concept Explanation chat created successfully",
      chat: {
        chat_id:
          result.insertId,
        main_file_id:
          mainFileId,
        main_file_name:
          files[0].file_name,
        title
      }
    });
  } catch (error) {
    console.error(
      "Explanation chat create error:",
      error
    );

    return res.status(500).json({
      status: "error",
      code:
        "EXPLANATION_CHAT_CREATE_ERROR",
      message:
        "Unable to create Concept Explanation chat"
    });
  }
};


const getExplanationChatsForFile =
  async (req, res) => {
    try {
      const fileId =
        Number(req.params.fileId);

      if (
        !Number.isInteger(fileId) ||
        fileId <= 0
      ) {
        return res.status(400).json({
          status: "error",
          code: "INVALID_FILE_ID",
          message:
            "A valid file ID is required"
        });
      }

      const [files] = await db.execute(
        `SELECT file_id, file_name
         FROM uploaded_files
         WHERE file_id = ? AND user_id = ?`,
        [
          fileId,
          req.user.user_id
        ]
      );

      if (files.length === 0) {
        return res.status(404).json({
          status: "error",
          code: "FILE_NOT_FOUND",
          message:
            "Study material not found"
        });
      }

      const [rows] = await db.execute(
        `SELECT
           ec.chat_id,
           ec.main_file_id,
           ec.title,
           ec.created_at,
           ec.updated_at,
           COUNT(eco.output_id) AS output_count,
           MAX(ao.generated_at) AS last_output_at
         FROM explanation_chats ec
         LEFT JOIN explanation_chat_outputs eco
           ON eco.chat_id = ec.chat_id
         LEFT JOIN ai_outputs ao
           ON ao.output_id = eco.output_id
           AND ao.user_id = ec.user_id
           AND ao.output_type = 'explanation'
         WHERE ec.user_id = ?
           AND ec.main_file_id = ?
         GROUP BY
           ec.chat_id,
           ec.main_file_id,
           ec.title,
           ec.created_at,
           ec.updated_at
         ORDER BY
           GREATEST(
             ec.updated_at,
             COALESCE(
               MAX(ao.generated_at),
               ec.updated_at
             )
           ) DESC,
           ec.chat_id DESC`,
        [
          req.user.user_id,
          fileId
        ]
      );

      const chats =
        rows.map((row) => ({
          ...row,
          output_count:
            Number(row.output_count)
        }));

      return res.json({
        status: "success",
        file: files[0],
        chats
      });
    } catch (error) {
      console.error(
        "Explanation chats fetch error:",
        error
      );

      return res.status(500).json({
        status: "error",
        code:
          "EXPLANATION_CHATS_FETCH_ERROR",
        message:
          "Unable to fetch Concept Explanation chats"
      });
    }
  };


const getExplanationChatMessages =
  async (req, res) => {
    try {
      const chatId =
        Number(req.params.chatId);

      if (
        !Number.isInteger(chatId) ||
        chatId <= 0
      ) {
        return res.status(400).json({
          status: "error",
          code: "INVALID_CHAT_ID",
          message:
            "A valid chat ID is required"
        });
      }

      const [chats] = await db.execute(
        `SELECT
           ec.chat_id,
           ec.main_file_id,
           ec.title,
           ec.created_at,
           ec.updated_at,
           uf.file_name AS main_file_name
         FROM explanation_chats ec
         INNER JOIN uploaded_files uf
           ON uf.file_id = ec.main_file_id
           AND uf.user_id = ec.user_id
         WHERE ec.chat_id = ?
           AND ec.user_id = ?`,
        [
          chatId,
          req.user.user_id
        ]
      );

      if (chats.length === 0) {
        return res.status(404).json({
          status: "error",
          code: "CHAT_NOT_FOUND",
          message:
            "Concept Explanation chat not found"
        });
      }

      const [outputs] = await db.execute(
        `SELECT
           ao.output_id,
           ao.file_id,
           ao.output_type,
           ao.content,
           ao.is_ai_generated,
           ao.generated_at,
           em.concept,
           em.explanation_level AS level
         FROM explanation_chat_outputs eco
         INNER JOIN ai_outputs ao
           ON ao.output_id = eco.output_id
         LEFT JOIN explanation_metadata em
           ON em.output_id = ao.output_id
         WHERE eco.chat_id = ?
           AND ao.user_id = ?
           AND ao.output_type = 'explanation'
         ORDER BY
           ao.generated_at ASC,
           ao.output_id ASC`,
        [
          chatId,
          req.user.user_id
        ]
      );

      return res.json({
        status: "success",
        chat: chats[0],
        outputs
      });
    } catch (error) {
      console.error(
        "Explanation chat messages fetch error:",
        error
      );

      return res.status(500).json({
        status: "error",
        code:
          "EXPLANATION_CHAT_MESSAGES_FETCH_ERROR",
        message:
          "Unable to fetch Concept Explanation chat messages"
      });
    }
  };


const uploadExplanationChatSource =
  async (req, res) => {
    let connection = null;

    try {
      const chatId =
        Number(req.params.chatId);

      if (
        !Number.isInteger(chatId) ||
        chatId <= 0
      ) {
        await removeExplanationSourceFile(
          req.file?.path
        );

        return res.status(400).json({
          status: "error",
          code: "INVALID_CHAT_ID",
          message:
            "A valid chat ID is required"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          status: "error",
          code: "NO_FILE",
          message:
            "No supplementary file uploaded"
        });
      }

      /*
       * Verify that the active chat belongs to
       * the authenticated user before extracting
       * or storing its supplementary material.
       */
      const [chats] =
        await db.execute(
          `SELECT
             chat_id,
             main_file_id,
             title
           FROM explanation_chats
           WHERE chat_id = ?
             AND user_id = ?`,
          [
            chatId,
            req.user.user_id
          ]
        );

      if (chats.length === 0) {
        await removeExplanationSourceFile(
          req.file.path
        );

        return res.status(404).json({
          status: "error",
          code: "CHAT_NOT_FOUND",
          message:
            "Concept Explanation chat not found"
        });
      }

      const physicalFilePath =
        path.resolve(
          req.file.path
        );

      const extractedText =
        await extractExplanationSourceText(
          physicalFilePath,
          req.file.originalname
        );

      if (
        !extractedText ||
        extractedText.trim().length === 0
      ) {
        await removeExplanationSourceFile(
          req.file.path
        );

        return res.status(422).json({
          status: "error",
          code: "NO_READABLE_TEXT",
          message:
            "No readable text could be extracted from this supplementary file. " +
            "Scanned or image-only documents are not supported. " +
            "Please upload a text-based document."
        });
      }

      connection =
        await db.getConnection();

      await connection.beginTransaction();

      const [result] =
        await connection.execute(
          `INSERT INTO explanation_chat_sources
           (
             chat_id,
             user_id,
             file_name,
             file_path,
             mime_type,
             file_size,
             extracted_text
           )
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            chatId,
            req.user.user_id,
            req.file.originalname,
            req.file.path,
            req.file.mimetype || null,
            req.file.size || null,
            extractedText
          ]
        );

      /*
       * Attaching supporting material is activity
       * within the chat, so move that conversation
       * to the top of the chat list.
       */
      await connection.execute(
        `UPDATE explanation_chats
         SET updated_at =
           CURRENT_TIMESTAMP
         WHERE chat_id = ?
           AND user_id = ?`,
        [
          chatId,
          req.user.user_id
        ]
      );

      await connection.commit();

      return res.status(201).json({
        status: "success",
        message:
          "Supplementary material attached to the chat successfully",
        source: {
          source_id:
            result.insertId,
          chat_id:
            chatId,
          file_name:
            req.file.originalname,
          mime_type:
            req.file.mimetype || null,
          file_size:
            req.file.size || null,
          text_length:
            extractedText.length
        }
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {
          // Preserve the original failure.
        }
      }

      await removeExplanationSourceFile(
        req.file?.path
      );

      console.error(
        "Explanation supplementary upload error:",
        error
      );

      if (
        error.code ===
        "UNSUPPORTED_FILE_TYPE"
      ) {
        return res.status(415).json({
          status: "error",
          code:
            "UNSUPPORTED_FILE_TYPE",
          message:
            "Only PDF, DOCX and TXT files are supported"
        });
      }

      return res.status(500).json({
        status: "error",
        code:
          "EXPLANATION_SOURCE_UPLOAD_ERROR",
        message:
          "Unable to attach supplementary material to this chat"
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  };


const getExplanationChatSources =
  async (req, res) => {
    try {
      const chatId =
        Number(req.params.chatId);

      if (
        !Number.isInteger(chatId) ||
        chatId <= 0
      ) {
        return res.status(400).json({
          status: "error",
          code: "INVALID_CHAT_ID",
          message:
            "A valid chat ID is required"
        });
      }

      const [chats] =
        await db.execute(
          `SELECT chat_id
           FROM explanation_chats
           WHERE chat_id = ?
             AND user_id = ?`,
          [
            chatId,
            req.user.user_id
          ]
        );

      if (chats.length === 0) {
        return res.status(404).json({
          status: "error",
          code: "CHAT_NOT_FOUND",
          message:
            "Concept Explanation chat not found"
        });
      }

      const [sources] =
        await db.execute(
          `SELECT
             source_id,
             chat_id,
             file_name,
             mime_type,
             file_size,
             uploaded_at,
             CHAR_LENGTH(
               extracted_text
             ) AS text_length
           FROM explanation_chat_sources
           WHERE chat_id = ?
             AND user_id = ?
           ORDER BY
             uploaded_at ASC,
             source_id ASC`,
          [
            chatId,
            req.user.user_id
          ]
        );

      return res.json({
        status: "success",
        sources
      });
    } catch (error) {
      console.error(
        "Explanation supplementary sources fetch error:",
        error
      );

      return res.status(500).json({
        status: "error",
        code:
          "EXPLANATION_SOURCES_FETCH_ERROR",
        message:
          "Unable to retrieve supplementary material for this chat"
      });
    }
  };


const deleteExplanationChatSource =
  async (req, res) => {
    const connection =
      await db.getConnection();

    try {
      const chatId =
        Number(req.params.chatId);

      const sourceId =
        Number(req.params.sourceId);

      if (
        !Number.isInteger(chatId) ||
        chatId <= 0
      ) {
        return res.status(400).json({
          status: "error",
          code: "INVALID_CHAT_ID",
          message:
            "A valid chat ID is required"
        });
      }

      if (
        !Number.isInteger(sourceId) ||
        sourceId <= 0
      ) {
        return res.status(400).json({
          status: "error",
          code: "INVALID_SOURCE_ID",
          message:
            "A valid supplementary source ID is required"
        });
      }

      await connection.beginTransaction();

      /*
       * Joining to explanation_chats verifies
       * both source ownership and chat ownership.
       */
      const [sources] =
        await connection.execute(
          `SELECT
             ecs.source_id,
             ecs.file_name,
             ecs.file_path
           FROM explanation_chat_sources ecs
           INNER JOIN explanation_chats ec
             ON ec.chat_id = ecs.chat_id
           WHERE ecs.source_id = ?
             AND ecs.chat_id = ?
             AND ecs.user_id = ?
             AND ec.user_id = ?
           FOR UPDATE`,
          [
            sourceId,
            chatId,
            req.user.user_id,
            req.user.user_id
          ]
        );

      if (sources.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          status: "error",
          code: "SOURCE_NOT_FOUND",
          message:
            "Supplementary material not found"
        });
      }

      const source =
        sources[0];

      const [deleteResult] =
        await connection.execute(
          `DELETE FROM explanation_chat_sources
           WHERE source_id = ?
             AND chat_id = ?
             AND user_id = ?`,
          [
            sourceId,
            chatId,
            req.user.user_id
          ]
        );

      if (
        deleteResult.affectedRows !== 1
      ) {
        throw new Error(
          "Supplementary source deletion did not remove exactly one row"
        );
      }

      await connection.execute(
        `UPDATE explanation_chats
         SET updated_at =
           CURRENT_TIMESTAMP
         WHERE chat_id = ?
           AND user_id = ?`,
        [
          chatId,
          req.user.user_id
        ]
      );

      await connection.commit();

      await removeExplanationSourceFile(
        source.file_path
      );

      return res.json({
        status: "success",
        message:
          "Supplementary material removed successfully",
        source: {
          source_id:
            source.source_id,
          chat_id:
            chatId,
          file_name:
            source.file_name
        }
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original failure.
      }

      console.error(
        "Explanation supplementary source delete error:",
        error
      );

      return res.status(500).json({
        status: "error",
        code:
          "EXPLANATION_SOURCE_DELETE_ERROR",
        message:
          "Unable to remove supplementary material from this chat"
      });
    } finally {
      connection.release();
    }
  };

const deleteExplanationChat =
  async (req, res) => {
    const connection =
      await db.getConnection();

    try {
      const chatId =
        Number(req.params.chatId);

      if (
        !Number.isInteger(chatId) ||
        chatId <= 0
      ) {
        return res.status(400).json({
          status: "error",
          code: "INVALID_CHAT_ID",
          message:
            "A valid chat ID is required"
        });
      }

      await connection.beginTransaction();

      const [chats] =
        await connection.execute(
          `SELECT
             chat_id,
             main_file_id,
             title
           FROM explanation_chats
           WHERE chat_id = ?
             AND user_id = ?
           FOR UPDATE`,
          [
            chatId,
            req.user.user_id
          ]
        );

      if (chats.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          status: "error",
          code: "CHAT_NOT_FOUND",
          message:
            "Concept Explanation chat not found"
        });
      }

      /*
       * Save the supplementary physical file paths
       * before deleting the chat. The database rows
       * themselves will be removed by the chat's
       * ON DELETE CASCADE relationship.
       */
      const [chatSources] =
        await connection.execute(
          `SELECT
             source_id,
             file_path
           FROM explanation_chat_sources
           WHERE chat_id = ?
             AND user_id = ?
           FOR UPDATE`,
          [
            chatId,
            req.user.user_id
          ]
        );

      /*
       * Delete only AI explanation outputs belonging to this chat.
       * Deleting those rows cascades their metadata and chat-output mappings.
       * The main uploaded study material remains untouched.
       */
      const [outputDeleteResult] =
        await connection.execute(
          `DELETE ao
           FROM ai_outputs ao
           INNER JOIN explanation_chat_outputs eco
             ON eco.output_id = ao.output_id
           WHERE eco.chat_id = ?
             AND ao.user_id = ?
             AND ao.output_type = 'explanation'`,
          [
            chatId,
            req.user.user_id
          ]
        );

      const [chatDeleteResult] =
        await connection.execute(
          `DELETE FROM explanation_chats
           WHERE chat_id = ?
             AND user_id = ?`,
          [
            chatId,
            req.user.user_id
          ]
        );

      if (
        chatDeleteResult.affectedRows !== 1
      ) {
        throw new Error(
          "Explanation chat deletion did not remove exactly one chat"
        );
      }

      await connection.commit();

      /*
       * The database transaction is already complete.
       * Physical-file cleanup cannot restore database
       * rows, so failures are logged rather than turning
       * a successful chat deletion into a false failure.
       */
      for (
        const source of chatSources
      ) {
        await removeExplanationSourceFile(
          source.file_path
        );
      }

      return res.json({
        status: "success",
        message:
          "Concept Explanation chat deleted successfully",
        chat: {
          chat_id:
            chatId,
          main_file_id:
            chats[0].main_file_id,
          title:
            chats[0].title,
          deleted_outputs:
            outputDeleteResult.affectedRows,
          deleted_sources:
            chatSources.length
        }
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // Ignore rollback failure while returning the original error.
      }

      console.error(
        "Explanation chat delete error:",
        error
      );

      return res.status(500).json({
        status: "error",
        code:
          "EXPLANATION_CHAT_DELETE_ERROR",
        message:
          "Unable to delete Concept Explanation chat"
      });
    } finally {
      connection.release();
    }
  };

module.exports = {
  generateOutput,
  getOutputsForFile,
  deleteOutput,
  submitQuizAttempt,
  getQuizAttempts,
  createExplanationChat,
  getExplanationChatsForFile,
  getExplanationChatMessages,
  uploadExplanationChatSource,
  getExplanationChatSources,
  deleteExplanationChatSource,
  deleteExplanationChat
};
