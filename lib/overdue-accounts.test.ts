import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node's strip-types runner requires an explicit TypeScript extension.
import { getOverdueOpenBillingSummaries, isOverdueAccount, summarizeOpenBillingsByCustomer } from "./overdue-accounts.ts"

type TestBilling = {
  id: string
  customer_id: string
  billing_date: string
  usage_cubic: number
  amount: number
  amount_paid: number | null
  status: "paid" | "partial" | "unpaid" | "overdue"
}

function bill(overrides: Partial<TestBilling>): TestBilling {
  return {
    id: overrides.id || crypto.randomUUID(),
    customer_id: overrides.customer_id || "customer-1",
    billing_date: overrides.billing_date || "2026-01-01",
    usage_cubic: overrides.usage_cubic ?? 10,
    amount: overrides.amount ?? 350,
    amount_paid: overrides.amount_paid ?? 0,
    status: overrides.status || "unpaid",
  }
}

test("does not mark one old manual-book unpaid bill as overdue", () => {
  const summaries = summarizeOpenBillingsByCustomer([
    bill({ billing_date: "2026-01-01", status: "unpaid" }),
  ])

  assert.equal(summaries[0].openBillCount, 1)
  assert.equal(summaries[0].oldestOpenBillingDate, "2026-01-01")
  assert.equal(isOverdueAccount(summaries[0].openBillCount), false)
  assert.equal(getOverdueOpenBillingSummaries(summaries[0].openBillings).length, 0)
})

test("does not mark two open bills as overdue", () => {
  const summaries = getOverdueOpenBillingSummaries([
    bill({ id: "bill-1", billing_date: "2026-01-01" }),
    bill({ id: "bill-2", billing_date: "2026-02-01" }),
  ])

  assert.equal(summaries.length, 0)
})

test("marks three unpaid bills as overdue", () => {
  const summaries = getOverdueOpenBillingSummaries([
    bill({ id: "bill-1", billing_date: "2026-01-01", status: "unpaid" }),
    bill({ id: "bill-2", billing_date: "2026-02-01", status: "unpaid" }),
    bill({ id: "bill-3", billing_date: "2026-03-01", status: "unpaid" }),
  ])

  assert.equal(summaries.length, 1)
  assert.equal(summaries[0].openBillCount, 3)
})

test("counts partial bills as open", () => {
  const summaries = getOverdueOpenBillingSummaries([
    bill({ id: "bill-1", billing_date: "2026-01-01", status: "partial", amount_paid: 100 }),
    bill({ id: "bill-2", billing_date: "2026-02-01", status: "unpaid" }),
    bill({ id: "bill-3", billing_date: "2026-03-01", status: "unpaid" }),
  ])

  assert.equal(summaries.length, 1)
  assert.equal(summaries[0].openBillCount, 3)
})

test("does not count paid bills", () => {
  const summaries = getOverdueOpenBillingSummaries([
    bill({ id: "bill-1", billing_date: "2026-01-01", status: "paid", amount_paid: 350 }),
    bill({ id: "bill-2", billing_date: "2026-02-01", status: "unpaid" }),
    bill({ id: "bill-3", billing_date: "2026-03-01", status: "unpaid" }),
  ])

  assert.equal(summaries.length, 0)
})

test("keeps old dates as display information only", () => {
  const summaries = summarizeOpenBillingsByCustomer([
    bill({ id: "bill-1", billing_date: "2025-01-01", status: "unpaid" }),
  ])

  assert.equal(summaries[0].oldestOpenBillingDate, "2025-01-01")
  assert.equal(summaries[0].latestOpenBillingDate, "2025-01-01")
  assert.equal(isOverdueAccount(summaries[0].openBillCount), false)
})

test("calculates unpaid balance with a non-negative floor", () => {
  const summaries = summarizeOpenBillingsByCustomer([
    bill({ id: "bill-1", amount: 350, amount_paid: 100, status: "partial" }),
    bill({ id: "bill-2", amount: 350, amount_paid: 400, status: "partial" }),
    bill({ id: "bill-3", amount: 350, amount_paid: 0, status: "unpaid" }),
  ])

  assert.equal(summaries[0].totalUnpaid, 600)
  assert.equal(summaries[0].penaltyFee, 200)
  assert.equal(summaries[0].totalDue, 800)
})

test("keeps all open bills for a qualifying overdue account", () => {
  const summaries = getOverdueOpenBillingSummaries([
    bill({ id: "jan", billing_date: "2026-01-01", status: "partial" }),
    bill({ id: "feb", billing_date: "2026-02-01", status: "unpaid" }),
    bill({ id: "mar", billing_date: "2026-03-01", status: "overdue" }),
    bill({ id: "paid", billing_date: "2026-04-01", status: "paid", amount_paid: 350 }),
  ])

  assert.deepEqual(
    summaries[0].openBillings.map((billing) => billing.id),
    ["jan", "feb", "mar"],
  )
})
