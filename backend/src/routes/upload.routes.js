const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/auth.middleware");
const { handleUpload } = require("../middleware/upload.middleware");

const {
  uploadFile
} = require("../controllers/upload.controller");

// Upload PDF, DOCX or TXT
router.post(
  "/",
  authenticateUser,
  handleUpload,
  uploadFile
);

module.exports = router;
