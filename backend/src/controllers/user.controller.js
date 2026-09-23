const db = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const registerUser = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    // Check if email already exists
    const [existingUser] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Email already exists"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save hashed password
    await db.execute(
      "INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)",
      [full_name, email, hashedPassword]
    );

    res.status(201).json({
      status: "success",
      message: "User Registered Successfully"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Database Error"
    });
  }
};

const loginUser = async (req, res) => {
  try {

    const { email, password } = req.body;

    // Find user
    const [users] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid Email or Password"
      });
    }

    const user = users[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        status: "error",
        message: "Invalid Email or Password"
      });
    }

    // Create JWT Token
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

    res.json({
      status: "success",
      token
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Login Failed"
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

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  getProfilePicture,
  deleteProfilePicture,
  changeUserPassword
};