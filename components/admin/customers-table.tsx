"use client"

import { useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Search, Eye, Edit, Archive } from "lucide-react"
import { EditCustomerDialog } from "@/components/admin/edit-customer-dialog"
import type { AdminRole, Customer } from "@/lib/types"
import Link from "next/link"
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
import { toast } from "sonner"

interface CustomersTableProps {
  customers: Customer[]
  userRole: AdminRole
}

function getStubOutLabel(customer: Customer) {
  return customer.stub_out_locations?.code || "-"
}

function getMeterIdLabel(customer: Customer) {
  return customer.meter_id || "-"
}

function getStubOutSearchText(customer: Customer) {
  const stubOutLocation = customer.stub_out_locations

  return [
    getStubOutLabel(customer),
    stubOutLocation?.name,
    stubOutLocation?.municipality,
    stubOutLocation?.barangay,
    stubOutLocation?.sitio,
    stubOutLocation?.purok,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

export function CustomersTable({ customers, userRole }: CustomersTableProps) {
  const [search, setSearch] = useState("")
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const canEditCustomers = userRole === "finance" || userRole === "reader"
  const canArchiveCustomers = userRole === "finance"

  const searchLower = search.toLowerCase()
  const filteredCustomers = customers.filter(
    (customer) =>
      (customer.customer_name ?? "").toLowerCase().includes(searchLower) ||
      (customer.account_number ?? "").toLowerCase().includes(searchLower) ||
      (customer.meter_id ?? "").toLowerCase().includes(searchLower) ||
      (customer.address ?? "").toLowerCase().includes(searchLower) ||
      (customer.contact_number ?? "").toLowerCase().includes(searchLower) ||
      getStubOutSearchText(customer).includes(searchLower)
  )

  function getStatusTextClass(isActive: boolean) {
    return isActive
      ? "text-sm font-medium text-emerald-700 dark:text-emerald-400"
      : "text-sm font-medium text-red-700 dark:text-red-400"
  }

  async function handleDeleteCustomer() {
    if (!deletingCustomer) {
      return
    }

    setDeleteError(null)
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/customers/${deletingCustomer.id}/archive`, {
        method: "POST",
      })

      const payload = await response.json()

      if (!response.ok) {
        setDeleteError(payload.error || "Failed to archive customer.")
        return
      }

      setDeletingCustomer(null)
      toast.success("Customer archived successfully.")
      router.refresh()
    } catch {
      setDeleteError("Failed to archive customer.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers, accounts, or meters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {filteredCustomers.length === 0 ? (
          <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            No customers found.
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div key={customer.id} className="rounded-lg border p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{customer.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{customer.account_number}</p>
                </div>
                <span className={getStatusTextClass(customer.is_active)}>
                  {customer.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Meter ID: </span>
                  <span>{getMeterIdLabel(customer)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Contact: </span>
                  <span>{customer.contact_number}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Stub Out: </span>
                  <span>{getStubOutLabel(customer)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Address: </span>
                  <span>{customer.address ?? "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Registered: </span>
                  <span>{format(new Date(customer.date_registered), "MMM d, yyyy")}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/customers/${customer.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      {canEditCustomers && (
                        <DropdownMenuItem onSelect={() => setEditingCustomer(customer)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canArchiveCustomers && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => {
                            setDeleteError(null)
                            setDeletingCustomer(customer)
                          }}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
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
              <TableHead>Stub Out</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="min-w-[140px] font-medium">{customer.account_number}</TableCell>
                  <TableCell className="min-w-[110px]">{getMeterIdLabel(customer)}</TableCell>
                  <TableCell>{customer.customer_name}</TableCell>
                  <TableCell className="min-w-[180px] max-w-[220px] truncate">{customer.address ?? "-"}</TableCell>
                  <TableCell className="min-w-[130px]">{customer.contact_number}</TableCell>
                  <TableCell>{getStubOutLabel(customer)}</TableCell>
                  <TableCell>
                    <span className={getStatusTextClass(customer.is_active)}>
                      {customer.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-[120px]">{format(new Date(customer.date_registered), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/customers/${customer.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                        {canEditCustomers && (
                          <DropdownMenuItem onSelect={() => setEditingCustomer(customer)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canArchiveCustomers && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => {
                              setDeleteError(null)
                              setDeletingCustomer(customer)
                            }}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditCustomerDialog
        customer={editingCustomer}
        open={!!editingCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCustomer(null)
          }
        }}
      />

      <AlertDialog
        open={!!deletingCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingCustomer(null)
            setDeleteError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This customer will be moved to Archived Customers and can be restored within 60 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteCustomer()
              }}
            >
              {isDeleting ? "Archiving..." : "Archive Customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
