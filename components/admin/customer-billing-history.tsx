"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AdminRole, BillingStatus, PaymentMethod } from "@/lib/types"
import { calculateWaterBill, getWaterBillBreakdown } from "@/lib/types"
import { calculateMeterUsage, formatMeterReading, parseMeterReadingInput } from "@/lib/meter-reading"
import { CreditCard, UnlockKeyhole } from "lucide-react"

type BillingHistoryItem = {
  amount: number
  amount_paid?: number | null
  billing_date: string
  created_at?: string
  customer_id: string
  due_date: string
  id: string
  meter_readings?: {
    previous_reading?: number | null
    current_reading?: number | null
    is_starting_reading?: boolean | null
  } | null
  paid_date?: string | null
  payment_method?: PaymentMethod | null
  status: BillingStatus
  updated_at?: string
  usage_cubic?: number | null
}

interface CustomerBillingHistoryProps {
  billings: BillingHistoryItem[]
  role: AdminRole
  isArchived?: boolean
}

function getBillingStatusTextClass(status: BillingStatus) {
  if (status === "paid") {
    return "font-medium text-emerald-700 dark:text-emerald-400"
  }

  if (status === "partial") {
    return "font-medium text-amber-700 dark:text-amber-400"
  }

  return "font-medium text-red-700 dark:text-red-400"
}

function canEditBilling(status: BillingStatus) {
  return status !== "paid"
}

function canPayBilling(status: BillingStatus) {
  return status !== "paid"
}

function getRemainingBalance(billing: BillingHistoryItem) {
  return Math.max(billing.amount - (billing.amount_paid || 0), 0)
}

function getPaymentMethodText(paymentMethod: PaymentMethod | null | undefined) {
  if (paymentMethod === "cash") {
    return {
      label: "Cash",
      className: "font-medium text-emerald-700 dark:text-emerald-400",
    }
  }

  if (paymentMethod === "online") {
    return {
      label: "Online",
      className: "font-medium text-blue-700 dark:text-blue-400",
    }
  }

  return {
    label: "N/A",
    className: "text-muted-foreground",
  }
}

function LockedUnlockButton({
  billing,
  onClick,
}: {
  billing: BillingHistoryItem
  onClick: (billing: BillingHistoryItem) => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="group h-7 cursor-pointer gap-1.5 rounded-full border-amber-300 bg-amber-50 px-3 text-xs font-medium text-amber-800 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-950 focus-visible:ring-amber-500/40 active:scale-[0.98] dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:border-amber-700 dark:hover:bg-amber-950/50"
      onClick={() => onClick(billing)}
      aria-label={`Unlock billing dated ${format(new Date(billing.billing_date), "MMM d, yyyy")}`}
    >
      <UnlockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="group-hover:hidden group-focus-visible:hidden">Locked</span>
      <span className="hidden group-hover:inline group-focus-visible:inline">Unlock</span>
    </Button>
  )
}

export function CustomerBillingHistory({ billings, role, isArchived = false }: CustomerBillingHistoryProps) {
  const [selectedBilling, setSelectedBilling] = useState<BillingHistoryItem | null>(null)
  const [deleteBilling, setDeleteBilling] = useState<BillingHistoryItem | null>(null)
  const [paymentDialog, setPaymentDialog] = useState<BillingHistoryItem | null>(null)
  const [unlockBilling, setUnlockBilling] = useState<BillingHistoryItem | null>(null)
  const [isUnlockPasswordStep, setIsUnlockPasswordStep] = useState(false)
  const [unlockPassword, setUnlockPassword] = useState("")
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [billingDate, setBillingDate] = useState("")
  const [currentReading, setCurrentReading] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const router = useRouter()

  const canManageBilling = role === "finance"

  useEffect(() => {
    if (!selectedBilling) {
      setBillingDate("")
      setCurrentReading("")
      setErrorMessage(null)
      return
    }

    setBillingDate(selectedBilling.billing_date)
    setCurrentReading(formatMeterReading(selectedBilling.meter_readings?.current_reading ?? 0))
    setErrorMessage(null)
  }, [selectedBilling])

  const parsedCurrentReading = parseMeterReadingInput(currentReading)
  const previousReading = selectedBilling?.meter_readings?.previous_reading ?? 0
  const nextUsage = parsedCurrentReading === null ? 0 : calculateMeterUsage(parsedCurrentReading, previousReading)
  const nextAmount = parsedCurrentReading !== null && nextUsage >= 0 ? calculateWaterBill(nextUsage) : 0

  const displayedBillings = useMemo(
    () => [...billings].sort((a, b) => {
      const billingDateDiff = new Date(b.billing_date).getTime() - new Date(a.billing_date).getTime()
      if (billingDateDiff !== 0) {
        return billingDateDiff
      }

      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    }),
    [billings],
  )
  const selectedBillingIndex = selectedBilling
    ? displayedBillings.findIndex((billing) => billing.id === selectedBilling.id)
    : -1
  const followingBilling = selectedBillingIndex > 0 ? displayedBillings[selectedBillingIndex - 1] : null
  const followingCurrentReading = followingBilling?.meter_readings?.current_reading ?? null
  const followingUsage = parsedCurrentReading !== null && followingCurrentReading !== null
    ? calculateMeterUsage(followingCurrentReading, parsedCurrentReading)
    : null
  const followingAmount = followingUsage !== null && followingUsage >= 0
    ? calculateWaterBill(followingUsage)
    : null
  const canDeleteSelectedBilling =
    canManageBilling &&
    !isArchived &&
    !!selectedBilling &&
    selectedBilling.id === displayedBillings[0]?.id &&
    !selectedBilling.meter_readings?.is_starting_reading &&
    canEditBilling(selectedBilling.status)

  function openUnlockDialog(billing: BillingHistoryItem) {
    setUnlockBilling(billing)
    setIsUnlockPasswordStep(false)
    setUnlockPassword("")
    setUnlockError(null)
  }

  function resetUnlockDialog() {
    setUnlockBilling(null)
    setIsUnlockPasswordStep(false)
    setUnlockPassword("")
    setUnlockError(null)
    setIsUnlocking(false)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedBilling) {
      return
    }

    const trimmedBillingDate = billingDate.trim()
    const parsedCurrent = parseMeterReadingInput(currentReading)

    if (!trimmedBillingDate) {
      setErrorMessage("Billing date is required.")
      return
    }

    if (parsedCurrent === null) {
      setErrorMessage("Current meter reading must contain exactly 5 digits.")
      return
    }

    if (parsedCurrent < previousReading) {
      setErrorMessage("Current meter reading must be greater than or equal to the previous reading.")
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/billings/${selectedBilling.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billing_date: trimmedBillingDate,
          current_reading: currentReading,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        setErrorMessage(payload.error || "Failed to update billing.")
        return
      }

      setSelectedBilling(null)
      router.refresh()
    } catch (error) {
      console.error("Billing update failed:", error)
      setErrorMessage("Failed to update billing.")
    } finally {
      setIsLoading(false)
    }
  }

  function getPaymentErrorMessage(error: unknown, isPartialAttempt: boolean) {
    if (!error || typeof error !== "object") {
      return isPartialAttempt
        ? "Partial payments require the billing migration in scripts/002_add_partial_payment_support.sql."
        : "Failed to record payment."
    }

    const maybeError = error as {
      code?: string
      message?: string
      details?: string
      hint?: string
    }

    const combinedMessage = [
      maybeError.message,
      maybeError.details,
      maybeError.hint,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    if (
      isPartialAttempt &&
      (
        maybeError.code === "PGRST204" ||
        combinedMessage.includes("amount_paid") ||
        combinedMessage.includes("partial") ||
        combinedMessage.includes("check constraint") ||
        combinedMessage.includes("column") ||
        combinedMessage.includes("schema cache")
      )
    ) {
      return "Partial payments require the billing migration in scripts/002_add_partial_payment_support.sql."
    }

    return maybeError.message || "Failed to record payment."
  }

  async function handlePayment() {
    if (!paymentDialog || !paymentAmount) {
      return
    }

    const amount = Number.parseFloat(paymentAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      setPaymentError("Enter a valid payment amount.")
      return
    }

    const previousPaid = paymentDialog.amount_paid || 0
    const remainingBalance = getRemainingBalance(paymentDialog)

    if (amount > remainingBalance) {
      setPaymentError("Payment amount cannot be greater than the remaining balance.")
      return
    }

    if (!paymentMethod) {
      setPaymentError("Select a payment method.")
      return
    }

    setIsProcessingPayment(true)
    setPaymentError(null)

    const totalPaid = previousPaid + amount
    const nextStatus = totalPaid >= paymentDialog.amount ? "paid" : "partial"
    const isPartialAttempt = nextStatus === "partial"
    const supabase = createClient()
    const { error } = await supabase
      .from("billings")
      .update({
        amount_paid: totalPaid,
        status: nextStatus,
        paid_date: nextStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
        payment_method: paymentMethod,
      })
      .eq("id", paymentDialog.id)

    setIsProcessingPayment(false)

    if (error) {
      setPaymentError(getPaymentErrorMessage(error, isPartialAttempt))
      return
    }

    setPaymentDialog(null)
    setPaymentAmount("")
    setPaymentMethod("")
    setPaymentError(null)
    router.refresh()
  }

  async function handleDeleteBilling() {
    if (!deleteBilling) {
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/admin/billings/${deleteBilling.id}`, {
        method: "DELETE",
      })
      const payload = await response.json()

      if (!response.ok) {
        setDeleteError(payload.error || "Failed to delete billing row.")
        return
      }

      setDeleteBilling(null)
      setSelectedBilling(null)
      router.refresh()
    } catch (error) {
      console.error("Billing delete failed:", error)
      setDeleteError("Failed to delete billing row.")
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!unlockBilling) {
      return
    }

    if (!unlockPassword) {
      setUnlockError("Finance password is required.")
      return
    }

    setIsUnlocking(true)
    setUnlockError(null)

    try {
      const response = await fetch(`/api/admin/billings/${unlockBilling.id}/unlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: unlockPassword }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setUnlockError(payload.error || "Failed to unlock billing row.")
        return
      }

      resetUnlockDialog()
      router.refresh()
    } catch (error) {
      console.error("Billing unlock failed:", error)
      setUnlockError("Failed to unlock billing row.")
    } finally {
      setIsUnlocking(false)
    }
  }

  if (displayedBillings.length === 0) {
    return (
      <Empty className="min-h-[220px] border">
        <EmptyHeader>
          <EmptyTitle>No billing records yet</EmptyTitle>
          <EmptyDescription>Billing history will appear here after bills are generated.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:hidden">
        {displayedBillings.map((billing, index) => {
          const displayedConsumption = billing.usage_cubic ?? billing.meter_readings?.current_reading ?? 0
          const breakdown = getWaterBillBreakdown(displayedConsumption)
          const followingIsPaid = index > 0 && displayedBillings[index - 1].status === "paid"
          const isEditable = canManageBilling && !isArchived && !billing.meter_readings?.is_starting_reading && !followingIsPaid && canEditBilling(billing.status)
          const isPayable = canManageBilling && canPayBilling(billing.status)
          const isUnlockable = canManageBilling && billing.status === "paid"
          const paymentMethodText = getPaymentMethodText(billing.payment_method)
          const statusTextClass = getBillingStatusTextClass(billing.status)
          const remainingBalance = getRemainingBalance(billing)

          return (
            <div key={billing.id} className="rounded-lg border p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Billing Date</p>
                  <p className="font-medium">{format(new Date(billing.billing_date), "MMM d, yyyy")}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={statusTextClass}>
                    {billing.status}
                  </span>
                  {isUnlockable ? (
                    <LockedUnlockButton billing={billing} onClick={openUnlockDialog} />
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p>{format(new Date(billing.due_date), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Consumption</p>
                  <p>{displayedConsumption} m³</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">₱{billing.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Date</p>
                  <p>{billing.paid_date ? format(new Date(billing.paid_date), "MMM d, yyyy") : "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className={paymentMethodText.className}>{paymentMethodText.label}</p>
                </div>
              </div>

              <div className="mt-3 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <span>Base Rate</span>
                  <span>₱{breakdown.baseRate.toLocaleString()}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span>Excess Cubic</span>
                  <span>{breakdown.excessCubic} m3</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span>Excess Charge</span>
                  <span>₱{breakdown.excessCharge.toLocaleString()}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 font-medium text-foreground">
                  <span>Total</span>
                  <span>₱{breakdown.total.toLocaleString()}</span>
                </div>
              </div>

              {isEditable || isPayable ? (
                <div className="mt-4 flex justify-end gap-2">
                  {isEditable ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setSelectedBilling(billing)}
                    >
                      Edit
                    </Button>
                  ) : null}
                  {isPayable ? (
                    <Button
                      size="sm"
                      className="cursor-pointer !border-emerald-600 !bg-emerald-600 !text-white shadow-sm hover:!border-emerald-700 hover:!bg-emerald-700 hover:!text-white"
                      onClick={() => {
                        setPaymentDialog(billing)
                        setPaymentAmount(String(remainingBalance))
                        setPaymentMethod("")
                        setPaymentError(null)
                      }}
                    >
                      <CreditCard className="mr-2 h-3 w-3" />
                      Pay
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Billing Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Consumption</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Payment Method</TableHead>
              {canManageBilling ? <TableHead className="text-right">Action</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedBillings.map((billing, index) => {
              const displayedConsumption = billing.usage_cubic ?? billing.meter_readings?.current_reading ?? 0
              const breakdown = getWaterBillBreakdown(displayedConsumption)
              const followingIsPaid = index > 0 && displayedBillings[index - 1].status === "paid"
              const isEditable = canManageBilling && !isArchived && !billing.meter_readings?.is_starting_reading && !followingIsPaid && canEditBilling(billing.status)
              const isPayable = canManageBilling && canPayBilling(billing.status)
              const isUnlockable = canManageBilling && billing.status === "paid"
              const paymentMethodText = getPaymentMethodText(billing.payment_method)
              const statusTextClass = getBillingStatusTextClass(billing.status)
              const remainingBalance = getRemainingBalance(billing)

              return (
                <TableRow key={billing.id}>
                  <TableCell>{format(new Date(billing.billing_date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{format(new Date(billing.due_date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{displayedConsumption} m³</TableCell>
                  <TableCell className="font-medium">
                    <div>₱{billing.amount.toLocaleString()}</div>
                    <div className="mt-1 text-xs font-normal text-muted-foreground">
                      Base ₱{breakdown.baseRate.toLocaleString()} + Excess {breakdown.excessCubic} cubics
                      {" "}({`₱${breakdown.excessCharge.toLocaleString()}`})
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={statusTextClass}>
                      {billing.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {billing.paid_date ? format(new Date(billing.paid_date), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    <span className={paymentMethodText.className}>{paymentMethodText.label}</span>
                  </TableCell>
                  {canManageBilling ? (
                    <TableCell className="text-right">
                      {isEditable || isPayable ? (
                        <div className="flex items-center justify-end gap-2">
                          {isEditable ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                              onClick={() => setSelectedBilling(billing)}
                            >
                              Edit
                            </Button>
                          ) : null}
                          {isPayable ? (
                            <Button
                              size="sm"
                              className="cursor-pointer !border-emerald-600 !bg-emerald-600 !text-white shadow-sm hover:!border-emerald-700 hover:!bg-emerald-700 hover:!text-white"
                              onClick={() => {
                                setPaymentDialog(billing)
                                setPaymentAmount(String(remainingBalance))
                                setPaymentMethod("")
                                setPaymentError(null)
                              }}
                            >
                              <CreditCard className="mr-2 h-3 w-3" />
                              Pay
                            </Button>
                          ) : null}
                        </div>
                      ) : isUnlockable ? (
                        <LockedUnlockButton billing={billing} onClick={openUnlockDialog} />
                      ) : (
                        <Badge variant="outline">Locked</Badge>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!selectedBilling}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBilling(null)
            setDeleteBilling(null)
            setDeleteError(null)
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Billing</DialogTitle>
            <DialogDescription>
              Update the billing date and current meter reading. Amount is recalculated automatically using the current tariff.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {errorMessage ? (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="edit_billing_date">Billing Date</Label>
                <Input
                  id="edit_billing_date"
                  type="date"
                  value={billingDate}
                  onChange={(event) => setBillingDate(event.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_current_reading">Current Meter Reading</Label>
                <Input
                  id="edit_current_reading"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  maxLength={5}
                  value={currentReading}
                  onChange={(event) => setCurrentReading(event.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="00240"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Previous: {formatMeterReading(previousReading)} · Consumption: {Math.max(nextUsage, 0)} m³
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_amount">Amount</Label>
                <Input
                  id="edit_amount"
                  value={`₱${nextAmount.toLocaleString()}`}
                  disabled
                  className="bg-muted"
                />
              </div>

              {followingBilling && followingCurrentReading !== null ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-medium">The following bill will also be recalculated.</p>
                  <p className="mt-1 text-xs">
                    {format(new Date(followingBilling.billing_date), "MMM d, yyyy")}: previous reading becomes {currentReading || "-----"},
                    consumption becomes {followingUsage !== null && followingUsage >= 0 ? `${followingUsage} m³` : "invalid"},
                    and amount becomes {followingAmount !== null ? `₱${followingAmount.toLocaleString()}` : "invalid"}.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label>Status</Label>
                <div>
                  <span className={selectedBilling ? getBillingStatusTextClass(selectedBilling.status) : "text-muted-foreground"}>
                    {selectedBilling?.status || "unknown"}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              {canDeleteSelectedBilling ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setDeleteBilling(selectedBilling)
                    setDeleteError(null)
                  }}
                  disabled={isLoading}
                  className="sm:mr-auto"
                >
                  Delete
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedBilling(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteBilling}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteBilling(null)
            setDeleteError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this month&apos;s bill?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the billing row and its linked meter reading. This action cannot be undone.
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
                void handleDeleteBilling()
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!paymentDialog}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentDialog(null)
            setPaymentAmount("")
            setPaymentMethod("")
            setPaymentError(null)
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Recording payment for billing dated{" "}
              {paymentDialog ? format(new Date(paymentDialog.billing_date), "MMM d, yyyy") : "-"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Amount Due</Label>
              <div className="text-lg font-bold">
                <span className="font-normal">₱</span>
                {paymentDialog ? getRemainingBalance(paymentDialog).toLocaleString() : "0"}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Previously Paid</Label>
              <div className="text-lg">
                ₱{(paymentDialog?.amount_paid || 0).toLocaleString()}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer_payment_amount">Payment Amount</Label>
              <Input
                id="customer_payment_amount"
                type="number"
                min={0}
                max={paymentDialog ? getRemainingBalance(paymentDialog) : 0}
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                placeholder="Enter payment amount"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer_payment_method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <SelectTrigger id="customer_payment_method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentError ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {paymentError}
              </p>
            ) : null}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setPaymentDialog(null)
                setPaymentAmount("")
                setPaymentMethod("")
                setPaymentError(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={isProcessingPayment || !paymentAmount}>
              {isProcessingPayment ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!unlockBilling}
        onOpenChange={(open) => {
          if (!open) {
            resetUnlockDialog()
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          {!isUnlockPasswordStep ? (
            <>
              <DialogHeader>
                <DialogTitle>Unlock this row bill?</DialogTitle>
                <DialogDescription>
                  This will revise the payment record and return the billing status to unpaid.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={resetUnlockDialog}>
                  No
                </Button>
                <Button type="button" onClick={() => setIsUnlockPasswordStep(true)}>
                  Yes
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleUnlock}>
              <DialogHeader>
                <DialogTitle>Enter Finance Password</DialogTitle>
                <DialogDescription>
                  Confirm your Finance account password to unlock this paid billing row.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="unlock_finance_password">Finance Password</Label>
                  <Input
                    id="unlock_finance_password"
                    type="password"
                    value={unlockPassword}
                    onChange={(event) => setUnlockPassword(event.target.value)}
                    autoComplete="current-password"
                    autoFocus
                  />
                </div>
                {unlockError ? (
                  <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {unlockError}
                  </p>
                ) : null}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsUnlockPasswordStep(false)
                    setUnlockPassword("")
                    setUnlockError(null)
                  }}
                  disabled={isUnlocking}
                >
                  No
                </Button>
                <Button type="submit" disabled={isUnlocking || !unlockPassword}>
                  {isUnlocking ? "Unlocking..." : "Yes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
