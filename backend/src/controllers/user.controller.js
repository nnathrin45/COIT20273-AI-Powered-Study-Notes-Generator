const db = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
      "study_notes_secret",
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

module.exports = {
  registerUser,
  loginUser
};