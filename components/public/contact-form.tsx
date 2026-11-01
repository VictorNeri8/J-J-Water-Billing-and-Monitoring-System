"use client"

import Link from "next/link"
import Script from "next/script"
import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    turnstile?: {
      remove?: (widgetId: string) => void
      render: (
        container: HTMLElement,
        options: {
          callback?: (token: string) => void
          "error-callback"?: () => void
          "expired-callback"?: () => void
          sitekey: string
          theme?: "light" | "dark" | "auto"
        }
      ) => string
      reset?: (widgetId?: string) => void
    }
  }
}

type ContactFormState = {
  name: string
  email: string
  subject: string
  message: string
}

const INITIAL_STATE: ContactFormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
}

export function ContactForm() {
  const [form, setForm] = useState<ContactFormState>(INITIAL_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [turnstileLoaded, setTurnstileLoaded] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState("")
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null)
  const turnstileWidgetIdRef = useRef<string | null>(null)
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (
      !turnstileLoaded ||
      !turnstileSiteKey ||
      !turnstileContainerRef.current ||
      !window.turnstile ||
      turnstileWidgetIdRef.current
    ) {
      return
    }

    turnstileWidgetIdRef.current = window.turnstile.render(
      turnstileContainerRef.current,
      {
        sitekey: turnstileSiteKey,
        theme: "auto",
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      }
    )

    return () => {
      if (turnstileWidgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(turnstileWidgetIdRef.current)
      }

      turnstileWidgetIdRef.current = null
    }
  }, [turnstileLoaded, turnstileSiteKey])

  function updateField<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!turnstileSiteKey || !turnstileToken) {
      setResult({
        success: false,
        message: "Complete the security check before submitting.",
      })
      return
    }

    setIsSubmitting(true)
    setResult(null)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        setResult({
          success: false,
          message: data.error || "Failed to submit your message.",
        })
        return
      }

      setForm(INITIAL_STATE)
      setTurnstileToken("")
      window.turnstile?.reset?.(turnstileWidgetIdRef.current ?? undefined)
      setResult({
        success: true,
        message: "Your message has been sent. Our finance team will review it soon.",
      })
    } catch {
      setResult({
        success: false,
        message: "Something went wrong while sending your message.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setTurnstileLoaded(true)}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
            className="block h-12 w-full rounded-2xl border border-border/70 bg-background/70 px-4 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-cyan-400/70 focus:ring-4 focus:ring-cyan-400/10 dark:bg-slate-950/45"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            required
            className="block h-12 w-full rounded-2xl border border-border/70 bg-background/70 px-4 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-cyan-400/70 focus:ring-4 focus:ring-cyan-400/10 dark:bg-slate-950/45"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="subject" className="text-sm font-medium text-foreground">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          value={form.subject}
          onChange={(event) => updateField("subject", event.target.value)}
          required
          className="block h-12 w-full rounded-2xl border border-border/70 bg-background/70 px-4 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-cyan-400/70 focus:ring-4 focus:ring-cyan-400/10 dark:bg-slate-950/45"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className="text-sm font-medium text-foreground">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          value={form.message}
          onChange={(event) => updateField("message", event.target.value)}
          required
          className="block w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-cyan-400/70 focus:ring-4 focus:ring-cyan-400/10 dark:bg-slate-950/45"
        />
      </div>

      {turnstileSiteKey ? (
        <div className="space-y-2">
          <div ref={turnstileContainerRef} />
        </div>
      ) : (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Security verification is unavailable. Please try again later.
        </div>
      )}

      {result && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            result.success
              ? "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300"
              : "border-destructive/20 bg-destructive/10 text-destructive"
          }`}
        >
          {result.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-cyan-400 px-6 text-sm font-semibold text-slate-950 shadow-sm transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-70 md:shadow-[0_0_30px_rgba(34,211,238,0.25)] md:hover:shadow-[0_0_42px_rgba(34,211,238,0.42)] sm:w-auto"
      >
        {isSubmitting ? "Submitting..." : "Submit message"}
      </button>

      <p className="text-xs text-muted-foreground">
        By submitting this form, you agree to our{" "}
        <Link href="/terms" className="font-semibold text-cyan-700 underline-offset-4 hover:underline dark:text-cyan-200">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-semibold text-cyan-700 underline-offset-4 hover:underline dark:text-cyan-200">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  )
}
