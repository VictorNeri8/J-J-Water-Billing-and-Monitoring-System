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

  const archivedAt = new Date().toISOString()
  const serviceRole = createServiceRoleClient()
  const { data, error } = await serviceRole
    .from("customers")
    .update({
      archived_at: archivedAt,
      archived_by_user_id: adminContext.user.id,
      archived_by_email: adminContext.profile.email,
      archived_by_role: adminContext.profile.role,
    })
    .eq("id", id)
    .is("archived_at", null)
    .select("id, archive_expires_at")
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to archive customer." },
      { status: 400 },
    )
  }

  if (!data) {
    return NextResponse.json(
      { error: "Customer was not found or is already archived." },
      { status: 409 },
    )
  }

  return NextResponse.json({ success: true, archive_expires_at: data.archive_expires_at })
}
