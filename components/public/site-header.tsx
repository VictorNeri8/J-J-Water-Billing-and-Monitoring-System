"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { LogIn, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PublicThemeToggle } from "@/components/public/public-theme-toggle"
import { usePublicMotionPolicy } from "@/hooks/use-public-motion-policy"

const navigation = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Services", href: "/#services" },
  { name: "Rates", href: "/#rates" },
  { name: "Check Bill", href: "/customer-bill" },
  { name: "FAQ", href: "/#faq" },
  { name: "Contact", href: "/contact" },
]

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const { prefersReducedMotion, allowDesktopOnlyMotion } = usePublicMotionPolicy()

  useEffect(() => {
    let lastScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollDelta = currentScrollY - lastScrollY

      if (currentScrollY <= 24) {
        setIsVisible(true)
        lastScrollY = currentScrollY
        return
      }

      if (Math.abs(scrollDelta) < 8) {
        return
      }

      if (mobileMenuOpen) {
        setIsVisible(true)
      } else {
        setIsVisible(scrollDelta < 0)
      }

      lastScrollY = currentScrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => window.removeEventListener("scroll", handleScroll)
  }, [mobileMenuOpen])

  return (
    <header
      className={`sticky top-0 z-50 w-full overflow-x-clip px-3 pt-3 transition-transform duration-200 ease-out motion-reduce:transition-none sm:px-4 lg:pt-5 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <motion.div
        initial={allowDesktopOnlyMotion ? { opacity: 0, y: -24 } : false}
        animate={allowDesktopOnlyMotion ? { opacity: 1, y: 0 } : undefined}
        data-desktop-motion-static="true"
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <nav className="mx-auto flex h-[3.75rem] min-h-[3.75rem] max-w-5xl items-center justify-between gap-3 rounded-full border border-white/45 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm supports-backdrop-filter:bg-white/82 md:bg-white/68 md:shadow-[0_18px_60px_rgba(2,6,23,0.10)] md:backdrop-blur-2xl md:supports-backdrop-filter:bg-white/48 dark:border-white/12 dark:bg-slate-950/90 dark:md:bg-slate-950/48 dark:md:shadow-[0_18px_70px_rgba(8,47,73,0.18)] lg:px-4">
        <div className="flex min-w-0 lg:flex-1">
          <Link href="/" className="flex min-w-0 items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-black/[0.035] dark:hover:bg-white/[0.06]">
            <Image
              src="/jandj-logo.png"
              alt="J&J Water Distribution Services"
              width={48}
              height={48}
              className="h-8 w-8 shrink-0 object-contain lg:h-9 lg:w-9"
              priority
            />
            <span className="truncate text-sm font-bold leading-tight text-foreground sm:text-base">
              J&J WATER
              <span className="block truncate text-[0.62rem] font-medium tracking-[0.08em] text-muted-foreground sm:text-[0.68rem]">DISTRIBUTION SERVICES</span>
            </span>
          </Link>
        </div>
        <div className="flex h-11 w-[5.75rem] shrink-0 items-center justify-end gap-1 lg:hidden">
          <PublicThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 min-h-[2.75rem] min-w-[2.75rem] shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/45 p-0 text-muted-foreground transition-colors hover:text-foreground dark:bg-white/[0.06]"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <span className="sr-only">{mobileMenuOpen ? "Close main menu" : "Open main menu"}</span>
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
        <div className="hidden items-center rounded-full border border-border/50 bg-background/38 p-1 shadow-inner shadow-white/30 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-cyan-400/10 hover:text-foreground"
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="hidden shrink-0 lg:flex lg:flex-1 lg:items-center lg:justify-end lg:gap-2">
          <PublicThemeToggle />
          <Button asChild className="h-10 rounded-full bg-cyan-700 px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(14,116,144,0.22)] hover:bg-cyan-600 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300">
            <Link href="/admin/login">
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Admin Portal
            </Link>
          </Button>
        </div>
        </nav>

        <AnimatePresence initial={false}>
          {mobileMenuOpen && (
            <motion.div
            id="mobile-menu"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: "easeOut" }}
            className="mx-auto mt-2 max-w-5xl overflow-hidden rounded-[1.75rem] border border-white/45 bg-white/96 shadow-md backdrop-blur-sm dark:border-white/12 dark:bg-slate-950/96 lg:hidden"
          >
            <div className="max-h-[calc(100dvh-5.75rem)] overflow-y-auto p-3 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
              <nav className="grid gap-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-cyan-400/10"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="mt-3 border-t border-border/70 pt-3">
                <Button asChild className="h-11 w-full rounded-full bg-cyan-700 text-white hover:bg-cyan-600 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300">
                  <Link href="/admin/login" onClick={() => setMobileMenuOpen(false)}>
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    Admin Portal
                  </Link>
                </Button>
              </div>
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </header>
  )
}
