import { createClient } from "@/lib/supabase/server"
import { differenceInDays, format } from "date-fns"
import { Badge } from "@/components/ui/badge"

export async function DashboardOverdueAccounts() {
  const supabase = await createClient()

  const { data: overdueAccounts } = await supabase
    .from("billings")
    .select(`
      id,
      customer_id,
      due_date,
      amount,
      amount_paid,
      customers (
        customer_name,
        account_number
      )
    `)
    .in("status", ["unpaid", "partial"])
    .order("due_date", { ascending: true })

  if (!overdueAccounts || overdueAccounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">No overdue accounts</p>
        <p className="mt-1 text-xs text-muted-foreground">All accounts are up to date</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {(overdueAccounts || [])
        .reduce<typeof overdueAccounts>((acc, account) => {
          if (acc.some((item) => item.customer_id === account.customer_id)) {
            return acc
          }

          acc.push(account)
          return acc
        }, [])
        .slice(0, 5)
        .map((account) => {
        const customer = account.customers as { customer_name?: string; account_number?: string } | null
        const daysOverdue = differenceInDays(new Date(), new Date(account.due_date))

        let severity: "default" | "secondary" | "destructive" = "default"
        if (daysOverdue >= 76) severity = "destructive"
        else if (daysOverdue >= 60) severity = "secondary"

        return (
          <div key={account.id} className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">{customer?.customer_name || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">
                {customer?.account_number} - Due: {format(new Date(account.due_date), "MMM d, yyyy")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">₱{Math.max(account.amount - (account.amount_paid || 0), 0).toLocaleString()}</p>
              <Badge variant={severity} className="text-xs">
                {daysOverdue > 0 ? `${daysOverdue} days overdue` : "Due today"}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}
