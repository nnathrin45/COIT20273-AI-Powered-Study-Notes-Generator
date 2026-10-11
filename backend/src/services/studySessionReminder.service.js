const db = require("../config/database");

const {
  sendStudySessionReminderEmail
} = require("./email.service");


let reminderCheckRunning = false;


const parsePlanData = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return {};
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};


const normaliseSessionDate = (value) => {
  const text =
    String(value || "").trim();

  const match =
    /^(\d{4}-\d{2}-\d{2})/.exec(
      text
    );

  return match
    ? match[1]
    : "";
};


const addCalendarDays = (
  calendarDate,
  amount
) => {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      calendarDate
    );

  if (!match) {
    return "";
  }

  const date =
    new Date(
      Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]) + amount
      )
    );

  return date
    .toISOString()
    .slice(0, 10);
};


const getReminderTimeZone = () => {
  const requestedTimeZone =
    process.env.STUDY_REMINDER_TIME_ZONE ||
    "UTC";

  try {
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          requestedTimeZone
      }
    ).format(
      new Date()
    );

    return requestedTimeZone;
  } catch {
    console.warn(
      `Invalid STUDY_REMINDER_TIME_ZONE "${requestedTimeZone}". Falling back to UTC.`
    );

    return "UTC";
  }
};


const getCalendarDateInTimeZone = (
  date,
  timeZone
) => {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    ).formatToParts(date);

  const values = {};

  for (const part of parts) {
    if (
      part.type === "year" ||
      part.type === "month" ||
      part.type === "day"
    ) {
      values[part.type] =
        part.value;
    }
  }

  return [
    values.year,
    values.month,
    values.day
  ].join("-");
};


const isReminderEmailEnabled = () => {
  return (
    String(
      process.env
        .STUDY_REMINDER_EMAIL_ENABLED ||
      "false"
    ).toLowerCase() === "true"
  );
};


const runStudySessionReminderCheck =
  async () => {
    if (reminderCheckRunning) {
      return {
        skipped: true,
        reason:
          "Reminder check already running"
      };
    }

    reminderCheckRunning = true;

    const stats = {
      checked_plans: 0,
      eligible_sessions: 0,
      notifications_created: 0,
      emails_sent: 0,
      email_failures: 0
    };

    try {
      const timeZone =
        getReminderTimeZone();

      const today =
        getCalendarDateInTimeZone(
          new Date(),
          timeZone
        );

      const tomorrow =
        addCalendarDays(
          today,
          1
        );

      /*
       * Sessions are stored in plan_data JSON.
       * The deadline condition avoids loading
       * study plans that are already completely
       * in the past.
       */
      const [plans] =
        await db.execute(
          `SELECT
             sp.plan_id,
             sp.user_id,
             sp.subject,
             sp.topic,
             sp.plan_data,
             u.full_name,
             u.email,
             u.email_verified
           FROM study_plans sp
           INNER JOIN users u
             ON u.user_id = sp.user_id
           WHERE sp.deadline >= ?`,
          [today]
        );

      stats.checked_plans =
        plans.length;

      for (const plan of plans) {
        const planData =
          parsePlanData(
            plan.plan_data
          );

        const sessions =
          Array.isArray(
            planData.sessions
          )
            ? planData.sessions
            : [];

        for (
          let index = 0;
          index < sessions.length;
          index += 1
        ) {
          const session =
            sessions[index] || {};

          const sessionDate =
            normaliseSessionDate(
              session.date
            );

          if (
            sessionDate !== today &&
            sessionDate !== tomorrow
          ) {
            continue;
          }

          stats.eligible_sessions += 1;

          const sessionIndex =
            index + 1;

          const sessionLabel =
            String(
              session.session ||
              `Session ${sessionIndex}`
            ).slice(0, 100);

          const activity =
            session.activity
              ? String(
                  session.activity
                ).slice(0, 1000)
              : null;

          const duration =
            session.duration
              ? String(
                  session.duration
                ).slice(0, 100)
              : null;

          const [insertResult] =
            await db.execute(
              `INSERT IGNORE INTO
                 study_session_notifications
               (
                 user_id,
                 plan_id,
                 session_index,
                 session_date,
                 session_label,
                 activity,
                 duration
               )
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                plan.user_id,
                plan.plan_id,
                sessionIndex,
                sessionDate,
                sessionLabel,
                activity,
                duration
              ]
            );

          if (
            insertResult.affectedRows === 1
          ) {
            stats.notifications_created +=
              1;
          }

          /*
           * Retrieve the persistent reminder row.
           * Existing rows with email_sent_at NULL
           * are intentionally retried on later runs.
           */
          const [notificationRows] =
            await db.execute(
              `SELECT
                 notification_id,
                 email_sent_at
               FROM
                 study_session_notifications
               WHERE plan_id = ?
                 AND session_index = ?
                 AND session_date = ?
               LIMIT 1`,
              [
                plan.plan_id,
                sessionIndex,
                sessionDate
              ]
            );

          if (
            notificationRows.length === 0
          ) {
            continue;
          }

          const notification =
            notificationRows[0];

          if (
            notification.email_sent_at ||
            !isReminderEmailEnabled() ||
            Number(
              plan.email_verified
            ) !== 1 ||
            !plan.email
          ) {
            continue;
          }

          try {
            await sendStudySessionReminderEmail({
              to:
                plan.email,

              fullName:
                plan.full_name,

              subjectName:
                plan.subject,

              topic:
                plan.topic,

              sessionLabel,

              sessionDate,

              activity,

              duration,

              planId:
                plan.plan_id,

              timingLabel:
                sessionDate === today
                  ? "today"
                  : "tomorrow"
            });

            await db.execute(
              `UPDATE
                 study_session_notifications
               SET email_sent_at =
                 CURRENT_TIMESTAMP
               WHERE notification_id = ?
                 AND email_sent_at IS NULL`,
              [
                notification.notification_id
              ]
            );

            stats.emails_sent += 1;
          } catch (emailError) {
            stats.email_failures += 1;

            console.error(
              `Study session reminder email failed for notification ${notification.notification_id}:`,
              emailError.message
            );
          }
        }
      }

      return {
        ...stats,
        today,
        tomorrow,
        time_zone:
          timeZone,
        email_enabled:
          isReminderEmailEnabled()
      };
    } finally {
      reminderCheckRunning = false;
    }
  };


module.exports = {
  runStudySessionReminderCheck
};