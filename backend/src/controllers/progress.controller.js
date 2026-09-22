const db = require("../config/database");

const getPeriodCondition = (period, columnName) => {
  if (period === "week") {
    return ` AND ${columnName} >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)`;
  }

  if (period === "month") {
    return ` AND ${columnName} >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`;
  }

  return "";
};


const getProgressDashboard = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const period = req.query.period || "all";

    if (!["all", "week", "month"].includes(period)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid progress period"
      });
    }

    const filePeriod = getPeriodCondition(
      period,
      "uploaded_at"
    );

    const aiPeriod = getPeriodCondition(
      period,
      "generated_at"
    );

    const quizPeriod = getPeriodCondition(
      period,
      "attempted_at"
    );

    const planPeriod = getPeriodCondition(
      period,
      "created_at"
    );

    // Uploaded study materials
    const [fileStats] = await db.execute(
      `SELECT COUNT(*) AS total_files
       FROM uploaded_files
       WHERE user_id = ?${filePeriod}`,
      [userId]
    );

    // AI-generated study resources grouped by output type
    const [aiStats] = await db.execute(
      `SELECT
         COUNT(*) AS total_ai_outputs,
         COALESCE(SUM(
           CASE WHEN output_type = 'summary' THEN 1 ELSE 0 END
         ), 0) AS summaries_generated,
         COALESCE(SUM(
           CASE WHEN output_type = 'flashcards' THEN 1 ELSE 0 END
         ), 0) AS flashcards_generated,
         COALESCE(SUM(
           CASE WHEN output_type = 'quiz' THEN 1 ELSE 0 END
         ), 0) AS quizzes_generated,
         COALESCE(SUM(
           CASE WHEN output_type = 'explanation' THEN 1 ELSE 0 END
         ), 0) AS explanations_generated
       FROM ai_outputs
       WHERE user_id = ?${aiPeriod}`,
      [userId]
    );

    // Quiz attempt statistics
    const [quizStats] = await db.execute(
      `SELECT
         COUNT(*) AS total_quiz_attempts,
         COALESCE(SUM(score), 0) AS total_correct,
         COALESCE(SUM(total), 0) AS total_questions,
         COALESCE(
           ROUND(
             AVG(
               CASE
                 WHEN total > 0
                   THEN (score * 100.0 / total)
                 ELSE 0
               END
             ),
             0
           ),
           0
         ) AS average_percentage
       FROM quiz_attempts
       WHERE user_id = ?${quizPeriod}`,
      [userId]
    );

    // Study plans created
    const [studyPlanStats] = await db.execute(
      `SELECT COUNT(*) AS total_study_plans
       FROM study_plans
       WHERE user_id = ?${planPeriod}`,
      [userId]
    );

    // Recent quiz attempts
    const [recentAttempts] = await db.execute(
      `SELECT
         qa.attempt_id,
         qa.output_id,
         uf.file_name AS quiz_title,
         qa.score,
         qa.total,
         CASE
           WHEN qa.total > 0
             THEN ROUND(
               (qa.score * 100.0 / qa.total),
               0
             )
           ELSE 0
         END AS percentage,
         qa.attempted_at
       FROM quiz_attempts qa
       INNER JOIN ai_outputs ao
         ON ao.output_id = qa.output_id
         AND ao.user_id = qa.user_id
       INNER JOIN uploaded_files uf
         ON uf.file_id = ao.file_id
         AND uf.user_id = qa.user_id
       WHERE qa.user_id = ?${getPeriodCondition(
         period,
         "qa.attempted_at"
       )}
       ORDER BY qa.attempted_at DESC
       LIMIT 10`,
      [userId]
    );

    // Recent study activity.
    // Activity history is independent from the underlying resources,
    // allowing users to clear history without deleting study data.
    const [recentActivity] = await db.execute(
      `SELECT
         activity_id,
         activity_type,
         detail,
         source_type,
         source_id,
         occurred_at
       FROM activity_history
       WHERE user_id = ?${getPeriodCondition(
         period,
         "occurred_at"
       )}
       ORDER BY occurred_at DESC, activity_id DESC
       LIMIT 10`,
      [userId]
    );

    return res.status(200).json({
      status: "success",
      period,
      progress: {
        total_files: Number(
          fileStats[0].total_files
        ),
        total_ai_outputs: Number(
          aiStats[0].total_ai_outputs
        ),
        summaries_generated: Number(
          aiStats[0].summaries_generated
        ),
        flashcards_generated: Number(
          aiStats[0].flashcards_generated
        ),
        quizzes_generated: Number(
          aiStats[0].quizzes_generated
        ),
        explanations_generated: Number(
          aiStats[0].explanations_generated
        ),
        total_quiz_attempts: Number(
          quizStats[0].total_quiz_attempts
        ),
        total_correct: Number(
          quizStats[0].total_correct
        ),
        total_questions: Number(
          quizStats[0].total_questions
        ),
        average_percentage: Number(
          quizStats[0].average_percentage
        ),
        total_study_plans: Number(
          studyPlanStats[0].total_study_plans
        ),
        recent_attempts: recentAttempts.map(
          (attempt) => ({
            ...attempt,
            score: Number(attempt.score),
            total: Number(attempt.total),
            percentage: Number(
              attempt.percentage
            )
          })
        ),
        recent_activity: recentActivity
      }
    });

  } catch (error) {
    console.error(
      "Get progress dashboard error:",
      error
    );

    return res.status(500).json({
      status: "error",
      message:
        "Unable to fetch progress dashboard"
    });
  }
};


const deleteSelectedActivity = async (req, res) => {
  try {
    const { activity_ids } = req.body;

    if (
      !Array.isArray(activity_ids) ||
      activity_ids.length === 0
    ) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_ACTIVITY_IDS",
        message:
          "Select at least one activity to delete"
      });
    }

    if (activity_ids.length > 100) {
      return res.status(400).json({
        status: "error",
        code: "TOO_MANY_ACTIVITY_IDS",
        message:
          "A maximum of 100 activities can be deleted at once"
      });
    }

    const ids = [
      ...new Set(
        activity_ids.map(Number)
      )
    ];

    if (
      ids.some(
        (id) =>
          !Number.isInteger(id) ||
          id <= 0
      )
    ) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_ACTIVITY_IDS",
        message:
          "Every activity ID must be a valid positive integer"
      });
    }

    const placeholders = ids
      .map(() => "?")
      .join(", ");

    const [result] = await db.execute(
      `DELETE FROM activity_history
       WHERE user_id = ?
         AND activity_id IN (${placeholders})`,
      [
        req.user.user_id,
        ...ids
      ]
    );

    return res.status(200).json({
      status: "success",
      message:
        "Selected activity history deleted successfully",
      deleted_count: result.affectedRows
    });

  } catch (error) {
    console.error(
      "Delete selected activity error:",
      error
    );

    return res.status(500).json({
      status: "error",
      code: "ACTIVITY_DELETE_ERROR",
      message:
        "Unable to delete selected activity history"
    });
  }
};


const clearActivityHistory = async (req, res) => {
  try {
    const [result] = await db.execute(
      `DELETE FROM activity_history
       WHERE user_id = ?`,
      [req.user.user_id]
    );

    return res.status(200).json({
      status: "success",
      message:
        "Activity history cleared successfully",
      deleted_count: result.affectedRows
    });

  } catch (error) {
    console.error(
      "Clear activity history error:",
      error
    );

    return res.status(500).json({
      status: "error",
      code: "ACTIVITY_CLEAR_ERROR",
      message:
        "Unable to clear activity history"
    });
  }
};


module.exports = {
  getProgressDashboard,
  deleteSelectedActivity,
  clearActivityHistory
};