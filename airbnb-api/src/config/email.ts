import nodemailer from "nodemailer";

const emailPort = Number(process.env["EMAIL_PORT"] ?? 587);
const isSecure = process.env["EMAIL_SECURE"]
  ? process.env["EMAIL_SECURE"] === "true"
  : emailPort === 465;

// A transporter is the connection to your email service
// It holds the SMTP credentials and reuses the connection for all emails
const transporter = nodemailer.createTransport({
  host: process.env["EMAIL_HOST"],
  port: emailPort,

  // secure: true uses SSL (port 465)
  // secure: false uses TLS (port 587) — more common
  secure: isSecure,

  // Use only in local/dev environments where SMTP traffic is intercepted
  // by a proxy/antivirus that presents a self-signed certificate.
  tls: process.env["EMAIL_ALLOW_SELF_SIGNED"] === "true"
    ? { rejectUnauthorized: false }
    : undefined,

  auth: {
    user: process.env["EMAIL_USER"],
    pass: process.env["EMAIL_PASS"],
  },
});

// sendEmail is a reusable function that wraps nodemailer's sendMail
// to: recipient email address
// subject: email subject line
// html: the email body as HTML
export async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: process.env["EMAIL_FROM"],
    to,
    subject,
    html,
  });
}

export default transporter;