const db = require("../config/database");


const parsePositiveInteger = (value) => {
  const parsed =
    Number(value);

  return (
    Number.isInteger(parsed) &&
    parsed > 0
  )
    ? parsed
    : null;
};


/*
 * GET /api/notifications
 *
 * Returns the authenticated student's recent
 * Study Planner session notifications.
 */
const getStudySessionNotifications =
  async (req, res) => {
    try {
      const userId =
        req.user.user_id;

      const [notifications] =
        await db.execute(
          `SELECT
             n.notification_id,
             n.plan_id,
             n.session_index,

             DATE_FORMAT(
               n.session_date,
               '%Y-%m-%d'
             ) AS session_date,

             n.session_label,
             n.activity,
             n.duration,
             n.email_sent_at,
             n.read_at,
             n.created_at,

             sp.subject,
             sp.topic

           FROM study_session_notifications n

           INNER JOIN study_plans sp
             ON sp.plan_id = n.plan_id
            AND sp.user_id = n.user_id

           WHERE n.user_id = ?

           ORDER BY
             (n.read_at IS NULL) DESC,
             n.session_date ASC,
             n.created_at DESC

           LIMIT 25`,
          [userId]
        );

      const [countRows] =
        await db.execute(
          `SELECT
             COUNT(*) AS unread_count
           FROM study_session_notifications
           WHERE user_id = ?
             AND read_at IS NULL`,
          [userId]
        );

      const unreadCount =
        Number(
          countRows[0]
            ?.unread_count || 0
        );

      res.json({
        status: "success",
        unread_count:
          unreadCount,
        notifications
      });

    } catch (error) {
      console.error(
        "Get study session notifications error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Unable to load notifications"
      });
    }
  };


/*
 * PUT /api/notifications/:notificationId/read
 *
 * Marks one notification as read.
 * Ownership is enforced through user_id.
 */
const markStudySessionNotificationRead =
  async (req, res) => {
    try {
      const userId =
        req.user.user_id;

      const notificationId =
        parsePositiveInteger(
          req.params.notificationId
        );

      if (!notificationId) {
        return res.status(400).json({
          status: "error",
          message:
            "Invalid notification ID"
        });
      }

      const [notifications] =
        await db.execute(
          `SELECT
             notification_id,
             read_at
           FROM study_session_notifications
           WHERE notification_id = ?
             AND user_id = ?
           LIMIT 1`,
          [
            notificationId,
            userId
          ]
        );

      if (
        notifications.length === 0
      ) {
        return res.status(404).json({
          status: "error",
          message:
            "Notification not found"
        });
      }

      if (
        !notifications[0].read_at
      ) {
        await db.execute(
          `UPDATE
             study_session_notifications
           SET read_at =
             CURRENT_TIMESTAMP
           WHERE notification_id = ?
             AND user_id = ?`,
          [
            notificationId,
            userId
          ]
        );
      }

      const [updatedRows] =
        await db.execute(
          `SELECT
             notification_id,
             read_at
           FROM study_session_notifications
           WHERE notification_id = ?
             AND user_id = ?
           LIMIT 1`,
          [
            notificationId,
            userId
          ]
        );

      res.json({
        status: "success",
        notification:
          updatedRows[0]
      });

    } catch (error) {
      console.error(
        "Mark notification read error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Unable to update notification"
      });
    }
  };


/*
 * PUT /api/notifications/read-all
 *
 * Marks all unread notifications belonging
 * to the authenticated student as read.
 */
const markAllStudySessionNotificationsRead =
  async (req, res) => {
    try {
      const userId =
        req.user.user_id;

      const [result] =
        await db.execute(
          `UPDATE
             study_session_notifications
           SET read_at =
             CURRENT_TIMESTAMP
           WHERE user_id = ?
             AND read_at IS NULL`,
          [userId]
        );

      res.json({
        status: "success",
        marked_read:
          result.affectedRows
      });

    } catch (error) {
      console.error(
        "Mark all notifications read error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Unable to update notifications"
      });
    }
  };


module.exports = {
  getStudySessionNotifications,
  markStudySessionNotificationRead,
  markAllStudySessionNotificationsRead
};