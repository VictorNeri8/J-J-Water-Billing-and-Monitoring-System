import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { recordAdminLoginDevice } from "@/lib/admin/login-devices"
import { ADMIN_OTP_CHALLENGE_COOKIE, normalizeAdminEmail } from "@/lib/admin/shared"
import {
  clearLoginAttempts,
  createLockoutResponse,
  createRemainingAttemptsResponse,
  getClientIp,
  getLoginLockout,
  recordFailedLoginAttempt,
} from "@/lib/admin/login-lockout"
import { sendAdminNewDeviceLoginEmail } from "@/lib/email/admin-otp"
import { createServiceRoleClient } from "@/lib/supabase/admin"

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
    const body = await request.json()
    const email = normalizeAdminEmail(String(body.email || ""))
    const otp = String(body.otp || "").replace(/\s+/g, "")
    const ipAddress = getClientIp(request)

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 })
    }

    const lockout = await getLoginLockout(email, ipAddress)
    if (lockout) {
      return NextResponse.json(createLockoutResponse(lockout), { status: 429 })
    }

    const cookieStore = await cookies()
    const sessionCookies: Array<{ name: string; value: string; options?: any }> = []
    const challenge = parseChallengeCookie(cookieStore.get(ADMIN_OTP_CHALLENGE_COOKIE)?.value)

    if (!challenge || challenge.email !== email || challenge.expiresAt < Date.now()) {
      return NextResponse.json({ error: "OTP challenge expired. Please sign in again." }, { status: 400 })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              sessionCookies.push({ name, value, options })
              cookieStore.set(name, value, options)
            })
          },
        },
      },
    )

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "magiclink",
    })

    if (verifyError || !verifyData.user) {
      const attemptResult = await recordFailedLoginAttempt(email, ipAddress)
      if ("lockedUntil" in attemptResult) {
        return NextResponse.json(createLockoutResponse(attemptResult), { status: 429 })
      }
      if (attemptResult.remainingAttempts <= 3) {
        return NextResponse.json(
          {
            error: `Invalid or expired OTP. ${createRemainingAttemptsResponse(attemptResult).error}`,
            remainingAttempts: attemptResult.remainingAttempts,
            failedAttempts: attemptResult.failedAttempts,
          },
          { status: 401 },
        )
      }
      return NextResponse.json({ error: "Invalid or expired OTP." }, { status: 401 })
    }

    const serviceRole = createServiceRoleClient()
    const { data: profile, error: profileError } = await serviceRole
      .from("admin_profiles")
      .select("id, email, role")
      .eq("email", email)
      .maybeSingle()

    if (profileError || !profile || profile.id !== verifyData.user.id) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: "Admin profile mismatch." }, { status: 403 })
    }

    await clearLoginAttempts(email, ipAddress)

    let newDeviceLoginAlertSent = false
    try {
      const loginDeviceResult = await recordAdminLoginDevice({
        adminUserId: profile.id,
        email,
        request,
      })

      if (loginDeviceResult.isNewDevice) {
        try {
          await sendAdminNewDeviceLoginEmail({
            email,
            details: loginDeviceResult.details,
            role: profile.role,
          })
          newDeviceLoginAlertSent = true
        } catch (error) {
          console.error("Admin new device login email send failed:", error)
        }
      }
    } catch (error) {
      console.error("Admin login device tracking failed:", error)
    }

    const response = NextResponse.json({
      role: profile.role,
      redirectTo: "/admin/dashboard",
      newDeviceLoginAlertSent,
    })

    sessionCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })

    response.cookies.set(ADMIN_OTP_CHALLENGE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error("Admin OTP verification failed:", error)
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
}
