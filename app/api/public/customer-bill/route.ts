import { getClientIp, logSecurityEvent } from "@/lib/contact/security"
import { verifyTurnstileToken } from "@/lib/contact/turnstile"
import { checkAndRecordPublicBillRateLimit } from "@/lib/public-bill/rate-limit"
import {
  containsSuspiciousPublicBillInput,
  isNameMatch,
  validatePublicBillInquiry,
} from "@/lib/public-bill/security"
import { isOpenBillingStatus, isOverdueAccount } from "@/lib/overdue-accounts"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import type { BillingStatus, PaymentMethod } from "@/lib/types"
import { NextRequest, NextResponse } from "next/server"

type CustomerRow = {
  account_number: string
  address: string | null
  contact_number: string | null
  customer_name: string
  id: string
  meter_id: string | null
}

type BillingRow = {
  amount: number | string | null
  amount_paid: number | string | null
  billing_date: string
  due_date: string
  paid_date: string | null
  payment_method: PaymentMethod | null
  status: BillingStatus
  usage_cubic: number | string | null
  meter_readings: Array<{
    current_reading: number | string | null
  }> | {
    current_reading: number | string | null
  } | null
}

const CUSTOMER_VERIFICATION_ERROR = "Unable to verify customer information."

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function getTodayDateOnly() {
  return new Date().toISOString().split("T")[0]
}

function getAccountOverdueReason(summary: {
  openBillsCount: number
}) {
  if (isOverdueAccount(summary.openBillsCount)) {
    return "3 or more open bills"
  }

  return null
}

function maskContactNumber(contactNumber: string | null) {
  if (!contactNumber) {
    return null
  }

  const trimmed = contactNumber.trim()
  const digits = trimmed.replace(/\D/g, "")

  if (digits.length >= 4) {
    return `**** ${digits.slice(-4)}`
  }

  if (trimmed.length <= 2) {
    return "**"
  }

  return `${"*".repeat(Math.max(trimmed.length - 2, 0))}${trimmed.slice(-2)}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const ip = getClientIp(request.headers)
    const validationResult = validatePublicBillInquiry(body)

    if (!validationResult.success) {
      const hasNameError = validationResult.error.issues.some((issue) =>
        issue.path.includes("name"),
      )

      logSecurityEvent({
        event: "validation_failed",
        ip,
        reason: validationResult.error.issues.map((issue) => issue.message).join("; "),
      })

      return NextResponse.json(
        { error: hasNameError ? "Please enter a valid name." : "Please enter a valid account number." },
        { status: 400 },
      )
    }

    const submission = validationResult.data

    if (containsSuspiciousPublicBillInput(submission)) {
      logSecurityEvent({
        event: "validation_failed",
        ip,
        reason: "Suspicious public bill inquiry content detected.",
      })

      return NextResponse.json(
        { error: "Please enter a valid name." },
        { status: 400 },
      )
    }

    const rateLimitResult = await checkAndRecordPublicBillRateLimit(ip)

    if (!rateLimitResult.allowed) {
      logSecurityEvent({
        event: "rate_limited",
        ip,
        reason: "Public bill inquiry limit exceeded.",
      })

      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfterSeconds),
          },
        },
      )
    }

    if (!submission.turnstileToken) {
      logSecurityEvent({
        event: "captcha_failed",
        ip,
        reason: "Missing Turnstile token for public bill inquiry.",
      })

      return NextResponse.json(
        { error: "Security verification failed." },
        { status: 400 },
      )
    }

    const turnstileResult = await verifyTurnstileToken({
      token: submission.turnstileToken,
      ip,
    })

    if (!turnstileResult.success) {
      logSecurityEvent({
        event: "captcha_failed",
        ip,
        reason: turnstileResult.errorCodes.join(", ") || "Turnstile verification failed.",
      })

      return NextResponse.json(
        { error: "Security verification failed." },
        { status: 400 },
      )
    }

    const accountNumber = submission.accountNumber
    const supabase = createServiceRoleClient()
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("id, account_number, meter_id, customer_name, address, contact_number")
      .eq("account_number", accountNumber)
      .maybeSingle()

    if (customerError) {
      console.error("Public customer bill lookup failed:", customerError)
      return NextResponse.json(
        { error: "Unable to fetch billing records. Please try again later." },
        { status: 500 },
      )
    }

    if (!customerData) {
      logSecurityEvent({
        event: "validation_failed",
        ip,
        reason: "Public bill customer verification failed.",
      })

      return NextResponse.json(
        { error: CUSTOMER_VERIFICATION_ERROR },
        { status: 403 },
      )
    }

    const customer = customerData as CustomerRow

    if (!isNameMatch(submission.name, customer.customer_name)) {
      logSecurityEvent({
        event: "validation_failed",
        ip,
        reason: "Public bill customer verification failed.",
      })

      return NextResponse.json(
        { error: CUSTOMER_VERIFICATION_ERROR },
        { status: 403 },
      )
    }

    const { data: billingData, error: billingError } = await supabase
      .from("billings")
      .select(`
        billing_date,
        due_date,
        usage_cubic,
        amount,
        amount_paid,
        status,
        payment_method,
        paid_date,
        meter_readings (
          current_reading
        )
      `)
      .eq("customer_id", customer.id)
      .order("billing_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (billingError) {
      console.error("Public customer billing records lookup failed:", billingError)
      return NextResponse.json(
        { error: "Unable to fetch billing records. Please try again later." },
        { status: 500 },
      )
    }

    const today = getTodayDateOnly()
    const billings = ((billingData || []) as BillingRow[]).map((billing) => {
      const meterReading = Array.isArray(billing.meter_readings)
        ? billing.meter_readings[0]
        : billing.meter_readings
      const amount = toNumber(billing.amount)
      const amountPaid = toNumber(billing.amount_paid)
      const remainingBalance = Math.max(amount - amountPaid, 0)

      return {
        billingDate: billing.billing_date,
        dueDate: billing.due_date,
        currentReading: toNumber(meterReading?.current_reading),
        usageCubic: toNumber(billing.usage_cubic),
        amount,
        amountPaid,
        remainingBalance,
        status: billing.status,
        paymentMethod: billing.payment_method,
        paidDate: billing.paid_date,
      }
    })

    const summary = billings.reduce(
      (acc, billing) => {
        acc.totalBilled += billing.amount
        acc.totalPaid += billing.amountPaid
        acc.totalRemaining += billing.remainingBalance
        acc.totalConsumption += billing.usageCubic

        if (isOpenBillingStatus(billing.status)) {
          acc.openBillsCount += 1

          if (
            !acc.oldestUnpaidBillingDate ||
            billing.billingDate < acc.oldestUnpaidBillingDate
          ) {
            acc.oldestUnpaidBillingDate = billing.billingDate
          }
        }

        if (isOpenBillingStatus(billing.status) && billing.dueDate < today) {
          acc.overdueBillsCount += 1
        }

        return acc
      },
      {
        totalBilled: 0,
        totalPaid: 0,
        totalRemaining: 0,
        totalConsumption: 0,
        openBillsCount: 0,
        overdueBillsCount: 0,
        oldestUnpaidBillingDate: null as string | null,
      },
    )

    const overdueReason = getAccountOverdueReason(summary)

    return NextResponse.json({
      customer: {
        accountNumber: customer.account_number,
        meterId: customer.meter_id,
        customerName: customer.customer_name,
        address: customer.address,
        contactNumberMasked: maskContactNumber(customer.contact_number),
      },
      summary: {
        ...summary,
        accountStatus: overdueReason ? "Overdue" : "Not Overdue",
        overdueReason,
      },
      billings,
    })
  } catch (error) {
    console.error("Public customer bill request failed:", error)
    return NextResponse.json(
      { error: "Unable to fetch billing records. Please try again later." },
      { status: 500 },
    )
  }
}
