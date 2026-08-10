const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const {
    uploadFile
} = require("../controllers/upload.controller");

// Upload PDF
router.post(
    "/",
    authenticateUser,
    upload.single("file"),
    uploadFile
);

module.exports = router;