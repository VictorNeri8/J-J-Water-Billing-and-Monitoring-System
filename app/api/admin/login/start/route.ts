import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  ADMIN_OTP_CHALLENGE_COOKIE,
  ADMIN_OTP_RESEND_COOLDOWN_SECONDS,
  ADMIN_OTP_TTL_SECONDS,
  normalizeAdminEmail,
} from "@/lib/admin/shared"
import {
  clearLoginAttempts,
  createLockoutResponse,
  createRemainingAttemptsResponse,
  getClientIp,
  getLoginLockout,
  recordFailedLoginAttempt,
} from "@/lib/admin/login-lockout"
import { sendAdminOtpEmail } from "@/lib/email/admin-otp"
import { createAdminAuthClient, createServiceRoleClient } from "@/lib/supabase/admin"

function parseChallengeCookie(rawValue: string | undefined) {
  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(rawValue, "base64url").toString("utf8")) as {
      email: string
      expiresAt: number
      resendAvailableAt: number
    }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const body = await request.json()
    const email = normalizeAdminEmail(String(body.email || ""))
    const password = String(body.password || "")
    const forceResend = body.forceResend === true
    const ipAddress = getClientIp(request)

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
    }

    const lockout = await getLoginLockout(email, ipAddress)
    if (lockout) {
      return NextResponse.json(createLockoutResponse(lockout), { status: 429 })
    }

    const serviceRole = createServiceRoleClient()
    const { data: profile, error: profileError } = await serviceRole
      .from("admin_profiles")
      .select("email, role")
      .eq("email", email)
      .maybeSingle()

    if (profileError) {
      console.error("Admin profile lookup failed:", profileError)
      return NextResponse.json({ error: "Unable to start login." }, { status: 500 })
    }

    if (!profile) {
      const attemptResult = await recordFailedLoginAttempt(email, ipAddress)
      if ("lockedUntil" in attemptResult) {
        return NextResponse.json(createLockoutResponse(attemptResult), { status: 429 })
      }
      if (attemptResult.remainingAttempts <= 3) {
        return NextResponse.json(
          {
            error: `Unauthorized email. ${createRemainingAttemptsResponse(attemptResult).error}`,
            remainingAttempts: attemptResult.remainingAttempts,
            failedAttempts: attemptResult.failedAttempts,
          },
          { status: 401 },
        )
      }
      return NextResponse.json({ error: "Unauthorized email" }, { status: 401 })
    }

    const authClient = createAdminAuthClient()
    const { data: signInData, error: passwordError } = await authClient.auth.signInWithPassword({
      email,
      password,
    })

    if (passwordError || !signInData.user) {
      const attemptResult = await recordFailedLoginAttempt(email, ipAddress)
      if ("lockedUntil" in attemptResult) {
        return NextResponse.json(createLockoutResponse(attemptResult), { status: 429 })
      }
      if (attemptResult.remainingAttempts <= 3) {
        return NextResponse.json(
          {
            error: `Invalid email or password. ${createRemainingAttemptsResponse(attemptResult).error}`,
            remainingAttempts: attemptResult.remainingAttempts,
            failedAttempts: attemptResult.failedAttempts,
          },
          { status: 401 },
        )
      }
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
    }

    await authClient.auth.signOut()

    const currentChallenge = parseChallengeCookie(
      cookieStore.get(ADMIN_OTP_CHALLENGE_COOKIE)?.value,
    )

    const now = Date.now()
    if (
      !forceResend &&
      currentChallenge &&
      currentChallenge.email === email &&
      currentChallenge.expiresAt > now
    ) {
      return NextResponse.json({
        challenge: currentChallenge,
        reused: true,
      })
    }

    if (
      forceResend &&
      currentChallenge &&
      currentChallenge.email === email &&
      currentChallenge.resendAvailableAt > now
    ) {
      return NextResponse.json(
        {
          error: "Please wait before requesting another code.",
          challenge: currentChallenge,
        },
        { status: 429 },
      )
    }

    const { data: linkData, error: otpError } = await serviceRole.auth.admin.generateLink({
      type: "magiclink",
      email,
    })

    if (otpError || !linkData.properties.email_otp) {
      console.error("OTP generation failed:", otpError)
      return NextResponse.json(
        { error: otpError?.message || "Unable to generate OTP." },
        { status: otpError?.status || 500 },
      )
    }

    try {
      await sendAdminOtpEmail({
        email,
        otp: linkData.properties.email_otp,
        role: profile.role,
      })
    } catch {
      console.error("OTP email send failed.")
      return NextResponse.json({ error: "Unable to send OTP." }, { status: 500 })
    }

    const expiresAt = now + ADMIN_OTP_TTL_SECONDS * 1000
    const resendAvailableAt = now + ADMIN_OTP_RESEND_COOLDOWN_SECONDS * 1000
    const response = NextResponse.json({
      challenge: {
        email,
        expiresAt,
        resendAvailableAt,
      },
      reused: false,
    })

    response.cookies.set(
      ADMIN_OTP_CHALLENGE_COOKIE,
      Buffer.from(JSON.stringify({ email, expiresAt, resendAvailableAt }), "utf8").toString("base64url"),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: ADMIN_OTP_TTL_SECONDS,
      },
    )

    return response
  } catch (error) {
    console.error("Admin login start failed:", error)
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
}
