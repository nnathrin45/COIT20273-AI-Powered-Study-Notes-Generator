const db = require("../config/database");

const logActivity = async ({
  userId,
  activityType,
  detail,
  sourceType,
  sourceId
}) => {
  try {
    const safeDetail =
      String(detail || "Study activity")
        .trim()
        .slice(0, 500);

    await db.execute(
      `INSERT IGNORE INTO activity_history
       (
         user_id,
         activity_type,
         detail,
         source_type,
         source_id
       )
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        activityType,
        safeDetail,
        sourceType || null,
        sourceId ?? null
      ]
    );

    return true;
  } catch (error) {
    /*
     * Activity logging must not cause the user's real action
     * to fail. The resource operation remains authoritative.
     */
    console.error(
      "Activity history logging error:",
      error
    );

    return false;
  }
};

module.exports = {
  logActivity
};