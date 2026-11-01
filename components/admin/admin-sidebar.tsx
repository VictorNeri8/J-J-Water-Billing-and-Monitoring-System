"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  Users,
  Gauge,
  FileText,
  BarChart3,
  TriangleAlert,
  MapPinned,
  Mail,
  Settings,
  X,
  LogOut,
  Moon,
  Sun,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { AdminRole } from "@/lib/types"

interface AdminSidebarProps {
  userRole: AdminRole
  userEmail: string
  userName?: string | null
  notificationCounts?: {
    overdueAccounts?: number
    unreadContactInbox?: number
  }
  collapsed: boolean
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, roles: ["reader", "finance"] },
  { name: "Customers", href: "/admin/customers", icon: Users, roles: ["reader", "finance"] },
  { name: "Meter Readings", href: "/admin/readings", icon: Gauge, roles: ["reader", "finance"] },
  { name: "Billing", href: "/admin/billing", icon: FileText, roles: ["finance"] },
  { name: "Overdue Accounts", href: "/admin/overdue", icon: TriangleAlert, roles: ["reader", "finance"] },
  { name: "Stub Out Location", href: "/admin/stub-outs", icon: MapPinned, roles: ["reader", "finance"] },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3, roles: ["reader", "finance"] },
  { name: "Contact Inbox", href: "/admin/contact", icon: Mail, roles: ["finance"] },
  { name: "Settings", href: "/admin/settings", icon: Settings, roles: ["reader", "finance"] },
]

function formatRole(role: AdminRole) {
  return role === "finance" ? "Finance" : "Reader"
}

function AdminThemeToggle({ isExpanded }: { isExpanded: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return isExpanded ? (
      <div className="h-10 rounded-lg bg-sidebar-accent/45" />
    ) : (
      <div className="flex w-full justify-center">
        <div className="h-10 w-10 rounded-lg bg-sidebar-accent/45" />
      </div>
    )
  }

  const isNightMode = resolvedTheme === "dark"
  const nextTheme = isNightMode ? "light" : "dark"
  const label = isNightMode ? "Night mode" : "Light mode"
  const actionLabel = `Switch to ${isNightMode ? "light" : "night"} mode`
  const Icon = isNightMode ? Moon : Sun

  const toggleButton = (
    <Button
      type="button"
      variant="ghost"
      size={isExpanded ? "default" : "icon"}
      aria-label={actionLabel}
      title={actionLabel}
      onClick={() => setTheme(nextTheme)}
      className={cn(
        "rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:scale-[0.98]",
        isExpanded ? "h-10 w-full justify-between px-3" : "flex h-10 w-10 items-center justify-center"
      )}
    >
      <span className={cn("flex items-center gap-2", isExpanded ? "" : "sr-only")}>
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </span>
      {isExpanded ? (
        <span
          aria-hidden="true"
          className={cn(
            "relative h-5 w-9 rounded-full border border-sidebar-border bg-sidebar-accent transition-colors duration-300",
            isNightMode && "bg-sidebar-foreground/20"
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 left-0.5 h-4 w-4 -translate-y-1/2 rounded-full bg-sidebar-foreground shadow-sm transition-transform duration-300",
              isNightMode && "translate-x-4"
            )}
          />
        </span>
      ) : (
        <Icon className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  )

  if (!isExpanded) {
    return <div className="flex w-full justify-center">{toggleButton}</div>
  }

  return toggleButton
}

export function AdminSidebar({
  userRole,
  userEmail,
  userName,
  notificationCounts,
  collapsed,
  mobileOpen,
  onMobileOpenChange,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isHoveringCollapsedSidebar, setIsHoveringCollapsedSidebar] = useState(false)

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(userRole)
  )

  const prioritizedNavigation =
    userRole === "reader"
      ? [
          ...filteredNavigation.filter((item) => item.href === "/admin/readings"),
          ...filteredNavigation.filter((item) => item.href !== "/admin/readings"),
        ]
      : filteredNavigation

  const initials = (userName || userEmail || "A")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  const isExpanded = mobileOpen || !collapsed || isHoveringCollapsedSidebar
  const desktopExpandedTextClasses = isExpanded ? "max-w-40 opacity-100 translate-x-0 delay-75" : "pointer-events-none max-w-0 opacity-0 -translate-x-2 delay-0"
  const desktopExpandedBlockClasses = isExpanded ? "opacity-100 translate-x-0 delay-75" : "pointer-events-none opacity-0 -translate-x-2 delay-0"
  const desktopCollapsedClasses = isExpanded ? "pointer-events-none opacity-0 scale-90" : "opacity-100 scale-100 delay-75"

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-out lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => onMobileOpenChange(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
          isExpanded ? "w-64" : "w-20"
        )}
        onMouseEnter={() => {
          if (collapsed) {
            setIsHoveringCollapsedSidebar(true)
          }
        }}
        onMouseLeave={() => setIsHoveringCollapsedSidebar(false)}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div
            className={cn(
              "flex h-16 items-center border-b border-sidebar-border transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              isExpanded ? "justify-between px-6" : "justify-center px-0"
            )}
          >
            <Link
              href="/admin/dashboard"
              className={cn("flex items-center", isExpanded ? "" : "w-full justify-center")}
            >
              <Image
                src="/jandj-logo.png"
                alt="J&J Water"
                width={32}
                height={32}
                className={cn("object-contain", isExpanded ? "h-8 w-8" : "h-9 w-9")}
              />
              <span
                className={cn(
                  "ml-2 overflow-hidden whitespace-nowrap text-base leading-tight font-bold text-sidebar-foreground transition-all duration-300 ease-out",
                  desktopExpandedTextClasses,
                )}
              >
                J&J WATER
              </span>
            </Link>
            <div className={cn("items-center gap-2 lg:hidden", isExpanded ? "flex" : "hidden")}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMobileOpenChange(false)}
                className="text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close sidebar</span>
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className={cn("flex-1 space-y-1 py-4 transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", isExpanded ? "px-3" : "px-2")}>
            {prioritizedNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              const isPriorityItem = userRole === "reader" && item.href === "/admin/readings"
              const notificationCount =
                item.href === "/admin/overdue"
                  ? notificationCounts?.overdueAccounts || 0
                  : item.href === "/admin/contact"
                    ? notificationCounts?.unreadContactInbox || 0
                    : 0
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => onMobileOpenChange(false)}
                  className={cn(
                    "relative flex items-center rounded-lg py-2 text-sm font-medium transition-all duration-300 ease-out",
                    isExpanded ? "gap-3 px-3" : "justify-center px-2",
                    isPriorityItem &&
                      "mb-3 border border-emerald-500/30 bg-emerald-500/10 text-sidebar-foreground shadow-sm shadow-emerald-900/10 hover:border-emerald-500/40 hover:bg-emerald-500/15",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                    <item.icon className={cn("h-5 w-5", isPriorityItem && "text-emerald-600")} />
                    {notificationCount > 0 && !isExpanded ? (
                      <span className="absolute -top-2 left-3 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white shadow-sm">
                        {notificationCount}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "overflow-hidden whitespace-nowrap transition-all duration-300 ease-out",
                      isExpanded ? "flex-1" : "flex-none",
                      desktopExpandedTextClasses,
                    )}
                  >
                    {item.name}
                  </span>
                  {notificationCount > 0 && isExpanded ? (
                    <span
                      className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white transition-all duration-300 ease-out"
                    >
                      {notificationCount}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className={cn("border-t border-sidebar-border py-4 transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", isExpanded ? "px-4" : "px-2")}>
            <div className="relative min-h-40">
              <div className={cn("space-y-3 transition-all duration-300 ease-out", desktopExpandedBlockClasses)}>
                <AdminThemeToggle isExpanded />
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="h-10 w-full justify-start gap-2 rounded-lg px-3 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </Button>
                <div className="rounded-xl bg-sidebar-accent/60 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-sidebar text-sidebar-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-sidebar-foreground">
                        {userName || userEmail}
                      </div>
                      <div className="text-xs text-sidebar-foreground/60">{formatRole(userRole)} Administrator</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={cn("absolute inset-x-0 top-0 space-y-3 transition-all duration-300 ease-out", desktopCollapsedClasses)}>
                <AdminThemeToggle isExpanded={false} />
                <div className="flex w-full justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="flex h-10 w-10 items-center justify-center text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Log out</span>
                  </Button>
                </div>
                <div className="flex justify-center">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
