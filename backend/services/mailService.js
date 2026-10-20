const nodemailer = require("nodemailer");
const env = require("../config/env");

// Sends the password reset link. Without SMTP settings the link is printed in the server log.
async function sendPasswordReset(email, token) {
  const link = `${env.appUrl}/#reset=${token}`;

  if (!env.smtp.host) {
    console.log(`[CropMate] Password reset link for ${email}: ${link}`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  await transport.sendMail({
    from: env.smtp.from,
    to: email,
    subject: "Reset your CropMate password",
    text: `Open this link within 1 hour to choose a new password:\n${link}\n\nIf you did not ask for this, ignore this email.`,
  });
}

module.exports = { sendPasswordReset };
