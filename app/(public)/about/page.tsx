"use client"

import { useLayoutEffect, useRef, useState } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { Award, Droplets, Eye, Heart, Leaf, ShieldCheck, Target, Users } from "lucide-react"
import aboutImage1 from "@/dist/carousel-about-assets/j&j-image-1.png"
import aboutImage2 from "@/dist/carousel-about-assets/j&j-image-2.png"
import aboutImage3 from "@/dist/carousel-about-assets/j&j-image-3.png"
import aboutImage4 from "@/dist/carousel-about-assets/j&j-image-4.png"
import aboutImage5 from "@/dist/carousel-about-assets/j&j-image-5.png"
import aboutImage6 from "@/dist/carousel-about-assets/j&j-image-6.png"
import storyImage1 from "@/dist/story-about-assets/story-image-1.png"
import storyImage2 from "@/dist/story-about-assets/story-image-2.png"
import storyImage3 from "@/dist/story-about-assets/story-image-3.png"
import storyImage4 from "@/dist/story-about-assets/story-image-4.png"
import { usePublicMotionPolicy } from "@/hooks/use-public-motion-policy"

const principles = [
  {
    title: "Mission",
    description:
      "Provide safe, reliable, and affordable water services to every household and business in the community.",
    icon: Target,
  },
  {
    title: "Vision",
    description:
      "Be recognized for excellent service delivery, modern water management, and long-term environmental responsibility.",
    icon: Eye,
  },
]

const values = [
  {
    title: "Integrity",
    description: "Honest operations, transparent communication, and ethical standards in every customer interaction.",
    icon: Heart,
  },
  {
    title: "Excellence",
    description: "Continuous improvement across service quality, response time, billing clarity, and support.",
    icon: Award,
  },
  {
    title: "Community",
    description: "Service decisions guided by the daily needs of families, businesses, and local neighborhoods.",
    icon: Users,
  },
  {
    title: "Sustainability",
    description: "Responsible stewardship of water resources for both current customers and future generations.",
    icon: Leaf,
  },
  {
    title: "Accountability",
    description: "Clear ownership of service commitments, operational standards, and customer trust.",
    icon: ShieldCheck,
  },
]

const timeline = [
  {
    year: "2023",
    title: "Foundation",
    description:
      "J&J Water Distribution Services began serving the local community in 2023 to address the growing demand for accessible and reliable water services. Starting with a focused distribution network, the company prioritized consistent water delivery and dependable customer service for residential needs.",
    image: storyImage1,
  },
  {
    year: "2024",
    title: "Service Growth and Infrastructure Development",
    description:
      "As local demand increased, J&J Water Distribution Services expanded its operational coverage and strengthened its distribution infrastructure. Additional service connections and improved coordination helped support more households while keeping the water supply stable and efficient.",
    image: storyImage2,
  },
  {
    year: "2025",
    title: "Operational Modernization",
    description:
      "The company continued modernizing its operations by adopting digital tools to improve efficiency and service management. Meter reading processes became more organized, billing systems were improved, and customer records were digitized to enhance accuracy, transparency, and operational reliability.",
    image: storyImage3,
  },
  {
    year: "Today",
    title: "Present Day",
    description:
      "Today, J&J Water Distribution Services continues to serve thousands of households with a stronger focus on innovation and customer convenience. The company now utilizes modern water management practices, SMS notifications, digital billing systems, and centralized customer monitoring to provide a more efficient, transparent, and reliable water distribution service for the community.",
    image: storyImage4,
  },
]

const carouselImages = [
  {
    src: aboutImage1,
    alt: "J&J Water Distribution team handling service operations",
    caption: "Field coordination",
  },
  {
    src: aboutImage2,
    alt: "Water distribution infrastructure maintained by J&J",
    caption: "Network upkeep",
  },
  {
    src: aboutImage3,
    alt: "J&J Water Distribution service equipment and local operations",
    caption: "Daily reliability",
  },
  {
    src: aboutImage4,
    alt: "Community water service support from J&J",
    caption: "Customer support",
  },
  {
    src: aboutImage5,
    alt: "J&J Water Distribution monitoring work in progress",
    caption: "Quality checks",
  },
  {
    src: aboutImage6,
    alt: "Local water delivery system served by J&J",
    caption: "Clean delivery",
  },
]

const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
}

const heroItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

function StoryPanel({ event, index, allowDesktopMotion }: { event: (typeof timeline)[number]; index: number; allowDesktopMotion: boolean }) {
  const panelRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: panelRef,
    offset: ["start end", "end start"],
  })
  const imageY = useTransform(scrollYProgress, [0, 1], allowDesktopMotion ? [-24, 24] : [0, 0])
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], allowDesktopMotion ? [1.025, 1, 1.025] : [1, 1, 1])

  return (
    <section
      ref={panelRef}
      className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-20 sm:px-6 md:min-h-screen lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-8"
    >
      <motion.article
        initial={allowDesktopMotion ? { opacity: 0, y: 18 } : false}
        whileInView={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
        data-mobile-static="true"
        data-desktop-motion-static="true"
        viewport={{ once: true, amount: 0.45 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="order-2 mx-auto max-w-xl lg:order-1 lg:mx-0 lg:pl-10 xl:pl-14"
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
          {event.year}
        </p>
        <h3 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {event.title}
        </h3>
        <p className="mt-6 text-base leading-8 text-foreground/82 dark:text-muted-foreground sm:text-lg">
          {event.description}
        </p>
        <div className="mt-8 flex items-center gap-4 text-xs font-bold uppercase tracking-[0.12em] text-foreground">
          <span>{String(index + 1).padStart(2, "0")} of {String(timeline.length).padStart(2, "0")}</span>
          <span className="h-px w-14 bg-foreground/35" />
        </div>
      </motion.article>

      <motion.figure
        initial={allowDesktopMotion ? { opacity: 0, y: 16 } : false}
        whileInView={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
        data-mobile-static="true"
        data-desktop-motion-static="true"
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="order-1 relative mx-auto h-[34vh] w-full max-w-[42rem] overflow-hidden rounded-[2rem] sm:h-[42vh] lg:order-2 lg:h-[52vh] lg:max-w-[38rem] lg:justify-self-end"
      >
        <motion.div data-desktop-motion-static="true" style={{ y: imageY, scale: imageScale }} className="absolute -inset-y-10 inset-x-0">
          <Image src={event.image} alt={event.title} fill sizes="(max-width: 1023px) 100vw, 38rem" className="object-cover" />
        </motion.div>
      </motion.figure>
    </section>
  )
}

export default function AboutPage() {
  const { allowDesktopMotion, allowDesktopOnlyMotion } = usePublicMotionPolicy()
  const carouselRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragLimit, setDragLimit] = useState(0)

  useLayoutEffect(() => {
    const updateDragLimit = () => {
      if (!carouselRef.current || !trackRef.current) return

      setDragLimit(Math.max(0, trackRef.current.scrollWidth - carouselRef.current.offsetWidth))
    }

    updateDragLimit()
    window.addEventListener("resize", updateDragLimit)

    return () => window.removeEventListener("resize", updateDragLimit)
  }, [])

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
            <Droplets className="h-4 w-4" aria-hidden="true" />
            Trusted community utility
          </motion.div>
          <motion.h1 variants={heroItem} data-desktop-motion-static="true" transition={{ duration: 0.55, ease: "easeOut" }} className="mx-auto mt-8 max-w-5xl text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-[5rem] lg:leading-none">
            Built on dependable water service and local accountability.
          </motion.h1>
          <motion.p variants={heroItem} data-desktop-motion-static="true" transition={{ duration: 0.55, ease: "easeOut" }} className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Since 2023, J&J Water Distribution Services has focused on clean delivery, clear communication, and responsible water management for the communities it serves.
          </motion.p>
        </motion.div>
      </section>

      <section className="relative mt-6 overflow-hidden pb-24 sm:mt-8 sm:pb-32">
        <div
          ref={carouselRef}
          className="mx-auto max-w-[100rem] overflow-x-auto px-4 [mask-image:linear-gradient(to_right,transparent_0,black_4rem,black_calc(100%-4rem),transparent_100%)] [scrollbar-width:none] sm:px-6 sm:[mask-image:linear-gradient(to_right,transparent_0,black_6rem,black_calc(100%-6rem),transparent_100%)] lg:px-8 [&::-webkit-scrollbar]:hidden"
        >
          <motion.div
            ref={trackRef}
            drag={allowDesktopMotion ? "x" : false}
            dragConstraints={{ left: -dragLimit, right: 0 }}
            dragElastic={0.08}
            dragMomentum={allowDesktopMotion}
            whileTap={allowDesktopMotion ? { cursor: "grabbing" } : undefined}
            className="flex snap-x snap-mandatory gap-4 py-6 md:cursor-grab md:snap-none md:active:cursor-grabbing sm:gap-5"
          >
            {carouselImages.map((image, index) => (
              <motion.figure
                key={image.caption}
                initial={allowDesktopMotion ? { opacity: 0, scale: 0.94, y: 18 } : false}
                whileInView={allowDesktopMotion ? { opacity: 1, scale: 1, y: 0 } : undefined}
                data-mobile-static="true"
                viewport={{ once: true, amount: 0.28 }}
                transition={{ duration: 0.4, delay: index * 0.035, ease: "easeOut" }}
                className="group relative h-[22rem] w-[18rem] shrink-0 snap-center overflow-hidden rounded-[1.75rem] border border-slate-300/60 bg-white shadow-sm md:shadow-[0_18px_50px_rgba(148,163,184,0.18)] sm:h-[27rem] sm:w-[23rem] lg:h-[32rem] lg:w-[29rem] dark:border-white/12 dark:bg-slate-950 dark:md:shadow-2xl dark:md:shadow-cyan-950/10"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 639px) 18rem, (max-width: 1023px) 23rem, 29rem"
                  draggable={false}
                  className="select-none object-cover opacity-90 contrast-110 saturate-[0.92] md:transition md:duration-500 md:ease-out md:group-hover:scale-[1.03] md:group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(15,23,42,0.08)_44%,rgba(15,23,42,0.38)_100%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.28)_48%,rgba(2,6,23,0.82)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.32),transparent_30%)] opacity-70 transition-opacity duration-500 group-hover:opacity-100 dark:bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.24),transparent_34%)]" />
                <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-6">
                  <span className="max-w-52 text-2xl font-semibold leading-none tracking-tight sm:text-3xl">
                    {image.caption}
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:pb-32 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          {principles.map((principle, index) => (
            <motion.article
              key={principle.title}
              initial={allowDesktopMotion ? { opacity: 0, y: 18 } : false}
              whileInView={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
              data-mobile-static="true"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
              whileHover={allowDesktopMotion ? { y: -4 } : undefined}
              className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-8 shadow-sm backdrop-blur-none transition-colors hover:border-cyan-400/45 md:bg-card/85 md:shadow-xl md:shadow-cyan-950/5 md:backdrop-blur-xl dark:bg-slate-950 dark:md:bg-white/[0.045]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_36%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-700 dark:text-cyan-200">
                  <principle.icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <h2 className="mt-7 text-3xl font-semibold tracking-tight text-foreground">Our {principle.title}</h2>
                <p className="mt-4 text-base leading-8 text-muted-foreground">{principle.description}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-muted/35 px-4 py-24 sm:py-32 lg:px-8 dark:bg-slate-950">
        <div className="absolute inset-0 -z-0 opacity-[0.13] [background-image:radial-gradient(circle_at_center,var(--border)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative mx-auto max-w-7xl">
          <motion.div
            initial={allowDesktopMotion ? { opacity: 0, y: 18 } : false}
            whileInView={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
            data-mobile-static="true"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Values that make utility service feel dependable.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              The operating standards behind every meter reading, service request, billing notice, and customer conversation.
            </p>
          </motion.div>

          <div className="mt-16 grid grid-flow-dense gap-5 sm:grid-cols-2 lg:grid-cols-6">
            {values.map((value, index) => (
              <motion.article
                key={value.title}
                initial={allowDesktopMotion ? { opacity: 0, y: 16 } : false}
                whileInView={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
                data-mobile-static="true"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.38, delay: index * 0.035, ease: "easeOut" }}
                className={`rounded-3xl border border-border/70 bg-card p-6 shadow-sm backdrop-blur-none md:bg-card/80 md:shadow-lg md:shadow-cyan-950/5 md:backdrop-blur-xl dark:bg-slate-950 dark:md:bg-white/[0.045] ${
                  index < 3 ? "lg:col-span-2" : "lg:col-span-3"
                }`}
              >
                <value.icon className="h-7 w-7 text-cyan-700 dark:text-cyan-200" aria-hidden="true" />
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-foreground">{value.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{value.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-7xl px-4 pt-24 text-center sm:px-6 lg:px-8">
          <motion.div
            variants={heroContainer}
            initial={allowDesktopOnlyMotion ? "hidden" : false}
            whileInView={allowDesktopOnlyMotion ? "visible" : undefined}
            data-mobile-static="true"
            data-desktop-motion-static="true"
            viewport={{ once: true, amount: 0.5 }}
            className="mx-auto max-w-3xl"
          >
            <motion.h2 variants={heroItem} data-desktop-motion-static="true" transition={{ duration: 0.5, ease: "easeOut" }} className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Four decades of expanding reliable access.
            </motion.h2>
            <motion.p variants={heroItem} data-desktop-motion-static="true" transition={{ duration: 0.5, ease: "easeOut" }} className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              A steady shift from local distribution coverage to modern billing, meter reading, and customer communication.
            </motion.p>
          </motion.div>
        </div>

        {timeline.map((event, index) => (
          <StoryPanel key={event.title} event={event} index={index} allowDesktopMotion={allowDesktopOnlyMotion} />
        ))}
      </section>
    </div>
  )
}
