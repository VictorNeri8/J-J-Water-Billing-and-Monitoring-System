import nodemailer from "nodemailer"

import type { AdminLoginDeviceDetails } from "@/lib/admin/login-devices"
import type { AdminRole } from "@/lib/types"

const DEFAULT_FROM_NAME = "J&J Water Distribution Services"

const SMTP_ROLE_PREFIX: Record<AdminRole, "FINANCE" | "READER"> = {
  finance: "FINANCE",
  reader: "READER",
}

type AdminMailerConfig = {
  fromEmail: string
  fromName: string
  host: string
  pass: string
  port: number
  secure: boolean
  user: string
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function parseSecureValue(prefix: string, port: number) {
  const raw = process.env[`${prefix}_SMTP_SECURE`]?.trim().toLowerCase()

  if (!raw) {
    return port === 465
  }

  const numeric = Number.parseInt(raw, 10)
  if (Number.isFinite(numeric)) {
    return numeric === 465
  }

  if (raw === "true") {
    return true
  }

  if (raw === "false") {
    return false
  }

  throw new Error(`Invalid ${prefix}_SMTP_SECURE value. Use "true", "false", 465, or 587.`)
}

function normalizePassword(host: string, pass: string) {
  if (host.toLowerCase().includes("gmail")) {
    return pass.replace(/\s+/g, "")
  }

  return pass
}

function normalizeFromEmail(host: string, user: string, fromEmail: string) {
  if (host.toLowerCase().includes("gmail") && fromEmail.toLowerCase() !== user.toLowerCase()) {
    return user
  }

  return fromEmail
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function getConfigForRole(role: AdminRole): AdminMailerConfig {
  const rolePrefix = SMTP_ROLE_PREFIX[role]
  const prefix =
    process.env.APP_ENV?.trim().toLowerCase() === "test"
      ? `DEVELOPER_${rolePrefix}`
      : rolePrefix

  const host = getRequiredEnv(`${prefix}_SMTP_HOST`)
  const port = Number.parseInt(getRequiredEnv(`${prefix}_SMTP_PORT`), 10)

  if (!Number.isFinite(port)) {
    throw new Error(`Invalid ${prefix}_SMTP_PORT value.`)
  }

  const user = getRequiredEnv(`${prefix}_SMTP_USER`)
  const fromEmail = normalizeFromEmail(
    host,
    user,
    process.env[`${prefix}_SMTP_FROM_EMAIL`]?.trim() || user,
  )

  return {
    host,
    port,
    user,
    pass: normalizePassword(host, getRequiredEnv(`${prefix}_SMTP_PASS`)),
    fromEmail,
    fromName: process.env[`${prefix}_SMTP_FROM_NAME`]?.trim() || DEFAULT_FROM_NAME,
    secure: parseSecureValue(prefix, port),
  }
}

function buildOtpHtml(email: string, otp: string) {
  return `
    <div style="margin:0;padding:24px;background:#061318;font-family:Arial,sans-serif;color:#e8f2f5;">
      <div style="max-width:560px;margin:0 auto;background:#0b1d24;border:1px solid #173741;border-radius:16px;padding:32px;">
        <p style="margin:0 0 12px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#8fb9c7;">
          J&J Water Distribution Services
        </p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#ffffff;">
          Admin sign-in code
        </h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#bfd5dc;">
          Use this 8-digit code to finish signing in as <strong style="color:#ffffff;">${email}</strong>.
          The code expires in 10 minutes.
        </p>
        <div style="margin:0 0 24px;padding:18px 20px;border-radius:14px;background:#08171d;border:1px solid #1b4a57;text-align:center;">
          <span style="display:inline-block;font-size:32px;letter-spacing:0.35em;font-weight:700;color:#35d2e3;">
            ${otp}
          </span>
        </div>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#8fb9c7;">
          If you did not request this code, you can ignore this email.
        </p>
      </div>
    </div>
  `
}

function formatLoginTime(loginTime: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(loginTime))
}

function buildLoginAlertHtml(email: string, details: AdminLoginDeviceDetails) {
  const loginTime = formatLoginTime(details.loginTime)
  const rows = [
    ["Browser", details.browser],
    ["OS", details.os],
    ["IP address", details.ipAddress],
    ["Location", details.approximateLocation || "Unknown"],
    ["Time", loginTime],
  ]

  return `
    <div style="margin:0;padding:24px;background:#061318;font-family:Arial,sans-serif;color:#e8f2f5;">
      <div style="max-width:600px;margin:0 auto;background:#0b1d24;border:1px solid #173741;border-radius:16px;padding:32px;">
        <p style="margin:0 0 12px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#8fb9c7;">
          J&amp;J Water Distribution Services
        </p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#ffffff;">
          New device login detected
        </h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#bfd5dc;">
          We noticed a login to your admin account from a new device or browser.
        </p>

        <div style="margin:0 0 24px;padding:22px 24px;border-radius:14px;background:#08171d;border:1px solid #1b4a57;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            ${rows
              .map(
                ([label, value], index) => `
                  <tr>
                    <td style="padding:${index === 0 ? "0 0 14px" : "14px 0"};font-weight:700;color:#ffffff;width:120px;vertical-align:top;${index === 0 ? "" : "border-top:1px solid #173741;"}">
                      ${escapeHtml(label)}
                    </td>
                    <td style="padding:${index === 0 ? "0 0 14px" : "14px 0"};color:#dce9ee;${index === 0 ? "" : "border-top:1px solid #173741;"}">
                      ${escapeHtml(value)}
                    </td>
                  </tr>
                `,
              )
              .join("")}
          </table>
        </div>

        <div style="margin:0 0 24px;padding:18px 20px;border-radius:14px;background:#2b1214;border:1px solid #7f1d1d;color:#fecaca;font-size:14px;line-height:1.6;">
          If this was not you, please secure your account immediately by changing your password and reviewing recent activity.
        </div>

        <p style="margin:0;font-size:13px;line-height:1.6;color:#8fb9c7;">
          This alert was sent to <strong style="color:#ffffff;">${escapeHtml(email)}</strong>. No OTP codes or session tokens are included in this notification.
        </p>
      </div>
    </div>
  `
}

export async function sendAdminOtpEmail(params: { email: string; otp: string; role: AdminRole }) {
  const { email, otp, role } = params
  const config = getConfigForRole(role)

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: email,
      subject: "J&J Water Admin OTP code",
      text: `Your J&J Water admin sign-in code is ${otp}. It expires in 10 minutes.`,
      html: buildOtpHtml(email, otp),
    })
  } catch {
    throw new Error("Failed to send admin OTP email.")
  }
}

export async function sendAdminNewDeviceLoginEmail(params: {
  email: string
  details: AdminLoginDeviceDetails
  role: AdminRole
}) {
  const { email, details, role } = params
  const config = getConfigForRole(role)
  const loginTime = formatLoginTime(details.loginTime)

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: email,
      subject: "Security Alert: New Device Login Detected",
      text: [
        "We noticed a login to your J&J Water admin account from a new device or browser.",
        "",
        `Browser: ${details.browser}`,
        `OS: ${details.os}`,
        `IP address: ${details.ipAddress}`,
        `Location: ${details.approximateLocation || "Unknown"}`,
        `Time: ${loginTime}`,
        "",
        "If this was not you, please secure your account immediately.",
      ].join("\n"),
      html: buildLoginAlertHtml(email, details),
    })
  } catch {
    throw new Error("Failed to send admin new device login email.")
  }
}
