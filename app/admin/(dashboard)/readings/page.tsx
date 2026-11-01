import { requireAdminContext } from "@/lib/admin/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MeterReadingsTable } from "@/components/admin/meter-readings-table"
import { AddReadingDialog } from "@/components/admin/add-reading-dialog"

export default async function MeterReadingsPage() {
  const { supabase, profile } = await requireAdminContext(["reader", "finance"])

  const [{ data: readings }, { data: customers }] = await Promise.all([
    supabase
      .from("meter_readings")
      .select(`
        *,
        customers (
          customer_name,
          account_number,
          meter_id,
          stop_out,
          archived_at
        )
      `)
      .order("reading_date", { ascending: false }),
    supabase
      .from("customers")
      .select(`
        id,
        customer_name,
        account_number,
        meter_id,
        stop_out,
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
      .order("customer_name"),
  ])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Meter Readings</h1>
        <p className="text-muted-foreground">Record and manage water consumption readings</p>
      </div>

      <div className="sticky top-20 z-20 w-full justify-self-stretch rounded-md bg-background/95 py-2 backdrop-blur supports-backdrop-filter:bg-background/80 sm:w-auto sm:justify-self-end sm:py-0">
        <AddReadingDialog
          customers={customers || []}
          triggerClassName="w-full shadow-sm sm:w-auto"
        />
      </div>

      <Card className="min-w-0 lg:col-span-2">
        <CardHeader>
          <CardTitle>All Readings</CardTitle>
          <CardDescription>
            History of all meter readings recorded in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <MeterReadingsTable readings={readings || []} userRole={profile.role} />
        </CardContent>
      </Card>
    </div>
  )
}
