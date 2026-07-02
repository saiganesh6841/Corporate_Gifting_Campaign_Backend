const nodemailer = require("nodemailer");
require("dotenv").config();
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// send a single email
const sendMail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`✅ Mail sent to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.log(`❌ Mail failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

// send bulk emails — fires all in parallel, collects results
const sendBulkMail = async (mailList) => {
  const results = await Promise.allSettled(
    mailList.map((mail) => sendMail(mail)),
  );
  const sent = results.filter(
    (r) => r.status === "fulfilled" && r.value.success,
  ).length;
  const failed = results.length - sent;
  console.log(`✅ Bulk mail done: ${sent} sent, ${failed} failed`);
  return { sent, failed };
};

module.exports = { sendMail, sendBulkMail };
