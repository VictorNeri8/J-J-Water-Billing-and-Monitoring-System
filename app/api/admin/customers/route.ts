import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { resolveAddressSelection } from "@/lib/admin/address-options"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  ACCOUNT_NUMBER_ERROR,
  METER_ID_ERROR,
  formatTitleCase,
  isValidAccountNumber,
  isValidMeterId,
  normalizeMeterId,
} from "@/lib/customer-input"
import { parseCubicConsumedInput, parseMeterReadingInput } from "@/lib/meter-reading"

const CUSTOMER_CREATE_ROLES = new Set(["finance", "reader"])

function getTodayDateOnly() {
  return new Date().toISOString().split("T")[0]
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

function addDaysToDateOnly(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().split("T")[0]
}

function getCustomerWriteError(error: { code?: string; message?: string } | null, fallback: string) {
  if (error?.code === "23505" && error.message?.toLowerCase().includes("meter_id")) {
    return "Meter ID already exists."
  }

  return error?.message || fallback
}

export async function POST(request: Request) {
  const adminContext = await getCurrentAdminContext()

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!CUSTOMER_CREATE_ROLES.has(adminContext.profile.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const account_number = String(body.account_number || "").trim()
    const meter_id = normalizeMeterId(String(body.meter_id || ""))
    const customer_name = formatTitleCase(String(body.customer_name || ""))
    const contact_number = String(body.contact_number || "").trim()
    const municipality = String(body.municipality || "").trim()
    const barangay = String(body.barangay || "").trim()
    const sitio = String(body.sitio || "").trim()
    const purok = String(body.purok || "").trim()
    const stub_out_location_id = body.stub_out_location_id
      ? String(body.stub_out_location_id).trim()
      : null
    const old_customer_mode = body.old_customer_mode === true
    const starting_reading = old_customer_mode
      ? parseMeterReadingInput(String(body.starting_reading ?? ""))
      : null
    const cubic_consumed = old_customer_mode
      ? parseCubicConsumedInput(String(body.cubic_consumed ?? ""))
      : null
    const import_date = old_customer_mode
      ? String(body.import_date || getTodayDateOnly()).trim()
      : null

    if (!isValidAccountNumber(account_number)) {
      return NextResponse.json({ error: ACCOUNT_NUMBER_ERROR }, { status: 400 })
    }

    if (!isValidMeterId(meter_id)) {
      return NextResponse.json({ error: METER_ID_ERROR }, { status: 400 })
    }

    if (!customer_name || !stub_out_location_id) {
      return NextResponse.json(
        { error: "Customer name and Stub Out location are required." },
        { status: 400 },
      )
    }

    if (old_customer_mode && starting_reading === null) {
      return NextResponse.json(
        { error: "Starting meter reading must contain exactly 5 digits." },
        { status: 400 },
      )
    }

    if (old_customer_mode && cubic_consumed === null) {
      return NextResponse.json(
        { error: "Cubic consumed must be an integer between 0 and 99999." },
        { status: 400 },
      )
    }

    if (old_customer_mode && (!import_date || !isValidDateOnly(import_date))) {
      return NextResponse.json(
        { error: "Enter a valid manual book date." },
        { status: 400 },
      )
    }

    const serviceRole = createServiceRoleClient()

    const { data: stubOutLocation, error: stubOutLocationError } = await serviceRole
      .from("stub_out_locations")
      .select("id, code")
      .eq("id", stub_out_location_id)
      .maybeSingle()

    if (stubOutLocationError || !stubOutLocation) {
      return NextResponse.json(
        { error: "Selected Stub Out location was not found." },
        { status: 400 },
      )
    }

    const resolvedAddress = await resolveAddressSelection(
      serviceRole,
      { municipality, barangay, sitio, purok },
      adminContext.user.id,
    )
    const customerValues = {
      account_number,
      meter_id,
      customer_name,
      contact_number,
      stop_out: stubOutLocation.code,
      address: resolvedAddress.address,
      municipality: resolvedAddress.municipality,
      barangay: resolvedAddress.barangay,
      sitio: resolvedAddress.sitio,
      purok: resolvedAddress.purok,
      stub_out_location_id,
      address_sitio_id: resolvedAddress.address_sitio_id,
      address_purok_id: resolvedAddress.address_purok_id,
      created_by: adminContext.user.id,
      created_by_user_id: adminContext.user.id,
      created_by_email: adminContext.profile.email,
      created_by_role: adminContext.profile.role,
    }

    if (old_customer_mode) {
      const importDate = import_date || getTodayDateOnly()
      const dueDate = addDaysToDateOnly(importDate, 15)

      const { data, error } = await serviceRole.rpc("create_old_customer_transaction", {
        p_account_number: customerValues.account_number,
        p_meter_id: customerValues.meter_id,
        p_customer_name: customerValues.customer_name,
        p_contact_number: customerValues.contact_number,
        p_stop_out: customerValues.stop_out,
        p_address: customerValues.address,
        p_municipality: customerValues.municipality,
        p_barangay: customerValues.barangay,
        p_sitio: customerValues.sitio,
        p_purok: customerValues.purok,
        p_stub_out_location_id: customerValues.stub_out_location_id,
        p_address_sitio_id: customerValues.address_sitio_id,
        p_address_purok_id: customerValues.address_purok_id,
        p_starting_reading: starting_reading,
        p_cubic_consumed: cubic_consumed,
        p_import_date: importDate,
        p_due_date: dueDate,
        p_created_by: adminContext.user.id,
        p_created_by_email: adminContext.profile.email,
        p_created_by_role: adminContext.profile.role,
      })

      if (error || !data) {
        return NextResponse.json(
          { error: getCustomerWriteError(error, "Failed to import old customer.") },
          { status: 400 },
        )
      }

      return NextResponse.json({
        success: true,
        import: Array.isArray(data) ? data[0] : data,
      })
    }

    const { error } = await serviceRole.from("customers").insert(customerValues)

    if (error) {
      return NextResponse.json(
        { error: getCustomerWriteError(error, "Failed to add customer.") },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request." },
      { status: 400 },
    )
  }
}
