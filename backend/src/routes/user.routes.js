const express = require("express");

const router = express.Router();

const authenticateUser =
  require("../middleware/auth.middleware");

const {
  handleProfilePictureUpload
} = require(
  "../middleware/profilePicture.middleware"
);

const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  getProfilePicture,
  deleteProfilePicture,
  changeUserPassword,
  verifyUserEmail,
  resendVerificationCode
} = require("../controllers/user.controller");

router.post("/register", registerUser);

router.post(
  "/verify-email",
  verifyUserEmail
);

router.post(
  "/resend-verification",
  resendVerificationCode
);

router.post("/login", loginUser);

router.get(
  "/profile",
  authenticateUser,
  getUserProfile
);

router.put(
  "/profile",
  authenticateUser,
  updateUserProfile
);

router.get(
  "/profile-picture",
  authenticateUser,
  getProfilePicture
);

router.post(
  "/profile-picture",
  authenticateUser,
  handleProfilePictureUpload,
  uploadProfilePicture
);

router.delete(
  "/profile-picture",
  authenticateUser,
  deleteProfilePicture
);

router.put(
  "/password",
  authenticateUser,
  changeUserPassword
);

module.exports = router;