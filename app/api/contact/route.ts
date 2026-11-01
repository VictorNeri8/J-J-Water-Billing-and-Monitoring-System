import { checkAndRecordContactRateLimit } from "@/lib/contact/rate-limit"
import {
  containsSuspiciousInput,
  getClientIp,
  logSecurityEvent,
  validateContactSubmission,
} from "@/lib/contact/security"
import { verifyTurnstileToken } from "@/lib/contact/turnstile"
import { sendContactNotificationEmail } from "@/lib/email/contact-notification"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const ip = getClientIp(request.headers)
    const turnstileToken =
      typeof body.turnstileToken === "string" ? body.turnstileToken.trim() : ""
    const validationResult = validateContactSubmission(body)

    if (!validationResult.success) {
      logSecurityEvent({
        event: "validation_failed",
        ip,
        email: typeof body?.email === "string" ? body.email : undefined,
        reason: validationResult.error.issues.map((issue) => issue.message).join("; "),
      })

      return NextResponse.json(
        { error: "Invalid contact form submission." },
        { status: 400 }
      )
    }

    const submission = validationResult.data

    if (containsSuspiciousInput(submission)) {
      logSecurityEvent({
        event: "validation_failed",
        ip,
        email: submission.email,
        reason: "Suspicious content detected.",
      })

      return NextResponse.json(
        { error: "Invalid contact form submission." },
        { status: 400 }
      )
    }

    const rateLimitResult = await checkAndRecordContactRateLimit({
      ip,
      email: submission.email,
    })

    if (!rateLimitResult.allowed) {
      logSecurityEvent({
        event: "rate_limited",
        ip,
        email: submission.email,
        reason: "Contact submission limit exceeded.",
      })

      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfterSeconds),
          },
        }
      )
    }

    if (!turnstileToken) {
      logSecurityEvent({
        event: "captcha_failed",
        ip,
        email: submission.email,
        reason: "Missing Turnstile token.",
      })

      return NextResponse.json(
        { error: "Security verification failed." },
        { status: 400 }
      )
    }

    const turnstileResult = await verifyTurnstileToken({
      token: turnstileToken,
      ip,
    })

    if (!turnstileResult.success) {
      logSecurityEvent({
        event: "captcha_failed",
        ip,
        email: submission.email,
        reason: turnstileResult.errorCodes.join(", ") || "Turnstile verification failed.",
      })

      return NextResponse.json(
        { error: "Security verification failed." },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase.from("contact_submissions").insert({
      name: submission.name,
      email: submission.email,
      subject: submission.subject,
      message: submission.message,
    })

    if (error) {
      console.error("Error saving contact submission:", error)
      return NextResponse.json(
        { error: "Failed to save submission" },
        { status: 500 }
      )
    }

    try {
      await sendContactNotificationEmail(submission)
    } catch (emailError) {
      console.error("Error sending contact notification email:", emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing contact form:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
