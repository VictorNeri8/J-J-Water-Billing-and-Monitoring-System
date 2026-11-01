import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { AdminProfile, AdminRole } from "@/lib/types"
export { ADMIN_OTP_CHALLENGE_COOKIE, ADMIN_OTP_TTL_SECONDS, normalizeAdminEmail } from "@/lib/admin/shared"

export async function getCurrentAdminContext(): Promise<{
  user: User
  profile: AdminProfile
  supabase: Awaited<ReturnType<typeof createClient>>
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from("admin_profiles")
    .select("id, email, role, full_name, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !profile) {
    return null
  }

  return {
    user,
    profile: profile as AdminProfile,
    supabase,
  }
}

export async function requireAdminContext(roles?: AdminRole[]) {
  const context = await getCurrentAdminContext()

  if (!context) {
    redirect("/admin/login")
  }

  if (roles && !roles.includes(context.profile.role)) {
    redirect("/admin/dashboard")
  }

  return context
}

export function isFinanceRole(role: AdminRole) {
  return role === "finance"
}

export function isReaderRole(role: AdminRole) {
  return role === "reader"
}
