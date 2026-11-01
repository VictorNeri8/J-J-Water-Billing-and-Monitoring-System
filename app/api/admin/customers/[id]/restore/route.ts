import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminContext = await getCurrentAdminContext()

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (adminContext.profile.role !== "finance") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: "Customer id is required." }, { status: 400 })
  }

  const serviceRole = createServiceRoleClient()
  const { data: customer, error: lookupError } = await serviceRole
    .from("customers")
    .select("id, archived_at, archive_expires_at")
    .eq("id", id)
    .maybeSingle()

  if (lookupError || !customer) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 })
  }

  if (!customer.archived_at || !customer.archive_expires_at) {
    return NextResponse.json({ error: "Customer is not archived." }, { status: 409 })
  }

  const now = new Date().toISOString()
  if (customer.archive_expires_at <= now) {
    return NextResponse.json(
      { error: "The 60-day restoration period has expired." },
      { status: 409 },
    )
  }

  const { data: restoredCustomer, error } = await serviceRole
    .from("customers")
    .update({
      archived_at: null,
      archived_by_user_id: null,
      archived_by_email: null,
      archived_by_role: null,
      archive_expires_at: null,
    })
    .eq("id", id)
    .not("archived_at", "is", null)
    .gt("archive_expires_at", now)
    .select("id")
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to restore customer." },
      { status: 400 },
    )
  }

  if (!restoredCustomer) {
    return NextResponse.json(
      { error: "The 60-day restoration period has expired." },
      { status: 409 },
    )
  }

  return NextResponse.json({ success: true })
}
