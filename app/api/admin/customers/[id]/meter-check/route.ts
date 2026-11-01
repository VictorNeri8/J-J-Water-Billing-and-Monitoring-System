import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

const METER_CHECK_ROLES = new Set(["reader", "finance"])

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminContext = await getCurrentAdminContext()

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!METER_CHECK_ROLES.has(adminContext.profile.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
  }

  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: "Customer id is required." }, { status: 400 })
  }

  let checked = true

  try {
    const body = await request.json()
    checked = body.checked !== false
  } catch {
    checked = true
  }

  const checkedAt = new Date()
  const expiresAt = new Date(checkedAt)
  expiresAt.setDate(expiresAt.getDate() + 10)
  const meterCheckValues = checked
    ? {
        meter_checked_at: checkedAt.toISOString(),
        meter_check_expires_at: expiresAt.toISOString(),
        meter_checked_by_user_id: adminContext.user.id,
        meter_checked_by_email: adminContext.profile.email,
        meter_checked_by_role: adminContext.profile.role,
      }
    : {
        meter_checked_at: null,
        meter_check_expires_at: null,
        meter_checked_by_user_id: null,
        meter_checked_by_email: null,
        meter_checked_by_role: null,
      }

  const serviceRole = createServiceRoleClient()
  const { data: updatedCustomer, error } = await serviceRole
    .from("customers")
    .update(meterCheckValues)
    .eq("id", id)
    .is("archived_at", null)
    .select("id, meter_checked_at, meter_check_expires_at, meter_checked_by_user_id, meter_checked_by_email, meter_checked_by_role")
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to mark this meter checked." },
      { status: 400 },
    )
  }

  if (!updatedCustomer) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 })
  }

  return NextResponse.json({ success: true, customer: updatedCustomer })
}
