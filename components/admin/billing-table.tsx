"use client"

import { useState } from "react"
import { differenceInDays, format } from "date-fns"
import { useRouter } from "next/navigation"
import { getWaterBillBreakdown } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CreditCard, Eye, Search } from "lucide-react"
import type { PaymentMethod } from "@/lib/types"

interface Billing {
  id: string
  customer_id: string
  billing_date: string
  due_date: string
  usage_cubic?: number | null
  amount: number
  amount_paid: number | null
  status: "unpaid" | "paid" | "partial" | "overdue"
  paid_date?: string | null
  payment_method?: PaymentMethod | null
  customers: {
    customer_name?: string | null
    account_number?: string | null
    contact_number?: string | null
  } | null
  meter_readings?: {
    current_reading?: number | null
  } | null
}

interface BillingTableProps {
  billings: Billing[]
  showPaymentButton?: boolean
  emptyMessage?: string
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

function getBillingStatusTextClass(status: Billing["status"]) {
  if (status === "paid") {
    return "font-medium text-emerald-700 dark:text-emerald-400"
  }

  if (status === "partial") {
    return "font-medium text-amber-700 dark:text-amber-400"
  }

  return "font-medium text-red-700 dark:text-red-400"
}

export function BillingTable({ billings, showPaymentButton, emptyMessage = "No billing records found." }: BillingTableProps) {
  const [search, setSearch] = useState("")
  const [paymentDialog, setPaymentDialog] = useState<Billing | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const router = useRouter()

  const searchLower = search.toLowerCase()
  const filteredBillings = billings.filter((billing) => {
    const customerName = billing.customers?.customer_name || ""
    const accountNumber = billing.customers?.account_number || ""

    return (
      customerName.toLowerCase().includes(searchLower) ||
      accountNumber.toLowerCase().includes(searchLower)
    )
  })

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
    if (!paymentDialog || !paymentAmount) return

    const amount = parseFloat(paymentAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      setPaymentError("Enter a valid payment amount.")
      return
    }

    const previousPaid = paymentDialog.amount_paid || 0
    const remainingBalance = paymentDialog.amount - previousPaid

    if (amount > remainingBalance) {
      setPaymentError("Payment amount cannot be greater than the remaining balance.")
      return
    }

    if (!paymentMethod) {
      setPaymentError("Select a payment method.")
      return
    }

    setIsProcessing(true)
    setPaymentError(null)
    const supabase = createClient()
    const totalPaid = previousPaid + amount
    const nextStatus = totalPaid >= paymentDialog.amount ? "paid" : "partial"
    const isPartialAttempt = nextStatus === "partial"

    const { error } = await supabase
      .from("billings")
      .update({
        amount_paid: totalPaid,
        status: nextStatus,
        paid_date: nextStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
        payment_method: paymentMethod,
      })
      .eq("id", paymentDialog.id)

    setIsProcessing(false)

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredBillings.length === 0 && (
        <Empty className="min-h-[220px] border">
          <EmptyHeader>
            <EmptyTitle>No billing records found</EmptyTitle>
            <EmptyDescription>{emptyMessage}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {filteredBillings.length > 0 && (
      <div className="grid gap-3 md:hidden">
        {filteredBillings.map((billing) => {
            const daysOverdue = differenceInDays(new Date(), new Date(billing.due_date))
            const isOverdue = billing.status !== "paid" && daysOverdue > 0
            const amountPaid = billing.amount_paid || 0
            const remainingBalance = Math.max(billing.amount - amountPaid, 0)
            const displayedConsumption = billing.usage_cubic ?? billing.meter_readings?.current_reading ?? 0
            const breakdown = getWaterBillBreakdown(displayedConsumption)
            const paymentMethodText = getPaymentMethodText(billing.payment_method)
            const statusTextClass = getBillingStatusTextClass(billing.status)

            return (
              <div key={billing.id} className="rounded-lg border p-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {billing.customers?.customer_name || "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {billing.customers?.account_number || "-"}
                    </p>
                  </div>
                  <span className={statusTextClass}>
                    {billing.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Billing Date: </span>
                    <span>{format(new Date(billing.billing_date), "MMM d, yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Due Date: </span>
                    <span className={isOverdue ? "text-destructive" : ""}>
                      {format(new Date(billing.due_date), "MMM d, yyyy")}
                      {isOverdue ? ` (${daysOverdue}d overdue)` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Consumption: </span>
                    <span>{displayedConsumption} m3</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount Due: </span>
                    <span className="font-medium">{remainingBalance.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount Paid: </span>
                    <span>{amountPaid.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment Method: </span>
                    <span className={paymentMethodText.className}>{paymentMethodText.label}</span>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
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
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="icon" asChild className="h-8 w-8">
                    <Link href={`/admin/customers/${billing.customer_id}`}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View customer details</span>
                    </Link>
                  </Button>
                  {showPaymentButton && billing.status !== "paid" && (
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
                  )}
                </div>
              </div>
            )
          })}
      </div>
      )}

      {filteredBillings.length > 0 && (
      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Billing Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Consumption</TableHead>
              <TableHead className="text-right">Amount Due</TableHead>
              <TableHead className="text-right">Amount Paid</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBillings.map((billing) => {
                const daysOverdue = differenceInDays(new Date(), new Date(billing.due_date))
                const isOverdue = billing.status !== "paid" && daysOverdue > 0
                const amountPaid = billing.amount_paid || 0
                const remainingBalance = Math.max(billing.amount - amountPaid, 0)
                const displayedConsumption = billing.usage_cubic ?? billing.meter_readings?.current_reading ?? 0
                const paymentMethodText = getPaymentMethodText(billing.payment_method)
                const statusTextClass = getBillingStatusTextClass(billing.status)

                return (
                  <TableRow key={billing.id}>
                    <TableCell className="min-w-[140px] font-medium">{billing.customers?.account_number || "-"}</TableCell>
                    <TableCell className="min-w-[140px]">{billing.customers?.customer_name || "Unknown"}</TableCell>
                    <TableCell className="min-w-[120px]">{format(new Date(billing.billing_date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="min-w-[150px]">
                      <span className={isOverdue ? "text-destructive" : ""}>
                        {format(new Date(billing.due_date), "MMM d, yyyy")}
                      </span>
                      {isOverdue && (
                        <span className="ml-2 text-xs text-destructive">({daysOverdue}d overdue)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{displayedConsumption} m3</TableCell>
                    <TableCell className="text-right font-medium">
                      <div>₱{remainingBalance.toLocaleString()}</div>
{/*                       <div className="mt-1 text-xs font-normal text-muted-foreground">
                        Base ₱{breakdown.baseRate.toLocaleString()} + Excess {breakdown.excessCubic} m3
                        {" "}({`₱${breakdown.excessCharge.toLocaleString()}`})
                      </div> */}
                    </TableCell>
                    <TableCell className="text-right">₱{amountPaid.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={paymentMethodText.className}>{paymentMethodText.label}</span>
                    </TableCell>
                    <TableCell>
                      <span className={statusTextClass}>
                        {billing.status}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="icon" asChild className="h-8 w-8">
                          <Link href={`/admin/customers/${billing.customer_id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View customer details</span>
                          </Link>
                        </Button>
                        {showPaymentButton && billing.status !== "paid" && (
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
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </div>
      )}

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
              Recording payment for {paymentDialog?.customers?.customer_name} ({paymentDialog?.customers?.account_number})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Amount Due</Label>
              <div className="text-lg font-bold">
              <span className="font-normal">₱</span>
              {Math.max((paymentDialog?.amount || 0) - (paymentDialog?.amount_paid || 0), 0).toLocaleString()}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Previously Paid</Label>
              <div className="text-lg">₱{(paymentDialog?.amount_paid || 0).toLocaleString()}</div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment_amount">Payment Amount</Label>
              <Input
                id="payment_amount"
                type="number"
                min={0}
                max={paymentDialog ? Math.max(paymentDialog.amount - (paymentDialog.amount_paid || 0), 0) : 0}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter payment amount"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <SelectTrigger id="payment_method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentError && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {paymentError}
              </p>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={isProcessing || !paymentAmount}>
              {isProcessing ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
