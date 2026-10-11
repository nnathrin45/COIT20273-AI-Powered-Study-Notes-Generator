-- AI-Powered Study Notes Generator — database schema
-- Tables 1–3 reconstructed from existing backend code (Member 2)
-- Tables 4–5 added for AI integration and consent tracking (Member 3, issue #5)

CREATE TABLE IF NOT EXISTS users (
  user_id                       INT AUTO_INCREMENT PRIMARY KEY,
  full_name                     VARCHAR(255) NOT NULL,
  email                         VARCHAR(255) NOT NULL UNIQUE,
  email_verified                TINYINT(1) NOT NULL DEFAULT 0,
  email_verification_code_hash  VARCHAR(255) NULL,
  email_verification_expires_at DATETIME NULL,
  email_verification_sent_at    DATETIME NULL,
  email_verification_attempts   INT NOT NULL DEFAULT 0,

  login_code_hash VARCHAR(255) NULL,
  login_code_expires_at DATETIME NULL,
  login_code_sent_at DATETIME NULL,
  login_code_attempts INT NOT NULL DEFAULT 0,

  password                      VARCHAR(255) NOT NULL,
  profile_picture               VARCHAR(255) NULL,
  created_at                    DATETIME DEFAULT CURRENT_TIMESTAMP
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

-- Concept Explanation chat sessions
-- Each chat belongs to one user and one main study material.
CREATE TABLE IF NOT EXISTS explanation_chats (
  chat_id       INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  main_file_id  INT NOT NULL,
  title         VARCHAR(255) NOT NULL DEFAULT 'New chat',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (main_file_id) REFERENCES uploaded_files(file_id) ON DELETE CASCADE
);

-- Associates stored explanation outputs with one Concept Explanation chat.
-- ai_outputs remains unchanged so Summary, Flashcards, Quiz, Saved Materials
-- and Progress continue using the existing shared AI output structure.
CREATE TABLE IF NOT EXISTS explanation_chat_outputs (
  chat_id     INT NOT NULL,
  output_id   INT NOT NULL UNIQUE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (chat_id, output_id),
  FOREIGN KEY (chat_id) REFERENCES explanation_chats(chat_id) ON DELETE CASCADE,
  FOREIGN KEY (output_id) REFERENCES ai_outputs(output_id) ON DELETE CASCADE
);
-- Supplementary files attached only to a Concept Explanation chat.
-- These files provide additional AI context and do not become main study materials.
CREATE TABLE IF NOT EXISTS explanation_chat_sources (
  source_id       INT AUTO_INCREMENT PRIMARY KEY,
  chat_id         INT NOT NULL,
  user_id         INT NOT NULL,
  file_name       VARCHAR(255) NOT NULL,
  file_path       VARCHAR(500) NOT NULL,
  mime_type       VARCHAR(150),
  file_size       BIGINT UNSIGNED,
  extracted_text  LONGTEXT NOT NULL,
  uploaded_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES explanation_chats(chat_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
-- Concept Explanation metadata
-- Stores the user's original question and selected explanation level separately
-- from ai_outputs.content so existing AI resource consumers remain compatible.
CREATE TABLE IF NOT EXISTS explanation_metadata (
  output_id          INT PRIMARY KEY,
  concept            TEXT NOT NULL,
  explanation_level  ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  FOREIGN KEY (output_id) REFERENCES ai_outputs(output_id) ON DELETE CASCADE
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

-- Study Planner plans
CREATE TABLE IF NOT EXISTS study_plans (
  plan_id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  subject          VARCHAR(255) NOT NULL,
  topic            VARCHAR(500) NOT NULL,
  deadline         DATE NOT NULL,
  available_hours  DECIMAL(5,2) NOT NULL,
  study_days       JSON NOT NULL,
  plan_data        JSON NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
                   ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

  INDEX idx_study_plans_user_deadline (user_id, deadline)
);

-- Study Planner upcoming-session notifications.
-- One row represents one upcoming reminder for one generated study session.
-- The unique key prevents duplicate notifications and duplicate reminder emails.
CREATE TABLE IF NOT EXISTS study_session_notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  plan_id         INT NOT NULL,
  session_index   INT NOT NULL,
  session_date    DATE NOT NULL,
  session_label   VARCHAR(100) NOT NULL,
  activity        VARCHAR(1000) NULL,
  duration        VARCHAR(100) NULL,

  email_sent_at   DATETIME NULL,
  read_at         DATETIME NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

  FOREIGN KEY (plan_id)
    REFERENCES study_plans(plan_id)
    ON DELETE CASCADE,

  UNIQUE KEY uq_study_session_notification (
    plan_id,
    session_index,
    session_date
  ),

  INDEX idx_study_session_notifications_user_read (
    user_id,
    read_at,
    session_date
  )
);

-- Independent recent activity history.
-- Activity records are separate from study resources so users can clear
-- their history without deleting uploaded files, AI outputs, quiz attempts,
-- or study plans.
CREATE TABLE IF NOT EXISTS activity_history (
  activity_id    INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  activity_type  VARCHAR(50) NOT NULL,
  detail         VARCHAR(500) NOT NULL,
  source_type    VARCHAR(50) NULL,
  source_id      INT NULL,
  occurred_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

  INDEX idx_activity_history_user_date (
    user_id,
    occurred_at
  ),

  UNIQUE KEY uq_activity_history_source (
    user_id,
    activity_type,
    source_type,
    source_id
  )
);