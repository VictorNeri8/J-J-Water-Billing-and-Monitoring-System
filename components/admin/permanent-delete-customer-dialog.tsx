"use client"

import { useState, type ReactElement } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Customer } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface PermanentDeleteCustomerDialogProps {
  customer: Pick<Customer, "id" | "customer_name">
  children: ReactElement
  redirectTo?: string
}

export function PermanentDeleteCustomerDialog({
  customer,
  children,
  redirectTo,
}: PermanentDeleteCustomerDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function permanentlyDeleteCustomer() {
    setError(null)
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/permanent-delete`, {
        method: "POST",
      })
      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error || "Failed to permanently delete customer.")
        return
      }

      setOpen(false)
      toast.success("Customer permanently deleted successfully.")
      if (redirectTo) {
        router.push(redirectTo)
      }
      router.refresh()
    } catch {
      setError("Failed to permanently delete customer.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => {
      if (!isDeleting) {
        setOpen(nextOpen)
        if (!nextOpen) setError(null)
      }
    }}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure to delete?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <span className="block">This will permanently delete the customer.</span>
              <span className="block">This action cannot be undone.</span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault()
              void permanentlyDeleteCustomer()
            }}
          >
            {isDeleting ? "Deleting..." : "Delete Permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
