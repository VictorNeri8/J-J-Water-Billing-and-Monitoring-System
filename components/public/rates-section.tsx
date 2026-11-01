"use client"

import { motion } from "framer-motion"
import { Check, CreditCard, Gauge, ShieldCheck, Sparkles } from "lucide-react"
import { usePublicMotionPolicy } from "@/hooks/use-public-motion-policy"

const ratePlans = [
  {
    name: "Residential",
    description: "For daily household water use with simple monthly billing.",
    price: "₱350",
    metric: "first 10 cubic meters",
    accent: "from-cyan-400 to-teal-300",
    features: [
      "First 10 cubic meters included",
      "₱40 per cubic meter thereafter",
      "Monthly billing cycle",
      "60-day grace period",
    ],
  },
  {
    name: "Commercial",
    description: "For business establishments that need responsive account support.",
    price: "₱550",
    metric: "first 15 cubic meters",
    accent: "from-teal-300 to-emerald-300",
    featured: true,
    features: [
      "First 15 cubic meters included",
      "₱40 per cubic meter thereafter",
      "Priority support",
      "Dedicated account assistance",
    ],
  },
]

const terms = [
  { label: "Due window", value: "15 days", icon: CreditCard },
  { label: "Reminder", value: "60 days", icon: Gauge },
  { label: "Final warning", value: "76 days", icon: Sparkles },
  { label: "Disconnection review", value: "90 days", icon: ShieldCheck },
]

export function RatesSection() {
  const { allowDesktopMotion } = usePublicMotionPolicy()

  return (
    <section id="rates" className="relative scroll-mt-24 overflow-hidden bg-background py-24 sm:py-32">
      <div className="absolute inset-0 -z-10">
        <div className="public-desktop-decoration absolute left-[-12rem] top-20 hidden h-[32rem] w-[32rem] rounded-full bg-cyan-400/10 blur-3xl md:block dark:bg-cyan-400/12" />
        <div className="public-desktop-decoration absolute right-[-14rem] bottom-0 hidden h-[30rem] w-[30rem] rounded-full bg-teal-400/10 blur-3xl md:block dark:bg-teal-400/12" />
        <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(circle_at_50%_38%,black,transparent_72%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          initial={allowDesktopMotion ? { opacity: 0, y: 18 } : false}
          whileInView={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
          data-mobile-static="true"
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-200">
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            Transparent water rates
          </div>
          <h2 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Pricing that feels clear before the bill arrives.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Straightforward base rates, predictable usage charges, and payment terms designed for responsible account management.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-6 lg:grid-cols-[1fr_1fr]">
          {ratePlans.map((plan, index) => (
            <motion.article
              key={plan.name}
              initial={allowDesktopMotion ? { opacity: 0, y: 20 } : false}
              whileInView={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
              data-mobile-static="true"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
              whileHover={allowDesktopMotion ? { y: -5 } : undefined}
              className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-sm transition-colors hover:border-cyan-400/45 md:bg-card/85 md:shadow-xl md:shadow-cyan-950/5 md:backdrop-blur-xl dark:bg-slate-950 dark:md:bg-white/[0.045] sm:p-8"
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${plan.accent}`} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_35%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              {plan.featured && (
                <div className="absolute right-5 top-5 rounded-full border border-teal-300/30 bg-teal-300/12 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-100">
                  Business-ready
                </div>
              )}

              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/12 text-cyan-700 dark:text-cyan-200">
                  <Gauge className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="mt-7 text-2xl font-semibold tracking-tight text-foreground">{plan.name} Rate</h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">{plan.description}</p>

                <div className="mt-8 rounded-2xl border border-border/70 bg-background/70 p-5 dark:bg-slate-950/45">
                  <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                    <span className="text-5xl font-semibold tracking-tight text-foreground">{plan.price}</span>
                    <span className="pb-1 text-sm font-medium text-muted-foreground">/ month</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Base rate for {plan.metric}</p>
                </div>

                <div className="mt-7 grid gap-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 rounded-2xl bg-muted/45 p-3 text-sm text-foreground dark:bg-white/[0.035]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-300" aria-hidden="true" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={allowDesktopMotion ? { opacity: 0, y: 16 } : false}
          whileInView={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
          data-mobile-static="true"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mx-auto mt-8 grid max-w-6xl grid-flow-dense gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {terms.map((term) => (
            <div key={term.label} className="rounded-2xl border border-border/70 bg-card p-5 backdrop-blur-none md:bg-card/70 md:backdrop-blur-xl dark:bg-slate-950 dark:md:bg-white/[0.035]">
              <term.icon className="h-5 w-5 text-cyan-700 dark:text-cyan-200" aria-hidden="true" />
              <p className="mt-4 text-sm text-muted-foreground">{term.label}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{term.value}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
