export { formatTitleCase } from "@/lib/address-data"

export const ACCOUNT_NUMBER_PREFIX = "JJ-"
export const ACCOUNT_NUMBER_MAX_DIGITS = 12
export const ACCOUNT_NUMBER_ERROR = "Account number must start with JJ- followed by digits only."
export const METER_ID_MIN_LENGTH = 4
export const METER_ID_MAX_LENGTH = 10
export const METER_ID_ERROR = "Meter ID must be 4–10 characters."

export function extractAccountNumberDigits(value: string) {
  return value
    .trim()
    .replace(/^JJ-/i, "")
    .replace(/\D/g, "")
    .slice(0, ACCOUNT_NUMBER_MAX_DIGITS)
}

export function formatAccountNumber(digits: string) {
  return `${ACCOUNT_NUMBER_PREFIX}${extractAccountNumberDigits(digits)}`
}

export function isValidAccountNumber(value: string) {
  return new RegExp(`^JJ-\\d{1,${ACCOUNT_NUMBER_MAX_DIGITS}}$`).test(value)
}

export function normalizeMeterId(value: string) {
  return value.trim().toUpperCase()
}

export function sanitizeMeterIdInput(value: string) {
  return normalizeMeterId(value).replace(/[^A-Z0-9]/g, "").slice(0, METER_ID_MAX_LENGTH)
}

export function formatOptionalMeterId(value: string) {
  const normalized = normalizeMeterId(value)
  return normalized.length > 0 ? normalized : null
}

export function isValidMeterId(value: string) {
  return new RegExp(`^[A-Z0-9]{${METER_ID_MIN_LENGTH},${METER_ID_MAX_LENGTH}}$`).test(value)
}
