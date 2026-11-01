export const METER_READING_DIGITS = 5
export const MAX_METER_READING = 99_999

const METER_READING_PATTERN = /^\d{5}$/

export function formatMeterReading(value: number): string {
  return Math.trunc(value).toString().padStart(METER_READING_DIGITS, "0")
}

export function isValidMeterReadingInput(value: string): boolean {
  return METER_READING_PATTERN.test(value)
}

export function parseMeterReadingInput(value: string): number | null {
  if (!isValidMeterReadingInput(value)) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_METER_READING
    ? parsed
    : null
}

export function parseCubicConsumedInput(value: string): number | null {
  if (!/^\d{1,5}$/.test(value)) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_METER_READING
    ? parsed
    : null
}

export function calculateMeterUsage(currentReading: number, previousReading: number): number {
  return currentReading - previousReading
}

export type HistoricalMeterImpact = {
  editedUsage: number
  followingUsage: number | null
}

export function calculateHistoricalMeterImpact(
  previousReading: number,
  editedCurrentReading: number,
  followingCurrentReading: number | null,
): HistoricalMeterImpact | null {
  if (editedCurrentReading < previousReading) {
    return null
  }

  if (followingCurrentReading !== null && editedCurrentReading > followingCurrentReading) {
    return null
  }

  return {
    editedUsage: editedCurrentReading - previousReading,
    followingUsage: followingCurrentReading === null
      ? null
      : followingCurrentReading - editedCurrentReading,
  }
}
