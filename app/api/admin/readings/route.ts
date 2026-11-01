import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { parseMeterReadingInput } from "@/lib/meter-reading"
import { createServiceRoleClient } from "@/lib/supabase/admin"

type LatestReadingRow = {
  reading_date: string
}

type MeterReadingCreationRow = {
  reading_id: string
  previous_reading: number
  current_reading: number
  usage_cubic: number
  amount: number
  customer_id: string
  meter_checked_at: string | null
  meter_check_expires_at: string | null
  meter_checked_by_user_id: string | null
  meter_checked_by_email: string | null
  meter_checked_by_role: string | null
}

const READING_WRITE_ROLES = new Set(["reader", "finance"])
const INACTIVE_CUSTOMER_READING_ERROR = "Please turn this customer status to active to add meter."

function toDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function getDatabaseError(error: { message?: string } | null, fallback: string) {
  if (error?.message?.toLowerCase().includes("customer is inactive")) {
    return INACTIVE_CUSTOMER_READING_ERROR
  }

  return error?.message || fallback
}

async function resolveAvailableReadingDate(customerId: string) {
  const serviceRole = createServiceRoleClient()
  const { data, error } = await serviceRole
    .from("meter_readings")
    .select("reading_date")
    .eq("customer_id", customerId)
    .order("reading_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  const latestReadingDate = (data as LatestReadingRow | null)?.reading_date ?? null
  const candidate = latestReadingDate ? new Date(`${latestReadingDate}T00:00:00`) : new Date()
  if (latestReadingDate) candidate.setMonth(candidate.getMonth() + 1)

  while (true) {
    const nextDate = toDateOnly(candidate)
    const { data: existingReading, error: existingReadingError } = await serviceRole
      .from("meter_readings")
      .select("id")
      .eq("customer_id", customerId)
      .eq("reading_date", nextDate)
      .limit(1)
      .maybeSingle()

    if (existingReadingError) throw existingReadingError
    if (!existingReading) return nextDate
    candidate.setDate(candidate.getDate() + 1)
  }
}

export async function POST(request: Request) {
  const adminContext = await getCurrentAdminContext()
  if (!adminContext) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  if (!READING_WRITE_ROLES.has(adminContext.profile.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const customerId = String(body.customer_id || "").trim()
    const currentReading = parseMeterReadingInput(String(body.current_reading ?? ""))

    if (!customerId) {
      return NextResponse.json({ error: "Customer is required." }, { status: 400 })
    }
    if (currentReading === null) {
      return NextResponse.json({ error: "Current meter reading must contain exactly 5 digits." }, { status: 400 })
    }

    const readingDate = await resolveAvailableReadingDate(customerId)
    const dueDate = new Date(`${readingDate}T00:00:00`)
    dueDate.setDate(dueDate.getDate() + 15)

    const serviceRole = createServiceRoleClient()
    const { data, error } = await serviceRole.rpc("record_meter_reading_transaction", {
      p_customer_id: customerId,
      p_current_reading: currentReading,
      p_reading_date: readingDate,
      p_due_date: toDateOnly(dueDate),
      p_recorded_by: adminContext.user.id,
      p_recorded_by_role: adminContext.profile.role,
      p_recorded_by_email: adminContext.profile.email,
    })

    if (error || !data) {
      return NextResponse.json({ error: getDatabaseError(error, "Failed to save the meter reading.") }, { status: 400 })
    }

    const reading = (Array.isArray(data) ? data[0] : data) as MeterReadingCreationRow

    return NextResponse.json({
      success: true,
      reading: {
        reading_id: reading.reading_id,
        previous_reading: reading.previous_reading,
        current_reading: reading.current_reading,
        usage_cubic: reading.usage_cubic,
        amount: reading.amount,
      },
      customer_check: {
        id: reading.customer_id,
        meter_checked_at: reading.meter_checked_at,
        meter_check_expires_at: reading.meter_check_expires_at,
        meter_checked_by_user_id: reading.meter_checked_by_user_id,
        meter_checked_by_email: reading.meter_checked_by_email,
        meter_checked_by_role: reading.meter_checked_by_role,
      },
    })
  } catch (error) {
    console.error("Admin reading creation failed:", error)
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
}
