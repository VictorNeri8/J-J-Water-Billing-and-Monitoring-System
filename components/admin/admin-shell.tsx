"use client"

import { useState } from "react"
import type { AdminProfile } from "@/lib/types"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

interface AdminShellProps {
  profile: AdminProfile
  notificationCounts: {
    overdueAccounts: number
    unreadContactInbox: number
  }
  children: React.ReactNode
}

export function AdminShell({ profile, notificationCounts, children }: AdminShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
        userRole={profile.role}
        userEmail={profile.email}
        userName={profile.full_name}
        notificationCounts={notificationCounts}
        collapsed
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />
      <div
        className="flex min-h-screen min-w-0 flex-1 flex-col transition-[padding-left] duration-300 ease-out lg:pl-20"
      >
        <AdminHeader
          onToggleSidebar={() => setMobileSidebarOpen((current) => !current)}
        />
        <main className="min-w-0 flex-1 p-4 transition-all duration-300 ease-out sm:p-6">{children}</main>
      </div>
    </div>
  )
}
