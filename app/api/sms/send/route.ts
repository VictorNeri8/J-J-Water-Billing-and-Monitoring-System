import { createClient } from "@/lib/supabase/server"
import { sendSMS, formatPhoneNumber } from "@/lib/sms"
import { SMS_DISABLED_RESPONSE, SMS_FEATURE_ENABLED } from "@/lib/config/features"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  /**
   * SMS IMPLEMENTATION TEMPORARILY DISABLED
   * Cutoff date: June 4, 2026
   *
   * To enable again:
   * 1. Set SMS_FEATURE_ENABLED=true
   * 2. Add Semaphore env variables
   * 3. Verify SMS endpoint behavior
   */
  if (!SMS_FEATURE_ENABLED) {
    return NextResponse.json(SMS_DISABLED_RESPONSE, { status: 503 })
  }

  try {
    const { phone, message, customerId, billingId } = await request.json()
    const trimmedPhone = typeof phone === "string" ? phone.trim() : ""
    const trimmedMessage = typeof message === "string" ? message.trim() : ""

    if (!customerId || !trimmedPhone || !trimmedMessage) {
      return NextResponse.json(
        { error: "Customer, phone, and message are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("is_active, archived_at")
      .eq("id", customerId)
      .maybeSingle()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer was not found." },
        { status: 400 }
      )
    }

    if (!customer.is_active) {
      return NextResponse.json(
        { error: "Inactive customers cannot receive SMS until set back to Active." },
        { status: 400 }
      )
    }

    if (customer.archived_at) {
      return NextResponse.json(
        { error: "Archived customers cannot receive SMS." },
        { status: 409 }
      )
    }

    let formattedPhone = ""
    try {
      formattedPhone = formatPhoneNumber(trimmedPhone)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid phone number" },
        { status: 400 }
      )
    }

    const result = await sendSMS(formattedPhone, trimmedMessage)

    // Log the SMS
    const { error: logError } = await supabase.from("sms_logs").insert({
      customer_id: customerId,
      billing_id: billingId || null,
      phone_number: formattedPhone,
      message: trimmedMessage,
      sms_type: "custom",
      status: result.success ? "sent" : "failed",
      twilio_sid: result.success ? result.sid : null,
      error_message: result.success ? null : result.error || "Failed to send SMS",
      sent_at: result.success ? new Date().toISOString() : null,
    })

    if (logError) {
      console.error("Error logging SMS:", logError)
      return NextResponse.json(
        { error: "SMS was processed but could not be logged." },
        { status: 500 }
      )
    }

    if (result.success) {
      return NextResponse.json({ success: true, sid: result.sid })
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to send SMS" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error sending SMS:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
