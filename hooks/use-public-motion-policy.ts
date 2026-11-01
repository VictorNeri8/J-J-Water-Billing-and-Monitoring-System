"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "framer-motion"

export function usePublicMotionPolicy() {
  // Desktop is the SSR animation baseline; responsive CSS keeps smaller
  // viewports visible and static before hydration completes.
  const [isMobile, setIsMobile] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  const prefersReducedMotion = Boolean(useReducedMotion())
  const isMobileReducedMotion = isMobile || prefersReducedMotion

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)")
    const desktopQuery = window.matchMedia("(min-width: 1024px)")
    const update = () => {
      setIsMobile(query.matches)
      setIsDesktop(desktopQuery.matches)
    }

    update()
    query.addEventListener("change", update)
    desktopQuery.addEventListener("change", update)
    return () => {
      query.removeEventListener("change", update)
      desktopQuery.removeEventListener("change", update)
    }
  }, [])

  return {
    isMobile,
    isDesktop,
    prefersReducedMotion,
    isMobileReducedMotion,
    allowDesktopMotion: !isMobileReducedMotion,
    allowDesktopOnlyMotion: isDesktop && !prefersReducedMotion,
  }
}
