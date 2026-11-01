import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { parseAddress } from "@/lib/address-data"
import { resolveAddressSelection } from "@/lib/admin/address-options"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  ACCOUNT_NUMBER_ERROR,
  METER_ID_ERROR,
  formatOptionalMeterId,
  formatTitleCase,
  isValidAccountNumber,
  isValidMeterId,
} from "@/lib/customer-input"

const CUSTOMER_PROFILE_EDIT_ROLES = new Set(["reader", "finance"])

function getCustomerWriteError(error: { code?: string; message?: string } | null, fallback: string) {
  if (error?.code === "23505" && error.message?.toLowerCase().includes("meter_id")) {
    return "Meter ID already exists."
  }

  return error?.message || fallback
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminContext = await getCurrentAdminContext()

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!CUSTOMER_PROFILE_EDIT_ROLES.has(adminContext.profile.role)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
  }

  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: "Customer id is required." }, { status: 400 })
  }

  try {
    const body = await request.json()
    const account_number = String(body.account_number || "").trim()
    const meter_id = formatOptionalMeterId(String(body.meter_id || ""))
    const customer_name = formatTitleCase(String(body.customer_name || ""))
    const contact_number = String(body.contact_number || "").trim()
    const address = String(body.address || "").trim() || null
    const preserveLegacyAddress = body.preserve_legacy_address === true
    const municipality = String(body.municipality || "").trim()
    const barangay = String(body.barangay || "").trim()
    const sitio = String(body.sitio || "").trim()
    const purok = String(body.purok || "").trim()
    const is_active = Boolean(body.is_active)
    const stub_out_location_id = body.stub_out_location_id
      ? String(body.stub_out_location_id).trim()
      : null

    if (!isValidAccountNumber(account_number)) {
      return NextResponse.json({ error: ACCOUNT_NUMBER_ERROR }, { status: 400 })
    }

    if (meter_id && !isValidMeterId(meter_id)) {
      return NextResponse.json({ error: METER_ID_ERROR }, { status: 400 })
    }

    if (!customer_name) {
      return NextResponse.json(
        { error: "Customer name is required." },
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
        { error: "Restore this customer before editing their account." },
        { status: 409 },
      )
    }

    let stopOut = "-"

    if (stub_out_location_id) {
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

      stopOut = stubOutLocation.code
    }

    if (preserveLegacyAddress) {
      if (!address || parseAddress(address)) {
        return NextResponse.json(
          { error: "Legacy addresses can only be preserved unchanged." },
          { status: 400 },
        )
      }

      const { data: existingCustomer, error: existingCustomerError } = await serviceRole
        .from("customers")
        .select("address")
        .eq("id", id)
        .single()

      if (
        existingCustomerError ||
        !existingCustomer?.address ||
        existingCustomer.address !== address
      ) {
        return NextResponse.json(
          { error: "Legacy addresses can only be preserved unchanged." },
          { status: 400 },
        )
      }
    }

    let resolvedAddress = null

    if (!preserveLegacyAddress) {
      resolvedAddress = await resolveAddressSelection(
        serviceRole,
        { municipality, barangay, sitio, purok },
        adminContext.user.id,
      )
    }

    const { data: updatedCustomer, error } = await serviceRole
      .from("customers")
      .update({
        account_number,
        meter_id,
        customer_name,
        contact_number,
        stop_out: stopOut,
        address: resolvedAddress?.address || address,
        municipality: resolvedAddress?.municipality || null,
        barangay: resolvedAddress?.barangay || null,
        sitio: resolvedAddress?.sitio || null,
        purok: resolvedAddress?.purok || null,
        stub_out_location_id,
        address_sitio_id: resolvedAddress?.address_sitio_id || null,
        address_purok_id: resolvedAddress?.address_purok_id || null,
        is_active,
      })
      .eq("id", id)
      .is("archived_at", null)
      .select("id")
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: getCustomerWriteError(error, "Failed to update customer.") },
        { status: 400 },
      )
    }

    if (!updatedCustomer) {
      return NextResponse.json(
        { error: "Restore this customer before editing their account." },
        { status: 409 },
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
