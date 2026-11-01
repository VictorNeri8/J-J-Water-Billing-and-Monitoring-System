"use client"

import { useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { AdminRole, OverdueAccount, PaymentMethod } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CreditCard, Eye } from "lucide-react"

interface OverdueAccountsTableProps {
  role: AdminRole
  accounts: OverdueAccount[]
}

export function OverdueAccountsTable({ role, accounts }: OverdueAccountsTableProps) {
  const [selectedAccount, setSelectedAccount] = useState<OverdueAccount | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const router = useRouter()

  const canProcessPayments = role === "finance"

  async function handlePay() {
    if (!selectedAccount) return

    if (!paymentMethod) {
      setPaymentError("Select a payment method.")
      return
    }

    setIsProcessing(true)
    setPaymentError(null)

    try {
      const supabase = createClient()
      const paidDate = new Date().toISOString().split("T")[0]
      const results = await Promise.all(
        selectedAccount.openBillings.map((billing) =>
          supabase
            .from("billings")
            .update({
              status: "paid",
              amount_paid: billing.amount,
              paid_date: paidDate,
              payment_method: paymentMethod,
            })
            .eq("id", billing.id),
        ),
      )

      const error = results.find((result) => result.error)?.error
      if (error) {
        setPaymentError(error.message || "Failed to mark overdue bills as paid.")
        return
      }

      setSelectedAccount(null)
      setPaymentMethod("")
      router.refresh()
    } catch {
      setPaymentError("Failed to mark overdue bills as paid.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (accounts.length === 0) {
    return (
      <Empty className="min-h-[260px] border">
        <EmptyHeader>
          <EmptyTitle>No overdue accounts</EmptyTitle>
          <EmptyDescription>All overdue balances are cleared.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:hidden">
        {accounts.map((account) => (
          <div key={account.customerId} className="rounded-lg border p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{account.customerName}</p>
                <p className="text-sm text-muted-foreground">{account.accountNumber}</p>
              </div>
              <Badge variant="destructive">Overdue</Badge>
            </div>

            <div className="mt-4 grid gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Address: </span>
                <span className="break-words">{account.address || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Contact: </span>
                <span>{account.contactNumber || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Stub Out: </span>
                <span>{account.stopOut || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Open Bills: </span>
                <span>{account.openBillCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Unpaid Consumption: </span>
                <span>{account.totalUnpaidConsumption} m3</span>
              </div>
            </div>

            {canProcessPayments ? (
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="icon" asChild className="h-8 w-8">
                  <Link href={`/admin/customers/${account.customerId}`}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View customer details</span>
                  </Link>
                </Button>
                <Button
                  size="sm"
                  className="cursor-pointer !border-emerald-600 !bg-emerald-600 !text-white shadow-sm hover:!border-emerald-700 hover:!bg-emerald-700 hover:!text-white"
                  onClick={() => {
                    setPaymentError(null)
                    setPaymentMethod("")
                    setSelectedAccount(account)
                  }}
                >
                  <CreditCard className="mr-2 h-3 w-3" />
                  Pay
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Stub Out</TableHead>
              <TableHead className="text-right">Open Bills</TableHead>
              <TableHead className="text-right">Total Unpaid Consumption</TableHead>
              <TableHead>Status</TableHead>
              {canProcessPayments ? <TableHead className="text-right">Action</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.customerId}>
                <TableCell className="font-medium">{account.accountNumber}</TableCell>
                <TableCell>{account.customerName}</TableCell>
                <TableCell className="max-w-[260px] whitespace-normal break-words">{account.address || "-"}</TableCell>
                <TableCell>{account.contactNumber || "-"}</TableCell>
                <TableCell>{account.stopOut || "-"}</TableCell>
                <TableCell className="text-right">{account.openBillCount}</TableCell>
                <TableCell className="text-right">{account.totalUnpaidConsumption} m3</TableCell>
                <TableCell>
                  <Badge variant="destructive">Overdue</Badge>
                </TableCell>
                {canProcessPayments ? (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="icon" asChild className="h-8 w-8">
                        <Link href={`/admin/customers/${account.customerId}`}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View customer details</span>
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="cursor-pointer !border-emerald-600 !bg-emerald-600 !text-white shadow-sm hover:!border-emerald-700 hover:!bg-emerald-700 hover:!text-white"
                        onClick={() => {
                          setPaymentError(null)
                          setPaymentMethod("")
                          setSelectedAccount(account)
                        }}
                      >
                        <CreditCard className="mr-2 h-3 w-3" />
                        Pay
                      </Button>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!selectedAccount}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentError(null)
            setPaymentMethod("")
            setSelectedAccount(null)
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
          <DialogHeader>
            <DialogTitle>Process Overdue Payment</DialogTitle>
            <DialogDescription>
              Review all open bills for {selectedAccount?.customerName} ({selectedAccount?.accountNumber}).
            </DialogDescription>
          </DialogHeader>

          {selectedAccount ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-medium text-foreground">{selectedAccount.customerName}</p>
                <p className="text-muted-foreground">{selectedAccount.accountNumber}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Billing Breakdown</h4>
                <div className="space-y-2 rounded-lg border p-3">
                  {selectedAccount.openBillings.map((billing) => {
                    const remainingAmount = Math.max(billing.amount - billing.amountPaid, 0)

                    return (
                      <div key={billing.id} className="flex items-start justify-between gap-3 text-sm">
                        <div>
                          <p className="font-medium text-foreground">
                            {format(new Date(billing.billingDate), "MMMM yyyy")}
                          </p>
                          <p className="text-muted-foreground">{billing.usageCubic} m3 unpaid consumption</p>
                        </div>
                        <p className="font-medium text-foreground">₱{remainingAmount.toLocaleString()}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/20 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Unpaid Consumption</span>
                  <span className="font-medium">{selectedAccount.totalUnpaidConsumption} m3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Unpaid</span>
                  <span className="font-medium">₱{selectedAccount.totalUnpaid.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Maintenance/Labor Fee</span>
                  <span className="font-medium">₱{selectedAccount.penaltyFee.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                  <span>Total Due</span>
                  <span>
                    <span className="font-normal">₱</span>
                    {selectedAccount.totalDue.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="overdue_payment_method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                  <SelectTrigger id="overdue_payment_method">
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
          ) : null}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setPaymentError(null)
                setPaymentMethod("")
                setSelectedAccount(null)
              }}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer !border-emerald-600 !bg-emerald-600 !text-white shadow-sm hover:!border-emerald-700 hover:!bg-emerald-700 hover:!text-white"
              onClick={handlePay}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
