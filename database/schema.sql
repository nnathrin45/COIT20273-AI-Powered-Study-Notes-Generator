-- AI-Powered Study Notes Generator — database schema
-- Tables 1–3 reconstructed from existing backend code (Member 2)
-- Tables 4–5 added for AI integration and consent tracking (Member 3, issue #5)

CREATE TABLE IF NOT EXISTS users (
  user_id     INT AUTO_INCREMENT PRIMARY KEY,
  full_name   VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,          -- bcrypt hash
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  note_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title       VARCHAR(255) NOT NULL,
  content     TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS uploaded_files (
  file_id        INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  file_name      VARCHAR(255) NOT NULL,
  file_path      VARCHAR(500) NOT NULL,
  extracted_text LONGTEXT,
  uploaded_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Consent audit trail (FR17, NFR11)
CREATE TABLE IF NOT EXISTS ai_consent (
  consent_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  status      ENUM('granted','revoked') NOT NULL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Generated AI content (FR9–FR12, FR16)
CREATE TABLE IF NOT EXISTS ai_outputs (
  output_id        INT AUTO_INCREMENT PRIMARY KEY,
  file_id          INT NOT NULL,
  user_id          INT NOT NULL,
  output_type      ENUM('summary','flashcards','quiz','explanation') NOT NULL,
  content          LONGTEXT NOT NULL,
  is_ai_generated  BOOLEAN NOT NULL DEFAULT TRUE,   -- FR16 labelling
  generated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES uploaded_files(file_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Quiz attempts: submitted answers and resulting score (FR11.2)
-- Each attempt is a new row rather than an update, so a student can retake a
-- quiz and the history remains available for the progress dashboard (FR14).
CREATE TABLE IF NOT EXISTS quiz_attempts (
  attempt_id   INT AUTO_INCREMENT PRIMARY KEY,
  output_id    INT NOT NULL,                     -- the quiz in ai_outputs
  user_id      INT NOT NULL,
  answers      LONGTEXT NOT NULL,                -- JSON array of submitted answers
  score        INT NOT NULL,                     -- number answered correctly
  total        INT NOT NULL,                     -- number of questions in the quiz
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (output_id) REFERENCES ai_outputs(output_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
