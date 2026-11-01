import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  STUB_OUT_DELETE_BLOCKED_MESSAGE,
  parseStubOutLocationInput,
} from "@/lib/admin/stub-out-locations"

export async function PATCH(
  request: Request,
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
    return NextResponse.json({ error: "Stub Out location id is required." }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { data: input, error: validationError } = parseStubOutLocationInput(body)

    if (validationError || !input) {
      return NextResponse.json({ error: validationError || "Invalid request." }, { status: 400 })
    }

    const serviceRole = createServiceRoleClient()
    const { error } = await serviceRole
      .from("stub_out_locations")
      .update(input)
      .eq("id", id)

    if (error) {
      const message = error.code === "23505"
        ? "A Stub Out location with this code already exists."
        : error.message || "Failed to update Stub Out location."

      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request." },
      { status: 400 },
    )
  }
}

export async function DELETE(
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
    return NextResponse.json({ error: "Stub Out location id is required." }, { status: 400 })
  }

  const serviceRole = createServiceRoleClient()
  const { count, error: countError } = await serviceRole
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("stub_out_location_id", id)

  if (countError) {
    return NextResponse.json(
      { error: countError.message || "Failed to check Stub Out assignments." },
      { status: 400 },
    )
  }

  if ((count || 0) > 0) {
    return NextResponse.json({ error: STUB_OUT_DELETE_BLOCKED_MESSAGE }, { status: 400 })
  }

  const { error } = await serviceRole
    .from("stub_out_locations")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete Stub Out location." },
      { status: 400 },
    )
  }

  return NextResponse.json({ success: true })
}
