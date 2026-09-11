const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/auth.middleware");

const {
  createStudyPlan,
  getAllStudyPlans,
  getStudyPlanById,
  deleteStudyPlan
} = require("../controllers/studyPlan.controller");

router.post("/", authenticateUser, createStudyPlan);

router.get("/", authenticateUser, getAllStudyPlans);

router.get("/:id", authenticateUser, getStudyPlanById);

router.delete("/:id", authenticateUser, deleteStudyPlan);

module.exports = router;