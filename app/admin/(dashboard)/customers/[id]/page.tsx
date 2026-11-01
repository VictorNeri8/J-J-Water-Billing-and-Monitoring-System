import { requireAdminContext } from "@/lib/admin/auth"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CustomerBillingHistory } from "@/components/admin/customer-billing-history"
import { CustomerArchiveActions } from "@/components/admin/customer-archive-actions"
import { getCustomerArchiveDaysRemaining, isCustomerArchiveExpired } from "@/lib/customer-archive"
import { getAdminRoleLabel } from "@/lib/types"
import { formatMeterReading } from "@/lib/meter-reading"
import { isOpenBillingStatus, isOverdueAccount } from "@/lib/overdue-accounts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, User, Gauge, FileText, Phone, MapPin, Archive } from "lucide-react"
import Link from "next/link"

function getCustomerStatusTextClass(isActive: boolean) {
  return isActive
    ? "text-sm font-medium text-emerald-700 dark:text-emerald-400"
    : "text-sm font-medium text-red-700 dark:text-red-400"
}

function getOverdueBadgeClass() {
  return "border-red-200 bg-red-50 text-red-700 hover:bg-red-50"
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, profile } = await requireAdminContext(["reader", "finance"])

  const { data: customer } = await supabase
    .from("customers")
    .select(`
      *,
      stub_out_locations (
        code,
        name,
        municipality,
        barangay,
        sitio,
        purok
      )
    `)
    .eq("id", id)
    .single()

  if (!customer) {
    notFound()
  }

  const [{ data: readings }, { data: billings }] = await Promise.all([
    supabase
      .from("meter_readings")
      .select("*")
      .eq("customer_id", id)
      .order("reading_date", { ascending: false })
      .limit(10),
    supabase
      .from("billings")
      .select(`
        *,
        meter_readings (
          previous_reading,
          current_reading,
          is_starting_reading
        )
      `)
      .eq("customer_id", id)
      .order("billing_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ])

  const openBillings = (billings || []).filter((billing) => isOpenBillingStatus(billing.status))
  const hasOverdueBillingHistory = isOverdueAccount(openBillings.length)
  const stubOutLabel = customer.stub_out_locations?.code || "-"
  const meterIdLabel = customer.meter_id || "-"
  const creatorRoleLabel = getAdminRoleLabel(customer.created_by_role)
  const isArchived = Boolean(customer.archived_at)
  const archiveExpired = isArchived && isCustomerArchiveExpired(customer.archive_expires_at)
  const archiveDaysRemaining = getCustomerArchiveDaysRemaining(customer.archive_expires_at)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={isArchived ? "/admin/customers/archive" : "/admin/customers"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{customer.customer_name}</h1>
              <span className={isArchived ? "text-sm font-medium text-amber-700 dark:text-amber-400" : getCustomerStatusTextClass(customer.is_active)}>
                {isArchived ? "Archived" : customer.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-muted-foreground">Account: {customer.account_number}</p>
            <p className="text-muted-foreground">Meter ID: {meterIdLabel}</p>
          </div>
          {isArchived ? <CustomerArchiveActions customer={customer} role={profile.role} /> : null}
        </div>
      </div>

      {isArchived ? (
        <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <Archive className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">This customer is archived.</p>
            <p className="text-sm">
              {archiveExpired
                ? "The 60-day restoration period has expired."
                : `This customer can be restored for ${archiveDaysRemaining} more day${archiveDaysRemaining === 1 ? "" : "s"}.`}
              {" "}Existing billing and meter-reading history remains available.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="flex items-start gap-3">
              <Gauge className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Meter ID</p>
                <p className="break-words text-sm text-muted-foreground">{meterIdLabel}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Address</p>
                <p className="break-words text-sm text-muted-foreground">{customer.address}</p>
              </div>
            </div>
            {customer.contact_number && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Phone</p>
                  <p className="break-all text-sm text-muted-foreground">{customer.contact_number}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Gauge className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Stub Out</p>
                <p className="text-sm text-muted-foreground">{stubOutLabel}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Registered on {format(new Date(customer.date_registered || customer.created_at), "MMMM d, yyyy")}
              </p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>
                  Added by <span className="font-medium text-foreground">{creatorRoleLabel}</span>
                </p>
                <p className="break-all">Email: {customer.created_by_email || "-"}</p>
                <p>Created at: {format(new Date(customer.created_at), "MMMM d, yyyy")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Recent Meter Readings
            </CardTitle>
            <CardDescription>Last 10 meter readings for this customer</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {readings && readings.length > 0 ? (
              <>
                <div className="grid gap-3 md:hidden">
                  {readings.map((reading) => (
                    <div key={reading.id} className="rounded-lg border p-4 shadow-xs">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Date</p>
                          <p>{format(new Date(reading.reading_date), "MMM d, yyyy")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Consumption</p>
                          <p className="font-medium">{reading.usage_cubic} m³</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Previous</p>
                          <p>{formatMeterReading(reading.previous_reading)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current</p>
                          <p>{formatMeterReading(reading.current_reading)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Source</p>
                          <p>{reading.is_starting_reading ? "Manual Book Import" : "Meter Entry"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Previous</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Consumption</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readings.map((reading) => (
                        <TableRow key={reading.id}>
                          <TableCell>{format(new Date(reading.reading_date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="tabular-nums">{formatMeterReading(reading.previous_reading)}</TableCell>
                          <TableCell className="tabular-nums">{formatMeterReading(reading.current_reading)}</TableCell>
                          <TableCell>{reading.is_starting_reading ? "Manual Book Import" : "Meter Entry"}</TableCell>
                          <TableCell className="font-medium">{reading.usage_cubic} m³</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No meter readings recorded yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex flex-wrap items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>Billing History</span>
            {hasOverdueBillingHistory ? (
              <Badge className={getOverdueBadgeClass()} variant="outline">
                Overdue Account
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>All billing statements for this customer</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <CustomerBillingHistory
            billings={billings || []}
            role={profile.role}
            isArchived={isArchived}
          />
        </CardContent>
      </Card>
    </div>
  )
}
