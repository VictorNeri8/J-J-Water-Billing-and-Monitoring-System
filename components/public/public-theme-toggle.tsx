"use client"

import { ThemeToggle } from "@/components/motion/theme-toggle"

export function PublicThemeToggle() {
  return (
    <span className="inline-flex h-11 w-11 min-h-[2.75rem] min-w-[2.75rem] shrink-0 items-center justify-center [contain:layout_style]">
      <ThemeToggle
        variant="circle"
        start="button"
        data-public-theme-toggle="true"
        className="group relative inline-flex h-11 w-11 min-h-[2.75rem] min-w-[2.75rem] shrink-0 items-center justify-center overflow-hidden rounded-full border border-transparent bg-white p-0 text-[#070026] shadow-sm outline-none ring-1 ring-slate-950/5 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-cyan-500 md:duration-200 md:shadow-[0_12px_36px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] md:hover:shadow-[0_16px_46px_rgba(15,23,42,0.18)] dark:bg-white dark:text-[#070026] dark:md:shadow-[0_0_0_7px_rgba(255,255,255,0.045),0_16px_42px_rgba(0,0,0,0.34)]"
        iconClassName="h-5 w-5"
      />
    </span>
  )
}
