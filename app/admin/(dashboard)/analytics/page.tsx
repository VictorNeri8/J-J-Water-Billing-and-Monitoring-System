import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnalyticsCharts } from "@/components/admin/analytics-charts"
import { AnalyticsRangeSelector } from "@/components/admin/analytics-range-selector"
import { requireAdminContext } from "@/lib/admin/auth"
import { getOverdueOpenBillingSummaries, OPEN_BILLING_STATUSES } from "@/lib/overdue-accounts"

type AnalyticsPageProps = {
  searchParams?: Promise<{
    range?: string
  }>
}

type BillingRow = {
  id: string
  customer_id: string
  billing_date: string
  due_date: string
  amount: number | null
  amount_paid: number | null
  status: string | null
  paid_date: string | null
  payment_method?: string | null
  created_at?: string | null
  customers:
    | {
        customer_name?: string | null
        account_number?: string | null
      }
    | {
        customer_name?: string | null
        account_number?: string | null
      }[]
    | null
}

type MeterReadingRow = {
  customer_id: string
  reading_date: string
  usage_cubic: number | null
  created_at?: string | null
}

const RANGE_OPTIONS = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Monthly", value: "monthly" },
  { label: "Year", value: "year" },
] as const

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"]

function resolveStartDate(range: RangeValue) {
  const today = new Date()

  if (range === "7d") {
    const start = new Date(today)
    start.setDate(today.getDate() - 6)
    return start
  }

  if (range === "30d") {
    const start = new Date(today)
    start.setDate(today.getDate() - 29)
    return start
  }

  if (range === "year") {
    return new Date(today.getFullYear(), 0, 1)
  }

  return null
}

function isMonthlyRange(range: RangeValue) {
  return range === "monthly" || range === "year"
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatBucket(date: Date, range: RangeValue) {
  if (range === "7d" || range === "30d") {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
  }

  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date)
}

function getBucketDate(date: Date, range: RangeValue) {
  if (isMonthlyRange(range)) {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getBucketKey(date: Date, range: RangeValue) {
  const bucketDate = getBucketDate(date, range)
  return isMonthlyRange(range)
    ? `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, "0")}-01`
    : formatDateOnly(bucketDate)
}

function buildBucketOrder(dateValues: string[], range: RangeValue, startDate: Date | null) {
  if (range === "7d" || range === "30d") {
    const start = startDate ? new Date(startDate) : new Date()
    const end = new Date()
    const buckets: string[] = []
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())

    while (cursor <= endDate) {
      buckets.push(formatDateOnly(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }

    return buckets
  }

  if (range === "year" && startDate) {
    const buckets: string[] = []
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    const today = new Date()
    const endDate = new Date(today.getFullYear(), today.getMonth(), 1)

    while (cursor <= endDate) {
      buckets.push(formatDateOnly(cursor))
      cursor.setMonth(cursor.getMonth() + 1)
    }

    return buckets
  }

  return [...new Set(dateValues.map((value) => getBucketKey(parseDateOnly(value), range)))]
    .sort((a, b) => parseDateOnly(a).getTime() - parseDateOnly(b).getTime())
}

function aggregateUsage(rows: MeterReadingRow[], range: RangeValue, startDate: Date | null) {
  const usageMap = new Map<string, number>()

  for (const row of rows) {
    const key = getBucketKey(parseDateOnly(row.reading_date), range)
    usageMap.set(key, (usageMap.get(key) || 0) + Number(row.usage_cubic || 0))
  }

  return buildBucketOrder(rows.map((row) => row.reading_date), range, startDate).map((bucketKey) => ({
    month: formatBucket(parseDateOnly(bucketKey), range),
    total_usage: usageMap.get(bucketKey) || 0,
  }))
}

function aggregatePaidRevenue(rows: BillingRow[], range: RangeValue, startDate: Date | null) {
  const effectivePaymentMap = new Map<string, number>()

  for (const row of rows) {
    if (row.status !== "paid" || !row.paid_date) {
      continue
    }

    const effectiveKey = `${row.customer_id}:${row.paid_date}`
    const effectiveAmount = Number(row.amount_paid || row.amount || 0)
    effectivePaymentMap.set(effectiveKey, Math.max(effectivePaymentMap.get(effectiveKey) || 0, effectiveAmount))
  }

  const revenueMap = new Map<string, number>()

  for (const [effectiveKey, effectiveAmount] of effectivePaymentMap.entries()) {
    const [, paidDate] = effectiveKey.split(":")
    const key = getBucketKey(parseDateOnly(paidDate), range)
    revenueMap.set(key, (revenueMap.get(key) || 0) + effectiveAmount)
  }

  const revenueDates = [...effectivePaymentMap.keys()].map((key) => key.split(":")[1])

  return buildBucketOrder(revenueDates, range, startDate).map((bucketKey) => ({
    month: formatBucket(parseDateOnly(bucketKey), range),
    total_revenue: revenueMap.get(bucketKey) || 0,
  }))
}

function aggregatePartialRevenue(rows: BillingRow[], range: RangeValue, startDate: Date | null) {
  const partialRevenueRows = getLatestBillingsByCustomer(rows)
    .filter((row) => row.status === "partial" && Number(row.amount_paid || 0) > 0)

  const revenueMap = new Map<string, number>()

  for (const row of partialRevenueRows) {
    const key = getBucketKey(parseDateOnly(row.billing_date), range)
    revenueMap.set(key, (revenueMap.get(key) || 0) + Number(row.amount_paid || 0))
  }

  return buildBucketOrder(partialRevenueRows.map((row) => row.billing_date), range, startDate).map((bucketKey) => ({
    month: formatBucket(parseDateOnly(bucketKey), range),
    total_revenue: revenueMap.get(bucketKey) || 0,
  }))
}

function getCollectedAmount(row: BillingRow) {
  const paidAmount = Number(row.amount_paid || 0)

  if (paidAmount > 0) {
    return paidAmount
  }

  if (row.status === "paid") {
    return Number(row.amount || 0)
  }

  return 0
}

function getRemainingBalance(row: BillingRow) {
  if (row.status === "paid") {
    return 0
  }

  return Math.max(Number(row.amount || 0) - Number(row.amount_paid || 0), 0)
}

function aggregateOutstandingBalance(rows: BillingRow[], range: RangeValue, startDate: Date | null) {
  const outstandingMap = new Map<string, number>()
  const openRows = rows.filter((row) => getRemainingBalance(row) > 0)

  for (const row of openRows) {
    const key = getBucketKey(parseDateOnly(row.billing_date), range)
    outstandingMap.set(key, (outstandingMap.get(key) || 0) + getRemainingBalance(row))
  }

  return buildBucketOrder(rows.map((row) => row.billing_date), range, startDate).map((bucketKey) => ({
    month: formatBucket(parseDateOnly(bucketKey), range),
    total_outstanding: outstandingMap.get(bucketKey) || 0,
  }))
}

function aggregatePaymentMethods(rows: BillingRow[]) {
  const totals = {
    cash: 0,
    online: 0,
  }

  for (const row of rows) {
    const collectedAmount = getCollectedAmount(row)

    if (row.payment_method === "cash") {
      totals.cash += collectedAmount
    }

    if (row.payment_method === "online") {
      totals.online += collectedAmount
    }
  }

  return [
    {
      method: "cash",
      label: "Cash",
      total_collected: totals.cash,
      fill: "hsl(var(--chart-2))",
    },
    {
      method: "online",
      label: "Online",
      total_collected: totals.online,
      fill: "hsl(var(--chart-1))",
    },
  ]
}

function getCustomerInfo(row: BillingRow) {
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers

  return {
    customerName: customer?.customer_name || "Unknown",
    accountNumber: customer?.account_number || "-",
  }
}

function getOverdueAccounts(rows: BillingRow[]) {
  return getOverdueOpenBillingSummaries(rows)
    .map((summary) => {
      const customer = getCustomerInfo(summary.openBillings[0])

      return {
        customerId: summary.customerId,
        customerName: customer.customerName,
        accountNumber: customer.accountNumber,
        oldestUnpaidBillingDate: summary.oldestOpenBillingDate,
        openBillCount: summary.openBillCount,
        remainingBalance: summary.totalUnpaid,
      }
    })
    .sort((a, b) => b.remainingBalance - a.remainingBalance)
}

function getTopOverdueAccounts(rows: BillingRow[]) {
  return getOverdueAccounts(rows).slice(0, 5)
}

function getAnalyticsSummary(rows: BillingRow[], overdueRows: BillingRow[]) {
  const billedAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const collectedAmount = rows.reduce((sum, row) => sum + getCollectedAmount(row), 0)
  const outstandingBalance = rows.reduce((sum, row) => sum + getRemainingBalance(row), 0)
  const paymentMethodData = aggregatePaymentMethods(rows)
  const overdueAccounts = getOverdueAccounts(overdueRows)

  return {
    billedAmount,
    collectedAmount,
    collectionRate: billedAmount > 0 ? (collectedAmount / billedAmount) * 100 : 0,
    outstandingBalance,
    cashCollected: paymentMethodData.find((item) => item.method === "cash")?.total_collected || 0,
    onlineCollected: paymentMethodData.find((item) => item.method === "online")?.total_collected || 0,
    overdueCount: overdueAccounts.length,
    overdueTotal: overdueAccounts.reduce((sum, account) => sum + account.remainingBalance, 0),
  }
}

function getLatestBillingsByCustomer(rows: BillingRow[]) {
  return rows
    .slice()
    .sort((a, b) => {
      const dateDiff = parseDateOnly(b.billing_date).getTime() - parseDateOnly(a.billing_date).getTime()
      if (dateDiff !== 0) {
        return dateDiff
      }

      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })
    .reduce<BillingRow[]>((acc, row) => {
      if (!acc.some((item) => item.customer_id === row.customer_id)) {
        acc.push(row)
      }

      return acc
    }, [])
}

function aggregateStatus(rows: BillingRow[]) {
  const statusMap = new Map<string, number>()

  for (const row of getLatestBillingsByCustomer(rows)) {
    const key = row.status || "unknown"
    statusMap.set(key, (statusMap.get(key) || 0) + 1)
  }

  return [...statusMap.entries()].map(([status, value]) => ({ status, value }))
}

function getStatusFill(status: string) {
  if (status === "paid") return "hsl(var(--chart-2))"
  if (status === "partial") return "hsl(var(--chart-4))"
  if (status === "unpaid") return "var(--destructive)"
  return "hsl(var(--chart-5))"
}

async function fetchAnalyticsData(range: RangeValue) {
  const { supabase } = await requireAdminContext(["reader", "finance"])
  const startDate = resolveStartDate(range)
  const startDateString = startDate ? formatDateOnly(startDate) : null

  const statusBillingQuery = supabase
    .from("billings")
    .select(`
      id,
      customer_id,
      billing_date,
      due_date,
      amount,
      amount_paid,
      status,
      paid_date,
      payment_method,
      created_at,
      customers (
        customer_name,
        account_number
      )
    `)
    .order("billing_date", { ascending: true })
    .order("created_at", { ascending: true })

  const revenueBillingQuery = supabase
    .from("billings")
    .select(`
      id,
      customer_id,
      billing_date,
      due_date,
      amount,
      amount_paid,
      status,
      paid_date,
      payment_method,
      created_at,
      customers (
        customer_name,
        account_number
      )
    `)
    .eq("status", "paid")
    .not("paid_date", "is", null)
    .order("paid_date", { ascending: true })
    .order("created_at", { ascending: true })

  const openBillingQuery = supabase
    .from("billings")
    .select(`
      id,
      customer_id,
      billing_date,
      due_date,
      amount,
      amount_paid,
      status,
      paid_date,
      payment_method,
      created_at,
      customers (
        customer_name,
        account_number
      )
    `)
    .in("status", [...OPEN_BILLING_STATUSES])
    .order("billing_date", { ascending: true })
    .order("created_at", { ascending: true })

  const readingQuery = supabase
    .from("meter_readings")
    .select("customer_id, reading_date, usage_cubic, created_at")
    .order("reading_date", { ascending: true })
    .order("created_at", { ascending: true })

  const [
    { data: statusBillings, error: statusBillingError },
    { data: revenueBillings, error: revenueBillingError },
    { data: openBillings, error: openBillingError },
    { data: readings, error: readingError },
  ] = await Promise.all([
    startDateString ? statusBillingQuery.gte("billing_date", startDateString) : statusBillingQuery,
    startDateString ? revenueBillingQuery.gte("paid_date", startDateString) : revenueBillingQuery,
    openBillingQuery,
    startDateString ? readingQuery.gte("reading_date", startDateString) : readingQuery,
  ])

  if (statusBillingError) {
    throw statusBillingError
  }

  if (revenueBillingError) {
    throw revenueBillingError
  }

  if (openBillingError) {
    throw openBillingError
  }

  if (readingError) {
    throw readingError
  }

  const statusBillingRows = (statusBillings || []) as BillingRow[]
  const revenueBillingRows = (revenueBillings || []) as BillingRow[]
  const openBillingRows = (openBillings || []) as BillingRow[]
  const readingRows = (readings || []) as MeterReadingRow[]

  return {
    usageData: aggregateUsage(readingRows, range, startDate),
    paidRevenueData: aggregatePaidRevenue(revenueBillingRows, range, startDate),
    partialRevenueData: aggregatePartialRevenue(statusBillingRows, range, startDate),
    outstandingBalanceData: aggregateOutstandingBalance(statusBillingRows, range, startDate),
    paymentMethodData: aggregatePaymentMethods(statusBillingRows),
    topOverdueAccounts: getTopOverdueAccounts(openBillingRows),
    summary: getAnalyticsSummary(statusBillingRows, openBillingRows),
    statusData: aggregateStatus(statusBillingRows).map((row) => ({
      ...row,
      fill: getStatusFill(row.status),
    })),
  }
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const resolvedSearchParams = (await searchParams) || {}
  const range: RangeValue = RANGE_OPTIONS.some((option) => option.value === resolvedSearchParams.range)
    ? (resolvedSearchParams.range as RangeValue)
    : "30d"

  const {
    usageData,
    paidRevenueData,
    partialRevenueData,
    outstandingBalanceData,
    paymentMethodData,
    topOverdueAccounts,
    summary,
    statusData,
  } = await fetchAnalyticsData(range)

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Water usage, revenue, and billing status trends</p>
        </div>

        <AnalyticsRangeSelector value={range} options={RANGE_OPTIONS} />
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Analytics Summary</CardTitle>
          <CardDescription className="break-words leading-relaxed">
            The charts below are grouped daily for 7-day and 30-day views, and monthly for the year and monthly views.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 px-3 sm:px-6">
          <AnalyticsCharts
            usageData={usageData}
            paidRevenueData={paidRevenueData}
            partialRevenueData={partialRevenueData}
            outstandingBalanceData={outstandingBalanceData}
            paymentMethodData={paymentMethodData}
            topOverdueAccounts={topOverdueAccounts}
            summary={summary}
            statusData={statusData}
            range={range}
          />
        </CardContent>
      </Card>
    </div>
  )
}
