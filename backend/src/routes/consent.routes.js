const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/auth.middleware");

const {
  recordConsent,
  getConsentStatus
} = require("../controllers/consent.controller");

router.post("/", authenticateUser, recordConsent);
router.get("/", authenticateUser, getConsentStatus);

module.exports = router;
