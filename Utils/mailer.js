import nodemailer from "nodemailer";
import { verificationEmailTemplate } from "./emailTemplate.js";

const getSmtpConfig = () => ({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false") === "true",
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  appName: process.env.APP_NAME || "MD Shimul Portfolio",
  expiresMinutes: Number(process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES || 15),
});

const createTransporter = () => {
  const config = getSmtpConfig();

  if (!config.host || !config.user || !config.pass || !config.from) {
    const error = new Error("SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM are required");
    error.statusCode = 500;
    throw error;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
};

export const sendVerificationEmail = async ({ to, name, code }) => {
  const config = getSmtpConfig();
  const message = verificationEmailTemplate({
    appName: config.appName,
    name,
    code,
    expiresMinutes: config.expiresMinutes,
  });

  const transporter = createTransporter();
  await transporter.sendMail({
    from: config.from,
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
};

export const emailVerificationExpiresAt = () => {
  const { expiresMinutes } = getSmtpConfig();
  return new Date(Date.now() + expiresMinutes * 60 * 1000);
};
