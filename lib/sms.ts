import { SMS_FEATURE_ENABLED } from "@/lib/config/features"

/**
 * SMS service is currently disabled by feature flag.
 * Cutoff date: June 4, 2026.
 * Re-enable by setting SMS_FEATURE_ENABLED=true and configuring Semaphore env variables.
 *
 * The preserved implementation below currently targets FMCSMS. If the project
 * switches to Semaphore later, replace the provider call while keeping the
 * feature flag guard in place.
 */

interface SendSMSResult {
  success: boolean
  disabled?: boolean
  sid?: string
  provider: "fmcsms"
  message?: string
  error?: string
}

type JsonRecord = Record<string, unknown>

const smsProvider = (process.env.SMS_PROVIDER || "fmcsms").toLowerCase()
const fmcsmsApiKey = process.env.FMCSMS_API_KEY
const fmcsmsApiUrl = process.env.FMCSMS_API_URL || "https://www.fortmed.org/web/FMCSMS/api/messages.php"
const fmcsmsSenderName = process.env.FMCSMS_SENDER_NAME || process.env.FMCSMS_SENDER_ID || "J&J Water"
const fmcsmsFromNumber = process.env.FMCSMS_FROM_NUMBER || process.env.FMCSMS_SENDER_NUMBER
const humanChallengePattern =
  /document\.cookie\s*=\s*["'](humans_\d+)=([^"';]+)["']/

function getStringValue(data: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === "string" && value.trim()) {
      return value
    }
    if (typeof value === "number") {
      return String(value)
    }
  }

  return undefined
}

function isSuccessfulResponse(data: unknown, responseOk: boolean): boolean {
  if (!data || typeof data !== "object") {
    return responseOk
  }

  const record = data as JsonRecord
  if (typeof record.success === "boolean") {
    return record.success
  }

  const status = getStringValue(record, ["status", "state", "result"])?.toLowerCase()
  if (status) {
    return ["success", "sent", "queued", "ok"].includes(status)
  }

  return responseOk
}

function getResponseError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") {
    return fallback
  }

  const record = data as JsonRecord
  const message = getStringValue(record, ["error", "message", "detail", "description"])

  if (message && humanChallengePattern.test(message)) {
    return "FMCSMS returned an anti-bot challenge instead of an API response. Check FMCSMS_API_URL or ask FMCSMS to whitelist this server for API requests."
  }

  return (
    message ||
    fallback
  )
}

function getResponseMessageId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") {
    return undefined
  }

  const record = data as JsonRecord
  return getStringValue(record, ["message_id", "messageId", "id", "sid", "reference", "tracking_id"])
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

function getHumanChallengeCookie(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null
  }

  const message = getStringValue(data as JsonRecord, ["message"])
  const match = message?.match(humanChallengePattern)
  if (!match) {
    return null
  }

  return `${match[1]}=${match[2]}`
}

async function postToFMCSMS(to: string, message: string, cookie?: string) {
  return fetch(fmcsmsApiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "JandJWaterBillingSystem/1.0",
      "X-API-Key": fmcsmsApiKey || "",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({
      SenderName: fmcsmsSenderName,
      ToNumber: to,
      MessageBody: message,
      FromNumber: fmcsmsFromNumber,
    }),
  })
}

async function sendWithFMCSMS(to: string, message: string): Promise<SendSMSResult> {
  if (!fmcsmsApiKey) {
    throw new Error("FMCSMS API key is not configured")
  }

  if (!fmcsmsApiUrl) {
    throw new Error("FMCSMS API URL is not configured")
  }

  if (!fmcsmsFromNumber) {
    throw new Error("FMCSMS from number is not configured")
  }

  try {
    let response = await postToFMCSMS(to, message)
    let data = await readResponseBody(response)

    const challengeCookie = getHumanChallengeCookie(data)
    if (challengeCookie) {
      response = await postToFMCSMS(to, message, challengeCookie)
      data = await readResponseBody(response)
    }

    const success = isSuccessfulResponse(data, response.ok)

    if (success) {
      return {
        success: true,
        provider: "fmcsms",
        sid: getResponseMessageId(data),
      }
    }

    return {
      success: false,
      provider: "fmcsms",
      error: getResponseError(data, `FMCSMS request failed with status ${response.status}`),
    }
  } catch (error) {
    console.error("Error sending FMCSMS message:", error)
    return {
      success: false,
      provider: "fmcsms",
      error:
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Failed to send SMS.",
    }
  }
}

export async function sendSMS(to: string, message: string): Promise<SendSMSResult> {
  if (!SMS_FEATURE_ENABLED) {
    return {
      success: false,
      disabled: true,
      provider: "fmcsms",
      message: "SMS sending is disabled.",
      error: "SMS sending is disabled.",
    }
  }

  if (smsProvider !== "fmcsms") {
    throw new Error(`Unsupported SMS provider: ${smsProvider}`)
  }

  return sendWithFMCSMS(to, message)
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "")

  if (digits.length < 10) {
    throw new Error("Phone number is too short.")
  }

  if (digits.startsWith("0")) {
    if (digits.length !== 11) {
      throw new Error("Invalid Philippine mobile number.")
    }
    return "+63" + digits.slice(1)
  }

  if (digits.startsWith("63")) {
    if (digits.length !== 12) {
      throw new Error("Invalid Philippine mobile number.")
    }
    return "+" + digits
  }

  if (phone.trim().startsWith("+")) {
    if (digits.length < 11) {
      throw new Error("Invalid international phone number.")
    }
    return "+" + digits
  }

  throw new Error("Phone number must start with 0, 63, or +.")
}
