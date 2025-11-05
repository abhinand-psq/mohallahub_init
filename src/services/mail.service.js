// src/services/mail.service.js
// Minimal mailer stub - implement SMTP with nodemailer later
export const sendResetEmail = async ({ to, resetLink }) => {
  // In dev mode we do not send email. You can implement nodemailer later.
  if (process.env.DEV_MODE === "true") {
    return { success: true, info: `DEV_MODE: reset link = ${resetLink}` };
  }
  // Implement nodemailer send logic when you add SMTP credentials.
  return { success: false, info: "SMTP not configured" };
};
