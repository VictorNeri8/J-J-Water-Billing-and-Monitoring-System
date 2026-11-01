import { requireAdminContext } from "@/lib/admin/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BillingTable } from "@/components/admin/billing-table"
import { BillingFilters } from "@/components/admin/billing-filters"
import { BillingSummaryCards } from "@/components/admin/billing-summary-cards"

type BillingPageSearchParams = {
  month?: string
  year?: string
  all?: string
  paymentMethod?: string
}

function getDateRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextMonthYear = month === 12 ? year + 1 : year
  const end = `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`

  return { start, end }
}

function toValidMonth(value: string | undefined, fallback: number) {
  const month = Number(value)
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback
}

function toValidYear(value: string | undefined, fallback: number) {
  const year = Number(value)
  return Number.isInteger(year) && year > 0 ? year : fallback
}

function toValidPaymentMethod(value: string | undefined) {
  return value === "cash" || value === "online" ? value : "all"
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<BillingPageSearchParams>
}) {
  const { supabase } = await requireAdminContext(["finance"])

  const resolvedSearchParams = (await searchParams) || {}
  const now = new Date()
  const defaultMonth = now.getMonth() + 1
  const defaultYear = now.getFullYear()

  const isAll = resolvedSearchParams.all === "true"
  const selectedMonth = toValidMonth(resolvedSearchParams.month, defaultMonth)
  const selectedYear = toValidYear(resolvedSearchParams.year, defaultYear)
  const selectedPaymentMethod = toValidPaymentMethod(resolvedSearchParams.paymentMethod)

  const { data: billingDates } = await supabase
    .from("billings")
    .select("billing_date")
    .order("billing_date", { ascending: false })

  const yearOptions = Array.from(
    new Set(
      (billingDates || [])
        .map((billing) => new Date(billing.billing_date).getFullYear())
        .filter((year) => Number.isFinite(year)),
    ),
  ).sort((a, b) => b - a)

  let billingQuery = supabase
    .from("billings")
    .select(`
      *,
      customers (
        customer_name,
        account_number,
        contact_number
      ),
      meter_readings (
        current_reading
      )
    `)
    .order("billing_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })

  if (!isAll) {
    const { start, end } = getDateRange(selectedYear, selectedMonth)
    billingQuery = billingQuery.gte("billing_date", start).lt("billing_date", end)
  }

  if (selectedPaymentMethod !== "all") {
    billingQuery = billingQuery.eq("payment_method", selectedPaymentMethod)
  }

  const { data: billings } = await billingQuery

  const emptyMessage = isAll
    ? "No billing records found."
    : "No billing records found for this month."
  const filteredBillings = billings || []
  const totalBalance = filteredBillings.reduce(
    (sum, billing) => sum + Math.max((billing.amount || 0) - (billing.amount_paid || 0), 0),
    0,
  )
  const totalWaterConsumption = filteredBillings.reduce(
    (sum, billing) => sum + (billing.usage_cubic || 0),
    0,
  )
  const totalPaid = filteredBillings.reduce(
    (sum, billing) => sum + (billing.amount_paid || 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing Management</h1>
          <p className="text-muted-foreground">View customer billing records by month or across all entries.</p>
        </div>

        <BillingSummaryCards
          totalBalance={totalBalance}
          totalPaid={totalPaid}
          totalWaterConsumption={totalWaterConsumption}
        />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Billing Records</CardTitle>
            <CardDescription>
              {isAll
                ? "Showing all billing records."
                : "Showing billing records for the selected month and year."}
            </CardDescription>
          </div>
          <BillingFilters
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            isAll={isAll}
            selectedPaymentMethod={selectedPaymentMethod}
            yearOptions={yearOptions}
          />
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <BillingTable
            billings={filteredBillings}
            showPaymentButton
            emptyMessage={emptyMessage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
