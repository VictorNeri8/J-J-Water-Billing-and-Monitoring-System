import dynamic from "next/dynamic"
import { HeroSection } from "@/components/public/hero-section"
import { ServicesSection } from "@/components/public/services-section"
import { RatesSection } from "@/components/public/rates-section"
import { CTASection } from "@/components/public/cta-section"
import { FAQSection } from "@/components/public/faq-section"

const TestimonialsSection = dynamic(
  () => import("@/components/public/testimonials-section").then((module) => module.TestimonialsSection),
  {
    loading: () => <div className="min-h-[32rem] bg-background" aria-hidden="true" />,
  },
)

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <RatesSection />
      <FAQSection />
      <TestimonialsSection />
      <CTASection />
    </>
  )
}
