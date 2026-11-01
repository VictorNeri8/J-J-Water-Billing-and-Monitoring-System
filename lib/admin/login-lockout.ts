import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  ADMIN_LOGIN_LOCKOUT_COOLDOWN_SECONDS,
  ADMIN_LOGIN_LOCKOUT_MAX_ATTEMPTS,
} from "@/lib/admin/shared"

type LoginAttemptRow = {
  email: string
  failed_attempts: number
  ip_address: string
  locked_until: string | null
}

export type LoginLockoutState = {
  failedAttempts: number
  lockedUntil: string
  retryAfterSeconds: number
}

export type LoginAttemptFeedback = {
  failedAttempts: number
  remainingAttempts: number
}

function getRetryAfterSeconds(lockedUntil: string) {
  return Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000))
}

function mapLockoutState(record: LoginAttemptRow): LoginLockoutState | null {
  if (!record.locked_until) {
    return null
  }

  const retryAfterSeconds = getRetryAfterSeconds(record.locked_until)
  if (retryAfterSeconds <= 0) {
    return null
  }

  return {
    failedAttempts: record.failed_attempts,
    lockedUntil: record.locked_until,
    retryAfterSeconds,
  }
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const first = forwardedFor
      .split(",")
      .map((part) => part.trim())
      .find(Boolean)

    if (first) {
      return first
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) {
    return realIp
  }

  const cfIp = request.headers.get("cf-connecting-ip")?.trim()
  if (cfIp) {
    return cfIp
  }

  return "unknown"
}

export async function getLoginLockout(email: string, ipAddress: string) {
  const serviceRole = createServiceRoleClient()
  const { data, error } = await serviceRole
    .from("admin_login_attempts")
    .select("email, failed_attempts, ip_address, locked_until")
    .eq("email", email)
    .eq("ip_address", ipAddress)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return mapLockoutState(data as LoginAttemptRow)
}

export async function recordFailedLoginAttempt(email: string, ipAddress: string) {
  const serviceRole = createServiceRoleClient()
  const { data, error } = await serviceRole
    .from("admin_login_attempts")
    .select("email, failed_attempts, ip_address, locked_until")
    .eq("email", email)
    .eq("ip_address", ipAddress)
    .maybeSingle()

  if (error) {
    throw error
  }

  const currentRecord = data as LoginAttemptRow | null
  const activeLockout = currentRecord ? mapLockoutState(currentRecord) : null

  if (activeLockout) {
    return activeLockout
  }

  const nextAttempts =
    currentRecord && currentRecord.locked_until && getRetryAfterSeconds(currentRecord.locked_until) <= 0
      ? 1
      : (currentRecord?.failed_attempts ?? 0) + 1

  const lockedUntil =
    nextAttempts >= ADMIN_LOGIN_LOCKOUT_MAX_ATTEMPTS
      ? new Date(Date.now() + ADMIN_LOGIN_LOCKOUT_COOLDOWN_SECONDS * 1000).toISOString()
      : null

  const { error: upsertError } = await serviceRole
    .from("admin_login_attempts")
    .upsert(
      {
        email,
        ip_address: ipAddress,
        failed_attempts: nextAttempts,
        locked_until: lockedUntil,
        last_failed_at: new Date().toISOString(),
      },
      {
        onConflict: "email,ip_address",
      },
    )

  if (upsertError) {
    throw upsertError
  }

  if (!lockedUntil) {
    return {
      failedAttempts: nextAttempts,
      remainingAttempts: Math.max(0, ADMIN_LOGIN_LOCKOUT_MAX_ATTEMPTS - nextAttempts),
    } satisfies LoginAttemptFeedback
  }

  return {
    failedAttempts: nextAttempts,
    lockedUntil,
    retryAfterSeconds: getRetryAfterSeconds(lockedUntil),
  } satisfies LoginLockoutState
}

export async function clearLoginAttempts(email: string, ipAddress: string) {
  const serviceRole = createServiceRoleClient()
  const { error } = await serviceRole
    .from("admin_login_attempts")
    .delete()
    .eq("email", email)
    .eq("ip_address", ipAddress)

  if (error) {
    throw error
  }
}

export function createLockoutResponse(lockout: LoginLockoutState) {
  return {
    error: "Too many failed login attempts. Try again in 10 minutes.",
    lockedUntil: lockout.lockedUntil,
    retryAfterSeconds: lockout.retryAfterSeconds,
  }
}

export function createRemainingAttemptsResponse(feedback: LoginAttemptFeedback) {
  return {
    error:
      feedback.remainingAttempts === 1
        ? "1 input remaining."
        : `${feedback.remainingAttempts} inputs remaining.`,
    remainingAttempts: feedback.remainingAttempts,
    failedAttempts: feedback.failedAttempts,
  }
}
