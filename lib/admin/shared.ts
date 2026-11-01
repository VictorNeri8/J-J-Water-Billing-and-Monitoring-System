export const ADMIN_OTP_CHALLENGE_COOKIE = "admin-otp-challenge"
export const ADMIN_OTP_TTL_SECONDS = 10 * 60
export const ADMIN_OTP_RESEND_COOLDOWN_SECONDS = 60
export const ADMIN_LOGIN_LOCKOUT_MAX_ATTEMPTS = 8
export const ADMIN_LOGIN_LOCKOUT_COOLDOWN_SECONDS = 10 * 60

export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase()
}
