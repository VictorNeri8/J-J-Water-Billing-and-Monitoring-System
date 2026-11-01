"use client"

import { Button } from "@/components/ui/button"
import { PanelLeftOpen } from "lucide-react"

interface AdminHeaderProps {
  onToggleSidebar: () => void
}

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
      <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="shrink-0 lg:hidden">
        <PanelLeftOpen className="h-5 w-5" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>
    </header>
  )
}
