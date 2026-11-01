import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { parseStubOutLocationInput } from "@/lib/admin/stub-out-locations"

const STUB_OUT_CREATE_ROLES = new Set(["finance", "reader"])

export async function GET() {
  const adminContext = await getCurrentAdminContext()

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const serviceRole = createServiceRoleClient()
  const { data, error } = await serviceRole
    .from("stub_out_location_summaries")
    .select("*")
    .order("code", { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load Stub Out locations." },
      { status: 400 },
    )
  }

  return NextResponse.json({ locations: data || [] })
}

export async function POST(request: Request) {
  const adminContext = await getCurrentAdminContext()

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!STUB_OUT_CREATE_ROLES.has(adminContext.profile.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
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
      .insert({
        ...input,
        created_by_user_id: adminContext.user.id,
        created_by_email: adminContext.profile.email,
        created_by_role: adminContext.profile.role,
      })

    if (error) {
      const message = error.code === "23505"
        ? "A Stub Out location with this code already exists."
        : error.message || "Failed to add Stub Out location."

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
