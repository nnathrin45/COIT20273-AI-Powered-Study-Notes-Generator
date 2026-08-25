const db = require("../config/database");

const getProgressDashboard = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Number of uploaded study materials
    const [fileStats] = await db.execute(
      `SELECT COUNT(*) AS total_files
       FROM uploaded_files
       WHERE user_id = ?`,
      [userId]
    );

    // Number of AI-generated outputs
    const [aiStats] = await db.execute(
      `SELECT COUNT(*) AS total_ai_outputs
       FROM ai_outputs
       WHERE user_id = ?`,
      [userId]
    );

    // Quiz attempt statistics
    const [quizStats] = await db.execute(
      `SELECT
         COUNT(*) AS total_quiz_attempts,
         COALESCE(SUM(score), 0) AS total_correct,
         COALESCE(SUM(total), 0) AS total_questions,
         COALESCE(ROUND(AVG(
           CASE
             WHEN total > 0 THEN (score * 100.0 / total)
             ELSE 0
           END
         ), 0), 0) AS average_percentage
       FROM quiz_attempts
       WHERE user_id = ?`,
      [userId]
    );

    // Recent quiz attempts
    const [recentAttempts] = await db.execute(
      `SELECT
         qa.attempt_id,
         qa.output_id,
         qa.score,
         qa.total,
         CASE
           WHEN qa.total > 0
             THEN ROUND((qa.score * 100.0 / qa.total), 0)
           ELSE 0
         END AS percentage,
         qa.attempted_at
       FROM quiz_attempts qa
       WHERE qa.user_id = ?
       ORDER BY qa.attempted_at DESC
       LIMIT 10`,
      [userId]
    );

    res.status(200).json({
      status: "success",
      progress: {
        total_files: fileStats[0].total_files,
        total_ai_outputs: aiStats[0].total_ai_outputs,
        total_quiz_attempts: quizStats[0].total_quiz_attempts,
        total_correct: Number(quizStats[0].total_correct),
        total_questions: Number(quizStats[0].total_questions),
        average_percentage: Number(quizStats[0].average_percentage),
        recent_attempts: recentAttempts
      }
    });

  } catch (error) {
    console.error("Get progress dashboard error:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to fetch progress dashboard"
    });
  }
};

module.exports = {
  getProgressDashboard
};