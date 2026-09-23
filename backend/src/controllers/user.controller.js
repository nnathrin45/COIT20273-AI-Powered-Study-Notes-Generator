const db = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const {
  generateVerificationCode,
  hashVerificationCode,
  sendVerificationCodeEmail
} = require("../services/email.service");

const registerUser = async (req, res) => {
  let newUserId = null;

  try {
    const fullName = String(req.body.full_name ?? "").trim();
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");

    if (!fullName || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Full name, email, and password are required"
      });
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Please enter a valid email address"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 8 characters long"
      });
    }

    const [existingUsers] = await db.execute(
      `SELECT user_id
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "An account with this email already exists"
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const verificationCode =
      generateVerificationCode();

    const verificationCodeHash =
      await hashVerificationCode(
        verificationCode
      );

    const verificationExpiresAt =
      new Date(Date.now() + 10 * 60 * 1000);

    const verificationSentAt =
      new Date();

    const [result] = await db.execute(
      `INSERT INTO users (
        full_name,
        email,
        email_verified,
        email_verification_code_hash,
        email_verification_expires_at,
        email_verification_sent_at,
        email_verification_attempts,
        password
      )
      VALUES (?, ?, 0, ?, ?, ?, 0, ?)`,
      [
        fullName,
        email,
        verificationCodeHash,
        verificationExpiresAt,
        verificationSentAt,
        hashedPassword
      ]
    );

    newUserId = result.insertId;

    await sendVerificationCodeEmail({
      to: email,
      fullName,
      code: verificationCode
    });

    return res.status(201).json({
      status: "success",
      message:
        "Account created. Please check your email for the verification code.",
      verification_required: true,
      email
    });
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    /*
     * If account creation succeeded but sending
     * the verification email failed, remove the
     * incomplete account so the user can retry.
     */
    if (newUserId) {
      try {
        await db.execute(
          `DELETE FROM users
           WHERE user_id = ?
           AND email_verified = 0`,
          [newUserId]
        );
      } catch (cleanupError) {
        console.error(
          "Registration cleanup error:",
          cleanupError
        );
      }
    }

    return res.status(500).json({
      status: "error",
      message:
        "Unable to create account or send verification email"
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const email = String(
      req.body.email ?? ""
    )
      .trim()
      .toLowerCase();

    const password = String(
      req.body.password ?? ""
    );

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required"
      });
    }

    const [users] = await db.execute(
      `SELECT
        user_id,
        full_name,
        email,
        password,
        email_verified
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid Email or Password"
      });
    }

    const user = users[0];

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatches) {
      return res.status(401).json({
        status: "error",
        message: "Invalid Email or Password"
      });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        status: "error",
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Please verify your email address before signing in.",
        verification_required: true,
        email: user.email
      });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    return res.json({
      status: "success",
      message: "Login successful",
      token
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      status: "error",
      message: "Unable to sign in"
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT
        user_id,
        full_name,
        email,
        profile_picture,
        created_at
       FROM users
       WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User profile not found"
      });
    }

    res.json({
      status: "success",
      user: users[0]
    });

  } catch (error) {
    console.error("Profile fetch error:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to retrieve user profile"
    });
  }
};


const updateUserProfile = async (req, res) => {
  try {
    const fullName =
      String(req.body.full_name ?? "").trim();

    if (!fullName) {
      return res.status(400).json({
        status: "error",
        message: "Full name is required"
      });
    }

    if (fullName.length > 255) {
      return res.status(400).json({
        status: "error",
        message: "Full name must not exceed 255 characters"
      });
    }

    const [result] = await db.execute(
      `UPDATE users
       SET full_name = ?
       WHERE user_id = ?`,
      [
        fullName,
        req.user.user_id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "User profile not found"
      });
    }

    const [users] = await db.execute(
      `SELECT
        user_id,
        full_name,
        email,
        profile_picture,
        created_at
       FROM users
       WHERE user_id = ?`,
      [req.user.user_id]
    );

    res.json({
      status: "success",
      message: "Profile updated successfully",
      user: users[0]
    });

  } catch (error) {
    console.error("Profile update error:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to update user profile"
    });
  }
};

const uploadProfilePicture = async (req, res) => {
  let newFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "Please select a profile picture"
      });
    }

    newFilePath = req.file.path;

    const [users] = await db.execute(
      `SELECT profile_picture
       FROM users
       WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (users.length === 0) {
      if (fs.existsSync(newFilePath)) {
        fs.unlinkSync(newFilePath);
      }

      return res.status(404).json({
        status: "error",
        message: "User profile not found"
      });
    }

    const oldProfilePicture =
      users[0].profile_picture;

    await db.execute(
      `UPDATE users
       SET profile_picture = ?
       WHERE user_id = ?`,
      [
        req.file.filename,
        req.user.user_id
      ]
    );

    if (oldProfilePicture) {
      const oldFilePath = path.join(
        __dirname,
        "../profile-pictures",
        path.basename(oldProfilePicture)
      );

      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    res.json({
      status: "success",
      message:
        "Profile picture updated successfully",
      profile_picture: req.file.filename
    });

  } catch (error) {
    console.error(
      "Profile picture upload error:",
      error
    );

    if (
      newFilePath &&
      fs.existsSync(newFilePath)
    ) {
      fs.unlinkSync(newFilePath);
    }

    res.status(500).json({
      status: "error",
      message:
        "Unable to update profile picture"
    });
  }
};


const getProfilePicture = async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT profile_picture
       FROM users
       WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User profile not found"
      });
    }

    const profilePicture =
      users[0].profile_picture;

    if (!profilePicture) {
      return res.status(404).json({
        status: "error",
        message:
          "No profile picture has been uploaded"
      });
    }

    const filePath = path.join(
      __dirname,
      "../profile-pictures",
      path.basename(profilePicture)
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: "error",
        message:
          "Profile picture file was not found"
      });
    }

    res.sendFile(filePath);

  } catch (error) {
    console.error(
      "Profile picture fetch error:",
      error
    );

    res.status(500).json({
      status: "error",
      message:
        "Unable to retrieve profile picture"
    });
  }
};

const deleteProfilePicture = async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT profile_picture
       FROM users
       WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User profile not found"
      });
    }

    const profilePicture =
      users[0].profile_picture;

    await db.execute(
      `UPDATE users
       SET profile_picture = NULL
       WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (profilePicture) {
      const filePath = path.join(
        __dirname,
        "../profile-pictures",
        path.basename(profilePicture)
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({
      status: "success",
      message:
        "Profile picture removed successfully"
    });

  } catch (error) {
    console.error(
      "Profile picture delete error:",
      error
    );

    res.status(500).json({
      status: "error",
      message:
        "Unable to remove profile picture"
    });
  }
};

const changeUserPassword = async (req, res) => {
  try {
    const {
      current_password,
      new_password
    } = req.body;

    if (
      !current_password ||
      !new_password
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Current password and new password are required"
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        status: "error",
        message:
          "New password must be at least 8 characters long"
      });
    }

    const [users] = await db.execute(
      `SELECT user_id, password
       FROM users
       WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User account not found"
      });
    }

    const user = users[0];

    const passwordMatches =
      await bcrypt.compare(
        current_password,
        user.password
      );

    if (!passwordMatches) {
      return res.status(400).json({
        status: "error",
        message:
          "Current password is incorrect"
      });
    }

    const sameAsCurrent =
      await bcrypt.compare(
        new_password,
        user.password
      );

    if (sameAsCurrent) {
      return res.status(400).json({
        status: "error",
        message:
          "New password must be different from your current password"
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        new_password,
        10
      );

    await db.execute(
      `UPDATE users
       SET password = ?
       WHERE user_id = ?`,
      [
        hashedPassword,
        req.user.user_id
      ]
    );

    res.json({
      status: "success",
      message:
        "Password changed successfully"
    });

  } catch (error) {
    console.error(
      "Password change error:",
      error
    );

    res.status(500).json({
      status: "error",
      message:
        "Unable to change password"
    });
  }
};

const verifyUserEmail = async (req, res) => {
  try {
    const email = String(
      req.body.email ?? ""
    )
      .trim()
      .toLowerCase();

    const code = String(
      req.body.code ?? ""
    ).trim();

    if (!email || !code) {
      return res.status(400).json({
        status: "error",
        message:
          "Email and verification code are required"
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        status: "error",
        message:
          "Verification code must be 6 digits"
      });
    }

    const [users] = await db.execute(
      `SELECT
        user_id,
        email_verified,
        email_verification_code_hash,
        email_verification_expires_at,
        email_verification_attempts
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({
        status: "error",
        message:
          "Invalid email or verification code"
      });
    }

    const user = users[0];

    if (user.email_verified) {
      return res.json({
        status: "success",
        message:
          "Email address is already verified"
      });
    }

    if (
      !user.email_verification_code_hash ||
      !user.email_verification_expires_at
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "No active verification code was found"
      });
    }

    if (
      Number(
        user.email_verification_attempts
      ) >= 5
    ) {
      return res.status(429).json({
        status: "error",
        message:
          "Too many incorrect attempts. Please request a new verification code."
      });
    }

    const expiresAt = new Date(
      user.email_verification_expires_at
    );

    if (expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        status: "error",
        message:
          "Verification code has expired. Please request a new code."
      });
    }

    const codeMatches =
      await bcrypt.compare(
        code,
        user.email_verification_code_hash
      );

    if (!codeMatches) {
      await db.execute(
        `UPDATE users
         SET email_verification_attempts =
             email_verification_attempts + 1
         WHERE user_id = ?`,
        [user.user_id]
      );

      return res.status(400).json({
        status: "error",
        message:
          "Invalid verification code"
      });
    }

    await db.execute(
      `UPDATE users
       SET
         email_verified = 1,
         email_verification_code_hash = NULL,
         email_verification_expires_at = NULL,
         email_verification_sent_at = NULL,
         email_verification_attempts = 0
       WHERE user_id = ?`,
      [user.user_id]
    );

    return res.json({
      status: "success",
      message:
        "Email verified successfully. You can now sign in."
    });
  } catch (error) {
    console.error(
      "Email verification error:",
      error
    );

    return res.status(500).json({
      status: "error",
      message:
        "Unable to verify email address"
    });
  }
};

const resendVerificationCode = async (req, res) => {
  try {
    const email = String(
      req.body.email ?? ""
    )
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email address is required"
      });
    }

    const [users] = await db.execute(
      `SELECT
        user_id,
        full_name,
        email,
        email_verified,
        email_verification_sent_at
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({
        status: "error",
        message:
          "No account was found for this email address"
      });
    }

    const user = users[0];

    if (user.email_verified) {
      return res.status(400).json({
        status: "error",
        message:
          "This email address is already verified"
      });
    }

    /*
     * Prevent users from repeatedly requesting
     * verification emails.
     */
    if (user.email_verification_sent_at) {
      const lastSentAt = new Date(
        user.email_verification_sent_at
      ).getTime();

      const secondsSinceLastSend =
        Math.floor(
          (Date.now() - lastSentAt) / 1000
        );

      if (secondsSinceLastSend < 60) {
        const remainingSeconds =
          60 - secondsSinceLastSend;

        return res.status(429).json({
          status: "error",
          code: "VERIFICATION_RESEND_COOLDOWN",
          message:
            `Please wait ${remainingSeconds} seconds before requesting another code.`,
          retry_after: remainingSeconds
        });
      }
    }

    const verificationCode =
      generateVerificationCode();

    const verificationCodeHash =
      await hashVerificationCode(
        verificationCode
      );

    const verificationExpiresAt =
      new Date(
        Date.now() + 10 * 60 * 1000
      );

    const verificationSentAt =
      new Date();

    await sendVerificationCodeEmail({
      to: user.email,
      fullName: user.full_name,
      code: verificationCode
    });

    await db.execute(
      `UPDATE users
       SET
         email_verification_code_hash = ?,
         email_verification_expires_at = ?,
         email_verification_sent_at = ?,
         email_verification_attempts = 0
       WHERE user_id = ?`,
      [
        verificationCodeHash,
        verificationExpiresAt,
        verificationSentAt,
        user.user_id
      ]
    );

    return res.json({
      status: "success",
      message:
        "A new verification code has been sent to your email address."
    });
  } catch (error) {
    console.error(
      "Verification code resend error:",
      error
    );

    return res.status(500).json({
      status: "error",
      message:
        "Unable to send a new verification code"
    });
  }
};

module.exports = {
  registerUser,
  verifyUserEmail,
  loginUser,
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  getProfilePicture,
  deleteProfilePicture,
  changeUserPassword,
  resendVerificationCode
};