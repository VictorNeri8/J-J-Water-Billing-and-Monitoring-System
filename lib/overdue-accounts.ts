import type { BillingStatus } from "@/lib/types"

export const OPEN_BILLING_STATUSES = ["unpaid", "partial", "overdue"] as const
export const OVERDUE_OPEN_BILL_THRESHOLD = 3
export const OVERDUE_PENALTY_FEE = 200

export type OpenBillingStatus = (typeof OPEN_BILLING_STATUSES)[number]

export type OpenBillingInput = {
  customer_id: string
  billing_date: string
  usage_cubic?: number | string | null
  amount?: number | string | null
  amount_paid?: number | string | null
  status?: BillingStatus | string | null
}

export type OpenBillingSummary<TBilling extends OpenBillingInput> = {
  customerId: string
  openBillCount: number
  totalUnpaid: number
  totalUnpaidConsumption: number
  penaltyFee: number
  totalDue: number
  oldestOpenBillingDate: string
  latestOpenBillingDate: string
  openBillings: TBilling[]
}

export function isOpenBillingStatus(status: BillingStatus | string | null | undefined): status is OpenBillingStatus {
  return OPEN_BILLING_STATUSES.includes(status as OpenBillingStatus)
}

export function isOverdueAccount(openBillCount: number) {
  return openBillCount >= OVERDUE_OPEN_BILL_THRESHOLD
}

export function toFiniteBillingNumber(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

export function getRemainingBillingBalance(row: Pick<OpenBillingInput, "amount" | "amount_paid">) {
  return Math.max(toFiniteBillingNumber(row.amount) - toFiniteBillingNumber(row.amount_paid), 0)
}

export function summarizeOpenBillingsByCustomer<TBilling extends OpenBillingInput>(
  billings: TBilling[],
) {
  const summaries = new Map<string, OpenBillingSummary<TBilling>>()

  for (const billing of billings) {
    if (!isOpenBillingStatus(billing.status)) {
      continue
    }

    const remainingBalance = getRemainingBillingBalance(billing)
    const usageCubic = toFiniteBillingNumber(billing.usage_cubic)
    const current = summaries.get(billing.customer_id)

    if (!current) {
      summaries.set(billing.customer_id, {
        customerId: billing.customer_id,
        openBillCount: 1,
        totalUnpaid: remainingBalance,
        totalUnpaidConsumption: usageCubic,
        penaltyFee: OVERDUE_PENALTY_FEE,
        totalDue: remainingBalance + OVERDUE_PENALTY_FEE,
        oldestOpenBillingDate: billing.billing_date,
        latestOpenBillingDate: billing.billing_date,
        openBillings: [billing],
      })
      continue
    }

    current.openBillCount += 1
    current.totalUnpaid += remainingBalance
    current.totalUnpaidConsumption += usageCubic
    current.totalDue = current.totalUnpaid + current.penaltyFee
    current.openBillings.push(billing)

    if (billing.billing_date < current.oldestOpenBillingDate) {
      current.oldestOpenBillingDate = billing.billing_date
    }

    if (billing.billing_date > current.latestOpenBillingDate) {
      current.latestOpenBillingDate = billing.billing_date
    }
  }

  return Array.from(summaries.values())
}

export function getOverdueOpenBillingSummaries<TBilling extends OpenBillingInput>(
  billings: TBilling[],
) {
  return summarizeOpenBillingsByCustomer(billings).filter((summary) =>
    isOverdueAccount(summary.openBillCount),
  )
}
