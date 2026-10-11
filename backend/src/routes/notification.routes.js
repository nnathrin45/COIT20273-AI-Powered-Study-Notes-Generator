const express = require("express");

const router =
  express.Router();

const authenticateUser =
  require("../middleware/auth.middleware");

const {
  getStudySessionNotifications,
  markStudySessionNotificationRead,
  markAllStudySessionNotificationsRead
} = require(
  "../controllers/notification.controller"
);


router.get(
  "/",
  authenticateUser,
  getStudySessionNotifications
);


router.put(
  "/read-all",
  authenticateUser,
  markAllStudySessionNotificationsRead
);


router.put(
  "/:notificationId/read",
  authenticateUser,
  markStudySessionNotificationRead
);


module.exports = router;