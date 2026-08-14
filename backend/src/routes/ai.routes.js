const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/auth.middleware");

const {
  generateOutput,
  getOutputsForFile
} = require("../controllers/ai.controller");

// Generate AI content from an uploaded document
router.post("/generate", authenticateUser, generateOutput);

// Retrieve content already generated for a document
router.get("/outputs/:fileId", authenticateUser, getOutputsForFile);

module.exports = router;
