import { z } from "zod"

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g
const ACCOUNT_NUMBER_PATTERN = /^[A-Za-z0-9-]+$/
const NAME_PUNCTUATION = /[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]/g
const SUSPICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /onerror\s*=/i,
  /bcc:/i,
  /cc:/i,
  /\\r/i,
  /\\n/i,
]

function normalizeAccountNumber(value: string) {
  return value.trim().replace(CONTROL_CHARACTERS, "").toUpperCase()
}

function normalizeName(value: string) {
  return value.trim().replace(CONTROL_CHARACTERS, "").replace(/\s+/g, " ")
}

function normalizeSecurityToken(value: string) {
  return value.trim().replace(CONTROL_CHARACTERS, "")
}

const publicBillInquirySchema = z.object({
  accountNumber: z
    .string()
    .transform(normalizeAccountNumber)
    .pipe(
      z
        .string()
        .min(1)
        .max(30)
        .regex(ACCOUNT_NUMBER_PATTERN),
    ),
  name: z
    .string()
    .transform(normalizeName)
    .pipe(z.string().min(2).max(120)),
  turnstileToken: z
    .string()
    .optional()
    .default("")
    .transform(normalizeSecurityToken)
    .pipe(z.string().max(4096)),
})

export type PublicBillInquiryInput = z.infer<typeof publicBillInquirySchema>

export function validatePublicBillInquiry(input: unknown) {
  return publicBillInquirySchema.safeParse(input)
}

export function containsSuspiciousPublicBillInput(input: PublicBillInquiryInput) {
  return Object.values(input).some((value) =>
    SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(value)),
  )
}

function getComparableNameWords(value: string) {
  return normalizeName(value)
    .toLowerCase()
    .replace(NAME_PUNCTUATION, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length > 1)
}

export function isNameMatch(inputName: string, registeredName: string) {
  const inputWords = getComparableNameWords(inputName)
  const registeredWords = new Set(getComparableNameWords(registeredName))

  if (inputWords.length === 0 || registeredWords.size === 0) {
    return false
  }

  return inputWords.some((word) => registeredWords.has(word))
}
