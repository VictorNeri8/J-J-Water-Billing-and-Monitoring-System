"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type UsageDatum = {
  month: string
  total_usage: number
}

type RevenueDatum = {
  month: string
  total_revenue: number
}

type StatusDatum = {
  status: string
  value: number
  fill: string
}

type OutstandingDatum = {
  month: string
  total_outstanding: number
}

type PaymentMethodDatum = {
  method: string
  label: string
  total_collected: number
  fill: string
}

type AnalyticsSummary = {
  billedAmount: number
  collectedAmount: number
  collectionRate: number
  outstandingBalance: number
  cashCollected: number
  onlineCollected: number
  overdueCount: number
  overdueTotal: number
}

type TopOverdueAccount = {
  customerId: string
  customerName: string
  accountNumber: string
  oldestUnpaidBillingDate: string
  openBillCount: number
  remainingBalance: number
}

type AnalyticsChartsProps = {
  usageData: UsageDatum[]
  paidRevenueData: RevenueDatum[]
  partialRevenueData: RevenueDatum[]
  outstandingBalanceData: OutstandingDatum[]
  paymentMethodData: PaymentMethodDatum[]
  topOverdueAccounts: TopOverdueAccount[]
  summary: AnalyticsSummary
  statusData: StatusDatum[]
  range: "7d" | "30d" | "year" | "monthly"
}

const usageChartConfig = {
  total_usage: {
    label: "Water Usage",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const revenueChartConfig = {
  total_revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const outstandingChartConfig = {
  total_outstanding: {
    label: "Outstanding Balance",
    color: "var(--destructive)",
  },
} satisfies ChartConfig

const paymentMethodChartConfig = {
  total_collected: {
    label: "Collected",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const statusChartConfig = {
  paid: {
    label: "Paid",
    color: "hsl(var(--chart-2))",
  },
  unpaid: {
    label: "Unpaid",
    color: "var(--destructive)",
  },
  partial: {
    label: "Partial",
    color: "hsl(var(--chart-4))",
  },
  overdue: {
    label: "Overdue",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig

function formatCurrency(value: number) {
  return `₱${value.toLocaleString()}`
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export function AnalyticsCharts({
  usageData,
  paidRevenueData,
  partialRevenueData,
  outstandingBalanceData,
  paymentMethodData,
  topOverdueAccounts,
  summary,
  statusData,
  range,
}: AnalyticsChartsProps) {
  const [revenueMode, setRevenueMode] = useState<"paid" | "partial">("paid")
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)")
    const sync = () => setIsMobile(mediaQuery.matches)

    sync()
    mediaQuery.addEventListener("change", sync)

    return () => mediaQuery.removeEventListener("change", sync)
  }, [])

  const isMonthlyRange = range === "monthly" || range === "year"

  const usageDescription =
    isMonthlyRange
      ? "Monthly billed water usage based on recorded meter readings"
      : "Daily billed water usage based on recorded meter readings"

  const revenueDescription = revenueMode === "paid"
    ? isMonthlyRange
      ? "Monthly revenue grouped by payment date from completed payments"
      : "Daily revenue grouped by payment date from completed payments"
    : isMonthlyRange
      ? "Monthly partially collected revenue from currently partial accounts"
      : "Daily partially collected revenue from currently partial accounts"

  const revenueData = revenueMode === "paid" ? paidRevenueData : partialRevenueData
  const revenueColor = revenueMode === "paid" ? "var(--color-total_revenue)" : "hsl(var(--chart-4))"
  const chartHeightClass = isMobile ? "aspect-auto h-[230px] w-full max-w-full overflow-hidden" : "min-h-[300px] w-full"
  const chartCardClass = "min-w-0 overflow-hidden"
  const chartHeaderClass = "min-w-0 px-4 sm:px-6"
  const chartDescriptionClass = "break-words leading-relaxed"
  const chartContentClass = "min-w-0 px-4 sm:px-6"
  const chartMargin = { top: 8, right: isMobile ? 4 : 16, left: isMobile ? 4 : 0, bottom: 0 }
  const pieInnerRadius = isMobile ? 38 : 70
  const pieOuterRadius = isMobile ? 62 : 110

  return (
    <div className="min-w-0 space-y-6">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={chartCardClass}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Collection Rate</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatPercent(summary.collectionRate)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(summary.collectedAmount)} of {formatCurrency(summary.billedAmount)}
            </p>
          </CardContent>
        </Card>

        <Card className={chartCardClass}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p className="mt-2 text-2xl font-bold text-destructive">{formatCurrency(summary.outstandingBalance)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Open balance in the selected range</p>
          </CardContent>
        </Card>

        <Card className={chartCardClass}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Payment Method Split</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {formatCurrency(summary.cashCollected)} / {formatCurrency(summary.onlineCollected)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Cash / Online collected</p>
          </CardContent>
        </Card>

        <Card className={chartCardClass}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Overdue Account Total</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(summary.overdueTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{summary.overdueCount} account{summary.overdueCount === 1 ? "" : "s"} with 3+ open bills</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <Card className={chartCardClass}>
        <CardHeader className={chartHeaderClass}>
          <CardTitle>Water Consumption</CardTitle>
          <CardDescription className={chartDescriptionClass}>{usageDescription}</CardDescription>
        </CardHeader>
        <CardContent className={chartContentClass}>
          <ChartContainer config={usageChartConfig} className={chartHeightClass}>
            <LineChart data={usageData} margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis
                tickLine={false}
                axisLine={false}
                hide={isMobile}
                width={isMobile ? 0 : 36}
                tickFormatter={(value) => `${value} m3`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => <span className="font-medium">{Number(value).toLocaleString()} m3</span>}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="total_usage"
                stroke="var(--color-total_usage)"
                strokeWidth={3}
                dot={{ fill: "var(--color-total_usage)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className={chartCardClass}>
        <CardHeader className={chartHeaderClass}>
          <CardTitle>Billing Status</CardTitle>
          <CardDescription className={chartDescriptionClass}>Distribution of billing records by current status</CardDescription>
        </CardHeader>
        <CardContent className={chartContentClass}>
          <ChartContainer config={statusChartConfig} className={chartHeightClass}>
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="status"
                    formatter={(value, name) => (
                      <div className="flex min-w-[8rem] items-center justify-between gap-2">
                        <span>{String(name)}</span>
                        <span className="font-medium">{Number(value).toLocaleString()}</span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="status"
                cx="50%"
                cy="48%"
                innerRadius={pieInnerRadius}
                outerRadius={pieOuterRadius}
                paddingAngle={3}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="status" className="justify-start sm:justify-center" />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className={chartCardClass}>
        <CardHeader className={chartHeaderClass}>
          <CardTitle>Outstanding Balance Trend</CardTitle>
          <CardDescription className={chartDescriptionClass}>
            {isMonthlyRange ? "Monthly open balance from unpaid and partial billings" : "Daily open balance from unpaid and partial billings"}
          </CardDescription>
        </CardHeader>
        <CardContent className={chartContentClass}>
          <ChartContainer config={outstandingChartConfig} className={chartHeightClass}>
            <LineChart data={outstandingBalanceData} margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis
                tickLine={false}
                axisLine={false}
                hide={isMobile}
                width={isMobile ? 0 : 48}
                tickFormatter={(value) => `₱${Number(value).toLocaleString()}`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => <span className="font-medium">{formatCurrency(Number(value))}</span>}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="total_outstanding"
                stroke="var(--color-total_outstanding)"
                strokeWidth={3}
                dot={{ fill: "var(--color-total_outstanding)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className={chartCardClass}>
        <CardHeader className={chartHeaderClass}>
          <CardTitle>Payment Method Split</CardTitle>
          <CardDescription className={chartDescriptionClass}>Collected payments grouped by recorded payment method</CardDescription>
        </CardHeader>
        <CardContent className={chartContentClass}>
          <ChartContainer config={paymentMethodChartConfig} className={chartHeightClass}>
            <BarChart data={paymentMethodData} margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                hide={isMobile}
                width={isMobile ? 0 : 48}
                tickFormatter={(value) => `₱${Number(value).toLocaleString()}`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => <span className="font-medium">{formatCurrency(Number(value))}</span>}
                  />
                }
              />
              <Bar dataKey="total_collected" radius={8}>
                {paymentMethodData.map((entry) => (
                  <Cell key={entry.method} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className={`${chartCardClass} lg:col-span-2`}>
        <CardHeader className={chartHeaderClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription className={chartDescriptionClass}>{revenueDescription}</CardDescription>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                size="sm"
                variant={revenueMode === "paid" ? "default" : "outline"}
                className={`flex-1 sm:flex-none ${
                  revenueMode === "paid"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "border-green-200 text-green-700 hover:bg-green-50"
                }`}
                onClick={() => setRevenueMode("paid")}
              >
                Paid
              </Button>
              <Button
                type="button"
                size="sm"
                variant={revenueMode === "partial" ? "default" : "outline"}
                className={`flex-1 sm:flex-none ${
                  revenueMode === "partial"
                    ? "bg-yellow-500 text-white hover:bg-yellow-600"
                    : "border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                }`}
                onClick={() => setRevenueMode("partial")}
              >
                Partial
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className={chartContentClass}>
          <ChartContainer config={revenueChartConfig} className={chartHeightClass}>
            <BarChart data={revenueData} margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis
                tickLine={false}
                axisLine={false}
                hide={isMobile}
                width={isMobile ? 0 : 48}
                tickFormatter={(value) => `₱${Number(value).toLocaleString()}`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => <span className="font-medium">₱{Number(value).toLocaleString()}</span>}
                  />
                }
              />
              <Bar dataKey="total_revenue" radius={8} fill={revenueColor} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className={`${chartCardClass} lg:col-span-2`}>
        <CardHeader className={chartHeaderClass}>
          <CardTitle>Top Overdue Accounts</CardTitle>
          <CardDescription className={chartDescriptionClass}>Highest open balances from customers with 3+ open bills</CardDescription>
        </CardHeader>
        <CardContent className={chartContentClass}>
          {topOverdueAccounts.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No overdue accounts in this range.
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto rounded-md border">
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
                  {topOverdueAccounts.map((account) => (
                    <TableRow key={account.customerId}>
                      <TableCell className="font-medium">{account.customerName}</TableCell>
                      <TableCell>{account.accountNumber}</TableCell>
                      <TableCell>{formatShortDate(account.oldestUnpaidBillingDate)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(account.remainingBalance)}</TableCell>
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
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
