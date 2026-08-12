const db = require("../config/database");

// True only if the user's most recent consent record is 'granted' (FR17.1)
const hasActiveConsent = async (userId) => {
  const [rows] = await db.execute(
    `SELECT status
     FROM ai_consent
     WHERE user_id = ?
     ORDER BY recorded_at DESC, consent_id DESC
     LIMIT 1`,
    [userId]
  );

  return rows.length > 0 && rows[0].status === "granted";
};

module.exports = {
  hasActiveConsent
};
