"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from "framer-motion"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export type ThemeVariant = "circle"
export type ThemeToggleStart =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-down"
  | "bottom-up"
  | "center"
  | "button"
  | "click"

type ViewTransition = {
  ready: Promise<void>
  finished: Promise<void>
  updateCallbackDone: Promise<void>
  skipTransition: () => void
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => ViewTransition
}

interface ThemeToggleProps extends Omit<HTMLMotionProps<"button">, "onClick"> {
  variant?: ThemeVariant
  start?: ThemeToggleStart
  iconClassName?: string
}

const THEME_TRANSITION_STYLE_ID = "beui-theme-toggle-view-transition"
const MOBILE_THEME_TRANSITION_QUERY = "(max-width: 767px)"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function ensureViewTransitionStyle() {
  if (document.getElementById(THEME_TRANSITION_STYLE_ID)) {
    return
  }

  const style = document.createElement("style")
  style.id = THEME_TRANSITION_STYLE_ID
  style.textContent = `
::view-transition {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

::view-transition-group(root) {
  animation-duration: 0s;
  animation-timing-function: linear;
  z-index: 9999;
}

::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
  pointer-events: none;
}

html[data-theme-transition="light-to-dark"]::view-transition-old(root),
html[data-theme-transition="dark-to-light"]::view-transition-old(root) {
  z-index: 1;
}

html[data-theme-transition="light-to-dark"]::view-transition-new(root),
html[data-theme-transition="dark-to-light"]::view-transition-new(root) {
  z-index: 9999;
}

@media (max-width: 767px) {
  html[data-theme-transition="light-to-dark"]::view-transition-old(root),
  html[data-theme-transition="dark-to-light"]::view-transition-old(root),
  html[data-theme-transition="light-to-dark"]::view-transition-new(root),
  html[data-theme-transition="dark-to-light"]::view-transition-new(root) {
    animation: none;
    filter: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(root),
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none !important;
  }
}
`
  document.head.appendChild(style)
}

function getTransitionOrigin(start: ThemeToggleStart, event: React.MouseEvent<HTMLButtonElement>) {
  const { innerWidth, innerHeight } = window

  switch (start) {
    case "top-left":
      return { x: 0, y: 0 }
    case "top-right":
      return { x: innerWidth, y: 0 }
    case "bottom-left":
      return { x: 0, y: innerHeight }
    case "bottom-right":
      return { x: innerWidth, y: innerHeight }
    case "top-down":
      return { x: innerWidth / 2, y: 0 }
    case "bottom-up":
      return { x: innerWidth / 2, y: innerHeight }
    case "center":
      return { x: innerWidth / 2, y: innerHeight / 2 }
    case "button": {
      const rect = event.currentTarget.getBoundingClientRect()

      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }
    case "click":
    default:
      return { x: event.clientX, y: event.clientY }
  }
}

function getEndRadius(x: number, y: number) {
  const right = window.innerWidth - x
  const bottom = window.innerHeight - y

  return Math.hypot(Math.max(x, right), Math.max(y, bottom))
}

function getThemeTransitionTiming() {
  const isMobile = window.matchMedia(MOBILE_THEME_TRANSITION_QUERY).matches

  return {
    duration: isMobile ? 220 : 800,
    easing: isMobile ? "cubic-bezier(0.2, 0, 0, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)",
  }
}

function shouldReduceMotion(prefersReducedMotion: boolean) {
  return prefersReducedMotion || window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function applyThemeClass(theme: "light" | "dark") {
  const root = document.documentElement

  root.classList.remove("light", "dark")
  root.classList.add(theme)
  root.style.colorScheme = theme
}

export function ThemeToggle({
  variant = "circle",
  start = "click",
  className,
  iconClassName,
  disabled,
  ...props
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const activeTheme = resolvedTheme === "dark" ? "dark" : "light"
  const nextTheme = activeTheme === "dark" ? "light" : "dark"

  const handleThemeChange = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      return
    }

    const viewTransitionDocument = document as ViewTransitionDocument
    const root = document.documentElement

    const switchTheme = () => {
      applyThemeClass(nextTheme)
      setTheme(nextTheme)
    }

    if (variant !== "circle" || shouldReduceMotion(Boolean(prefersReducedMotion)) || !viewTransitionDocument.startViewTransition) {
      delete root.dataset.themeTransition
      switchTheme()
      return
    }

    ensureViewTransitionStyle()

    const { x, y } = getTransitionOrigin(start, event)
    const direction = `${activeTheme}-to-${nextTheme}`

    root.dataset.themeTransition = direction

    const transition = viewTransitionDocument.startViewTransition(() => {
      switchTheme()
    })
    const endRadius = getEndRadius(x, y)
    const { duration, easing } = getThemeTransitionTiming()

    void transition.ready
      .then(() => {
        root.animate(
          {
            opacity: [0.96, 1],
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
          },
          {
            duration,
            easing,
            pseudoElement: "::view-transition-new(root)",
          }
        )
      })
      .catch(() => undefined)

    const cleanup = () => {
      if (root.dataset.themeTransition === direction) {
        delete root.dataset.themeTransition
      }
    }

    void transition.finished.then(cleanup, cleanup)
  }

  if (!mounted) {
    return (
      <button
        type="button"
        className={cn("inline-flex items-center justify-center text-muted-foreground", className)}
        aria-hidden="true"
        disabled
      >
        <span className={cn("block rounded-full bg-muted", iconClassName)} />
      </button>
    )
  }

  return (
    <motion.button
      type="button"
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      disabled={disabled}
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
        className
      )}
      onClick={handleThemeChange}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        {activeTheme === "dark" ? (
          <motion.span
            key="sun"
            aria-hidden="true"
            initial={prefersReducedMotion ? false : { opacity: 0, rotate: -45, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, rotate: 45, scale: 0.7 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: "easeOut" }}
            className="relative flex h-6 w-6 items-center justify-center"
          >
            <Sun className={cn("h-5 w-5", iconClassName)} />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            aria-hidden="true"
            initial={prefersReducedMotion ? false : { opacity: 0, x: 4, rotate: 20, scale: 0.7 }}
            animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -4, rotate: -20, scale: 0.7 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: "easeOut" }}
            className="relative flex h-6 w-6 items-center justify-center"
          >
            <Moon className={cn("h-5 w-5", iconClassName)} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
