"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2, Clock, Droplets, Shield, Sparkles, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePublicMotionPolicy } from "@/hooks/use-public-motion-policy"

const trustIndicators = [
  "Transparent monthly billing",
  "Responsive local support",
  "Quality-tested distribution",
]

const stats = [
  {
    label: "Households served",
    value: "12,000+",
    icon: Users,
    className: "lg:-left-6 lg:top-16",
  },
  {
    label: "Years of service",
    value: "25+",
    icon: Clock,
    className: "lg:-right-4 lg:top-36",
  },
  {
    label: "Service reliability",
    value: "99.9%",
    icon: Shield,
    className: "lg:left-10 lg:bottom-8",
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
}

export function HeroSection() {
  const { allowDesktopMotion, allowDesktopOnlyMotion } = usePublicMotionPolicy()

  return (
    <section className="relative isolate overflow-hidden bg-background py-24 sm:py-28 lg:py-32">
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
        <svg
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-36 w-full text-cyan-500/15 dark:text-cyan-300/10"
          preserveAspectRatio="none"
          viewBox="0 0 1440 220"
        >
          <path
            d="M0 124C124 92 220 92 348 122C486 154 622 176 760 144C896 112 978 56 1118 72C1240 86 1348 142 1440 132V220H0V124Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:px-8 min-[1025px]:grid-cols-[1.04fr_0.96fr]">
        <motion.div
          initial={allowDesktopOnlyMotion ? "hidden" : false}
          animate={allowDesktopOnlyMotion ? "visible" : undefined}
          data-desktop-motion-static="true"
          transition={{ staggerChildren: 0.1, delayChildren: 0.08 }}
          className="mx-auto max-w-4xl text-center min-[1025px]:mx-0 min-[1025px]:text-left"
        >
          <motion.div
            variants={fadeUp}
            data-mobile-static="true"
            data-desktop-motion-static="true"
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-700 shadow-sm backdrop-blur-none md:shadow-[0_0_30px_rgba(34,211,238,0.16)] md:backdrop-blur dark:text-cyan-200 min-[1025px]:mx-0"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Trusted local water distribution
          </motion.div>

          <motion.h1
            variants={fadeUp}
            data-mobile-static="true"
            data-desktop-motion-static="true"
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mt-8 max-w-5xl text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-[5.6rem] lg:leading-[0.98]"
          >
            Reliable Water Service for Modern Communities
          </motion.h1>

          <motion.p
            variants={fadeUp}
            data-mobile-static="true"
            data-desktop-motion-static="true"
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl min-[1025px]:mx-0"
          >
            Clean water, clear billing, and responsive support from a community utility built for everyday confidence.
          </motion.p>

          <motion.div
            variants={fadeUp}
            data-mobile-static="true"
            data-desktop-motion-static="true"
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row min-[1025px]:justify-start"
          >
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-full bg-cyan-400 px-7 text-base font-semibold text-slate-950 shadow-md hover:bg-cyan-300 md:shadow-[0_0_34px_rgba(34,211,238,0.35)] md:hover:shadow-[0_0_48px_rgba(34,211,238,0.5)] sm:w-auto"
            >
              <Link href="/customer-bill">
                Check Bill
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 w-full rounded-full border-cyan-500/30 bg-background/80 px-7 text-base font-semibold text-foreground shadow-sm backdrop-blur-none hover:border-cyan-400/60 hover:bg-cyan-400/10 md:bg-background/60 md:backdrop-blur sm:w-auto"
            >
              <Link href="/contact">Start service request</Link>
            </Button>
          </motion.div>

          <motion.ul
            variants={fadeUp}
            data-mobile-static="true"
            data-desktop-motion-static="true"
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap min-[1025px]:justify-start"
          >
            {trustIndicators.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-500 dark:text-cyan-300" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          initial={allowDesktopMotion ? { opacity: 0, y: 24 } : false}
          animate={{ opacity: 1, y: 0 }}
          data-mobile-static="true"
          transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
          className="relative mx-auto hidden w-full max-w-[35rem] min-[1025px]:block"
        >
          <motion.div
            animate={allowDesktopMotion ? { y: [0, -8, 0] } : undefined}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-card p-4 shadow-md md:bg-card/70 md:shadow-2xl md:shadow-cyan-950/10 md:backdrop-blur-xl dark:bg-slate-950 dark:md:bg-slate-950/55 dark:md:shadow-cyan-950/35"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.14),transparent_42%)]" />
            <div className="relative rounded-[1.45rem] border border-border/70 bg-background/80 p-5 dark:bg-slate-950/70">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Distribution health</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">Live operations</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.38)]">
                  <Droplets className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-8 grid gap-3">
                {["Pressure stability", "Billing sync", "Emergency queue"].map((label, index) => (
                  <div key={label} className="rounded-2xl border border-border/70 bg-muted/40 p-4 dark:bg-white/[0.03]">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{label}</span>
                      <span className="text-cyan-700 dark:text-cyan-200">{index === 2 ? "Ready" : "Optimal"}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted dark:bg-white/10">
                      <div className="h-full" style={{ width: index === 2 ? "74%" : "92%" }}>
                        <motion.div
                          className="h-full origin-left rounded-full bg-gradient-to-r from-cyan-400 to-teal-300"
                          initial={allowDesktopMotion ? { scaleX: 0.25 } : false}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.7, delay: 0.25 + index * 0.08, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={allowDesktopMotion ? { opacity: 0, y: 18 } : false}
              animate={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
              data-mobile-static="true"
              transition={{ duration: 0.4, delay: 0.35 + index * 0.08, ease: "easeOut" }}
              className={`mt-4 flex items-center gap-3 rounded-2xl border border-cyan-500/20 bg-card p-4 shadow-sm md:bg-card/85 md:shadow-xl md:shadow-cyan-950/10 md:backdrop-blur-xl dark:bg-slate-950 dark:md:bg-slate-950/70 lg:absolute lg:mt-0 ${stat.className}`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-700 dark:text-cyan-200">
                <stat.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xl font-semibold text-foreground">{stat.value}</p>
                <p className="whitespace-nowrap text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
