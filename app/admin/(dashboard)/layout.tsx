import { requireAdminContext } from "@/lib/admin/auth"
import { AdminShell } from "@/components/admin/admin-shell"
import { isOverdueAccount, OPEN_BILLING_STATUSES } from "@/lib/overdue-accounts"

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { supabase, profile } = await requireAdminContext()

  const [{ data: openBillings }, { count: unreadContactCount }] = await Promise.all([
    supabase
      .from("billings")
      .select("customer_id")
      .in("status", [...OPEN_BILLING_STATUSES]),
    supabase
      .from("contact_submissions")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false),
  ])

  const openBillingCountsByCustomer = (openBillings || []).reduce<Record<string, number>>((acc, billing) => {
    acc[billing.customer_id] = (acc[billing.customer_id] || 0) + 1
    return acc
  }, {})

  const overdueAccountsCount = Object.values(openBillingCountsByCustomer).filter(isOverdueAccount).length

  return (
    <AdminShell
      profile={profile}
      notificationCounts={{
        overdueAccounts: overdueAccountsCount,
        unreadContactInbox: unreadContactCount || 0,
      }}
    >
      {children}
    </AdminShell>
  )
}
