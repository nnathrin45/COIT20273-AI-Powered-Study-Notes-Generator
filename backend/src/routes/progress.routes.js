const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/auth.middleware");

const {
  getProgressDashboard,
  deleteSelectedActivity,
  clearActivityHistory
} = require("../controllers/progress.controller");

router.get(
  "/",
  authenticateUser,
  getProgressDashboard
);

router.delete(
  "/activity/selected",
  authenticateUser,
  deleteSelectedActivity
);

router.delete(
  "/activity/all",
  authenticateUser,
  clearActivityHistory
);

module.exports = router;