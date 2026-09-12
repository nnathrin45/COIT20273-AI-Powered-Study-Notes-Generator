const db = require("../config/database");

const createStudyPlan = async (req, res) => {
  try {
    const {
      subject,
      topic,
      deadline,
      available_hours,
      study_days,
      plan_data
    } = req.body;

    const user_id = req.user.user_id;

    if (
      !subject ||
      !topic ||
      !deadline ||
      available_hours === undefined ||
      !study_days
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Subject, topic, deadline, available_hours and study_days are required"
      });
    }

    const studyDaysJson =
      typeof study_days === "string"
        ? study_days
        : JSON.stringify(study_days);

    const planDataJson =
      plan_data === undefined || plan_data === null
        ? null
        : typeof plan_data === "string"
          ? plan_data
          : JSON.stringify(plan_data);

    const [result] = await db.execute(
      `INSERT INTO study_plans
       (user_id, subject, topic, deadline, available_hours, study_days, plan_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        subject,
        topic,
        deadline,
        available_hours,
        studyDaysJson,
        planDataJson
      ]
    );

    res.status(201).json({
      status: "success",
      message: "Study plan created successfully",
      plan_id: result.insertId
    });

  } catch (error) {
    console.error("Create study plan error:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to create study plan"
    });
  }
};


const getAllStudyPlans = async (req, res) => {
  try {
    const [plans] = await db.execute(
      `SELECT *
       FROM study_plans
       WHERE user_id = ?
       ORDER BY deadline ASC, created_at DESC`,
      [req.user.user_id]
    );

    res.json({
      status: "success",
      plans
    });

  } catch (error) {
    console.error("Get study plans error:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to fetch study plans"
    });
  }
};


const getStudyPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const [plans] = await db.execute(
      `SELECT *
       FROM study_plans
       WHERE plan_id = ? AND user_id = ?`,
      [id, req.user.user_id]
    );

    if (plans.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Study plan not found"
      });
    }

    res.json({
      status: "success",
      plan: plans[0]
    });

  } catch (error) {
    console.error("Get study plan error:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to fetch study plan"
    });
  }
};


const deleteStudyPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      `DELETE FROM study_plans
       WHERE plan_id = ? AND user_id = ?`,
      [id, req.user.user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Study plan not found"
      });
    }

    res.json({
      status: "success",
      message: "Study plan deleted successfully"
    });

  } catch (error) {
    console.error("Delete study plan error:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to delete study plan"
    });
  }
};


module.exports = {
  createStudyPlan,
  getAllStudyPlans,
  getStudyPlanById,
  deleteStudyPlan
};