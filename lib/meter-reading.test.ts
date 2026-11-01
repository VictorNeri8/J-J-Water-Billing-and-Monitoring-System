import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node's strip-types runner requires an explicit TypeScript extension.
import { calculateWaterBill } from "./types.ts"
// @ts-expect-error Node's strip-types runner requires an explicit TypeScript extension.
import { calculateHistoricalMeterImpact, calculateMeterUsage, formatMeterReading, parseCubicConsumedInput, parseMeterReadingInput } from "./meter-reading.ts"

test("formats integer readings with leading zeros", () => {
  assert.equal(formatMeterReading(240), "00240")
  assert.equal(formatMeterReading(0), "00000")
})

test("accepts exactly five numeric digits", () => {
  assert.equal(parseMeterReadingInput("00140"), 140)
  assert.equal(parseMeterReadingInput("00000"), 0)
  assert.equal(parseMeterReadingInput("0140"), null)
  assert.equal(parseMeterReadingInput("000140"), null)
  assert.equal(parseMeterReadingInput("00A40"), null)
})

test("validates imported manual-book consumption independently of the baseline", () => {
  assert.equal(parseCubicConsumedInput("0"), 0)
  assert.equal(parseCubicConsumedInput("15"), 15)
  assert.equal(parseCubicConsumedInput("99999"), 99999)
  assert.equal(parseCubicConsumedInput(""), null)
  assert.equal(parseCubicConsumedInput("-1"), null)
  assert.equal(parseCubicConsumedInput("1.5"), null)
  assert.equal(parseCubicConsumedInput("100000"), null)
})

test("calculates cumulative usage", () => {
  assert.equal(calculateMeterUsage(140, 0), 140)
  assert.equal(calculateMeterUsage(240, 140), 100)
  assert.equal(calculateMeterUsage(240, 240), 0)
  assert.ok(calculateMeterUsage(235, 240) < 0)
})

test("keeps the existing water tariff", () => {
  assert.equal(calculateWaterBill(0), 0)
  assert.equal(calculateWaterBill(3), 350)
  assert.equal(calculateWaterBill(10), 350)
  assert.equal(calculateWaterBill(11), 390)
  assert.equal(calculateWaterBill(15), 550)
  assert.equal(calculateWaterBill(100), 3950)
})

test("recalculates only an edited reading and its immediate successor", () => {
  assert.deepEqual(calculateHistoricalMeterImpact(140, 220, 300), {
    editedUsage: 80,
    followingUsage: 80,
  })
  assert.deepEqual(calculateHistoricalMeterImpact(0, 140, 240), {
    editedUsage: 140,
    followingUsage: 100,
  })
  assert.deepEqual(calculateHistoricalMeterImpact(240, 300, null), {
    editedUsage: 60,
    followingUsage: null,
  })
})

test("rejects historical readings outside their neighboring values", () => {
  assert.equal(calculateHistoricalMeterImpact(240, 235, 300), null)
  assert.equal(calculateHistoricalMeterImpact(240, 305, 300), null)
  assert.notEqual(calculateHistoricalMeterImpact(240, 240, 300), null)
  assert.notEqual(calculateHistoricalMeterImpact(240, 300, 300), null)
})
