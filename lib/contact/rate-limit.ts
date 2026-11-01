import { createServiceRoleClient } from "@/lib/supabase/admin"

const IP_LIMIT = {
  scope: "ip",
  limit: 3,
  windowMs: 10 * 60 * 1000,
}

const EMAIL_LIMIT = {
  scope: "email",
  limit: 3,
  windowMs: 30 * 60 * 1000,
}

type LimitDescriptor = typeof IP_LIMIT | typeof EMAIL_LIMIT

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

async function evaluateLimit(
  descriptor: LimitDescriptor,
  identifier: string
): Promise<RateLimitResult> {
  const supabase = createServiceRoleClient()
  const windowStart = new Date(Date.now() - descriptor.windowMs).toISOString()

  const { data, error } = await supabase
    .from("contact_rate_limits")
    .select("created_at")
    .eq("scope", descriptor.scope)
    .eq("identifier", identifier)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to evaluate ${descriptor.scope} rate limit.`)
  }

  if ((data?.length ?? 0) < descriptor.limit) {
    return { allowed: true }
  }

  const oldestAttempt = data?.[0]?.created_at

  if (!oldestAttempt) {
    return { allowed: false, retryAfterSeconds: Math.ceil(descriptor.windowMs / 1000) }
  }

  const retryAfterMs =
    new Date(oldestAttempt).getTime() + descriptor.windowMs - Date.now()

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
  }
}

export async function checkAndRecordContactRateLimit(params: {
  email: string
  ip: string
}): Promise<RateLimitResult> {
  const ipResult = await evaluateLimit(IP_LIMIT, params.ip)

  if (!ipResult.allowed) {
    return ipResult
  }

  const emailResult = await evaluateLimit(EMAIL_LIMIT, params.email)

  if (!emailResult.allowed) {
    return emailResult
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from("contact_rate_limits").insert([
    { scope: IP_LIMIT.scope, identifier: params.ip },
    { scope: EMAIL_LIMIT.scope, identifier: params.email },
  ])

  if (error) {
    throw new Error("Failed to record contact rate limit usage.")
  }

  return { allowed: true }
}
