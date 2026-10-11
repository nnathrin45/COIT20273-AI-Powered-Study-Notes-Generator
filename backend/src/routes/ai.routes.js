const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/auth.middleware");
const { handleUpload } = require("../middleware/upload.middleware");

const {
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
} = require("../controllers/ai.controller");

// Generate AI content from an uploaded document
router.post("/generate", authenticateUser, generateOutput);

// Retrieve content already generated for a document
router.get("/outputs/:fileId", authenticateUser, getOutputsForFile);

// Delete one generated output belonging to the authenticated user
router.delete("/outputs/:outputId", authenticateUser, deleteOutput);

// Create a Concept Explanation chat for one main study material
router.post(
  "/explanation/chats",
  authenticateUser,
  createExplanationChat
);

// List Concept Explanation chats belonging to one study material
router.get(
  "/explanation/chats/:fileId",
  authenticateUser,
  getExplanationChatsForFile
);

// Retrieve the stored question/answer history for one chat
router.get(
  "/explanation/chats/:chatId/messages",
  authenticateUser,
  getExplanationChatMessages
);

// Delete one Concept Explanation chat and its generated explanation outputs
router.delete(
  "/explanation/chats/:chatId",
  authenticateUser,
  deleteExplanationChat
);
// Upload supplementary material to one Concept Explanation chat
router.post(
  "/explanation/chats/:chatId/sources",
  authenticateUser,
  handleUpload,
  uploadExplanationChatSource
);

// List supplementary materials belonging to one chat
router.get(
  "/explanation/chats/:chatId/sources",
  authenticateUser,
  getExplanationChatSources
);

// Remove one supplementary material from a chat
router.delete(
  "/explanation/chats/:chatId/sources/:sourceId",
  authenticateUser,
  deleteExplanationChatSource
);
// Submit answers to a generated quiz and receive the score (FR11.2)
router.post("/quiz/:outputId/attempt", authenticateUser, submitQuizAttempt);

// Previous attempts at a quiz (FR11.2, FR14)
router.get("/quiz/:outputId/attempts", authenticateUser, getQuizAttempts);

module.exports = router;
