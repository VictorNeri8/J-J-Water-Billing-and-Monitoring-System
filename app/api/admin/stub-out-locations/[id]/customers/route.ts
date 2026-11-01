import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { isOverdueAccount, OPEN_BILLING_STATUSES } from "@/lib/overdue-accounts"
import type { StubOutCustomer } from "@/lib/types"

interface OpenBillingRow {
  customer_id: string
  amount: number
  amount_paid: number | null
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminContext = await getCurrentAdminContext()

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: "Stub Out location id is required." }, { status: 400 })
  }

  const serviceRole = createServiceRoleClient()
  const { data: customers, error: customerError } = await serviceRole
    .from("customers")
    .select("id, account_number, meter_id, customer_name, address, contact_number, stop_out, is_active, meter_checked_at, meter_check_expires_at, meter_checked_by_user_id, meter_checked_by_email, meter_checked_by_role")
    .eq("stub_out_location_id", id)
    .is("archived_at", null)
    .order("customer_name", { ascending: true })

  if (customerError) {
    return NextResponse.json(
      { error: customerError.message || "Failed to load customers for this Stub Out location." },
      { status: 400 },
    )
  }

  const customerRows = customers || []
  const customerIds = customerRows.map((customer) => customer.id)
  const totalUnpaidBalanceByCustomer = new Map<string, number>()
  const openBillingCountByCustomer = new Map<string, number>()

  if (customerIds.length > 0) {
    const { data: openBillings, error: billingError } = await serviceRole
      .from("billings")
      .select("customer_id, amount, amount_paid")
      .in("customer_id", customerIds)
      .in("status", [...OPEN_BILLING_STATUSES])

    if (billingError) {
      return NextResponse.json(
        { error: billingError.message || "Failed to load billing status for assigned customers." },
        { status: 400 },
      )
    }

    for (const billing of (openBillings || []) as OpenBillingRow[]) {
      const remainingBalance = Math.max((billing.amount || 0) - (billing.amount_paid || 0), 0)
      const currentTotal = totalUnpaidBalanceByCustomer.get(billing.customer_id) || 0
      totalUnpaidBalanceByCustomer.set(billing.customer_id, currentTotal + remainingBalance)

      const currentCount = openBillingCountByCustomer.get(billing.customer_id) || 0
      openBillingCountByCustomer.set(billing.customer_id, currentCount + 1)
    }
  }

  const mappedCustomers: StubOutCustomer[] = customerRows.map((customer) => {
    const openBillingCount = openBillingCountByCustomer.get(customer.id) || 0

    return {
      id: customer.id,
      account_number: customer.account_number,
      meter_id: customer.meter_id,
      customer_name: customer.customer_name,
      address: customer.address,
      contact_number: customer.contact_number,
      stop_out: customer.stop_out,
      is_active: customer.is_active,
      meter_checked_at: customer.meter_checked_at,
      meter_check_expires_at: customer.meter_check_expires_at,
      meter_checked_by_user_id: customer.meter_checked_by_user_id,
      meter_checked_by_email: customer.meter_checked_by_email,
      meter_checked_by_role: customer.meter_checked_by_role,
      total_unpaid_balance: totalUnpaidBalanceByCustomer.get(customer.id) || 0,
      is_overdue_account: isOverdueAccount(openBillingCount),
    }
  })

  return NextResponse.json({ customers: mappedCustomers })
}
