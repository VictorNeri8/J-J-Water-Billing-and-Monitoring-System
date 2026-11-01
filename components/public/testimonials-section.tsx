"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { MapPin, Quote, Star } from "lucide-react"
import { usePublicMotionPolicy } from "@/hooks/use-public-motion-policy"

const testimonials = [
  {
    name: "Victor",
    location: "Calero, Liloan",
    avatar: "/testimonial-assets/victor.png",
    quote:
      "The service has been reliable, and I appreciate how clear the billing breakdown is every month. It helps our family plan expenses better.",
    rating: 5,
  },
  {
    name: "John Fritz",
    location: "Tagaytay, Liloan",
    avatar: "/testimonial-assets/john-fritz.png",
    quote:
      "When we had a supply concern, their team responded quickly and explained the issue clearly. That kind of support gives us confidence.",
    rating: 5,
  },
  {
    name: "John Mark",
    location: "Tagaytay, Liloan",
    avatar: "/testimonial-assets/john-mark.png",
    quote:
      "During a supply delay, their team communicated openly and resolved the situation quickly. It gave us a lot of confidence in working with them.",
    rating: 5,
  },
  {
    name: "Rex Vincent",
    location: "Yati, Liloan",
    avatar: "/testimonial-assets/rex-vincent.png",
    quote:
      "The updates are easy to follow, and the team handles requests with a level of care that feels very local and dependable.",
    rating: 5,
  },
  {
    name: "John Christian",
    location: "Poblacion, Liloan",
    avatar: "/testimonial-assets/john-christian.png",
    quote:
      "I like that the rates are easy to understand and the staff is approachable whenever I have questions about our account.",
    rating: 4,
  },
] as const

const marqueeItems = [...testimonials, ...testimonials]

export function TestimonialsSection() {
  const { prefersReducedMotion, allowDesktopMotion } = usePublicMotionPolicy()
  const visibleTestimonials = prefersReducedMotion ? testimonials : marqueeItems

  return (
    <section className="relative overflow-hidden bg-background py-24 sm:py-32">
      <div className="absolute inset-0 -z-10">
        <div className="public-desktop-decoration absolute left-[-10rem] top-20 hidden h-[28rem] w-[28rem] rounded-full bg-cyan-400/10 blur-3xl md:block dark:bg-cyan-400/12" />
        <div className="public-desktop-decoration absolute right-[-10rem] bottom-0 hidden h-[26rem] w-[26rem] rounded-full bg-teal-400/10 blur-3xl md:block dark:bg-teal-400/12" />
      </div>

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          initial={allowDesktopMotion ? { opacity: 0, y: 18 } : false}
          whileInView={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
          data-mobile-static="true"
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mx-auto inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-200">
            Customer confidence
          </div>
          <h2 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Trusted by families who count on clear service every month.
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Real feedback from households and businesses that value reliable water, responsive support, and billing that makes sense.
          </p>
        </motion.div>
      </div>

      <div className="mt-12 overflow-x-hidden overflow-y-visible py-6 md:[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <motion.div
          initial={allowDesktopMotion ? { opacity: 0, y: 14 } : false}
          whileInView={allowDesktopMotion ? { opacity: 1, y: 0 } : undefined}
          data-mobile-static="true"
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="group overflow-x-auto overflow-y-visible px-4 py-3 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden"
        >
          <div
            className={`flex w-max gap-5 ${prefersReducedMotion ? "snap-x snap-mandatory" : "animate-[testimonial-marquee_42s_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"}`}
          >
            {visibleTestimonials.map((testimonial, index) => (
              <TestimonialCard key={`${testimonial.name}-${index}`} testimonial={testimonial} index={index} allowDesktopMotion={allowDesktopMotion} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function TestimonialCard({
  testimonial,
  index,
  allowDesktopMotion,
}: {
  testimonial: (typeof testimonials)[number]
  index: number
  allowDesktopMotion: boolean
}) {
  return (
    <motion.article
      whileHover={allowDesktopMotion ? { scale: 1.015, y: -3 } : undefined}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="relative w-[20rem] shrink-0 snap-center overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm backdrop-blur-none transition-colors hover:border-cyan-400/45 md:w-[24rem] md:bg-card/85 md:shadow-xl md:shadow-cyan-950/5 md:backdrop-blur-xl dark:bg-slate-950 dark:md:bg-white/[0.045]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_34%)] opacity-0 transition-opacity duration-500 hover:opacity-100" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-400/30 bg-cyan-400/12 text-sm font-semibold text-cyan-800 shadow-sm ring-2 ring-cyan-400/10 md:shadow-[0_0_22px_rgba(34,211,238,0.16)] dark:text-cyan-100">
              <Image
                src={testimonial.avatar}
                alt={`${testimonial.name} profile photo`}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{testimonial.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" aria-hidden="true" />
                {testimonial.location}
              </p>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/12 text-cyan-700 dark:text-cyan-200">
            <Quote className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-1" aria-label={`${testimonial.rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, starIndex) => (
            <Star
              key={`${testimonial.name}-${index}-${starIndex}`}
              className={`h-4 w-4 ${starIndex < testimonial.rating ? "fill-cyan-400 text-cyan-400" : "text-border"}`}
              aria-hidden="true"
            />
          ))}
        </div>

        <p className="mt-5 text-sm leading-7 text-muted-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
      </div>
    </motion.article>
  )
}
