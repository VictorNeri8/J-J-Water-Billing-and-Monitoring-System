"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { AdminRole, Customer } from "@/lib/types"
import { isCustomerArchiveExpired } from "@/lib/customer-archive"
import { Button } from "@/components/ui/button"
import { PermanentDeleteCustomerDialog } from "@/components/admin/permanent-delete-customer-dialog"
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

export function CustomerArchiveActions({ customer, role }: { customer: Customer; role: AdminRole }) {
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  if (role !== "finance" || !customer.archived_at) {
    return null
  }

  const restoreExpired = isCustomerArchiveExpired(customer.archive_expires_at)

  async function submitAction() {
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/restore`, { method: "POST" })
      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error || "The customer archive action failed.")
        return
      }

      setRestoreOpen(false)
      toast.success("Customer restored successfully.")
      router.push("/admin/customers")
      router.refresh()
    } catch {
      setError("The customer archive action failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={restoreExpired} onClick={() => {
          setError(null)
          setRestoreOpen(true)
        }}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Restore
        </Button>
        <PermanentDeleteCustomerDialog customer={customer} redirectTo="/admin/customers/archive">
          <Button type="button" variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </PermanentDeleteCustomerDialog>
      </div>

      <AlertDialog open={restoreOpen} onOpenChange={(open) => {
        if (!open) {
          setRestoreOpen(false)
          setError(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This customer will return to the active customer list with all history intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault()
                void submitAction()
              }}
            >
              {isSubmitting ? "Restoring..." : "Restore Customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
