import { differenceInDays } from "date-fns"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { formatPhoneNumber, sendSMS } from "@/lib/sms"
import { SMS_DISABLED_RESPONSE, SMS_FEATURE_ENABLED } from "@/lib/config/features"

type BillingReminderRow = {
  id: string
  customer_id: string
  amount: number
  amount_paid: number | null
  due_date: string
  status: "paid" | "partial" | "unpaid" | "overdue"
  customers:
    | {
        id: string
        customer_name: string
        contact_number: string | null
        account_number: string
        is_active: boolean
        archived_at: string | null
      }
    | {
        id: string
        customer_name: string
        contact_number: string | null
        account_number: string
        is_active: boolean
        archived_at: string | null
      }[]
    | null
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin credentials are not configured")
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  /**
   * SMS IMPLEMENTATION TEMPORARILY DISABLED
   * Cutoff date: June 4, 2026
   *
   * To enable again:
   * 1. Set SMS_FEATURE_ENABLED=true
   * 2. Add Semaphore env variables
   * 3. Verify cron reminder behavior
   */
  if (!SMS_FEATURE_ENABLED) {
    return NextResponse.json(SMS_DISABLED_RESPONSE, { status: 503 })
  }

  try {
    const supabase = getSupabaseAdminClient()
    const today = new Date()

    const { data: overdueAccounts, error } = await supabase
      .from("billings")
      .select(`
        id,
        customer_id,
        amount,
        amount_paid,
        due_date,
        status,
        customers (
          id,
          customer_name,
          contact_number,
          account_number,
          is_active,
          archived_at
        )
      `)
      .in("status", ["unpaid", "partial", "overdue"])

    if (error) {
      console.error("Error fetching overdue accounts:", error)
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
    }

    const results = {
      processed: 0,
      sent: 0,
      errors: 0,
      details: [] as { account: string; type: string; status: string }[],
    }

    for (const account of (overdueAccounts || []) as BillingReminderRow[]) {
      const customer = Array.isArray(account.customers) ? account.customers[0] : account.customers
      if (!customer?.contact_number) {
        continue
      }

      const daysOverdue = differenceInDays(today, new Date(account.due_date))
      if (daysOverdue < 60) {
        continue
      }

      const balance = Math.max((account.amount || 0) - (account.amount_paid || 0), 0)
      if (balance <= 0) {
        continue
      }

      const messageType =
        daysOverdue >= 76 ? "76_day_final_warning" : "60_day_reminder"

      if (!customer.is_active) {
        results.details.push({
          account: customer.account_number,
          type: messageType,
          status: "skipped_inactive",
        })
        continue
      }

      if (customer.archived_at) {
        results.details.push({
          account: customer.account_number,
          type: messageType,
          status: "skipped_archived",
        })
        continue
      }

      const message =
        messageType === "76_day_final_warning"
          ? `J&J Water FINAL WARNING: Dear ${customer.customer_name}, your account ${customer.account_number} is ${daysOverdue} days overdue with a balance of ₱${balance.toLocaleString()}. Service disconnection is scheduled within 14 days. Please settle immediately. Contact: (123) 456-7890.`
          : `J&J Water Reminder: Dear ${customer.customer_name}, your water bill (Account: ${customer.account_number}) of ₱${balance.toLocaleString()} is ${daysOverdue} days overdue. Please settle your account to avoid service disconnection. Visit our office or contact us at (123) 456-7890.`

      const { data: existingLog, error: existingLogError } = await supabase
        .from("sms_logs")
        .select("id")
        .eq("billing_id", account.id)
        .eq("sms_type", messageType)
        .maybeSingle()

      if (existingLogError) {
        console.error("Error checking existing reminder log:", existingLogError)
        results.errors++
        results.details.push({
          account: customer.account_number,
          type: messageType,
          status: "lookup_error",
        })
        continue
      }

      if (existingLog) {
        results.details.push({
          account: customer.account_number,
          type: messageType,
          status: "already_sent",
        })
        continue
      }

      results.processed++

      try {
        const formattedPhone = formatPhoneNumber(customer.contact_number)
        const smsResult = await sendSMS(formattedPhone, message)

        const { error: insertError } = await supabase.from("sms_logs").insert({
          customer_id: customer.id,
          billing_id: account.id,
          phone_number: formattedPhone,
          message,
          sms_type: messageType,
          status: smsResult.success ? "sent" : "failed",
          twilio_sid: smsResult.success ? smsResult.sid : null,
          error_message: smsResult.success ? null : smsResult.error || "Failed to send SMS",
          sent_at: smsResult.success ? new Date().toISOString() : null,
        })

        if (insertError) {
          console.error("Error logging reminder SMS:", insertError)
          results.errors++
          results.details.push({
            account: customer.account_number,
            type: messageType,
            status: "log_failed",
          })
          continue
        }

        if (smsResult.success) {
          results.sent++
          results.details.push({
            account: customer.account_number,
            type: messageType,
            status: "sent",
          })
        } else {
          results.errors++
          results.details.push({
            account: customer.account_number,
            type: messageType,
            status: "failed",
          })
        }
      } catch (error) {
        results.errors++
        results.details.push({
          account: customer.account_number,
          type: messageType,
          status: "error",
        })
        console.error("Error sending reminder SMS:", error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} accounts, sent ${results.sent} SMS, ${results.errors} errors`,
      results,
    })
  } catch (error) {
    console.error("Cron SMS reminder error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process reminders" },
      { status: 500 }
    )
  }
}
