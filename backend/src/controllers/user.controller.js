const db = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const {
    generateVerificationCode,
    hashVerificationCode,
    sendVerificationCodeEmail,
    sendLoginCodeEmail,
    sendPasswordResetCodeEmail
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
        email_verified,
        login_code_hash,
        login_code_expires_at,
        login_code_sent_at,
        login_code_attempts
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

    const challengeToken = jwt.sign(
      {
        user_id: user.user_id,
        purpose: "login-2fa"
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m"
      }
    );

    if (user.login_code_sent_at) {
      const sentAt =
        new Date(user.login_code_sent_at);

      const elapsedSeconds =
        Math.floor(
          (Date.now() - sentAt.getTime()) / 1000
        );

      if (
        elapsedSeconds >= 0 &&
        elapsedSeconds < 60 &&
        user.login_code_hash
      ) {
        const retryAfter =
          60 - elapsedSeconds;

        return res.json({
          status: "success",
          code: "LOGIN_2FA_REQUIRED",
          message:
            "A sign-in verification code was recently sent to your email.",
          two_factor_required: true,
          challenge_token: challengeToken,
          retry_after: retryAfter
        });
      }
    }

    const loginCode =
      generateVerificationCode();

    const loginCodeHash =
      await hashVerificationCode(loginCode);

    const expiresAt =
      new Date(
        Date.now() + 10 * 60 * 1000
      );

    const sentAt = new Date();

    await db.execute(
      `UPDATE users
       SET
         login_code_hash = ?,
         login_code_expires_at = ?,
         login_code_sent_at = ?,
         login_code_attempts = 0
       WHERE user_id = ?`,
      [
        loginCodeHash,
        expiresAt,
        sentAt,
        user.user_id
      ]
    );

    try {
      await sendLoginCodeEmail({
        to: user.email,
        fullName: user.full_name,
        code: loginCode
      });
    } catch (emailError) {
      await db.execute(
        `UPDATE users
         SET
           login_code_hash = NULL,
           login_code_expires_at = NULL,
           login_code_sent_at = NULL,
           login_code_attempts = 0
         WHERE user_id = ?`,
        [user.user_id]
      );

      throw emailError;
    }

    return res.json({
      status: "success",
      code: "LOGIN_2FA_REQUIRED",
      message:
        "A sign-in verification code has been sent to your email.",
      two_factor_required: true,
      challenge_token: challengeToken,
      retry_after: 60
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      status: "error",
      message:
        "Unable to send the sign-in verification code"
    });
  }
};

const verifyLoginCode = async (req, res) => {
  try {
    const challengeToken = String(
      req.body.challenge_token ?? ""
    ).trim();

    const code = String(
      req.body.code ?? ""
    ).trim();

    if (!challengeToken || !code) {
      return res.status(400).json({
        status: "error",
        message:
          "Login challenge and verification code are required"
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        status: "error",
        message:
          "Verification code must contain exactly 6 digits"
      });
    }

    let challenge;

    try {
      challenge = jwt.verify(
        challengeToken,
        process.env.JWT_SECRET
      );
    } catch {
      return res.status(401).json({
        status: "error",
        code: "LOGIN_CHALLENGE_EXPIRED",
        message:
          "Your sign-in verification session has expired. Please sign in again."
      });
    }

    if (
      challenge.purpose !== "login-2fa" ||
      !challenge.user_id
    ) {
      return res.status(401).json({
        status: "error",
        message:
          "Invalid sign-in verification session"
      });
    }

    const [users] = await db.execute(
      `SELECT
        user_id,
        email,
        email_verified,
        login_code_hash,
        login_code_expires_at,
        login_code_attempts
       FROM users
       WHERE user_id = ?`,
      [challenge.user_id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: "error",
        message:
          "Invalid sign-in verification session"
      });
    }

    const user = users[0];

    if (!user.email_verified) {
      return res.status(403).json({
        status: "error",
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Please verify your email address before signing in."
      });
    }

    if (
      !user.login_code_hash ||
      !user.login_code_expires_at
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "No active sign-in verification code was found. Please sign in again."
      });
    }

    if (user.login_code_attempts >= 5) {
      return res.status(429).json({
        status: "error",
        code: "LOGIN_CODE_ATTEMPTS_EXCEEDED",
        message:
          "Too many incorrect verification attempts. Please sign in again."
      });
    }

    const expiresAt =
      new Date(user.login_code_expires_at);

    if (expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        status: "error",
        code: "LOGIN_CODE_EXPIRED",
        message:
          "The sign-in verification code has expired. Please sign in again."
      });
    }

    const codeMatches =
      await bcrypt.compare(
        code,
        user.login_code_hash
      );

    if (!codeMatches) {
      await db.execute(
        `UPDATE users
         SET login_code_attempts =
           login_code_attempts + 1
         WHERE user_id = ?`,
        [user.user_id]
      );

      return res.status(400).json({
        status: "error",
        message:
          "Invalid sign-in verification code"
      });
    }

    await db.execute(
      `UPDATE users
       SET
         login_code_hash = NULL,
         login_code_expires_at = NULL,
         login_code_sent_at = NULL,
         login_code_attempts = 0
       WHERE user_id = ?`,
      [user.user_id]
    );

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
      message: "Sign-in verification successful",
      token
    });
  } catch (error) {
    console.error(
      "Login verification error:",
      error
    );

    return res.status(500).json({
      status: "error",
      message:
        "Unable to verify the sign-in code"
    });
  }
};

const resendLoginCode = async (req, res) => {
  try {
    const challengeToken = String(
      req.body.challenge_token ?? ""
    ).trim();

    if (!challengeToken) {
      return res.status(400).json({
        status: "error",
        message:
          "Login challenge is required"
      });
    }

    let challenge;

    try {
      challenge = jwt.verify(
        challengeToken,
        process.env.JWT_SECRET
      );
    } catch {
      return res.status(401).json({
        status: "error",
        code: "LOGIN_CHALLENGE_EXPIRED",
        message:
          "Your sign-in verification session has expired. Please sign in again."
      });
    }

    if (
      challenge.purpose !== "login-2fa" ||
      !challenge.user_id
    ) {
      return res.status(401).json({
        status: "error",
        message:
          "Invalid sign-in verification session"
      });
    }

    const [users] = await db.execute(
      `SELECT
        user_id,
        full_name,
        email,
        email_verified,
        login_code_sent_at
       FROM users
       WHERE user_id = ?`,
      [challenge.user_id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: "error",
        message:
          "Invalid sign-in verification session"
      });
    }

    const user = users[0];

    if (!user.email_verified) {
      return res.status(403).json({
        status: "error",
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Please verify your email address before signing in."
      });
    }

    if (user.login_code_sent_at) {
      const sentAt =
        new Date(user.login_code_sent_at);

      const elapsedSeconds =
        Math.floor(
          (Date.now() - sentAt.getTime()) / 1000
        );

      if (
        elapsedSeconds >= 0 &&
        elapsedSeconds < 60
      ) {
        const retryAfter =
          60 - elapsedSeconds;

        return res.status(429).json({
          status: "error",
          code: "LOGIN_RESEND_COOLDOWN",
          message:
            `Please wait ${retryAfter} seconds before requesting another code.`,
          retry_after: retryAfter
        });
      }
    }

    const loginCode =
      generateVerificationCode();

    const loginCodeHash =
      await hashVerificationCode(loginCode);

    const expiresAt =
      new Date(
        Date.now() + 10 * 60 * 1000
      );

    const sentAt = new Date();

    await sendLoginCodeEmail({
      to: user.email,
      fullName: user.full_name,
      code: loginCode
    });

    await db.execute(
      `UPDATE users
      SET
        login_code_hash = ?,
        login_code_expires_at = ?,
        login_code_sent_at = ?,
        login_code_attempts = 0
      WHERE user_id = ?`,
      [
        loginCodeHash,
        expiresAt,
        sentAt,
        user.user_id
      ]
    );

    const refreshedChallengeToken = jwt.sign(
      {
        user_id: user.user_id,
        purpose: "login-2fa"
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m"
      }
    );

    return res.json({
      status: "success",
      message:
        "A new sign-in verification code has been sent to your email.",
      challenge_token: refreshedChallengeToken,
      retry_after: 60
    });

  } catch (error) {
    console.error(
      "Login code resend error:",
      error
    );

    return res.status(500).json({
      status: "error",
      message:
        "Unable to resend the sign-in verification code"
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
const requestPasswordReset = async (req, res) => {
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
         login_code_sent_at
       FROM users
       WHERE email = ?`,
      [email]
    );

    // Do not reveal whether an email is registered.
    if (users.length === 0) {
      return res.json({
        status: "success",
        message:
          "If an account exists for this email, a password reset code has been sent."
      });
    }

    const user = users[0];

    // 60-second resend cooldown.
    if (user.login_code_sent_at) {
      const lastSentAt =
        new Date(user.login_code_sent_at).getTime();

      const secondsSinceLastSend =
        Math.floor(
          (Date.now() - lastSentAt) / 1000
        );

      if (
        secondsSinceLastSend >= 0 &&
        secondsSinceLastSend < 60
      ) {
        const retryAfter =
          60 - secondsSinceLastSend;

        return res.status(429).json({
          status: "error",
          code: "PASSWORD_RESET_COOLDOWN",
          message:
            `Please wait ${retryAfter} seconds before requesting another password reset code.`,
          retry_after: retryAfter
        });
      }
    }

    const resetCode =
      generateVerificationCode();

    const resetCodeHash =
      await hashVerificationCode(resetCode);

    const expiresAt =
      new Date(
        Date.now() + 10 * 60 * 1000
      );

    const sentAt = new Date();

    // Store only the hashed reset code.
    await db.execute(
      `UPDATE users
       SET
         login_code_hash = ?,
         login_code_expires_at = ?,
         login_code_sent_at = ?,
         login_code_attempts = 0
       WHERE user_id = ?`,
      [
        resetCodeHash,
        expiresAt,
        sentAt,
        user.user_id
      ]
    );

    try {
      await sendPasswordResetCodeEmail({
        to: user.email,
        fullName: user.full_name,
        code: resetCode
      });
    } catch (emailError) {
      // Remove reset code if email delivery fails.
      await db.execute(
        `UPDATE users
         SET
           login_code_hash = NULL,
           login_code_expires_at = NULL,
           login_code_sent_at = NULL,
           login_code_attempts = 0
         WHERE user_id = ?`,
        [user.user_id]
      );

      throw emailError;
    }

    return res.json({
      status: "success",
      message:
        "If an account exists for this email, a password reset code has been sent."
    });
  } catch (error) {
    console.error(
      "Password reset request error:",
      error
    );

    return res.status(500).json({
      status: "error",
      message:
        "Unable to process password reset request"
    });
  }
};


const verifyPasswordResetCode = async (req, res) => {
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
          "Email and reset code are required"
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        status: "error",
        message:
          "Reset code must be 6 digits"
      });
    }

    const [users] = await db.execute(
      `SELECT
         user_id,
         email,
         login_code_hash,
         login_code_expires_at,
         login_code_attempts
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({
        status: "error",
        message:
          "Invalid or expired reset code"
      });
    }

    const user = users[0];

    if (
      !user.login_code_hash ||
      !user.login_code_expires_at
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Invalid or expired reset code"
      });
    }

    // Maximum 5 incorrect attempts.
    if (
      Number(user.login_code_attempts) >= 5
    ) {
      return res.status(429).json({
        status: "error",
        code: "PASSWORD_RESET_ATTEMPTS_EXCEEDED",
        message:
          "Too many incorrect reset-code attempts. Please request a new code."
      });
    }

    const expiresAt =
      new Date(
        user.login_code_expires_at
      );

    if (expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        status: "error",
        code: "PASSWORD_RESET_CODE_EXPIRED",
        message:
          "Reset code has expired. Please request a new code."
      });
    }

    const codeMatches =
      await bcrypt.compare(
        code,
        user.login_code_hash
      );

    if (!codeMatches) {
      await db.execute(
        `UPDATE users
         SET login_code_attempts =
             login_code_attempts + 1
         WHERE user_id = ?`,
        [user.user_id]
      );

      return res.status(400).json({
        status: "error",
        message:
          "Invalid or expired reset code"
      });
    }

    // Short-lived token proving successful code verification.
    const resetToken = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        purpose: "password-reset",
        code_hash: user.login_code_hash
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m"
      }
    );

    return res.json({
      status: "success",
      message:
        "Password reset code verified successfully",
      reset_token: resetToken
    });
  } catch (error) {
    console.error(
      "Password reset verification error:",
      error
    );

    return res.status(500).json({
      status: "error",
      message:
        "Unable to verify password reset code"
    });
  }
};


const resetPassword = async (req, res) => {
  try {
    const resetToken = String(
      req.body.reset_token ?? ""
    ).trim();

    const newPassword = String(
      req.body.new_password ?? ""
    );

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        status: "error",
        message:
          "Reset token and new password are required"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        status: "error",
        message:
          "New password must be at least 8 characters long"
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        resetToken,
        process.env.JWT_SECRET
      );
    } catch {
      return res.status(401).json({
        status: "error",
        message:
          "Invalid or expired password reset session"
      });
    }

    if (
      decoded.purpose !== "password-reset" ||
      !decoded.user_id ||
      !decoded.code_hash
    ) {
      return res.status(401).json({
        status: "error",
        message:
          "Invalid password reset session"
      });
    }

    const [users] = await db.execute(
      `SELECT
         user_id,
         password,
         login_code_hash,
         login_code_expires_at
       FROM users
       WHERE user_id = ?`,
      [decoded.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User account not found"
      });
    }

    const user = users[0];

    // Make sure this is still the same reset-code session.
    if (
      !user.login_code_hash ||
      user.login_code_hash !== decoded.code_hash
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Password reset session is no longer valid. Please request a new code."
      });
    }

    if (
      !user.login_code_expires_at ||
      new Date(
        user.login_code_expires_at
      ).getTime() < Date.now()
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Password reset session has expired. Please request a new code."
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10
      );

    await db.execute(
      `UPDATE users
       SET
         password = ?,
         login_code_hash = NULL,
         login_code_expires_at = NULL,
         login_code_sent_at = NULL,
         login_code_attempts = 0
       WHERE user_id = ?`,
      [
        hashedPassword,
        user.user_id
      ]
    );

    return res.json({
      status: "success",
      message:
        "Password reset successfully"
    });
  } catch (error) {
    console.error(
      "Password reset error:",
      error
    );

    return res.status(500).json({
      status: "error",
      message:
        "Unable to reset password"
    });
  }
};
module.exports = {
  registerUser,
  verifyUserEmail,
  loginUser,
  verifyLoginCode,
  resendLoginCode,
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  getProfilePicture,
  deleteProfilePicture,
  changeUserPassword,
  resendVerificationCode,
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword
};