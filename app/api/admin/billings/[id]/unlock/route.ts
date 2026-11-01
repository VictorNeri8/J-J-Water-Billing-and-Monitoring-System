import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { createAdminAuthClient, createServiceRoleClient } from "@/lib/supabase/admin"

type BillingRow = {
  status: "paid" | "partial" | "unpaid" | "overdue"
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminContext = await getCurrentAdminContext()
  if (!adminContext) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  if (adminContext.profile.role !== "finance") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
  }

  const { id } = await context.params
  if (!id) return NextResponse.json({ error: "Billing id is required." }, { status: 400 })

  try {
    const body = await request.json()
    const password = String(body.password || "")

    if (!password) {
      return NextResponse.json({ error: "Finance password is required." }, { status: 400 })
    }

    const authClient = createAdminAuthClient()
    const { data: signInData, error: passwordError } = await authClient.auth.signInWithPassword({
      email: adminContext.profile.email,
      password,
    })

    if (passwordError || !signInData.user) {
      return NextResponse.json({ error: "Finance password is incorrect." }, { status: 401 })
    }

    if (signInData.user.id !== adminContext.user.id) {
      return NextResponse.json({ error: "Password verification must match the current Finance account." }, { status: 403 })
    }

    const serviceRole = createServiceRoleClient()
    const { data: billingRecord, error: billingLookupError } = await serviceRole
      .from("billings")
      .select("status")
      .eq("id", id)
      .maybeSingle()

    if (billingLookupError || !billingRecord) {
      return NextResponse.json({ error: "Billing record not found." }, { status: 404 })
    }

    const billing = billingRecord as BillingRow
    if (billing.status !== "paid") {
      return NextResponse.json({ error: "Only paid billing records can be unlocked." }, { status: 400 })
    }

    const { data: unlockedBilling, error: updateError } = await serviceRole
      .from("billings")
      .update({
        status: "unpaid",
        amount_paid: 0,
        paid_date: null,
        payment_method: null,
        updated_by: adminContext.user.id,
      })
      .eq("id", id)
      .eq("status", "paid")
      .select("id")
      .maybeSingle()

    if (updateError || !unlockedBilling) {
      return NextResponse.json({ error: updateError?.message || "Failed to unlock billing row." }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Billing unlock failed:", error)
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
}
