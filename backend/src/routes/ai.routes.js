const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/auth.middleware");

const {
  generateOutput,
  getOutputsForFile,
  submitQuizAttempt,
  getQuizAttempts
} = require("../controllers/ai.controller");

// Generate AI content from an uploaded document
router.post("/generate", authenticateUser, generateOutput);

// Retrieve content already generated for a document
router.get("/outputs/:fileId", authenticateUser, getOutputsForFile);

// Submit answers to a generated quiz and receive the score (FR11.2)
router.post("/quiz/:outputId/attempt", authenticateUser, submitQuizAttempt);

// Previous attempts at a quiz (FR11.2, FR14)
router.get("/quiz/:outputId/attempts", authenticateUser, getQuizAttempts);

module.exports = router;
