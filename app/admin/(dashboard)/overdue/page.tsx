import { TriangleAlert } from "lucide-react"
import { requireAdminContext } from "@/lib/admin/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OverdueAccountsTable } from "@/components/admin/overdue-accounts-table"
import { getOverdueOpenBillingSummaries, OPEN_BILLING_STATUSES } from "@/lib/overdue-accounts"
import type { AdminRole, OverdueAccount } from "@/lib/types"

function buildOverdueAccounts(
  openBillings: Array<{
    id: string
    customer_id: string
    billing_date: string
    due_date: string
    usage_cubic: number | null
    amount: number
    amount_paid: number | null
    status: "unpaid" | "partial" | "overdue"
    customers:
      | {
          customer_name?: string | null
          account_number?: string | null
          address?: string | null
          contact_number?: string | null
          stop_out?: string | null
        }
      | {
          customer_name?: string | null
          account_number?: string | null
          address?: string | null
          contact_number?: string | null
          stop_out?: string | null
        }[]
      | null
  }>,
) {
  return getOverdueOpenBillingSummaries(openBillings)
    .map((summary) => {
      const firstBilling = summary.openBillings[0]
      const customer = Array.isArray(firstBilling.customers) ? firstBilling.customers[0] : firstBilling.customers

      return {
        customerId: summary.customerId,
        accountNumber: customer?.account_number || "-",
        customerName: customer?.customer_name || "Unknown",
        address: customer?.address || null,
        contactNumber: customer?.contact_number || null,
        stopOut: customer?.stop_out || null,
        totalUnpaid: summary.totalUnpaid,
        totalUnpaidConsumption: summary.totalUnpaidConsumption,
        penaltyFee: summary.penaltyFee,
        totalDue: summary.totalDue,
        openBillCount: summary.openBillCount,
        oldestUnpaidBillingDate: summary.oldestOpenBillingDate,
        latestOpenBillingDate: summary.latestOpenBillingDate,
        openBillings: summary.openBillings
          .map((billing) => ({
            id: billing.id,
            billingDate: billing.billing_date,
            dueDate: billing.due_date,
            usageCubic: billing.usage_cubic || 0,
            amount: billing.amount,
            amountPaid: billing.amount_paid || 0,
            status: billing.status,
          }))
          .sort((a, b) => a.billingDate.localeCompare(b.billingDate)),
      } satisfies OverdueAccount
    })
    .sort((a, b) => a.oldestUnpaidBillingDate.localeCompare(b.oldestUnpaidBillingDate))
}

export default async function OverdueAccountsPage() {
  const { supabase, profile } = await requireAdminContext(["reader", "finance"])

  const { data: openBillings } = await supabase
    .from("billings")
    .select(`
      id,
      customer_id,
      billing_date,
      due_date,
      usage_cubic,
      amount,
      amount_paid,
      status,
      customers (
        customer_name,
        account_number,
        address,
        contact_number,
        stop_out
      )
    `)
    .in("status", [...OPEN_BILLING_STATUSES])
    .order("billing_date", { ascending: true })

  const overdueAccounts = buildOverdueAccounts(openBillings || [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Overdue Accounts
          </h1>
          <p className="text-muted-foreground">
            Customers with 3 or more unpaid or partial bills.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          <TriangleAlert className="h-4 w-4 text-destructive" />
          <span>{overdueAccounts.length} overdue account{overdueAccounts.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overdue Accounts</CardTitle>
          <CardDescription>
            Review customers with 3 or more open bills and process payments if you are a finance user.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <OverdueAccountsTable
            role={profile.role as AdminRole}
            accounts={overdueAccounts}
          />
        </CardContent>
      </Card>
    </div>
  )
}
