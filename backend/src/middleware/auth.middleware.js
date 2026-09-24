const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      status: "error",
      message: "Access Denied. No Token Provided."
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Invalid Token"
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // A login-2FA challenge token is temporary and must never
    // be accepted as an authenticated StudyA session.
    if (decoded.purpose === "login-2fa") {
      return res.status(401).json({
        status: "error",
        message:
          "Sign-in verification must be completed before accessing this resource."
      });
    }

    if (!decoded.user_id) {
      return res.status(401).json({
        status: "error",
        message: "Invalid Token"
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid Token"
    });
  }
};

module.exports = authenticateUser;