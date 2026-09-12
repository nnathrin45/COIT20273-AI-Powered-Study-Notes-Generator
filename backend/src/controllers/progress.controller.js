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

    const filePeriod = getPeriodCondition(period, "uploaded_at");
    const aiPeriod = getPeriodCondition(period, "generated_at");
    const quizPeriod = getPeriodCondition(period, "attempted_at");
    const planPeriod = getPeriodCondition(period, "created_at");

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
             THEN ROUND((qa.score * 100.0 / qa.total), 0)
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

    // Recent study activity
    const [recentActivity] = await db.execute(
      `SELECT
         activity_type,
         detail,
         occurred_at
       FROM (
         SELECT
           'quiz_attempt' AS activity_type,
           uf.file_name AS detail,
           qa.attempted_at AS occurred_at
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

         UNION ALL

         SELECT
           CONCAT('ai_', ao.output_type) AS activity_type,
           uf.file_name AS detail,
           ao.generated_at AS occurred_at
         FROM ai_outputs ao
         INNER JOIN uploaded_files uf
           ON uf.file_id = ao.file_id
           AND uf.user_id = ao.user_id
         WHERE ao.user_id = ?${getPeriodCondition(
           period,
           "ao.generated_at"
         )}

         UNION ALL

         SELECT
           'upload' AS activity_type,
           file_name AS detail,
           uploaded_at AS occurred_at
         FROM uploaded_files
         WHERE user_id = ?${getPeriodCondition(
           period,
           "uploaded_at"
         )}

         UNION ALL

         SELECT
           'study_plan' AS activity_type,
           CONCAT(subject, ' - ', topic) AS detail,
           created_at AS occurred_at
         FROM study_plans
         WHERE user_id = ?${getPeriodCondition(
           period,
           "created_at"
         )}
       ) AS activities
       ORDER BY occurred_at DESC
       LIMIT 10`,
      [userId, userId, userId, userId]
    );

    return res.status(200).json({
      status: "success",
      period,
      progress: {
        total_files: Number(fileStats[0].total_files),
        total_ai_outputs: Number(aiStats[0].total_ai_outputs),
        summaries_generated: Number(aiStats[0].summaries_generated),
        flashcards_generated: Number(aiStats[0].flashcards_generated),
        quizzes_generated: Number(aiStats[0].quizzes_generated),
        explanations_generated: Number(
          aiStats[0].explanations_generated
        ),
        total_quiz_attempts: Number(
          quizStats[0].total_quiz_attempts
        ),
        total_correct: Number(quizStats[0].total_correct),
        total_questions: Number(quizStats[0].total_questions),
        average_percentage: Number(
          quizStats[0].average_percentage
        ),
        total_study_plans: Number(
          studyPlanStats[0].total_study_plans
        ),
        recent_attempts: recentAttempts.map((attempt) => ({
            ...attempt,
            score: Number(attempt.score),
            total: Number(attempt.total),
            percentage: Number(attempt.percentage)
        })),
        recent_activity: recentActivity
      }
    });
  } catch (error) {
    console.error("Get progress dashboard error:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to fetch progress dashboard"
    });
  }
};

module.exports = {
  getProgressDashboard
};