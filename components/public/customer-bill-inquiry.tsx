"use client"

import Script from "next/script"
import { useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Printer,
  ReceiptText,
  Search,
  type LucideIcon,
  UserRound,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatMeterReading } from "@/lib/meter-reading"

const ACCOUNT_NUMBER_PATTERN = /^[A-Za-z0-9-]+$/
const ACCOUNT_NUMBER_MAX_LENGTH = 30
const CUSTOMER_NAME_MAX_LENGTH = 120
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g
const INVALID_ACCOUNT_MESSAGE = "Please enter a valid account number."
const INVALID_NAME_MESSAGE = "Please enter a valid name."
const CUSTOMER_VERIFICATION_ERROR = "Unable to verify customer information."
const CUSTOMER_VERIFICATION_UI_ERROR =
  "Unable to verify customer information. Please check your account number and name."

declare global {
  interface Window {
    turnstile?: {
      remove?: (widgetId: string) => void
      render: (
        container: HTMLElement,
        options: {
          callback?: (token: string) => void
          "error-callback"?: () => void
          "expired-callback"?: () => void
          sitekey: string
          theme?: "light" | "dark" | "auto"
        },
      ) => string
      reset?: (widgetId?: string) => void
    }
  }
}

type PublicBillingStatus = "paid" | "partial" | "unpaid" | "overdue"
type PublicPaymentMethod = "cash" | "online" | null

type PublicBillResponse = {
  customer: {
    accountNumber: string
    address: string | null
    contactNumberMasked: string | null
    customerName: string
    meterId: string | null
  }
  summary: {
    accountStatus: "Overdue" | "Not Overdue"
    oldestUnpaidBillingDate: string | null
    openBillsCount: number
    overdueReason: string | null
    overdueBillsCount: number
    totalBilled: number
    totalConsumption: number
    totalPaid: number
    totalRemaining: number
  }
  billings: Array<{
    amount: number
    amountPaid: number
    billingDate: string
    currentReading: number
    dueDate: string
    paidDate: string | null
    paymentMethod: PublicPaymentMethod
    remainingBalance: number
    status: PublicBillingStatus
    usageCubic: number
  }>
}

function normalizeAccountNumber(value: string) {
  return value.trim().replace(CONTROL_CHARACTERS, "").toUpperCase()
}

function normalizeCustomerName(value: string) {
  return value.trim().replace(CONTROL_CHARACTERS, "").replace(/\s+/g, " ")
}

function sanitizeCustomerNameInput(value: string) {
  return value.replace(CONTROL_CHARACTERS, "").replace(/\s{2,}/g, " ")
}

function isValidAccountNumber(accountNumber: string) {
  return (
    accountNumber.length > 0 &&
    accountNumber.length <= ACCOUNT_NUMBER_MAX_LENGTH &&
    ACCOUNT_NUMBER_PATTERN.test(accountNumber)
  )
}

function isValidCustomerName(customerName: string) {
  return customerName.length >= 2 && customerName.length <= CUSTOMER_NAME_MAX_LENGTH
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value)
}

function formatCompactDate(value: string | null) {
  if (!value) {
    return "-"
  }

  return format(new Date(`${value}T00:00:00`), "MMM d, yyyy")
}

function formatBillingMonth(value: string) {
  return format(new Date(`${value}T00:00:00`), "MMMM yyyy")
}

function getPaymentMethodLabel(paymentMethod: PublicPaymentMethod) {
  if (paymentMethod === "cash") {
    return "Cash"
  }

  if (paymentMethod === "online") {
    return "Online"
  }

  return "N/A"
}

function getStatusBadgeClass(status: PublicBillingStatus) {
  if (status === "paid") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  }

  if (status === "partial") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }

  return "border-destructive/20 bg-destructive/10 text-destructive"
}

function getStatusLabel(status: PublicBillingStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function getMeterIdLabel(value: string | null | undefined) {
  return value || "-"
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone: string
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-background/72 py-3 shadow-none dark:bg-slate-950/38">
      <CardContent className="flex items-center gap-3 px-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tone)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-base font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function BillingHistoryMobile({ result }: { result: PublicBillResponse }) {
  if (result.billings.length === 0) {
    return (
      <Empty className="min-h-[220px] rounded-2xl border border-border/70">
        <EmptyHeader>
          <EmptyTitle>No billing records found</EmptyTitle>
          <EmptyDescription>Billing history will appear here after bills are generated.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid gap-3 md:hidden">
      {result.billings.map((billing, index) => (
        <div key={`${billing.billingDate}-${billing.dueDate}-${index}`} className="rounded-2xl border border-border/70 bg-background/72 p-4 dark:bg-slate-950/38">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Billing Month</p>
              <p className="font-semibold text-foreground">{formatBillingMonth(billing.billingDate)}</p>
            </div>
            <Badge variant="outline" className={getStatusBadgeClass(billing.status)}>
              {getStatusLabel(billing.status)}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Due Date</p>
              <p>{formatCompactDate(billing.dueDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reading</p>
              <p className="tabular-nums">{formatMeterReading(billing.currentReading)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Consumption</p>
              <p>{billing.usageCubic.toLocaleString()} m3</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-medium">{formatCurrency(billing.amount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Paid</p>
              <p>{formatCurrency(billing.amountPaid)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Balance</p>
              <p className={cn("font-medium", billing.remainingBalance > 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-300")}>
                {formatCurrency(billing.remainingBalance)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Payment</p>
              <p>{getPaymentMethodLabel(billing.paymentMethod)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function BillingHistoryTable({ result }: { result: PublicBillResponse }) {
  if (result.billings.length === 0) {
    return null
  }

  return (
    <div className="customer-bill-full-history customer-bill-history-table hidden overflow-hidden rounded-2xl border border-border/70 md:block">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-[14%]">Billing Month</TableHead>
            <TableHead className="w-[11%]">Due Date</TableHead>
            <TableHead className="w-[10%] text-right">Reading</TableHead>
            <TableHead className="w-[10%] text-right">Consumption</TableHead>
            <TableHead className="w-[11%] text-right">Amount</TableHead>
            <TableHead className="w-[11%] text-right">Paid</TableHead>
            <TableHead className="w-[11%] text-right">Balance</TableHead>
            <TableHead className="w-[13%]">Payment Method</TableHead>
            <TableHead className="w-[9%]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_td]:py-2 [&_tr:last-child]:border-b-0">
          {result.billings.map((billing, index) => (
            <TableRow key={`${billing.billingDate}-${billing.dueDate}-${index}`}>
              <TableCell className="font-medium">{formatBillingMonth(billing.billingDate)}</TableCell>
              <TableCell>{formatCompactDate(billing.dueDate)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMeterReading(billing.currentReading)}</TableCell>
              <TableCell className="text-right">{billing.usageCubic.toLocaleString()} m3</TableCell>
              <TableCell className="text-right">{formatCurrency(billing.amount)}</TableCell>
              <TableCell className="text-right">{formatCurrency(billing.amountPaid)}</TableCell>
              <TableCell className={cn("text-right font-medium", billing.remainingBalance > 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-300")}>
                {formatCurrency(billing.remainingBalance)}
              </TableCell>
              <TableCell>{getPaymentMethodLabel(billing.paymentMethod)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={getStatusBadgeClass(billing.status)}>
                  {getStatusLabel(billing.status)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function PrintSummary({ result }: { result: PublicBillResponse }) {
  const openBillings = result.billings.filter((billing) => billing.remainingBalance > 0)

  return (
    <div className="customer-bill-print-only hidden">
      <div className="customer-bill-print-header">
        <div>
          <h1>Billing Summary</h1>
          <p>{result.customer.customerName} | {result.customer.accountNumber}</p>
          <p>Meter ID: {getMeterIdLabel(result.customer.meterId)}</p>
          <p>{result.customer.address || "No address on record"}</p>
        </div>
        <div>
          <strong>{result.summary.accountStatus}</strong>
          {result.summary.overdueReason ? <p>{result.summary.overdueReason}</p> : null}
        </div>
      </div>

      <div className="customer-bill-print-metrics">
        <div>
          <span>Remaining</span>
          <strong>{formatCurrency(result.summary.totalRemaining)}</strong>
        </div>
        <div>
          <span>Open Bills</span>
          <strong>{result.summary.openBillsCount}</strong>
        </div>
      </div>

      <h2>Open Bills</h2>
      {openBillings.length === 0 ? (
        <p>No open bills.</p>
      ) : (
        <table className="customer-bill-print-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Due</th>
              <th>Reading</th>
              <th>Use</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {openBillings.map((billing, index) => (
              <tr key={`${billing.billingDate}-${billing.dueDate}-print-${index}`}>
                <td>{formatBillingMonth(billing.billingDate)}</td>
                <td>{formatCompactDate(billing.dueDate)}</td>
                <td>{formatMeterReading(billing.currentReading)}</td>
                <td>{billing.usageCubic.toLocaleString()} m3</td>
                <td>{formatCurrency(billing.amount)}</td>
                <td>{formatCurrency(billing.amountPaid)}</td>
                <td>{formatCurrency(billing.remainingBalance)}</td>
                <td>{getStatusLabel(billing.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function buildPrintDocument(result: PublicBillResponse) {
  const openBillings = result.billings.filter((billing) => billing.remainingBalance > 0)
  const openBillingRows = openBillings
    .map((billing) => `
      <tr>
        <td>${escapeHtml(formatBillingMonth(billing.billingDate))}</td>
        <td>${escapeHtml(formatCompactDate(billing.dueDate))}</td>
        <td>${escapeHtml(formatMeterReading(billing.currentReading))}</td>
        <td>${escapeHtml(`${billing.usageCubic.toLocaleString()} m3`)}</td>
        <td>${escapeHtml(formatCurrency(billing.amount))}</td>
        <td>${escapeHtml(formatCurrency(billing.amountPaid))}</td>
        <td>${escapeHtml(formatCurrency(billing.remainingBalance))}</td>
        <td>${escapeHtml(getStatusLabel(billing.status))}</td>
      </tr>
    `)
    .join("")

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Billing Summary</title>
        <style>
          @page { size: A4; margin: 8mm; }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #0f172a;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            line-height: 1.25;
          }
          .sheet { width: 100%; max-width: 194mm; margin: 0 auto; }
          .header {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 12px;
            align-items: start;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 7px;
          }
          h1 { margin: 0 0 4px; font-size: 18px; line-height: 1.05; }
          h2 { margin: 9px 0 5px; font-size: 12px; line-height: 1.1; }
          p { margin: 0 0 2px; }
          .status { min-width: 130px; text-align: right; font-size: 10px; }
          .status strong { display: block; font-size: 12px; }
          .metrics {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 5px;
            margin: 8px 0;
          }
          .metric {
            border: 1px solid #cbd5e1;
            border-radius: 5px;
            padding: 5px;
            min-height: 32px;
          }
          .metric span {
            display: block;
            color: #475569;
            font-size: 7px;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }
          .metric strong {
            display: block;
            margin-top: 2px;
            font-size: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 8.5px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 3px 4px;
            text-align: left;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          th {
            background: #f1f5f9;
            font-weight: 700;
          }
          .muted { color: #475569; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <main class="sheet">
          <section class="header avoid-break">
            <div>
              <h1>Billing Summary</h1>
              <p>${escapeHtml(result.customer.customerName)} | ${escapeHtml(result.customer.accountNumber)}</p>
              <p class="muted">Meter ID: ${escapeHtml(getMeterIdLabel(result.customer.meterId))}</p>
              <p class="muted">${escapeHtml(result.customer.address || "No address on record")}</p>
              <p class="muted">Contact: ${escapeHtml(result.customer.contactNumberMasked || "Not available")}</p>
            </div>
            <div class="status">
              <strong>${escapeHtml(result.summary.accountStatus)}</strong>
              ${result.summary.overdueReason ? `<p>${escapeHtml(result.summary.overdueReason)}</p>` : ""}
            </div>
          </section>

          <section class="metrics avoid-break">
            <div class="metric"><span>Remaining</span><strong>${escapeHtml(formatCurrency(result.summary.totalRemaining))}</strong></div>
            <div class="metric"><span>Open Bills</span><strong>${result.summary.openBillsCount}</strong></div>
          </section>

          <section>
            <h2>Open Bills</h2>
            ${openBillings.length === 0
              ? "<p>No open bills.</p>"
              : `<table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Due</th>
                      <th>Reading</th>
                      <th>Use</th>
                      <th>Amount</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>${openBillingRows}</tbody>
                </table>`}
          </section>
        </main>
      </body>
    </html>`
}

export function CustomerBillInquiry() {
  const [accountNumber, setAccountNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<PublicBillResponse | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [turnstileLoaded, setTurnstileLoaded] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState("")
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null)
  const turnstileWidgetIdRef = useRef<string | null>(null)
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const normalizedAccountNumber = useMemo(
    () => normalizeAccountNumber(accountNumber),
    [accountNumber],
  )
  const normalizedCustomerName = useMemo(
    () => normalizeCustomerName(customerName),
    [customerName],
  )

  useEffect(() => {
    if (
      !turnstileLoaded ||
      !turnstileSiteKey ||
      !turnstileContainerRef.current ||
      !window.turnstile ||
      turnstileWidgetIdRef.current
    ) {
      return
    }

    turnstileWidgetIdRef.current = window.turnstile.render(
      turnstileContainerRef.current,
      {
        sitekey: turnstileSiteKey,
        theme: "auto",
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      },
    )

    return () => {
      if (turnstileWidgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(turnstileWidgetIdRef.current)
      }

      turnstileWidgetIdRef.current = null
    }
  }, [turnstileLoaded, turnstileSiteKey])

  function resetTurnstile() {
    setTurnstileToken("")
    window.turnstile?.reset?.(turnstileWidgetIdRef.current ?? undefined)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isValidAccountNumber(normalizedAccountNumber)) {
      setErrorMessage(INVALID_ACCOUNT_MESSAGE)
      return
    }

    if (!isValidCustomerName(normalizedCustomerName)) {
      setErrorMessage(INVALID_NAME_MESSAGE)
      return
    }

    if (!turnstileSiteKey || !turnstileToken) {
      setErrorMessage("Complete the security check before checking your bill.")
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/public/customer-bill", {
        body: JSON.stringify({
          accountNumber: normalizedAccountNumber,
          name: normalizedCustomerName,
          turnstileToken,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })

      const payload = await response.json()

      if (!response.ok) {
        setErrorMessage(
          payload.error === CUSTOMER_VERIFICATION_ERROR
            ? CUSTOMER_VERIFICATION_UI_ERROR
            : payload.error || "Unable to fetch billing records. Please try again later.",
        )
        return
      }

      setResult(payload)
      setDialogOpen(true)
    } catch {
      setErrorMessage("Unable to fetch billing records. Please try again later.")
    } finally {
      resetTurnstile()
      setIsLoading(false)
    }
  }

  function handlePrint() {
    if (!result) {
      return
    }

    const iframe = document.createElement("iframe")
    iframe.setAttribute("aria-hidden", "true")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    iframe.style.visibility = "hidden"

    document.body.appendChild(iframe)

    const printDocument = iframe.contentWindow?.document
    if (!printDocument) {
      document.body.removeChild(iframe)
      return
    }

    let hasPrinted = false
    const printFrame = () => {
      if (hasPrinted) {
        return
      }

      hasPrinted = true
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      window.setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      }, 500)
    }

    iframe.onload = printFrame
    printDocument.open()
    printDocument.write(buildPrintDocument(result))
    printDocument.close()
    window.setTimeout(printFrame, 100)
  }

  return (
    <>
      <Card className="overflow-hidden rounded-[2rem] border-cyan-400/20 bg-card shadow-md backdrop-blur-none md:bg-card/90 md:shadow-2xl md:shadow-cyan-950/10 md:backdrop-blur-xl dark:bg-slate-950 dark:md:bg-white/[0.055]">
        <CardHeader className="gap-3 px-6 pt-7 sm:px-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-700 dark:text-cyan-200">
            <ReceiptText className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">Account lookup</CardTitle>
            <CardDescription className="mt-2 leading-6">
              Use the account number printed on your billing notice.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-7 sm:px-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              strategy="afterInteractive"
              onLoad={() => setTurnstileLoaded(true)}
            />

            <div className="space-y-2">
              <Label htmlFor="account-number">Account Number</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="account-number"
                  autoComplete="off"
                  className="h-12 rounded-2xl border-border/70 bg-background/70 pl-10 uppercase shadow-sm focus-visible:ring-cyan-400/20 dark:bg-slate-950/45"
                  maxLength={ACCOUNT_NUMBER_MAX_LENGTH}
                  onChange={(event) => {
                    setAccountNumber(normalizeAccountNumber(event.target.value))
                    if (errorMessage) {
                      setErrorMessage(null)
                    }
                  }}
                  placeholder="2026-0001"
                  value={accountNumber}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Letters, numbers, and dashes only. Maximum 30 characters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-name">Name</Label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="customer-name"
                  autoComplete="name"
                  className="h-12 rounded-2xl border-border/70 bg-background/70 pl-10 shadow-sm focus-visible:ring-cyan-400/20 dark:bg-slate-950/45"
                  maxLength={CUSTOMER_NAME_MAX_LENGTH}
                  onChange={(event) => {
                    setCustomerName(sanitizeCustomerNameInput(event.target.value))
                    if (errorMessage) {
                      setErrorMessage(null)
                    }
                  }}
                  placeholder="Enter your name"
                  value={customerName}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your full name, first name, or last name as registered.
              </p>
            </div>

            {errorMessage ? (
              <div className="flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {turnstileSiteKey ? (
              <div className="space-y-2">
                <div ref={turnstileContainerRef} />
              </div>
            ) : (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                Security verification is unavailable. Please try again later.
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-2/3 rounded-full" />
                <Skeleton className="h-3 w-1/2 rounded-full" />
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-full bg-cyan-700 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-600 active:translate-y-[1px] md:shadow-[0_12px_28px_rgba(14,116,144,0.22)] dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Check Bill
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="customer-bill-print max-h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] overflow-hidden rounded-2xl p-0 sm:w-[calc(100vw-2rem)] md:w-[min(96vw,1400px)] md:max-w-none">
          {result ? (
            <div className="customer-bill-scrollarea max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden p-4 sm:p-5 lg:p-6">
              <PrintSummary result={result} />

              <DialogHeader className="customer-bill-screen-content pr-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-semibold tracking-tight">Billing Summary</DialogTitle>
                    <DialogDescription className="mt-2">
                      {result.customer.customerName} | {result.customer.accountNumber}
                    </DialogDescription>
                  </div>
                  <Badge
                    variant={result.summary.accountStatus === "Overdue" ? "destructive" : "outline"}
                    className={cn(
                      "mb-2 h-8 self-center rounded-full px-3 sm:mb-0 sm:self-auto",
                      result.summary.accountStatus === "Not Overdue"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "",
                    )}
                  >
                    {result.summary.accountStatus === "Overdue" ? (
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {result.summary.accountStatus}
                  </Badge>
                </div>
                {result.summary.overdueReason ? (
                  <p className="mt-2 text-sm font-medium text-destructive">
                    {result.summary.overdueReason}
                  </p>
                ) : null}
              </DialogHeader>

              <div className="customer-bill-screen-content space-y-5">
                <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                  <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_1.4fr_0.9fr]">
                    <div>
                      <p className="text-muted-foreground">Customer Name</p>
                      <p className="mt-1 font-semibold text-foreground">{result.customer.customerName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Meter ID</p>
                      <p className="mt-1 font-medium text-foreground">{getMeterIdLabel(result.customer.meterId)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Address</p>
                      <p className="mt-1 font-medium text-foreground">{result.customer.address || "No address on record"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Contact</p>
                      <p className="mt-1 font-medium text-foreground">{result.customer.contactNumberMasked || "Not available"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
                  <SummaryTile
                    icon={AlertCircle}
                    label="Remaining"
                    value={formatCurrency(result.summary.totalRemaining)}
                    tone="bg-red-500/10 text-red-700 dark:text-red-300"
                  />
                  <SummaryTile
                    icon={CalendarDays}
                    label="Open Bills"
                    value={String(result.summary.openBillsCount)}
                    tone="bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  />
                </div>

                <Separator />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">Billing History</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Latest billing records appear first.
                      {result.summary.oldestUnpaidBillingDate
                        ? ` Oldest open bill: ${formatCompactDate(result.summary.oldestUnpaidBillingDate)}.`
                        : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="customer-bill-no-print rounded-full active:translate-y-[1px]"
                    onClick={handlePrint}
                  >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    Print Summary
                  </Button>
                </div>

                {result.billings.length === 0 ? (
                  <Empty className="min-h-[220px] rounded-2xl border border-border/70">
                    <EmptyHeader>
                      <FileText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                      <EmptyTitle>No billing records found</EmptyTitle>
                      <EmptyDescription>No billing records have been generated for this account yet.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <>
                    <div className="customer-bill-full-history">
                      <BillingHistoryMobile result={result} />
                    </div>
                    <BillingHistoryTable result={result} />
                  </>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
