const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/auth.middleware");

const {
    getUploadedFile
} = require("../controllers/uploaded.controller");

router.get("/:id", authenticateUser, getUploadedFile);

module.exports = router;