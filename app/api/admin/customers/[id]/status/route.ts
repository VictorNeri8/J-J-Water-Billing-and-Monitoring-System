import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

const CUSTOMER_STATUS_ROLES = new Set(["reader", "finance"])
const CUSTOMER_STATUS_FIELDS = new Set(["is_active"])

function hasOnlyStatusFields(body: Record<string, unknown>) {
  return Object.keys(body).every((key) => CUSTOMER_STATUS_FIELDS.has(key))
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminContext = await getCurrentAdminContext()

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!CUSTOMER_STATUS_ROLES.has(adminContext.profile.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
  }

  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: "Customer id is required." }, { status: 400 })
  }

  try {
    const body = await request.json()

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
    }

    const statusBody = body as Record<string, unknown>

    if (!hasOnlyStatusFields(statusBody) || typeof statusBody.is_active !== "boolean") {
      return NextResponse.json(
        { error: "Only is_active can be updated and it must be a boolean." },
        { status: 400 },
      )
    }

    const serviceRole = createServiceRoleClient()
    const { data: customerState, error: customerStateError } = await serviceRole
      .from("customers")
      .select("id, archived_at")
      .eq("id", id)
      .maybeSingle()

    if (customerStateError || !customerState) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 })
    }

    if (customerState.archived_at) {
      return NextResponse.json(
        { error: "Restore this customer before changing their status." },
        { status: 409 },
      )
    }

    const { data: updatedCustomer, error } = await serviceRole
      .from("customers")
      .update({ is_active: statusBody.is_active })
      .eq("id", id)
      .is("archived_at", null)
      .select("id, is_active, updated_at")
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update customer status." },
        { status: 400 },
      )
    }

    if (!updatedCustomer) {
      return NextResponse.json(
        { error: "Restore this customer before changing their status." },
        { status: 409 },
      )
    }

    return NextResponse.json({ success: true, customer: updatedCustomer })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request." },
      { status: 400 },
    )
  }
}
