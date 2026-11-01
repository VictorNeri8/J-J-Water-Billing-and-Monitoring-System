import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

const OUTSTANDING_BALANCE_ERROR =
  "This customer has an outstanding bill and cannot be permanently deleted during the 60-day restoration window."

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
  const { data, error } = await serviceRole.rpc("permanently_delete_archived_customer", {
    p_customer_id: id,
  })

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to permanently delete customer." },
      { status: 400 },
    )
  }

  if (data === "outstanding_balance") {
    return NextResponse.json({ error: OUTSTANDING_BALANCE_ERROR }, { status: 409 })
  }

  if (data === "not_archived") {
    return NextResponse.json(
      { error: "Only archived customers can be permanently deleted." },
      { status: 409 },
    )
  }

  if (data === "not_found") {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 })
  }

  if (data !== "deleted") {
    return NextResponse.json(
      { error: "Failed to permanently delete customer." },
      { status: 400 },
    )
  }

  return NextResponse.json({ success: true })
}
