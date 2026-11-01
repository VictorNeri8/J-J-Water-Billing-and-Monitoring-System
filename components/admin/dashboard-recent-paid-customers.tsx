import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"

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

export async function DashboardRecentPaidCustomers() {
  const supabase = await createClient()

  const { data: paidBillings } = await supabase
    .from("billings")
    .select(`
      id,
      billing_date,
      amount_paid,
      paid_date,
      payment_method,
      customers (
        customer_name,
        account_number,
        meter_id
      )
    `)
    .eq("status", "paid")
    .not("paid_date", "is", null)
    .order("paid_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8)

  if (!paidBillings || paidBillings.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No previous paid customers yet.
      </div>
    )
  }

  const rows = paidBillings.map((billing) => {
    const customer = Array.isArray(billing.customers)
      ? billing.customers[0]
      : billing.customers

    return {
      id: billing.id,
      customerName: customer?.customer_name || "Unknown",
      accountNumber: customer?.account_number || "-",
      meterId: customer?.meter_id || "-",
      billingDate: billing.billing_date,
      amountPaid: Number(billing.amount_paid || 0),
      paymentMethod: billing.payment_method || "-",
      paidDate: billing.paid_date!,
    }
  })

  return (
    <>
      {/* Mobile card view */}
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.customerName}</p>
                <p className="text-xs text-muted-foreground">{row.accountNumber}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold">{formatCurrency(row.amountPaid)}</p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Paid {formatShortDate(row.paidDate)}</span>
              <span className="capitalize">{row.paymentMethod}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden max-w-full overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Account No.</TableHead>
              <TableHead>Meter ID</TableHead>
              <TableHead>Billing Date</TableHead>
              <TableHead className="text-right">Amount Paid</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Paid Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.customerName}</TableCell>
                <TableCell>{row.accountNumber}</TableCell>
                <TableCell>{row.meterId}</TableCell>
                <TableCell>{formatShortDate(row.billingDate)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(row.amountPaid)}</TableCell>
                <TableCell className="capitalize">{row.paymentMethod}</TableCell>
                <TableCell>{formatShortDate(row.paidDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
