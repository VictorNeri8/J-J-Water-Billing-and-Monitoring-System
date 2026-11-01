"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Clock, MapPin, MessageCircle, Phone, ShieldCheck, Zap } from "lucide-react"
import { ContactForm } from "@/components/public/contact-form"
import { usePublicMotionPolicy } from "@/hooks/use-public-motion-policy"

const contactChannels = [
  { label: "Phone", value: "+63 929 532 3005", detail: "Best for leaks or urgent service interruptions", icon: Phone },
  { label: "Office", value: "J&J Building, Tagaytay, Calero, Liloan, Cebu. Philippines.", detail: "Customer service and account support", icon: MapPin },
  { label: "Office hours", value: "Monday - Saturday, 8:00 AM - 5:00 PM", detail: "Emergency concerns should be called in directly", icon: Clock },
]

const supportCards = [
  { label: "Emergency routing", value: "Direct phone support", icon: Zap },
  { label: "Account privacy", value: "Verified customer details", icon: ShieldCheck },
]

const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
}

const heroItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

export default function ContactPage() {
  const { allowDesktopMotion, allowDesktopOnlyMotion } = usePublicMotionPolicy()

  return (
    <div className="relative overflow-hidden bg-background">
      <section className="relative isolate overflow-hidden px-4 py-24 sm:py-32 lg:px-8">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            aria-hidden="true"
            className="public-desktop-decoration absolute left-1/2 top-[-18rem] hidden h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl md:block dark:bg-cyan-400/15"
            animate={allowDesktopMotion ? { scale: [1, 1.08, 1], opacity: [0.42, 0.62, 0.42] } : undefined}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden="true"
            className="public-desktop-decoration absolute right-[-12rem] top-32 hidden h-[34rem] w-[34rem] rounded-full bg-teal-400/20 blur-3xl md:block dark:bg-teal-400/15"
            animate={allowDesktopMotion ? { x: [0, -18, 0], y: [0, 12, 0] } : undefined}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(circle_at_50%_25%,black,transparent_70%)]"
          />
        </div>

        <motion.div
          variants={heroContainer}
          initial={allowDesktopOnlyMotion ? "hidden" : false}
          animate={allowDesktopOnlyMotion ? "visible" : undefined}
          data-mobile-static="true"
          data-desktop-motion-static="true"
          className="mx-auto max-w-6xl text-center"
        >
          <motion.div variants={heroItem} data-desktop-motion-static="true" transition={{ duration: 0.5, ease: "easeOut" }} className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-200">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Customer service desk
          </motion.div>
          <motion.h1 variants={heroItem} data-desktop-motion-static="true" transition={{ duration: 0.55, ease: "easeOut" }} className="mx-auto mt-8 max-w-5xl text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-[5rem] lg:leading-none">
            Reach the right water service team faster.
          </motion.h1>
          <motion.p variants={heroItem} data-desktop-motion-static="true" transition={{ duration: 0.55, ease: "easeOut" }} className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Questions about billing, service setup, or urgent supply concerns are routed through a simple support experience built for clarity.
          </motion.p>
        </motion.div>
      </section>

      <section className="px-4 pb-24 sm:pb-32 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <motion.div
            initial={allowDesktopMotion ? { opacity: 0, x: -18 } : false}
            animate={allowDesktopMotion ? { opacity: 1, x: 0 } : undefined}
            data-mobile-static="true"
            transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
            className="space-y-5"
          >
            <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm backdrop-blur-none md:bg-card/85 md:shadow-xl md:shadow-cyan-950/5 md:backdrop-blur-xl dark:bg-slate-950 dark:md:bg-white/[0.045] sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Get in touch</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                For emergencies such as leaks or service interruptions, call directly. For account support, include your account number in the message.
              </p>

              <div className="mt-8 grid gap-4">
                {contactChannels.map((channel) => (
                  <div key={channel.label} className="group rounded-2xl border border-border/70 bg-background/70 p-4 transition-colors hover:border-cyan-400/45 dark:bg-slate-950/45">
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-700 dark:text-cyan-200">
                        <channel.icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{channel.label}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{channel.value}</p>
                        <p className="mt-2 text-xs text-cyan-700 dark:text-cyan-200">{channel.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {supportCards.map((card) => (
                <div key={card.label} className="rounded-3xl border border-border/70 bg-card p-5 backdrop-blur-none md:bg-card/75 md:backdrop-blur-xl dark:bg-slate-950 dark:md:bg-white/[0.035]">
                  <card.icon className="h-5 w-5 text-cyan-700 dark:text-cyan-200" aria-hidden="true" />
                  <p className="mt-4 text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{card.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={allowDesktopMotion ? { opacity: 0, y: 20 } : false}
            animate={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
            data-mobile-static="true"
            transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
            className="order-first relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-card p-6 shadow-md backdrop-blur-none md:bg-card/90 md:shadow-2xl md:shadow-cyan-950/10 md:backdrop-blur-xl dark:bg-slate-950 dark:md:bg-white/[0.055] sm:p-8 lg:order-none"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_38%)]" />
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.35)]">
                  <MessageCircle className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Send us a message</h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    Our team will review your inquiry and respond through the contact details you provide.
                  </p>
                </div>
              </div>

              <ContactForm />

              <div className="mt-6 rounded-2xl border border-border/70 bg-background/70 p-4 text-xs leading-6 text-muted-foreground dark:bg-slate-950/45">
                Prefer SMS updates about billing and service? Once your account is set up, SMS notifications can be enabled in your customer profile.
                <span className="mt-3 block">
                  Looking for the admin portal?{" "}
                  <Link href="/admin/login" className="font-semibold text-cyan-700 underline-offset-4 hover:underline dark:text-cyan-200">
                    Go to admin login
                  </Link>
                  .
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
