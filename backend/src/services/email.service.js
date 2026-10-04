const crypto = require("crypto");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure:
        String(process.env.EMAIL_SECURE).toLowerCase() === "true",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const getFromAddress = () => {
    const fromName =
        process.env.EMAIL_FROM_NAME ||
        "StudyA";

    const fromAddress =
        process.env.EMAIL_FROM_ADDRESS ||
        process.env.EMAIL_USER;

    return `"${fromName}" <${fromAddress}>`;
};

const verifyEmailConnection = async () => {
    await transporter.verify();

    return true;
};

const sendEmail = async ({
    to,
    subject,
    text,
    html
}) => {
    if (!to) {
        throw new Error(
            "Recipient email address is required"
        );
    }

    return transporter.sendMail({
        from: getFromAddress(),
        to,
        subject,
        text,
        html
    });
};

const generateVerificationCode = () => {
    return crypto
        .randomInt(
            100000,
            1000000
        )
        .toString();
};

const hashVerificationCode = async (
    code
) => {
    return bcrypt.hash(
        code,
        10
    );
};

/*
 * Normalise the theme value received
 * from the frontend.
 *
 * Anything other than "light"
 * safely falls back to dark mode.
 */
const normaliseEmailTheme = (
    theme
) => {
    return theme === "light"
        ? "light"
        : "dark";
};

/*
 * Shared verification email HTML.
 *
 * Both dark and light versions use
 * the same centred layout.
 */
const buildVerificationEmailHtml = ({
    fullName,
    code,
    theme,
    badgeText,
    heading,
    description,
    securityMessage
}) => {
    const selectedTheme =
        normaliseEmailTheme(theme);

    const isLight =
        selectedTheme === "light";

    /*
     * Theme colours
     */
    const colours = isLight
        ? {
            outerBackground:
                "#eff1f5",

            cardBackground:
                "#ffffff",

            cardBorder:
                "#dfdfdf",

            heading:
                "#171717",

            greeting:
                "#45424d",

            body:
                "#65676b",

            muted:
                "#7a7575",

            footer:
                "#9a96a6",

            accent:
                "#7a44ff",

            badgeBackground:
                "#f1ebff",

            badgeBorder:
                "#ded0ff",

            codeBackground:
                "#f7f7fb",

            divider:
                "#dfdfdf",

            shadow:
                "0 12px 32px rgba(50,39,75,0.08)"
        }
        : {
            outerBackground:
                "#0d061f",

            cardBackground:
                "#160b32",

            cardBorder:
                "#2a1b4d",

            heading:
                "#f3f0ff",

            greeting:
                "#d9d4eb",

            body:
                "#a6a8c7",

            muted:
                "#898cc0",

            footer:
                "#727494",

            accent:
                "#a97cff",

            badgeBackground:
                "#251149",

            badgeBorder:
                "#49306f",

            codeBackground:
                "#1c1038",

            divider:
                "#2a1b4d",

            shadow:
                "0 18px 50px rgba(0,0,0,0.35)"
        };

    return `
    <div style="
        margin: 0;
        padding: 32px 16px;
        background: ${colours.outerBackground};
        font-family: Arial, Helvetica, sans-serif;
    ">

        <div style="
            max-width: 520px;
            margin: 0 auto;
            padding: 32px;
            background: ${colours.cardBackground};
            border: 1px solid ${colours.cardBorder};
            border-radius: 14px;
            color: ${colours.heading};
            box-shadow: ${colours.shadow};
        ">

            <div style="
                margin-bottom: 24px;
            ">

                <div style="
                    display: inline-block;
                    margin-bottom: 14px;
                    padding: 6px 10px;
                    background: ${colours.badgeBackground};
                    border: 1px solid ${colours.badgeBorder};
                    border-radius: 999px;
                    color: ${colours.accent};
                    font-size: 11px;
                    font-weight: bold;
                    letter-spacing: 1.2px;
                    text-transform: uppercase;
                ">
                    ${badgeText}
                </div>

                <h2 style="
                    margin: 0;
                    color: ${colours.heading};
                    font-size: 24px;
                    line-height: 1.3;
                ">
                    ${heading}
                </h2>

            </div>

            <p style="
                margin: 0 0 16px;
                color: ${colours.greeting};
                font-size: 15px;
                line-height: 1.7;
            ">
                Hi ${fullName},
            </p>

            <p style="
                margin: 0;
                color: ${colours.body};
                font-size: 15px;
                line-height: 1.7;
            ">
                ${description}
            </p>

            <div style="
                margin: 28px 0;
                padding: 24px;
                text-align: center;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                background: ${colours.codeBackground};
                border: 2px solid ${colours.accent};
                border-radius: 12px;
                color: ${colours.accent};
            ">
                ${code}
            </div>

            <p style="
                margin: 0 0 18px;
                color: ${colours.greeting};
                font-size: 15px;
                line-height: 1.7;
            ">
                This code will expire in

                <strong style="
                    color: ${colours.heading};
                ">
                    10 minutes
                </strong>.
            </p>

            <div style="
                margin-top: 24px;
                padding-top: 20px;
                border-top: 1px solid ${colours.divider};
            ">

                <p style="
                    margin: 0;
                    color: ${colours.muted};
                    font-size: 13px;
                    line-height: 1.6;
                ">
                    ${securityMessage}
                </p>

            </div>

            <p style="
                margin: 24px 0 0;
                color: ${colours.footer};
                font-size: 11px;
                text-align: center;
            ">
                StudyA &mdash; AI-Powered Study Notes
            </p>

        </div>

    </div>
    `;
};

/*
 * Registration Email Verification
 */
const sendVerificationCodeEmail = async ({
    to,
    fullName,
    code,
    theme = "dark"
}) => {
    const safeName =
        fullName || "Student";

    return sendEmail({
        to,

        subject:
            "Verify your StudyA email address",

        text:
            `Hi ${safeName},\n\n` +
            `Your StudyA verification code is: ${code}\n\n` +
            `This code will expire in 10 minutes.\n\n` +
            `If you did not create a StudyA account, you can ignore this email.`,

        html:
            buildVerificationEmailHtml({
                fullName: safeName,

                code,

                theme,

                badgeText:
                    "Email Verification",

                heading:
                    "Verify your StudyA email",

                description:
                    "Use the verification code below to complete your StudyA registration.",

                securityMessage:
                    "If you did not create a StudyA account, you can safely ignore this email."
            })
    });
};

/*
 * Sign-In Two-Factor Verification
 */
const sendLoginCodeEmail = async ({
    to,
    fullName,
    code,
    theme = "dark"
}) => {
    const safeName =
        fullName || "Student";

    return sendEmail({
        to,

        subject:
            "Your StudyA sign-in verification code",

        text:
            `Hi ${safeName},\n\n` +
            `Your StudyA sign-in verification code is: ${code}\n\n` +
            `This code will expire in 10 minutes.\n\n` +
            `If you did not attempt to sign in to StudyA, you can ignore this email.`,

        html:
            buildVerificationEmailHtml({
                fullName: safeName,

                code,

                theme,

                badgeText:
                    "Secure Sign-In",

                heading:
                    "Verify your StudyA sign-in",

                description:
                    "Use the verification code below to complete your StudyA sign-in.",

                securityMessage:
                    "If you did not attempt to sign in to StudyA, you can safely ignore this email."
            })
    });
};

/*
 * Forgot Password
 */
const sendPasswordResetCodeEmail = async ({
    to,
    fullName,
    code,
    theme = "dark"
}) => {
    const safeName =
        fullName || "Student";

    return sendEmail({
        to,

        subject:
            "Your StudyA password reset code",

        text:
            `Hi ${safeName},\n\n` +
            `Your StudyA password reset code is: ${code}\n\n` +
            `This code will expire in 10 minutes.\n\n` +
            `If you did not request a password reset, you can safely ignore this email.`,

        html:
            buildVerificationEmailHtml({
                fullName: safeName,

                code,

                theme,

                badgeText:
                    "Password Reset",

                heading:
                    "Reset your StudyA password",

                description:
                    "Use the password reset code below to create a new password.",

                securityMessage:
                    "If you did not request a password reset, you can safely ignore this email."
            })
    });
};

module.exports = {
    sendEmail,
    verifyEmailConnection,
    generateVerificationCode,
    hashVerificationCode,
    sendVerificationCodeEmail,
    sendLoginCodeEmail,
    sendPasswordResetCodeEmail
};