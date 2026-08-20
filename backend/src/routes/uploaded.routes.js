const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/auth.middleware");

const {
    getUploadedFiles,
    getUploadedFile
} = require("../controllers/uploaded.controller");

// Retrieve all uploaded files belonging to the authenticated user
router.get("/", authenticateUser, getUploadedFiles);

// Retrieve one uploaded file by ID
router.get("/:id", authenticateUser, getUploadedFile);

module.exports = router;