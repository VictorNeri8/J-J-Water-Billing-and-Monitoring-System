import { requireAdminContext } from "@/lib/admin/auth"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react"
import { SendManualSMSDialog } from "@/components/admin/send-manual-sms-dialog"
import { SMS_FEATURE_ENABLED } from "@/lib/config/features"

function getSMSLabel(smsType: string) {
  switch (smsType) {
    case "60_day_reminder":
      return "60-Day Reminder"
    case "76_day_final_warning":
      return "Final Warning"
    case "custom":
    default:
      return "Manual"
  }
}

function getSMSStatusTextClass(status: string) {
  if (status === "sent") {
    return "font-medium text-emerald-700 dark:text-emerald-400"
  }

  if (status === "failed") {
    return "font-medium text-red-700 dark:text-red-400"
  }

  return "font-medium text-muted-foreground"
}

function formatSMSStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default async function SMSLogsPage() {
  const { supabase } = await requireAdminContext(["finance"])

  const [{ data: logs }, { data: customers }] = await Promise.all([
    supabase
      .from("sms_logs")
      .select(`
        *,
        customers (
          customer_name,
          account_number
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("customers")
      .select("id, customer_name, account_number, contact_number")
      .eq("is_active", true)
      .is("archived_at", null)
      .order("customer_name", { ascending: true }),
  ])

  const sentCount = logs?.filter((l) => l.status === "sent").length || 0
  const failedCount = logs?.filter((l) => l.status === "failed").length || 0
  const pendingCount = logs?.filter((l) => l.status === "pending").length || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SMS Notifications</h1>
          <p className="text-muted-foreground">
            {SMS_FEATURE_ENABLED
              ? "Track payment reminder SMS messages"
              : "SMS notifications are currently disabled."}
          </p>
        </div>
        <div className="sm:self-start">
          <SendManualSMSDialog customers={customers || []} smsEnabled={SMS_FEATURE_ENABLED} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{sentCount}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{failedCount}</div>
            <p className="text-xs text-muted-foreground">Delivery failed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting delivery</p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS History
          </CardTitle>
          <CardDescription>Recent SMS notifications sent to customers</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="grid gap-3 md:hidden">
            {!logs || logs.length === 0 ? (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                No SMS logs found.
              </div>
            ) : (
              logs.map((log) => {
                const customer = log.customers as { customer_name: string; account_number: string } | null
                const statusTextClass = getSMSStatusTextClass(log.status)
                return (
                  <div key={log.id} className="rounded-lg border p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{customer?.customer_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{customer?.account_number}</p>
                      </div>
                      <span className={statusTextClass}>{formatSMSStatus(log.status)}</span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Date: </span>
                        <span>{format(new Date(log.created_at), "MMM d, yyyy HH:mm")}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone: </span>
                        <span>{log.phone_number}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type: </span>
                        <span className="font-medium text-foreground">{getSMSLabel(log.sms_type)}</span>
                      </div>
                      <div>
                        <p className="mb-1 text-muted-foreground">Message</p>
                        <p className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed">{log.message}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="max-w-[300px]">Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!logs || logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No SMS logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const customer = log.customers as { customer_name: string; account_number: string } | null
                    const statusTextClass = getSMSStatusTextClass(log.status)
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div>{customer?.customer_name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">
                            {customer?.account_number}
                          </div>
                        </TableCell>
                        <TableCell>{log.phone_number}</TableCell>
                        <TableCell>
                          <span className="font-medium text-foreground">{getSMSLabel(log.sms_type)}</span>
                        </TableCell>
                        <TableCell>
                          <span className={statusTextClass}>{formatSMSStatus(log.status)}</span>
                        </TableCell>
                        <TableCell className="min-w-[240px] max-w-[300px] truncate text-sm">
                          {log.message}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
