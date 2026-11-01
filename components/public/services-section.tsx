"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Droplet, FileText, FlaskConical, Gauge, Phone, Wrench } from "lucide-react"
import { usePublicMotionPolicy } from "@/hooks/use-public-motion-policy"

const services = [
  {
    name: "Water Supply",
    description: "Consistent, treated water delivery through a maintained local distribution network.",
    benefit: "Reliable daily access",
    icon: Droplet,
    image: "/service-assets/water-supply.jpg",
  },
  {
    name: "Meter Installation",
    description: "Accurate meter setup and maintenance for cleaner usage tracking from day one.",
    benefit: "Precise consumption data",
    icon: Gauge,
    image: "/service-assets/water-installation.jpg",
  },
  {
    name: "Meter Reading",
    description:
      "Routine on-site meter reading to accurately record water consumption, ensuring fair monthly billing and reliable usage tracking for every customer.",
    benefit: "Accurate monthly monitoring",
    icon: Gauge,
    image: "/service-assets/water-billing-meter-reading.png",
  },
  {
    name: "Billing Services",
    description: "Clear monthly statements with transparent rate details and simple account support.",
    benefit: "No surprise charges",
    icon: FileText,
    image: "/service-assets/water-billing-services.png",
  },
  {
    name: "Maintenance & Repairs",
    description: "Fast response for leaks, line issues, and essential distribution maintenance.",
    benefit: "Reduced service downtime",
    icon: Wrench,
    image: "/service-assets/water-maintenance-repair.jpg",
  },
  {
    name: "Water Quality Testing",
    description: "Routine checks that help keep household and business water standards dependable.",
    benefit: "Health-first monitoring",
    icon: FlaskConical,
    image: "/service-assets/water-quality-testing.jpg",
  },
  {
    name: "24/7 Emergency Support",
    description: "Urgent assistance for supply interruptions, leaks, and service concerns.",
    benefit: "Always-on response",
    icon: Phone,
    image: "/service-assets/water-emergency-support.png",
  },
]

const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
}

export function ServicesSection() {
  const { allowDesktopMotion } = usePublicMotionPolicy()

  return (
    <section id="services" className="relative scroll-mt-24 overflow-hidden bg-muted/35 py-24 sm:py-32 dark:bg-slate-950">
      <div className="absolute inset-0 -z-0">
        <div className="public-desktop-decoration absolute left-1/2 top-0 hidden h-72 w-[46rem] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl md:block dark:bg-cyan-400/12" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,transparent,black_22%,black_76%,transparent)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          initial={allowDesktopMotion ? { opacity: 0, y: 18 } : false}
          whileInView={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
          data-mobile-static="true"
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mx-auto inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-200">
            Services built around continuity
          </div>
          <h2 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Clean utility services, organized for modern households.
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Essential water operations presented with the clarity, speed, and support customers expect from a modern service platform.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial={allowDesktopMotion ? "hidden" : false}
          whileInView={allowDesktopMotion ? "visible" : undefined}
          data-mobile-static="true"
          viewport={{ once: true, amount: 0.16 }}
          className="mx-auto mt-16 grid max-w-6xl grid-flow-dense gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {services.map((service, index) => (
            <motion.article
              key={service.name}
              variants={allowDesktopMotion ? item : undefined}
              data-mobile-static="true"
              transition={{ duration: 0.4, ease: "easeOut" }}
              whileHover={allowDesktopMotion ? { y: -6 } : undefined}
              className={`group relative min-h-72 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-sm shadow-cyan-950/10 transition-colors duration-300 hover:border-cyan-300/45 dark:border-white/10 ${
                index === 0 || index === 3 ? "lg:row-span-2 lg:min-h-[24rem]" : ""
              }`}
            >
              <Image
                aria-hidden="true"
                src={service.image}
                alt=""
                fill
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                className="object-cover opacity-70 md:transition md:duration-500 md:ease-out md:group-hover:scale-[1.04] md:group-hover:opacity-85 motion-reduce:transform-none dark:opacity-62 dark:md:group-hover:opacity-78"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.42)_0%,rgba(2,6,23,0.70)_44%,rgba(2,6,23,0.94)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.26),transparent_38%),linear-gradient(135deg,rgba(20,184,166,0.14),transparent_46%)] opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-cyan-950/40 to-transparent" />
              <div className="absolute right-0 top-0 h-px w-2/3 bg-gradient-to-l from-cyan-300/80 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative z-10 flex h-full flex-col">
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/15 text-cyan-100 shadow-sm backdrop-blur-none md:shadow-[0_0_28px_rgba(34,211,238,0.18)] md:backdrop-blur-md"
                >
                  <service.icon className="h-7 w-7" aria-hidden="true" />
                </motion.div>

                <div className="mt-8">
                  <p className="text-sm font-medium text-cyan-100">{service.benefit}</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{service.name}</h3>
                  <p className="mt-4 text-sm leading-7 text-cyan-50/78">{service.description}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
