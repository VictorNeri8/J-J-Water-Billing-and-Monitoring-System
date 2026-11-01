import nodemailer from "nodemailer"

import type { ContactSubmissionInput } from "@/lib/contact/security"

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function parseSecureValue(port: number) {
  const raw = process.env.FINANCE_SMTP_SECURE?.trim().toLowerCase()

  if (!raw) {
    return port === 465
  }

  if (raw === "true") {
    return true
  }

  if (raw === "false") {
    return false
  }

  return Number.parseInt(raw, 10) === 465
}

export async function sendContactNotificationEmail(
  submission: ContactSubmissionInput
) {
  const host = getRequiredEnv("FINANCE_SMTP_HOST")
  const port = Number.parseInt(getRequiredEnv("FINANCE_SMTP_PORT"), 10)
  const user = getRequiredEnv("FINANCE_SMTP_USER")
  const pass = getRequiredEnv("FINANCE_SMTP_PASS")
  const fromEmail = process.env.FINANCE_SMTP_FROM_EMAIL?.trim() || user
  const fromName =
    process.env.FINANCE_SMTP_FROM_NAME?.trim() ||
    "J&J Water Distribution Services"
  const notificationEmail =
    process.env.CONTACT_NOTIFICATION_EMAIL?.trim() || user

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: parseSecureValue(port),
    auth: {
      user,
      pass: host.toLowerCase().includes("gmail") ? pass.replace(/\s+/g, "") : pass,
    },
  })

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: notificationEmail,
    replyTo: submission.email,
    subject: `J&J Water Contact Notification: ${submission.subject}`,
    text: [
      "A new contact form submission was received.",
      "",
      `Name: ${submission.name}`,
      `Email: ${submission.email}`,
      `Subject: ${submission.subject}`,
      "",
      "Message:",
      submission.message,
    ].join("\n"),
    html: `
      <div style="margin:0;padding:24px;background:#061318;font-family:Arial,sans-serif;color:#e8f2f5;">
        <div style="max-width:620px;margin:0 auto;background:#0b1d24;border:1px solid #173741;border-radius:16px;padding:32px;">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#8fb9c7;">
            Website Inquiry Notification
          </p>
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#ffffff;">
            New contact form submission
          </h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#bfd5dc;">
            A new inquiry was submitted through the public contact page and is ready for follow-up.
          </p>

          <div style="margin:0 0 24px;padding:22px 24px;border-radius:14px;background:#08171d;border:1px solid #1b4a57;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr>
                <td style="padding:0 0 14px;font-weight:700;color:#ffffff;width:120px;vertical-align:top;">
                  Name
                </td>
                <td style="padding:0 0 14px;color:#dce9ee;">
                  ${escapeHtml(submission.name)}
                </td>
              </tr>
              <tr>
                <td style="padding:14px 0;font-weight:700;color:#ffffff;width:120px;vertical-align:top;border-top:1px solid #173741;">
                  Email
                </td>
                <td style="padding:14px 0;color:#7ee0eb;border-top:1px solid #173741;">
                  ${escapeHtml(submission.email)}
                </td>
              </tr>
              <tr>
                <td style="padding:14px 0 0;font-weight:700;color:#ffffff;width:120px;vertical-align:top;border-top:1px solid #173741;">
                  Subject
                </td>
                <td style="padding:14px 0 0;color:#dce9ee;border-top:1px solid #173741;">
                  ${escapeHtml(submission.subject)}
                </td>
              </tr>
            </table>
          </div>

          <div style="margin:0 0 24px;">
            <h2 style="margin:0 0 10px;font-size:16px;color:#ffffff;">Message</h2>
            <div style="padding:18px 20px;border-radius:14px;background:#08171d;border:1px solid #1b4a57;color:#dce9ee;font-size:14px;line-height:1.7;white-space:pre-wrap;">
              ${escapeHtml(submission.message)}
            </div>
          </div>

          <p style="margin:0;font-size:12px;line-height:1.6;color:#8fb9c7;">
            This notification was generated automatically by the J&amp;J Water Distribution Services contact system.
          </p>
        </div>
      </div>
    `,
  })
}
