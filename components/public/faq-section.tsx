"use client"

import { motion } from "framer-motion"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { CircleHelp, CreditCard, Droplets, Plus, Wrench } from "lucide-react"
import { usePublicMotionPolicy } from "@/hooks/use-public-motion-policy"

const faqGroups = [
  {
    title: "Billing",
    icon: CreditCard,
    items: [
      {
        question: "How is my water bill calculated?",
        answer:
          "Your monthly bill includes the base rate for the first 10 cubic meters, plus an additional charge for every cubic meter used beyond that amount.",
      },
      {
        question: "What is the minimum charge for 1-10 cubic?",
        answer:
          "The minimum residential charge is ₱350 per month, which already covers the first 10 cubic meters of water consumption.",
      },
      {
        question: "How much is charged beyond 10 cubic?",
        answer: "Usage beyond the first 10 cubic meters is billed at ₱40 per cubic meter.",
      },
    ],
  },
  {
    title: "Payments",
    icon: CircleHelp,
    items: [
      {
        question: "When is payment due?",
        answer: "Payment is due within 15 days from the billing date to keep your account current.",
      },
      {
        question: "What happens if a bill remains unpaid?",
        answer:
          "We send reminder and warning notices as the account becomes overdue, and service may be disconnected after 90 days of non-payment.",
      },
    ],
  },
  {
    title: "Service",
    icon: Wrench,
    items: [
      {
        question: "How do I apply as a new customer?",
        answer:
          "Contact our team through the Contact page or visit our office so we can guide you through account setup and service requirements.",
      },
      {
        question: "How do I report service concerns?",
        answer:
          "You can report leaks, interruptions, or billing concerns by calling our office directly or sending a message through the Contact page.",
      },
    ],
  },
] as const

export function FAQSection() {
  const { allowDesktopMotion } = usePublicMotionPolicy()

  return (
    <section id="faq" className="relative scroll-mt-24 overflow-hidden bg-muted/35 py-24 sm:py-32 dark:bg-slate-950">
      <div className="absolute inset-0 -z-10">
        <div className="public-desktop-decoration absolute left-1/2 top-10 hidden h-[30rem] w-[44rem] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl md:block dark:bg-cyan-400/12" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle_at_center,var(--border)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]" />
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
            <Droplets className="h-4 w-4" aria-hidden="true" />
            Clear answers before you call
          </div>
          <h2 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Frequently asked questions, answered with utility-grade clarity.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Billing, payment, and service information organized so customers can make decisions faster.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <motion.aside
            initial={allowDesktopMotion ? { opacity: 0, x: -18 } : false}
            whileInView={allowDesktopMotion ? { opacity: 1, x: 0 } : undefined}
            data-mobile-static="true"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm backdrop-blur-none md:bg-card/80 md:shadow-xl md:shadow-cyan-950/5 md:backdrop-blur-xl dark:bg-slate-950 dark:md:bg-white/[0.045] lg:sticky lg:top-28 lg:h-fit"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.32)]">
              <CircleHelp className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">Need more help?</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              If an account detail is missing here, send a message through the Contact page with your account number for faster assistance.
            </p>
            {/* <div className="mt-8 grid gap-3">
              {faqGroups.map((group) => (
                <div key={group.title} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-3 dark:bg-slate-950/40">
                  <group.icon className="h-5 w-5 text-cyan-700 dark:text-cyan-200" aria-hidden="true" />
                  <span className="text-sm font-medium text-foreground">{group.title}</span>
                </div>
              ))}
            </div> */}
          </motion.aside>

          <Accordion type="single" collapsible className="space-y-4">
            {faqGroups.flatMap((group) =>
              group.items.map((item, index) => (
                <motion.div
                  key={item.question}
                  initial={allowDesktopMotion ? { opacity: 0, y: 14 } : false}
                  whileInView={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
                  data-mobile-static="true"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: index * 0.025, ease: "easeOut" }}
                >
                  <AccordionItem
                    value={item.question}
                    className="group overflow-hidden rounded-2xl border border-border/70 bg-card px-5 shadow-sm backdrop-blur-none transition-colors md:bg-card/80 md:shadow-lg md:shadow-cyan-950/5 md:backdrop-blur-xl dark:bg-slate-950 dark:md:bg-white/[0.045]"
                  >
                    <AccordionTrigger className="py-5 text-left text-base font-semibold text-foreground hover:no-underline sm:text-lg [&>svg]:hidden [&[data-state=open]_.faq-plus]:rotate-45">
                      <span className="pr-4">{item.question}</span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 text-cyan-700 dark:text-cyan-200">
                        <Plus className="faq-plus h-4 w-4 transition-transform duration-300" aria-hidden="true" />
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 pr-4 text-sm leading-7 text-muted-foreground sm:pr-12">
                      <div className="mb-4 h-px w-full bg-gradient-to-r from-cyan-400/45 to-transparent" />
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))
            )}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
