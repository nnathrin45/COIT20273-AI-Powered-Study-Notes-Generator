const db = require("../config/database");

// Record a consent decision (FR17, NFR11)
const recordConsent = async (req, res) => {
  try {
    const { status } = req.body;

    if (status !== "granted" && status !== "revoked") {
      return res.status(400).json({
        status: "error",
        code: "INVALID_CONSENT_STATUS",
        message: "Consent status must be either 'granted' or 'revoked'"
      });
    }

    await db.execute(
      "INSERT INTO ai_consent (user_id, status) VALUES (?, ?)",
      [req.user.user_id, status]
    );

    res.status(201).json({
      status: "success",
      message: `Consent ${status} successfully`,
      consent: { status }
    });

  } catch (error) {
    console.error("Consent record error:", error);

    res.status(500).json({
      status: "error",
      code: "CONSENT_ERROR",
      message: "Unable to record consent"
    });
  }
};

// Return the user's current consent state
const getConsentStatus = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT status, recorded_at
       FROM ai_consent
       WHERE user_id = ?
       ORDER BY recorded_at DESC, consent_id DESC
       LIMIT 1`,
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.json({
        status: "success",
        consent: null,
        message: "No consent record found for this user"
      });
    }

    res.json({
      status: "success",
      consent: rows[0]
    });

  } catch (error) {
    console.error("Consent fetch error:", error);

    res.status(500).json({
      status: "error",
      code: "CONSENT_FETCH_ERROR",
      message: "Unable to fetch consent status"
    });
  }
};

module.exports = {
  recordConsent,
  getConsentStatus
};
