import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowUpRight,
  BarChart3,
  CreditCard,
  FileText,
  Gauge,
  Mail,
  MapPin,
  TriangleAlert,
  TrendingUp,
  UserRoundX,
  Users,
} from "lucide-react"
import { DashboardRecentActivity } from "@/components/admin/dashboard-recent-activity"
import { DashboardRecentPaidCustomers } from "@/components/admin/dashboard-recent-paid-customers"
import { DashboardStubOutMapPreview } from "@/components/admin/dashboard-stub-out-map-preview"
import { DashboardCustomerSearch, type DashboardSearchCustomer } from "@/components/admin/dashboard-customer-search"
import { DashboardUnpaidBalanceCard } from "@/components/admin/dashboard-unpaid-balance-card"
import { requireAdminContext } from "@/lib/admin/auth"
import { SMS_FEATURE_ENABLED } from "@/lib/config/features"
import { isOverdueAccount, OPEN_BILLING_STATUSES, summarizeOpenBillingsByCustomer } from "@/lib/overdue-accounts"
import { createClient } from "@/lib/supabase/server"
import type { StubOutLocationSummary } from "@/lib/types"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type DashboardSummary = {
  analytics: {
    paidRevenue: number
    partialCollected: number
    totalUsage: number
    statusCounts: Record<string, number>
  }
  overdue: {
    count: number
    totalDue: number
    accounts: Array<{
      customerId: string
      accountNumber: string
      customerName: string
      totalDue: number
      openBillCount: number
      oldestUnpaidBillingDate: string
    }>
    topAccounts: Array<{
      customerId: string
      accountNumber: string
      customerName: string
      totalDue: number
      openBillCount: number
      oldestUnpaidBillingDate: string
    }>
  }
  sms: {
    sentCount: number
    failedCount: number
    pendingCount: number
    logs: Array<{
      id: string
      createdAt: string
      customerName: string
      accountNumber: string
      smsType: string
      status: string
    }>
  } | null
  contact: {
    unreadCount: number
    totalRecent: number
    submissions: Array<{
      id: string
      name: string
      subject: string
      isRead: boolean
      createdAt: string
    }>
  } | null
}

function getThirtyDaysAgoIsoDate() {
  const threshold = new Date()
  threshold.setDate(threshold.getDate() - 29)
  threshold.setHours(0, 0, 0, 0)
  return threshold.toISOString().split("T")[0]
}

function getCurrentMonthDetails() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date())
  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  const nextMonthYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1

  return {
    startDate: `${year}-${String(month).padStart(2, "0")}-01`,
    nextMonthStartDate: `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`,
    label: new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      month: "long",
    }).format(new Date()),
  }
}

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString()}`
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

function normalizeStubOutLocation(location: StubOutLocationSummary): StubOutLocationSummary {
  return {
    ...location,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    assigned_customer_count: Number(location.assigned_customer_count || 0),
  }
}

async function getDashboardData(supabase: SupabaseClient, isFinanceUser: boolean) {
  const thirtyDaysAgo = getThirtyDaysAgoIsoDate()
  const currentMonth = getCurrentMonthDetails()

  const [
    { count: totalCustomers },
    { count: activeCustomers },
    { count: inactiveCustomers },
    { data: searchCustomers },
    { data: stubOutLocationRows },
    { data: openBillings },
    paidRevenueResult,
    partialBillingsResult,
    readingsResult,
    statusBillingsResult,
    smsLogsResult,
    contactSubmissionsResult,
  ] = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("customers").select("*", { count: "exact", head: true }).is("archived_at", null).eq("is_active", true),
    supabase.from("customers").select("*", { count: "exact", head: true }).is("archived_at", null).eq("is_active", false),
    supabase
      .from("customers")
      .select(`
        id,
        account_number,
        customer_name,
        meter_id,
        address,
        contact_number,
        is_active,
        stub_out_locations (
          code,
          name,
          municipality,
          barangay,
          sitio,
          purok
        )
      `)
      .is("archived_at", null)
      .order("customer_name", { ascending: true }),
    supabase
      .from("stub_out_location_summaries")
      .select("*")
      .order("code", { ascending: true }),
    supabase
      .from("billings")
      .select(`
        id,
        customer_id,
        amount,
        amount_paid,
        status,
        billing_date,
        due_date,
        usage_cubic,
        updated_at,
        created_at,
        customers (
          customer_name,
          account_number
        )
      `)
      .in("status", [...OPEN_BILLING_STATUSES])
      .order("billing_date", { ascending: false })
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("billings")
      .select("customer_id, amount, amount_paid, status, paid_date, created_at")
      .eq("status", "paid")
      .not("paid_date", "is", null)
      .gte("paid_date", thirtyDaysAgo)
      .order("paid_date", { ascending: true }),
    supabase
      .from("billings")
      .select("customer_id, billing_date, amount_paid, status, created_at")
      .eq("status", "partial")
      .gt("amount_paid", 0)
      .gte("billing_date", thirtyDaysAgo)
      .order("billing_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("meter_readings")
      .select("usage_cubic, reading_date")
      .gte("reading_date", thirtyDaysAgo),
    supabase
      .from("billings")
      .select("customer_id, status, billing_date, created_at")
      .gte("billing_date", thirtyDaysAgo)
      .order("billing_date", { ascending: false })
      .order("created_at", { ascending: false }),
    isFinanceUser && SMS_FEATURE_ENABLED
      ? supabase
          .from("sms_logs")
          .select(`
            id,
            sms_type,
            status,
            created_at,
            customers (
              customer_name,
              account_number
            )
          `)
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] }),
    isFinanceUser
      ? supabase
          .from("contact_submissions")
          .select("id, name, subject, is_read, created_at")
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] }),
  ])

  const totalUnpaid =
    (openBillings || []).filter(
      (billing) => billing.billing_date >= currentMonth.startDate && billing.billing_date < currentMonth.nextMonthStartDate,
    ).reduce(
      (sum, billing) => sum + Math.max((billing.amount || 0) - (billing.amount_paid || 0), 0),
      0,
    ) || 0
  const overdueSummaries = summarizeOpenBillingsByCustomer(openBillings || [])
    .filter((summary) => isOverdueAccount(summary.openBillCount))

  const stubOutLocations = ((stubOutLocationRows || []) as StubOutLocationSummary[]).map(normalizeStubOutLocation)

  const stats = {
    totalCustomers: totalCustomers || 0,
    activeCustomers: activeCustomers || 0,
    inactiveCustomers: inactiveCustomers || 0,
    totalStubOut: stubOutLocations.reduce((sum, location) => sum + location.assigned_customer_count, 0),
    stubOutLocations,
    totalUnpaid,
    currentMonthLabel: currentMonth.label,
    overdueCount: overdueSummaries.length,
  }

  const paidRevenueByPayment = new Map<string, number>()
  for (const billing of paidRevenueResult.data || []) {
    const paidDate = billing.paid_date || ""
    const key = `${billing.customer_id}:${paidDate}`
    const amount = Number(billing.amount_paid || billing.amount || 0)
    paidRevenueByPayment.set(key, Math.max(paidRevenueByPayment.get(key) || 0, amount))
  }

  const latestPartialBillingsByCustomer = new Map<string, NonNullable<typeof partialBillingsResult.data>[number]>()
  for (const billing of partialBillingsResult.data || []) {
    if (!latestPartialBillingsByCustomer.has(billing.customer_id)) {
      latestPartialBillingsByCustomer.set(billing.customer_id, billing)
    }
  }

  const latestStatusBillingsByCustomer = new Map<string, NonNullable<typeof statusBillingsResult.data>[number]>()
  for (const billing of statusBillingsResult.data || []) {
    if (!latestStatusBillingsByCustomer.has(billing.customer_id)) {
      latestStatusBillingsByCustomer.set(billing.customer_id, billing)
    }
  }

  const statusCounts = Array.from(latestStatusBillingsByCustomer.values()).reduce<Record<string, number>>((acc, billing) => {
    const status = billing.status || "unknown"
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const overdueAccounts = overdueSummaries
    .map((summary) => {
      const firstBilling = summary.openBillings[0]
      const customer = Array.isArray(firstBilling.customers) ? firstBilling.customers[0] : firstBilling.customers

      return {
        customerId: summary.customerId,
        accountNumber: customer?.account_number || "-",
        customerName: customer?.customer_name || "Unknown",
        totalDue: summary.totalDue,
        openBillCount: summary.openBillCount,
        oldestUnpaidBillingDate: summary.oldestOpenBillingDate,
      }
    })
    .sort((a, b) => {
      const oldestDateSort = a.oldestUnpaidBillingDate.localeCompare(b.oldestUnpaidBillingDate)
      return oldestDateSort !== 0 ? oldestDateSort : b.totalDue - a.totalDue
    })
  const topOverdueAccounts = overdueAccounts
    .slice()
    .sort((a, b) => b.totalDue - a.totalDue)
    .slice(0, 5)

  const smsLogs = (smsLogsResult.data || []).map((log) => {
    const customer = Array.isArray(log.customers) ? log.customers[0] : log.customers
    return {
      id: log.id,
      createdAt: log.created_at,
      customerName: customer?.customer_name || "Unknown",
      accountNumber: customer?.account_number || "-",
      smsType: log.sms_type || "custom",
      status: log.status || "pending",
    }
  })

  const contactSubmissions = (contactSubmissionsResult.data || []).map((submission) => ({
    id: submission.id,
    name: submission.name,
    subject: submission.subject,
    isRead: Boolean(submission.is_read),
    createdAt: submission.created_at,
  }))

  const dashboardSummary: DashboardSummary = {
    analytics: {
      paidRevenue: Array.from(paidRevenueByPayment.values()).reduce((sum, amount) => sum + amount, 0),
      partialCollected: Array.from(latestPartialBillingsByCustomer.values()).reduce(
        (sum, billing) => sum + Number(billing.amount_paid || 0),
        0,
      ),
      totalUsage: (readingsResult.data || []).reduce((sum, reading) => sum + Number(reading.usage_cubic || 0), 0),
      statusCounts,
    },
    overdue: {
      count: overdueAccounts.length,
      totalDue: overdueAccounts.reduce((sum, account) => sum + account.totalDue, 0),
      accounts: overdueAccounts.slice(0, 3).map((account) => ({
        customerId: account.customerId,
        accountNumber: account.accountNumber,
        customerName: account.customerName,
        totalDue: account.totalDue,
        openBillCount: account.openBillCount,
        oldestUnpaidBillingDate: account.oldestUnpaidBillingDate,
      })),
      topAccounts: topOverdueAccounts
        .map((account) => ({
          customerId: account.customerId,
          accountNumber: account.accountNumber,
          customerName: account.customerName,
          totalDue: account.totalDue,
          openBillCount: account.openBillCount,
          oldestUnpaidBillingDate: account.oldestUnpaidBillingDate,
        })),
    },
    sms: isFinanceUser && SMS_FEATURE_ENABLED
      ? {
          sentCount: smsLogs.filter((log) => log.status === "sent").length,
          failedCount: smsLogs.filter((log) => log.status === "failed").length,
          pendingCount: smsLogs.filter((log) => log.status === "pending").length,
          logs: smsLogs.slice(0, 3),
        }
      : null,
    contact: isFinanceUser
      ? {
          unreadCount: contactSubmissions.filter((submission) => !submission.isRead).length,
          totalRecent: contactSubmissions.length,
          submissions: contactSubmissions.slice(0, 3),
        }
      : null,
  }

  return {
    stats,
    dashboardSummary,
    searchCustomers: (searchCustomers || []) as DashboardSearchCustomer[],
  }
}

function SummaryHeader({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <CardHeader className="space-y-0 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </CardHeader>
  )
}

function EmptySummary({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function StubOutLocationsCard({
  locations,
}: {
  locations: StubOutLocationSummary[]
}) {
  return (
    <Card>
      <SummaryHeader
        title="Stub Out Location"
        description="Map view of assigned customer stub out areas."
        href="/admin/stub-outs"
        icon={MapPin}
      />
      <CardContent>
        {locations.length === 0 ? (
          <EmptySummary>No stub out locations found.</EmptySummary>
        ) : (
          <DashboardStubOutMapPreview locations={locations} />
        )}
      </CardContent>
    </Card>
  )
}

function DashboardSummaries({ summary }: { summary: DashboardSummary }) {
  const analyticsStatusOrder = ["paid", "partial", "unpaid", "overdue"]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Dashboard Summary</h2>
        <p className="text-sm text-muted-foreground">Key finance items from the detailed work areas.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SummaryHeader
            title="Analytics"
            description="Last 30 days of usage, revenue, and billing status."
            href="/admin/analytics"
            icon={BarChart3}
          />
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Paid Revenue</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(summary.analytics.paidRevenue)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Partial Collected</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(summary.analytics.partialCollected)}</p>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Water Consumption</p>
                  <p className="text-xs text-muted-foreground">Recorded meter usage in the last 30 days</p>
                </div>
                <p className="shrink-0 text-lg font-semibold">
                  {summary.analytics.totalUsage.toLocaleString()} m3
                </p>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="mb-3">
                <p className="text-sm font-medium text-foreground">Billing Status</p>
                <p className="text-xs text-muted-foreground">Latest billing state per customer in the last 30 days</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                {analyticsStatusOrder.map((status) => (
                  <div key={status} className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-xs capitalize text-muted-foreground">{status}</p>
                    <p className="mt-1 text-base font-semibold">
                      {summary.analytics.statusCounts[status] || 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <SummaryHeader
            title="Overdue Accounts"
            description="Customers with 3 or more unpaid or partial bills."
            href="/admin/overdue"
            icon={TriangleAlert}
          />
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Overdue Accounts</p>
                <p className="mt-1 text-lg font-semibold text-destructive">{summary.overdue.count}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Due</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(summary.overdue.totalDue)}</p>
              </div>
            </div>

            {summary.overdue.accounts.length === 0 ? (
              <EmptySummary>No overdue accounts.</EmptySummary>
            ) : (
              <div className="space-y-3">
                {summary.overdue.accounts.map((account) => (
                  <div key={account.customerId} className="flex items-start justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{account.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.accountNumber} - {account.openBillCount} open bills
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">{formatCurrency(account.totalDue)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={summary.contact ? undefined : "lg:col-span-2"}>
          <SummaryHeader
            title="Top Overdue Accounts"
            description="Highest open balances from customers with 3+ open bills."
            href="/admin/analytics"
            icon={TriangleAlert}
          />
          <CardContent>
            {summary.overdue.topAccounts.length === 0 ? (
              <EmptySummary>No overdue accounts found.</EmptySummary>
            ) : (
              <>
                <div className="grid gap-3 md:hidden">
                  {summary.overdue.topAccounts.map((account) => (
                    <div key={account.customerId} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{account.customerName}</p>
                          <p className="text-xs text-muted-foreground">{account.accountNumber}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">{formatCurrency(account.totalDue)}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{account.openBillCount} open bills</span>
                        <Button variant="outline" size="sm" className="h-8 shrink-0 cursor-pointer" asChild>
                          <Link href={`/admin/customers/${account.customerId}`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden max-w-full overflow-x-auto rounded-md border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Account No.</TableHead>
                        <TableHead>Oldest Open Bill</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.overdue.topAccounts.map((account) => (
                        <TableRow key={account.customerId}>
                          <TableCell className="font-medium">{account.customerName}</TableCell>
                          <TableCell>{account.accountNumber}</TableCell>
                          <TableCell>{formatShortDate(account.oldestUnpaidBillingDate)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(account.totalDue)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                              <Link href={`/admin/customers/${account.customerId}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {summary.contact ? (
          <Card>
            <SummaryHeader
              title="Contact Inbox"
              description="Latest public-site inquiries and unread messages."
              href="/admin/contact"
              icon={Mail}
            />
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Unread</p>
                  <p className="mt-1 text-lg font-semibold">{summary.contact.unreadCount}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Recent Messages</p>
                  <p className="mt-1 text-lg font-semibold">{summary.contact.totalRecent}</p>
                </div>
              </div>

              {summary.contact.submissions.length === 0 ? (
                <EmptySummary>No unread messages.</EmptySummary>
              ) : (
                <div className="space-y-3">
                  {summary.contact.submissions.map((submission) => (
                    <div key={submission.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{submission.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {submission.name} - {formatShortDate(submission.createdAt)}
                        </p>
                      </div>
                      <Badge variant={submission.isRead ? "secondary" : "default"}>
                        {submission.isRead ? "Read" : "Unread"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const { supabase, profile } = await requireAdminContext()
  const { stats, dashboardSummary, searchCustomers } = await getDashboardData(supabase, profile.role === "finance")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your water district operations</p>
        </div>
        <DashboardCustomerSearch customers={searchCustomers} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.activeCustomers} active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Gauge className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="mr-1 inline h-3 w-3 text-green-500" />
              Receiving water service
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Connections</CardTitle>
            <UserRoundX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactiveCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Not receiving water service</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stub Out</CardTitle>
            <MapPin className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStubOut.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">With assigned locations</p>
          </CardContent>
        </Card>

        <DashboardUnpaidBalanceCard
          amount={formatCurrency(stats.totalUnpaid)}
          monthLabel={stats.currentMonthLabel}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Accounts</CardTitle>
            <TriangleAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      <StubOutLocationsCard locations={stats.stubOutLocations} />

      <DashboardSummaries summary={dashboardSummary} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Previous Paid Customers
          </CardTitle>
          <CardDescription>Recently completed customer payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardRecentPaidCustomers />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Meter Readings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardRecentActivity />
        </CardContent>
      </Card>
    </div>
  )
}
