import { z } from "zod"

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g
const SUSPICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /onerror\s*=/i,
  /bcc:/i,
  /cc:/i,
  /\\r/i,
  /\\n/i,
]

function normalizeText(value: string) {
  return value.trim().replace(CONTROL_CHARACTERS, "")
}

const normalizedString = z.string().transform(normalizeText)

export const contactSubmissionSchema = z.object({
  name: normalizedString.pipe(z.string().min(2).max(80)),
  email: normalizedString
    .transform((value) => value.toLowerCase())
    .pipe(z.string().email().max(254)),
  subject: normalizedString.pipe(z.string().min(5).max(120)),
  message: normalizedString.pipe(z.string().min(10).max(2000)),
})

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>

export function validateContactSubmission(input: unknown) {
  return contactSubmissionSchema.safeParse(input)
}

export function containsSuspiciousInput(input: ContactSubmissionInput) {
  return Object.values(input).some((value) =>
    SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(value))
  )
}

export function getClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown"
  }

  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  )
}

export function logSecurityEvent(params: {
  event: "validation_failed" | "rate_limited" | "captcha_failed"
  ip: string
  email?: string
  reason: string
}) {
  console.warn(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...params,
    })
  )
}
