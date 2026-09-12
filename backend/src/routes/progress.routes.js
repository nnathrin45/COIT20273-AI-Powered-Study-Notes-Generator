const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/auth.middleware");

const {
  getProgressDashboard
} = require("../controllers/progress.controller");

router.get("/", authenticateUser, getProgressDashboard);

module.exports = router;