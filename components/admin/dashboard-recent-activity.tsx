import { createClient } from "@/lib/supabase/server"
import { formatDistanceToNow } from "date-fns"
import { formatMeterReading } from "@/lib/meter-reading"

export async function DashboardRecentActivity() {
  const supabase = await createClient()

  const { data: activities } = await supabase
    .from("meter_readings")
    .select(`
      id,
      reading_date,
      created_at,
      previous_reading,
      current_reading,
      usage_cubic,
      customers (
        customer_name,
        account_number
      )
    `)
    .order("created_at", { ascending: false })
    .order("reading_date", { ascending: false })
    .limit(5)

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">No recent meter readings</p>
        <p className="mt-1 text-xs text-muted-foreground">Meter readings will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const customer = activity.customers as { customer_name?: string; account_number?: string } | null
        return (
          <div key={activity.id} className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {activity.usage_cubic}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">{customer?.customer_name || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">
                {customer?.account_number} · {formatMeterReading(activity.previous_reading)} → {formatMeterReading(activity.current_reading)} · {activity.usage_cubic} m³
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
