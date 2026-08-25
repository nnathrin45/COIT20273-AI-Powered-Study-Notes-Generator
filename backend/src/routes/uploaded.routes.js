const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/auth.middleware");

const {
    getUploadedFiles,
    getUploadedFile,
    deleteUploadedFile
} = require("../controllers/uploaded.controller");

// Retrieve all uploaded files belonging to the authenticated user
router.get("/", authenticateUser, getUploadedFiles);

// Retrieve one uploaded file by ID
router.get("/:id", authenticateUser, getUploadedFile);

// Delete one uploaded file belonging to the authenticated user
router.delete("/:id", authenticateUser, deleteUploadedFile);

module.exports = router;