"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Eye, RotateCcw, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { AdminRole, Customer } from "@/lib/types"
import { getAdminRoleLabel } from "@/lib/types"
import {
  getCustomerArchiveDaysRemaining,
  isCustomerArchiveExpired,
} from "@/lib/customer-archive"
import { Button } from "@/components/ui/button"
import { PermanentDeleteCustomerDialog } from "@/components/admin/permanent-delete-customer-dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ArchivedCustomersTableProps {
  customers: Customer[]
  userRole: AdminRole
}

function getRetentionLabel(customer: Customer) {
  if (isCustomerArchiveExpired(customer.archive_expires_at)) {
    return "Expired"
  }

  const days = getCustomerArchiveDaysRemaining(customer.archive_expires_at)
  return `${days} day${days === 1 ? "" : "s"}`
}

export function ArchivedCustomersTable({ customers, userRole }: ArchivedCustomersTableProps) {
  const [search, setSearch] = useState("")
  const [restoringCustomer, setRestoringCustomer] = useState<Customer | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const canManageArchive = userRole === "finance"
  const searchLower = search.trim().toLowerCase()
  const filteredCustomers = customers.filter((customer) =>
    [customer.account_number, customer.meter_id, customer.customer_name, customer.address, customer.contact_number]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchLower)),
  )

  async function restoreCustomer(customer: Customer) {
    setActionError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/restore`, {
        method: "POST",
      })
      const payload = await response.json()

      if (!response.ok) {
        setActionError(payload.error || "Failed to restore customer.")
        return
      }

      setRestoringCustomer(null)
      toast.success("Customer restored successfully.")
      router.refresh()
    } catch {
      setActionError("Failed to restore customer.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function renderActions(customer: Customer) {
    const expired = isCustomerArchiveExpired(customer.archive_expires_at)

    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/customers/${customer.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </Button>
        {canManageArchive ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={expired}
              onClick={() => {
                setActionError(null)
                setRestoringCustomer(customer)
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </Button>
            <PermanentDeleteCustomerDialog customer={customer}>
              <Button type="button" variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </PermanentDeleteCustomerDialog>
          </>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search archived customers, accounts, or meters..."
          className="pl-10"
        />
      </div>

      <div className="grid gap-3 md:hidden">
        {filteredCustomers.length === 0 ? (
          <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            No archived customers found.
          </div>
        ) : filteredCustomers.map((customer) => (
          <div key={customer.id} className="space-y-4 rounded-lg border p-4">
            <div>
              <p className="font-semibold">{customer.customer_name}</p>
              <p className="text-sm text-muted-foreground">{customer.account_number}</p>
            </div>
            <div className="grid gap-2 text-sm">
              <p><span className="text-muted-foreground">Meter ID:</span> {customer.meter_id || "-"}</p>
              <p><span className="text-muted-foreground">Address:</span> {customer.address || "-"}</p>
              <p><span className="text-muted-foreground">Contact:</span> {customer.contact_number || "-"}</p>
              <p><span className="text-muted-foreground">Archived:</span> {customer.archived_at ? format(new Date(customer.archived_at), "MMM d, yyyy") : "-"}</p>
              <p><span className="text-muted-foreground">Archived by:</span> {customer.archived_by_email || getAdminRoleLabel(customer.archived_by_role)}</p>
              <p><span className="text-muted-foreground">Days remaining:</span> {getRetentionLabel(customer)}</p>
            </div>
            {renderActions(customer)}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account No.</TableHead>
              <TableHead>Meter ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Archived Date</TableHead>
              <TableHead>Archived By</TableHead>
              <TableHead>Days Remaining</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">No archived customers found.</TableCell>
              </TableRow>
            ) : filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.account_number}</TableCell>
                <TableCell>{customer.meter_id || "-"}</TableCell>
                <TableCell>{customer.customer_name}</TableCell>
                <TableCell className="max-w-[220px] truncate">{customer.address || "-"}</TableCell>
                <TableCell>{customer.contact_number || "-"}</TableCell>
                <TableCell>{customer.archived_at ? format(new Date(customer.archived_at), "MMM d, yyyy") : "-"}</TableCell>
                <TableCell>
                  <div>{customer.archived_by_email || "-"}</div>
                  <div className="text-xs text-muted-foreground">{getAdminRoleLabel(customer.archived_by_role)}</div>
                </TableCell>
                <TableCell>{getRetentionLabel(customer)}</TableCell>
                <TableCell>{renderActions(customer)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!restoringCustomer} onOpenChange={(open) => {
        if (!open) {
          setRestoringCustomer(null)
          setActionError(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This customer will return to the active customer list with all history intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionError ? <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{actionError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isSubmitting} onClick={(event) => {
              event.preventDefault()
              if (restoringCustomer) void restoreCustomer(restoringCustomer)
            }}>
              {isSubmitting ? "Restoring..." : "Restore Customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
