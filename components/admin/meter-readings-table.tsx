"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
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
import { Pencil, Search } from "lucide-react"
import type { AdminRole } from "@/lib/types"
import { calculateMeterUsage, formatMeterReading, parseMeterReadingInput } from "@/lib/meter-reading"

const ALL_FILTER_VALUE = "all"

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

const DATE_OPTIONS = Array.from({ length: 31 }, (_, index) => String(index + 1))

interface MeterReading {
  id: string
  customer_id: string
  reading_date: string
  created_at: string
  previous_reading: number
  current_reading: number
  usage_cubic: number
  is_starting_reading: boolean
  recorded_by_role: AdminRole | null
  customers: {
    customer_name?: string | null
    full_name?: string | null
    account_number?: string | null
    meter_id?: string | null
    stop_out?: string | null
    archived_at?: string | null
  } | null
}

interface MeterReadingsTableProps {
  readings: MeterReading[]
  userRole: AdminRole
}

function parseReadingDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)

  if (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day)
  ) {
    return new Date(year, month - 1, day)
  }

  return new Date(value)
}

export function MeterReadingsTable({ readings, userRole }: MeterReadingsTableProps) {
  const [search, setSearch] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(ALL_FILTER_VALUE)
  const [selectedDate, setSelectedDate] = useState(ALL_FILTER_VALUE)
  const [selectedYear, setSelectedYear] = useState(ALL_FILTER_VALUE)
  const [editingReading, setEditingReading] = useState<MeterReading | null>(null)
  const [currentReadingValue, setCurrentReadingValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const router = useRouter()
  const searchLower = search.toLowerCase()
  const canEditReadings = userRole === "reader" || userRole === "finance"
  const latestReadingIds = useMemo(() => {
    const latestByCustomer = new Map<string, MeterReading>()
    for (const reading of readings) {
      const existing = latestByCustomer.get(reading.customer_id)
      if (!existing || reading.reading_date > existing.reading_date ||
        (reading.reading_date === existing.reading_date && reading.created_at > existing.created_at)) {
        latestByCustomer.set(reading.customer_id, reading)
      }
    }
    return new Set(Array.from(latestByCustomer.values(), (reading) => reading.id))
  }, [readings])
  const isAllDateFilter =
    selectedMonth === ALL_FILTER_VALUE &&
    selectedDate === ALL_FILTER_VALUE &&
    selectedYear === ALL_FILTER_VALUE

  const yearOptions = useMemo(() => {
    return Array.from(
      new Set(
        readings
          .map((reading) => parseReadingDate(reading.reading_date).getFullYear())
          .filter((year) => Number.isFinite(year)),
      ),
    ).sort((a, b) => b - a)
  }, [readings])

  const filteredReadings = readings.filter(
    (reading) => {
      const customerName = reading.customers?.customer_name || reading.customers?.full_name || ""
      const accountNumber = reading.customers?.account_number || ""
      const meterId = reading.customers?.meter_id || ""
      const stubOut = reading.customers?.stop_out || ""
      const readingDate = parseReadingDate(reading.reading_date)
      const matchesSearch =
        customerName.toLowerCase().includes(searchLower) ||
        accountNumber.toLowerCase().includes(searchLower) ||
        meterId.toLowerCase().includes(searchLower) ||
        stubOut.toLowerCase().includes(searchLower)
      const matchesMonth =
        selectedMonth === ALL_FILTER_VALUE ||
        readingDate.getMonth() + 1 === Number(selectedMonth)
      const matchesDate =
        selectedDate === ALL_FILTER_VALUE ||
        readingDate.getDate() === Number(selectedDate)
      const matchesYear =
        selectedYear === ALL_FILTER_VALUE ||
        readingDate.getFullYear() === Number(selectedYear)

      return matchesSearch && matchesMonth && matchesDate && matchesYear
    }
  )

  function resetDateFilters() {
    setSelectedMonth(ALL_FILTER_VALUE)
    setSelectedDate(ALL_FILTER_VALUE)
    setSelectedYear(ALL_FILTER_VALUE)
  }

  function canEditReading(reading: MeterReading) {
    if (reading.is_starting_reading || reading.customers?.archived_at || !latestReadingIds.has(reading.id)) {
      return false
    }

    const createdAtMs = new Date(reading.created_at).getTime()
    const hoursSinceCreated = (Date.now() - createdAtMs) / (1000 * 60 * 60)
    return hoursSinceCreated <= 24
  }

  function openEditDialog(reading: MeterReading) {
    if (!canEditReading(reading)) {
      setEditError("This reading can only be edited within 24 hours of being recorded.")
      return
    }
    setEditingReading(reading)
    setCurrentReadingValue(formatMeterReading(reading.current_reading))
    setEditError(null)
  }

  async function handleSaveReading() {
    if (!editingReading) return

    const parsedCurrentReading = parseMeterReadingInput(currentReadingValue)
    if (parsedCurrentReading === null) {
      setEditError("Current meter reading must contain exactly 5 digits.")
      return
    }

    if (parsedCurrentReading < editingReading.previous_reading) {
      setEditError("Current meter reading must be greater than or equal to the previous reading.")
      return
    }

    if (!canEditReading(editingReading)) {
      setEditError("This reading can only be edited within 24 hours of being recorded.")
      return
    }

    setIsSaving(true)
    setEditError(null)

    try {
      const response = await fetch(`/api/admin/readings/${editingReading.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_reading: currentReadingValue,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setEditError(payload.error || "Failed to update the current reading.")
        return
      }

      setEditingReading(null)
      setCurrentReadingValue("")
      router.refresh()
    } catch {
      setEditError("Failed to update the current reading.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, account, or meter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger aria-label="Filter readings by month" className="w-full lg:w-[150px]">
              <SelectValue placeholder="All months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>All months</SelectItem>
              {MONTH_OPTIONS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger aria-label="Filter readings by date" className="w-full lg:w-[120px]">
              <SelectValue placeholder="All dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>All dates</SelectItem>
              {DATE_OPTIONS.map((date) => (
                <SelectItem key={date} value={date}>
                  {date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger aria-label="Filter readings by year" className="w-full lg:w-[120px]">
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>All years</SelectItem>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant={isAllDateFilter ? "default" : "outline"}
            onClick={resetDateFilters}
            className="w-full lg:w-auto"
          >
            All
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {filteredReadings.length === 0 ? (
          <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            No readings found.
          </div>
        ) : (
          filteredReadings.map((reading) => (
            <div key={reading.id} className="rounded-lg border p-4 shadow-xs">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {reading.customers?.customer_name || reading.customers?.full_name || "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground">{reading.customers?.account_number || "-"}</p>
                <p className="text-sm text-muted-foreground">Meter ID: {reading.customers?.meter_id || "-"}</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p>{format(parseReadingDate(reading.reading_date), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Consumption</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{reading.usage_cubic} m³</p>
                    {canEditReadings && canEditReading(reading) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(reading)}>
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit current reading</span>
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Stub Out</p>
                  <p>{reading.customers?.stop_out || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Previous</p>
                  <p>{formatMeterReading(reading.previous_reading)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current</p>
                  <p>{formatMeterReading(reading.current_reading)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Added by</p>
                  <p>
                    {reading.recorded_by_role === "finance"
                      ? "Finance"
                      : reading.recorded_by_role === "reader"
                        ? "Reader"
                        : "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p>{reading.is_starting_reading ? "Manual Book Import" : "Meter Entry"}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Account No.</TableHead>
              <TableHead>Meter ID</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Stub Out</TableHead>
              <TableHead className="text-right">Previous</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Consumption (m³)</TableHead>
              <TableHead>Added by</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReadings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  No readings found.
                </TableCell>
              </TableRow>
            ) : (
              filteredReadings.map((reading) => (
                <TableRow key={reading.id}>
                  <TableCell className="min-w-[120px]">{format(parseReadingDate(reading.reading_date), "MMM d, yyyy")}</TableCell>
                  <TableCell className="min-w-[140px] font-medium">{reading.customers?.account_number || "-"}</TableCell>
                  <TableCell className="min-w-[110px]">{reading.customers?.meter_id || "-"}</TableCell>
                  <TableCell className="min-w-[140px]">{reading.customers?.customer_name || reading.customers?.full_name || "Unknown"}</TableCell>
                  <TableCell className="min-w-[100px]">{reading.customers?.stop_out || "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMeterReading(reading.previous_reading)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMeterReading(reading.current_reading)}</TableCell>
                  <TableCell className="text-right font-medium">
                    <div className="inline-flex items-center justify-end gap-2">
                      <span>{reading.usage_cubic}</span>
                      {canEditReadings && canEditReading(reading) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(reading)}>
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit current reading</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[100px]">
                    {reading.recorded_by_role === "finance"
                      ? "Finance"
                      : reading.recorded_by_role === "reader"
                        ? "Reader"
                        : "Unknown"}
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    {reading.is_starting_reading ? "Manual Book Import" : "Meter Entry"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!editingReading}
        onOpenChange={(open) => {
          if (!open) {
            setEditingReading(null)
            setCurrentReadingValue("")
            setEditError(null)
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Current Reading</DialogTitle>
            <DialogDescription>
              Update the current reading for {editingReading?.customers?.customer_name || editingReading?.customers?.full_name || "this customer"}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="previous_reading">Previous Reading</Label>
              <Input
                id="previous_reading"
                value={editingReading ? formatMeterReading(editingReading.previous_reading) : ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="current_reading">Current Reading</Label>
              <Input
                id="current_reading"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                value={currentReadingValue}
                onChange={(event) => setCurrentReadingValue(event.target.value.replace(/\D/g, "").slice(0, 5))}
              />
              <p className="text-xs text-muted-foreground">Enter the actual 5-digit reading shown on the submeter.</p>
            </div>

            {editingReading && parseMeterReadingInput(currentReadingValue) !== null && Number(currentReadingValue) >= editingReading.previous_reading ? (
              <p className="text-sm text-muted-foreground">
                Consumption: {calculateMeterUsage(parseMeterReadingInput(currentReadingValue)!, editingReading.previous_reading)} cubic meter(s)
              </p>
            ) : null}

            {editError && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {editError}
              </p>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingReading(null)
                setCurrentReadingValue("")
                setEditError(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveReading} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Reading"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
