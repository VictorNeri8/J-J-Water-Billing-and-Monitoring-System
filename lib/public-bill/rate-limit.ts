import { createServiceRoleClient } from "@/lib/supabase/admin"

const PUBLIC_BILL_LIMIT = {
  limit: 5,
  windowMs: 10 * 60 * 1000,
}

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

export async function checkAndRecordPublicBillRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  const supabase = createServiceRoleClient()
  const normalizedIdentifier = identifier.trim() || "unknown"
  const windowStart = new Date(Date.now() - PUBLIC_BILL_LIMIT.windowMs).toISOString()

  const { data, error } = await supabase
    .from("public_customer_bill_rate_limits")
    .select("created_at")
    .eq("identifier", normalizedIdentifier)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error("Failed to evaluate public bill rate limit.")
  }

  if ((data?.length ?? 0) >= PUBLIC_BILL_LIMIT.limit) {
    const oldestAttempt = data?.[0]?.created_at

    if (!oldestAttempt) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(PUBLIC_BILL_LIMIT.windowMs / 1000),
      }
    }

    const retryAfterMs =
      new Date(oldestAttempt).getTime() + PUBLIC_BILL_LIMIT.windowMs - Date.now()

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    }
  }

  const { error: insertError } = await supabase
    .from("public_customer_bill_rate_limits")
    .insert({ identifier: normalizedIdentifier })

  if (insertError) {
    throw new Error("Failed to record public bill rate limit usage.")
  }

  return { allowed: true }
}
