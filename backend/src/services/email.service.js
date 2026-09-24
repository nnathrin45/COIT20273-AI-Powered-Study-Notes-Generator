const crypto = require("crypto");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: String(process.env.EMAIL_SECURE).toLowerCase() === "true",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const getFromAddress = () => {
    const fromName = process.env.EMAIL_FROM_NAME || "StudyA";
    const fromAddress =
        process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;

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
        throw new Error("Recipient email address is required");
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
    return crypto.randomInt(100000, 1000000).toString();
};

const hashVerificationCode = async (code) => {
    return bcrypt.hash(code, 10);
};

const sendVerificationCodeEmail = async ({
    to,
    fullName,
    code
}) => {
    const safeName = fullName || "Student";

    return sendEmail({
        to,
        subject: "Verify your StudyA email address",
        text:
            `Hi ${safeName},\n\n` +
            `Your StudyA verification code is: ${code}\n\n` +
            `This code will expire in 10 minutes.\n\n` +
            `If you did not create a StudyA account, you can ignore this email.`,

        html: `
        <div style="
            font-family: Arial, sans-serif;
            max-width: 520px;
            margin: 0 auto;
            padding: 24px;
            background: #120928;
            color: #f3f0ff;
            border-radius: 12px;
        ">
            <h2 style="
            margin-top: 0;
            color: #ffffff;
            ">
            Verify your StudyA email
            </h2>

            <p>
            Hi ${safeName},
            </p>

            <p>
            Use the verification code below to complete your StudyA registration.
            </p>

            <div style="
            margin: 24px 0;
            padding: 18px;
            text-align: center;
            font-size: 30px;
            font-weight: bold;
            letter-spacing: 8px;
            background: #1c1038;
            border: 1px solid #7a44ff;
            border-radius: 10px;
            color: #ffffff;
            ">
            ${code}
            </div>

            <p>
            This code will expire in <strong>10 minutes</strong>.
            </p>

            <p style="
            color: #aaa3c7;
            font-size: 13px;
            ">
            If you did not create a StudyA account, you can safely ignore this email.
            </p>
        </div>
        `
    });
};

const sendLoginCodeEmail = async ({ to, fullName, code }) => {
    const safeName = fullName || "Student";

    return sendEmail({
        to,
        subject: "Your StudyA sign-in verification code",
        text:
            `Hi ${safeName},\n\n` +
            `Your StudyA sign-in verification code is: ${code}\n\n` +
            `This code will expire in 10 minutes.\n\n` +
            `If you did not attempt to sign in to StudyA, you can ignore this email.`,

        html: `
            <div
                style="
                background:#110724;
                color:#ffffff;
                padding:32px;
                font-family:Arial,sans-serif;
                border-radius:14px;
                max-width:520px;
                "
            >
                <h2 style="margin-top:0;">
                Verify your StudyA sign-in
                </h2>

                <p>Hi ${safeName},</p>

                <p>
                Use the verification code below to complete
                your StudyA sign-in.
                </p>

                <div
                style="
                    margin:28px 0;
                    padding:24px;
                    border:1px solid #7c3aed;
                    border-radius:10px;
                    background:#1d1038;
                    text-align:center;
                    font-size:32px;
                    font-weight:bold;
                    letter-spacing:8px;
                "
                >
                ${code}
                </div>

                <p>
                This code will expire in
                <strong>10 minutes</strong>.
                </p>

                <p style="color:#b9a7df;">
                If you did not attempt to sign in to StudyA,
                you can safely ignore this email.
                </p>
            </div>
            `
    });
};

module.exports = {
  sendEmail,
  verifyEmailConnection,
  generateVerificationCode,
  hashVerificationCode,
  sendVerificationCodeEmail,
  sendLoginCodeEmail
};