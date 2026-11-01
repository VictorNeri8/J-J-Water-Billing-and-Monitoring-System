import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { parseMeterReadingInput } from "@/lib/meter-reading"
import { createServiceRoleClient } from "@/lib/supabase/admin"

type BillingRow = {
  billing_date?: string
  created_at?: string | null
  customer_id?: string
  meter_reading_id: string | null
  status: "paid" | "partial" | "unpaid" | "overdue"
  customers?: { archived_at: string | null } | { archived_at: string | null }[] | null
  meter_readings: { is_starting_reading: boolean } | { is_starting_reading: boolean }[] | null
}

function isValidDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminContext = await getCurrentAdminContext()
  if (!adminContext) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  if (adminContext.profile.role !== "finance") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
  }

  const { id } = await context.params
  if (!id) return NextResponse.json({ error: "Billing id is required." }, { status: 400 })

  try {
    const body = await request.json()
    const billingDate = String(body.billing_date || "").trim()
    const currentReading = parseMeterReadingInput(String(body.current_reading ?? ""))

    if (!isValidDateOnly(billingDate)) {
      return NextResponse.json({ error: "Enter a valid billing date." }, { status: 400 })
    }
    if (currentReading === null) {
      return NextResponse.json({ error: "Current meter reading must contain exactly 5 digits." }, { status: 400 })
    }

    const serviceRole = createServiceRoleClient()
    const { data: billingRecord, error: billingLookupError } = await serviceRole
      .from("billings")
      .select("status, meter_reading_id, meter_readings ( is_starting_reading )")
      .eq("id", id)
      .maybeSingle()

    if (billingLookupError || !billingRecord) {
      return NextResponse.json({ error: "Billing record not found." }, { status: 404 })
    }

    const billing = billingRecord as BillingRow
    if (billing.status === "paid") {
      return NextResponse.json({ error: "Paid billing records are locked." }, { status: 400 })
    }
    if (!billing.meter_reading_id) {
      return NextResponse.json({ error: "This billing record is not linked to a meter reading." }, { status: 400 })
    }
    const linkedReading = Array.isArray(billing.meter_readings)
      ? billing.meter_readings[0]
      : billing.meter_readings
    if (linkedReading?.is_starting_reading) {
      return NextResponse.json({ error: "Manual Book Import baseline readings are locked." }, { status: 400 })
    }

    const { data, error } = await serviceRole.rpc("update_finance_historical_reading_transaction", {
      p_billing_id: id,
      p_current_reading: currentReading,
      p_reading_date: billingDate,
      p_updated_by: adminContext.user.id,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, result: Array.isArray(data) ? data[0] : data })
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const adminContext = await getCurrentAdminContext()
  if (!adminContext) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  if (adminContext.profile.role !== "finance") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
  }

  const { id } = await context.params
  if (!id) return NextResponse.json({ error: "Billing id is required." }, { status: 400 })

  try {
    const serviceRole = createServiceRoleClient()
    const { data: billingRecord, error: billingLookupError } = await serviceRole
      .from("billings")
      .select(`
        customer_id,
        meter_reading_id,
        status,
        billing_date,
        created_at,
        customers (
          archived_at
        ),
        meter_readings (
          is_starting_reading
        )
      `)
      .eq("id", id)
      .maybeSingle()

    if (billingLookupError || !billingRecord) {
      return NextResponse.json({ error: "Billing record not found." }, { status: 404 })
    }

    const billing = billingRecord as BillingRow
    if (!billing.customer_id) {
      return NextResponse.json({ error: "Billing record is not linked to a customer." }, { status: 400 })
    }
    if (billing.status === "paid") {
      return NextResponse.json({ error: "Paid billing records are locked." }, { status: 400 })
    }
    if (!billing.meter_reading_id) {
      return NextResponse.json({ error: "This billing record is not linked to a meter reading." }, { status: 400 })
    }

    const customer = Array.isArray(billing.customers)
      ? billing.customers[0]
      : billing.customers
    if (customer?.archived_at) {
      return NextResponse.json({ error: "Billing records for archived customers cannot be deleted." }, { status: 400 })
    }

    const linkedReading = Array.isArray(billing.meter_readings)
      ? billing.meter_readings[0]
      : billing.meter_readings
    if (linkedReading?.is_starting_reading) {
      return NextResponse.json({ error: "Manual Book Import baseline readings are locked." }, { status: 400 })
    }

    const { data: latestBilling, error: latestLookupError } = await serviceRole
      .from("billings")
      .select("id")
      .eq("customer_id", billing.customer_id)
      .order("billing_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestLookupError || !latestBilling) {
      return NextResponse.json({ error: "Unable to verify the latest billing row." }, { status: 400 })
    }
    if (latestBilling.id !== id) {
      return NextResponse.json({ error: "Only the latest billing row can be deleted." }, { status: 400 })
    }

    const { data: deletedReading, error: deleteError } = await serviceRole
      .from("meter_readings")
      .delete()
      .eq("id", billing.meter_reading_id)
      .eq("customer_id", billing.customer_id)
      .select("id")
      .maybeSingle()

    if (deleteError || !deletedReading) {
      return NextResponse.json({ error: deleteError?.message || "Failed to delete billing row." }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Billing delete failed:", error)
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
}
