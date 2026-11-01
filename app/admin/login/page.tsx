"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, BarChart3, CheckCircle2, Droplets, Eye, EyeOff, Gauge, LockKeyhole, Mail, ShieldCheck, Waves } from "lucide-react"
import {
  ADMIN_LOGIN_LOCKOUT_COOLDOWN_SECONDS,
  ADMIN_OTP_RESEND_COOLDOWN_SECONDS,
  normalizeAdminEmail,
} from "@/lib/admin/shared"

type LoginResponse = {
  challenge?: {
    email: string
    expiresAt: number
    resendAvailableAt?: number
  }
  error?: string
  failedAttempts?: number
  lockedUntil?: string
  remainingAttempts?: number
  retryAfterSeconds?: number
}

async function readLoginResponse(response: Response): Promise<LoginResponse> {
  const contentType = response.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    const endpointMessage =
      response.status === 404
        ? "The login API is unavailable. Restart the application server and try again."
        : "The application server returned an invalid login response."
    throw new Error(`${endpointMessage} (HTTP ${response.status})`)
  }

  return response.json() as Promise<LoginResponse>
}

export default function AdminLoginPage() {
  const [step, setStep] = useState<"credentials" | "otp">("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null)
  const [timeUntilResend, setTimeUntilResend] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [timeUntilUnlock, setTimeUntilUnlock] = useState(0)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    let isMounted = true

    async function checkExistingAdminSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        if (isMounted) {
          setIsCheckingSession(false)
        }
        return
      }

      const { data: profile } = await supabase
        .from("admin_profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()

      if (profile) {
        router.replace("/admin/dashboard")
        return
      }

      await supabase.auth.signOut()

      if (isMounted) {
        setIsCheckingSession(false)
      }
    }

    checkExistingAdminSession()

    return () => {
      isMounted = false
    }
  }, [router, supabase])

  useEffect(() => {
    if (!resendAvailableAt) {
      setTimeUntilResend(0)
      return
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000))
      setTimeUntilResend(remaining)
    }

    updateRemaining()
    const intervalId = window.setInterval(updateRemaining, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [resendAvailableAt])

  useEffect(() => {
    if (!lockedUntil) {
      setTimeUntilUnlock(0)
      return
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
      setTimeUntilUnlock(remaining)
      if (remaining === 0) {
        setLockedUntil(null)
      }
    }

    updateRemaining()
    const intervalId = window.setInterval(updateRemaining, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [lockedUntil])

  const isLocked = timeUntilUnlock > 0

  const applyLockoutState = (payload: { lockedUntil?: string; retryAfterSeconds?: number }) => {
    const nextLockedUntil = payload.lockedUntil
      ? new Date(payload.lockedUntil).getTime()
      : Date.now() + (payload.retryAfterSeconds ?? ADMIN_LOGIN_LOCKOUT_COOLDOWN_SECONDS) * 1000

    setLockedUntil(nextLockedUntil)
  }

  if (isCheckingSession) {
    return (
      <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-slate-950 p-6 text-white md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.18),transparent_36%),linear-gradient(135deg,#08111f,#111827_48%,#061b2b)]" />
        <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-sm text-cyan-100 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl">
          <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
          Checking session...
        </div>
      </div>
    )
  }

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/login/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizeAdminEmail(email),
          password,
        }),
      })

      const payload = await readLoginResponse(response)

      if (!response.ok) {
        if (payload.lockedUntil || payload.retryAfterSeconds) {
          applyLockoutState(payload)
        }
        throw new Error(payload.error || "Unable to start login.")
      }

      if (!payload.challenge) {
        throw new Error("The login API returned an incomplete response.")
      }

      setLockedUntil(null)
      setEmail(payload.challenge.email)
      setResendAvailableAt(payload.challenge.resendAvailableAt ?? Date.now() + ADMIN_OTP_RESEND_COOLDOWN_SECONDS * 1000)
      setStep("otp")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/login/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      })

      const payload = await readLoginResponse(response)

      if (!response.ok) {
        if (payload.lockedUntil || payload.retryAfterSeconds) {
          applyLockoutState(payload)
        }
        throw new Error(payload.error || "Unable to verify OTP.")
      }

      setLockedUntil(null)
      router.refresh()
      router.push("/admin/dashboard")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setIsResending(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/login/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          forceResend: true,
        }),
      })

      const payload = await readLoginResponse(response)

      if (!response.ok) {
        if (payload.lockedUntil || payload.retryAfterSeconds) {
          applyLockoutState(payload)
        }
        if (payload.challenge?.resendAvailableAt) {
          setResendAvailableAt(payload.challenge.resendAvailableAt)
        }
        throw new Error(payload.error || "Unable to resend OTP.")
      }

      if (!payload.challenge) {
        throw new Error("The login API returned an incomplete response.")
      }

      setLockedUntil(null)
      setResendAvailableAt(payload.challenge.resendAvailableAt ?? Date.now() + ADMIN_OTP_RESEND_COOLDOWN_SECONDS * 1000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-slate-950 p-4 text-white sm:p-6 lg:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_18%,rgba(34,211,238,0.20),transparent_30%),radial-gradient(circle_at_78%_70%,rgba(20,184,166,0.14),transparent_32%),linear-gradient(135deg,#070d1a,#111827_46%,#061b2b)]" />
      <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(to_right,rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(circle_at_50%_34%,black,transparent_72%)]" />

      <motion.section
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24, scale: 0.98 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative grid min-h-[min(760px,calc(100svh-2rem))] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-cyan-950/40 backdrop-blur-2xl lg:grid-cols-[1.18fr_0.82fr]"
      >
        <section className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_28%_18%,rgba(103,232,249,0.36),transparent_34%),linear-gradient(135deg,rgba(8,47,73,0.92),rgba(6,78,59,0.82)_50%,rgba(15,23,42,0.96))] p-8 lg:block">
          <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(circle_at_40%_30%,black,transparent_74%)]" />
          <motion.div
            aria-hidden="true"
            className="absolute -left-24 top-24 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl"
            animate={shouldReduceMotion ? undefined : { scale: [1, 1.12, 1], opacity: [0.45, 0.7, 0.45] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute right-[-8rem] top-10 h-96 w-96 rounded-full bg-teal-300/20 blur-3xl"
            animate={shouldReduceMotion ? undefined : { x: [0, -18, 0], y: [0, 20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <Link href="/" className="inline-flex w-fit items-center gap-3 text-white">
              <Image
                src="/jandj-logo.png"
                alt="J&J Water Distribution Services"
                width={52}
                height={52}
                className="h-12 w-12 rounded-2xl bg-white/95 object-contain p-1.5 shadow-lg shadow-cyan-950/25"
                priority
              />
              <span className="text-xl font-semibold leading-tight tracking-tight">
                J&J Water
                <span className="block text-xs font-medium text-cyan-100/80">Distribution Services</span>
              </span>
            </Link>

            <div className="absolute left-[38%] top-[18%] w-[34rem] max-w-[72%]">
              <motion.div
                animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="overflow-hidden rounded-[1.75rem] border border-white/18 bg-slate-950/42 shadow-2xl shadow-slate-950/45 backdrop-blur-2xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-300/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
                  </div>
                  <span className="text-xs font-medium text-cyan-100/75">Operations console</span>
                </div>
                <div className="grid grid-cols-[0.72fr_1.28fr]">
                  <div className="border-r border-white/10 bg-white/[0.06] p-4">
                    {["Meters", "Billing", "Customers", "Service"].map((item, index) => (
                      <div key={item} className={`mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${index === 1 ? "bg-cyan-300/18 text-cyan-50" : "text-cyan-100/65"}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-cyan-100/60">Water district health</p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">Admin overview</h2>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950">
                        <Droplets className="h-5 w-5" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {[
                        { label: "Collections", value: "92%" },
                        { label: "Meter sync", value: "Live" },
                        { label: "Open tickets", value: "18" },
                        { label: "Reminders", value: "Ready" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3">
                          <p className="text-[0.68rem] text-cyan-100/60">{item.label}</p>
                          <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 space-y-2">
                      {[86, 64, 78].map((width, index) => (
                        <div key={width} className="h-2 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-teal-200"
                            initial={{ width: "20%" }}
                            animate={{ width: `${width}%` }}
                            transition={{ duration: 0.9, delay: 0.4 + index * 0.12, ease: "easeOut" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="relative max-w-sm pb-8">
              <div className="mb-5 flex items-center gap-3 text-sm text-cyan-50/80">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10">
                  <Waves className="h-4 w-4" aria-hidden="true" />
                </span>
                Secure billing and distribution access
              </div>
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-white">
                Utility operations, protected behind verified access.
              </h1>
              <p className="mt-5 text-sm leading-7 text-cyan-50/70">
                Manage customer records, billing cycles, readings, and service requests from a focused admin workspace.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-background p-6 text-foreground sm:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <div className="mb-9 flex items-center justify-between gap-4">
              <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to site
              </Link>
              <div className="flex items-center gap-2 text-xs font-medium text-cyan-700 dark:text-cyan-200">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Secured portal
              </div>
            </div>

            <div className="mb-8 lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3">
                <Image
                  src="/jandj-logo.png"
                  alt="J&J Water Distribution Services"
                  width={48}
                  height={48}
                  className="h-11 w-11 object-contain"
                  priority
                />
                <span className="text-lg font-semibold leading-tight text-foreground">
                  J&J Water
                  <span className="block text-xs font-medium text-muted-foreground">Distribution Services</span>
                </span>
              </Link>
            </div>

            <div className="mb-8">
              <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-200">
                {step === "credentials" ? "Admin sign in" : "Two-step verification"}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {step === "credentials" ? "Welcome back." : "Check your email."}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {step === "credentials"
                  ? "Sign in with your approved admin email and password to continue."
                  : `Enter the 8-digit OTP sent to ${email}.`}
              </p>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-xl shadow-cyan-950/5 backdrop-blur-xl dark:bg-white/[0.035] sm:p-6">
              <form onSubmit={step === "credentials" ? handleCredentialSubmit : handleOtpSubmit}>
                <div className="flex flex-col gap-6">
                  {step === "credentials" ? (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="Email address"
                            autoComplete="email"
                            required
                            disabled={isLoading || isLocked}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-12 rounded-2xl border-border/70 bg-background/70 pl-10 focus-visible:ring-cyan-400/20 dark:bg-slate-950/45"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                          <Input
                            id="password"
                            type={isPasswordVisible ? "text" : "password"}
                            placeholder="Password"
                            autoComplete="current-password"
                            required
                            disabled={isLoading || isLocked}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-12 rounded-2xl border-border/70 bg-background/70 pl-10 pr-12 focus-visible:ring-cyan-400/20 dark:bg-slate-950/45"
                          />
                          <button
                            type="button"
                            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                            aria-pressed={isPasswordVisible}
                            disabled={isLoading || isLocked}
                            onPointerDown={(event) => {
                              event.preventDefault()
                              setIsPasswordVisible(true)
                            }}
                            onPointerUp={() => setIsPasswordVisible(false)}
                            onPointerCancel={() => setIsPasswordVisible(false)}
                            onMouseLeave={() => setIsPasswordVisible(false)}
                            onBlur={() => setIsPasswordVisible(false)}
                            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-cyan-400/10 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30 disabled:pointer-events-none disabled:opacity-50 dark:hover:text-cyan-200"
                          >
                            {isPasswordVisible ? (
                              <EyeOff className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid gap-2">
                      <Label htmlFor="otp" className="text-center">
                        One-Time Password
                      </Label>
                      <InputOTP
                        id="otp"
                        maxLength={8}
                        value={otp}
                        onChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, 8))}
                        pattern="^[0-9]+$"
                        inputMode="numeric"
                        containerClassName="justify-center overflow-hidden"
                        className="w-full"
                        autoFocus
                        required
                        disabled={isLoading || isLocked}
                      >
                        <InputOTPGroup className="mx-auto w-full max-w-[288px] justify-between gap-1 sm:max-w-[332px]">
                          {Array.from({ length: 8 }).map((_, index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className="h-10 w-8 rounded-xl border-border/70 bg-background/70 text-center text-sm font-semibold first:rounded-xl first:border last:rounded-xl dark:bg-slate-950/45 sm:h-11 sm:w-9 sm:text-base"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                      <p className="text-center text-xs text-muted-foreground">
                        Enter the 8-digit code from your email.
                      </p>
                      <div className="text-center text-xs text-muted-foreground">
                        {timeUntilResend > 0
                          ? `You can request a new code in ${timeUntilResend}s.`
                          : "Need another code?"}
                      </div>
                      {isLocked ? (
                        <div className="text-center text-xs text-destructive">
                          Login locked. Try again in {timeUntilUnlock}s.
                        </div>
                      ) : null}
                    </div>
                  )}
                  {error && (
                    <p className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <div className="flex flex-col gap-3">
                    <Button
                      type="submit"
                      className="h-12 w-full rounded-full bg-cyan-400 font-semibold text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.25)] hover:bg-cyan-300 hover:shadow-[0_0_42px_rgba(34,211,238,0.38)]"
                      disabled={isLoading || isLocked}
                    >
                      {isLoading
                        ? step === "credentials"
                          ? "Checking credentials..."
                          : "Verifying OTP..."
                        : step === "credentials"
                          ? "Continue"
                          : "Verify OTP"}
                    </Button>
                    {step === "otp" ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 w-full rounded-full border-border/70 bg-background/70"
                          disabled={isLoading || isResending || timeUntilResend > 0 || isLocked}
                          onClick={handleResendOtp}
                        >
                          {isResending ? "Sending..." : "Resend OTP"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 w-full rounded-full border-border/70 bg-background/70"
                          disabled={isLoading || isResending}
                          onClick={() => {
                            setOtp("")
                            setError(null)
                            setResendAvailableAt(null)
                            setStep("credentials")
                          }}
                        >
                          Back
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </form>

              <div className="mt-6 grid gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-700 dark:text-cyan-200" aria-hidden="true" />
                  OTP verification protects administrator access.
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-700 dark:text-cyan-200" aria-hidden="true" />
                  Authorized staff are redirected to the admin dashboard.
                </div>
              </div>
            </div>
          </div>
        </section>
      </motion.section>
    </main>
  )
}
