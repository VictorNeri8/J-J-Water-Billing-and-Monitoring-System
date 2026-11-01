"use client"

import { motion } from "framer-motion"
import { CustomerBillInquiry } from "@/components/public/customer-bill-inquiry"
import { usePublicMotionPolicy } from "@/hooks/use-public-motion-policy"

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
}

export function CustomerBillPageContent() {
  const { allowDesktopMotion } = usePublicMotionPolicy()

  return (
    <div className="relative overflow-hidden bg-background">
      <section className="relative isolate px-4 py-20 sm:py-28 lg:px-8">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            aria-hidden="true"
            className="public-desktop-decoration absolute left-1/2 top-[-18rem] hidden h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-cyan-400/18 blur-3xl md:block dark:bg-cyan-400/12"
            animate={allowDesktopMotion ? { scale: [1, 1.08, 1], opacity: [0.42, 0.62, 0.42] } : undefined}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden="true"
            className="public-desktop-decoration absolute right-[-14rem] top-36 hidden h-[32rem] w-[32rem] rounded-full bg-teal-400/16 blur-3xl md:block dark:bg-teal-400/10"
            animate={allowDesktopMotion ? { x: [0, -18, 0], y: [0, 12, 0] } : undefined}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(circle_at_50%_20%,black,transparent_72%)]"
          />
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <motion.div
            initial={allowDesktopMotion ? "hidden" : false}
            animate={allowDesktopMotion ? "visible" : undefined}
            data-mobile-static="true"
            transition={{ staggerChildren: allowDesktopMotion ? 0.06 : 0 }}
            className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left"
          >
            <motion.div
              variants={fadeUp}
              data-mobile-static="true"
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mx-auto inline-flex items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-200 lg:mx-0"
            >
              Public account service
            </motion.div>
            <motion.h1
              variants={fadeUp}
              data-mobile-static="true"
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="mx-auto mt-8 max-w-4xl text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:mx-0 lg:text-[4.75rem] lg:leading-none"
            >
              Check Your Water Bill
            </motion.h1>
            <motion.p
              variants={fadeUp}
              data-mobile-static="true"
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl lg:mx-0"
            >
              Enter your account number to view your billing summary and payment status.
            </motion.p>
          </motion.div>

          <motion.div
            initial={allowDesktopMotion ? { opacity: 0, y: 20 } : false}
            animate={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
            data-mobile-static="true"
            transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
            className="mx-auto w-full max-w-xl lg:ml-auto"
          >
            <CustomerBillInquiry />
          </motion.div>
        </div>
      </section>
    </div>
  )
}
