import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { parseMeterReadingInput } from "@/lib/meter-reading"
import { createServiceRoleClient } from "@/lib/supabase/admin"

const READING_WRITE_ROLES = new Set(["reader", "finance"])

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminContext = await getCurrentAdminContext()
  if (!adminContext) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  if (!READING_WRITE_ROLES.has(adminContext.profile.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
  }

  const { id } = await context.params
  if (!id) return NextResponse.json({ error: "Reading id is required." }, { status: 400 })

  try {
    const body = await request.json()
    const currentReading = parseMeterReadingInput(String(body.current_reading ?? ""))
    if (currentReading === null) {
      return NextResponse.json({ error: "Current meter reading must contain exactly 5 digits." }, { status: 400 })
    }

    const serviceRole = createServiceRoleClient()
    const { data: reading, error: readingError } = await serviceRole
      .from("meter_readings")
      .select("reading_date, is_starting_reading")
      .eq("id", id)
      .maybeSingle()

    if (readingError || !reading) {
      return NextResponse.json({ error: "Reading not found." }, { status: 404 })
    }
    if (reading.is_starting_reading) {
      return NextResponse.json({ error: "Manual Book Import baseline readings are locked." }, { status: 400 })
    }

    const { error } = await serviceRole.rpc("update_latest_meter_reading_transaction", {
      p_reading_id: id,
      p_current_reading: currentReading,
      p_reading_date: reading.reading_date,
      p_updated_by: adminContext.user.id,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
}
