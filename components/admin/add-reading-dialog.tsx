"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { calculateWaterBill } from "@/lib/types"
import { calculateMeterUsage, formatMeterReading, parseMeterReadingInput } from "@/lib/meter-reading"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Plus, Calculator } from "lucide-react"

interface Customer {
  id: string
  full_name?: string | null
  customer_name?: string | null
  account_number: string
  meter_id?: string | null
  stop_out?: string | null
  stub_out_locations?: StubOutLocationInfo | StubOutLocationInfo[] | null
  is_active?: boolean | null
}

interface StubOutLocationInfo {
    code?: string | null
    name?: string | null
    municipality?: string | null
    barangay?: string | null
    sitio?: string | null
    purok?: string | null
}

interface MeterReading {
  current_reading: number
  usage_cubic?: number | null
  reading_date?: string
}

interface ReadingPreview {
  previousReading: number
  nextReadingDate: string
}

export interface AddReadingSuccessPayload {
  success: true
  reading: {
    reading_id: string
    previous_reading: number
    current_reading: number
    usage_cubic: number
    amount: number
  }
  customer_check?: {
    id: string
    meter_checked_at: string | null
    meter_check_expires_at: string | null
    meter_checked_by_user_id: string | null
    meter_checked_by_email: string | null
    meter_checked_by_role: string | null
  }
}

interface AddReadingDialogProps {
  customers: Customer[]
  triggerClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialCustomerId?: string | null
  stubOutLabel?: string | null
  hideTrigger?: boolean
  onSaved?: (payload: AddReadingSuccessPayload) => void | Promise<void>
}

function getCustomerLabel(customer: Customer) {
  return customer.full_name || customer.customer_name || "Unknown Customer"
}

function getMeterIdLabel(customer?: Customer | null) {
  return customer?.meter_id || "-"
}

function getStubOutLabel(customer?: Customer | null, fallback?: string | null) {
  if (fallback) return fallback

  const stubOutLocationValue = customer?.stub_out_locations
  const stubOutLocation = Array.isArray(stubOutLocationValue)
    ? stubOutLocationValue[0]
    : stubOutLocationValue
  if (stubOutLocation) {
    const place = [
      stubOutLocation.name,
      stubOutLocation.sitio,
      stubOutLocation.barangay,
      stubOutLocation.municipality,
    ].filter(Boolean).join(", ")

    if (stubOutLocation.code && place) return `${stubOutLocation.code} - ${place}`
    if (stubOutLocation.code) return stubOutLocation.code
    if (place) return place
  }

  return customer?.stop_out || "-"
}

function getInactiveCustomerMessage() {
  return "Please turn this customer status to active to add meter."
}

function toDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function resolveNextReadingDate(latestReadingDate?: string | null) {
  const candidate = latestReadingDate ? new Date(`${latestReadingDate}T00:00:00`) : new Date()
  if (latestReadingDate) candidate.setMonth(candidate.getMonth() + 1)

  return toDateOnly(candidate)
}

function formatReadingMonth(dateOnly: string | null) {
  if (!dateOnly) return null

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateOnly}T00:00:00`))
}

async function fetchLatestReading(customerId: string): Promise<ReadingPreview> {
  const supabase = createClient()
  const { data: latestReading, error } = await supabase
    .from("meter_readings")
    .select("current_reading, reading_date")
    .eq("customer_id", customerId)
    .order("reading_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) throw error
  const mostRecentReading = (latestReading?.[0] as MeterReading | undefined) ?? null

  return {
    previousReading: mostRecentReading?.current_reading ?? 0,
    nextReadingDate: resolveNextReadingDate(mostRecentReading?.reading_date),
  }
}

export function AddReadingDialog({
  customers,
  triggerClassName,
  open,
  onOpenChange,
  initialCustomerId,
  stubOutLabel,
  hideTrigger = false,
  onSaved,
}: AddReadingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(initialCustomerId ?? "")
  const [previousReading, setPreviousReading] = useState<number | null>(null)
  const [nextReadingDate, setNextReadingDate] = useState<string | null>(null)
  const [currentReading, setCurrentReading] = useState("")
  const [usageCubic, setUsageCubic] = useState<number | null>(null)
  const [amountDuePreview, setAmountDuePreview] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const router = useRouter()
  const dialogOpen = open ?? internalOpen
  const selectedCustomerData = customers.find((customer) => customer.id === selectedCustomer)
  const selectedCustomerInactive = selectedCustomerData?.is_active === false
  const readingMonthLabel = formatReadingMonth(nextReadingDate)

  function setDialogOpen(nextOpen: boolean) {
    if (onOpenChange) {
      onOpenChange(nextOpen)
    } else {
      setInternalOpen(nextOpen)
    }

    if (!nextOpen) {
      resetForm()
    }
  }

  useEffect(() => {
    async function fetchLastReading() {
      if (!selectedCustomer) {
        setPreviousReading(null)
        setNextReadingDate(null)
        setFormError(null)
        return
      }

      setPreviousReading(null)
      setNextReadingDate(null)
      setUsageCubic(null)
      setAmountDuePreview(null)

      const customer = customers.find((item) => item.id === selectedCustomer)
      if (customer?.is_active === false) {
        setPreviousReading(null)
        setNextReadingDate(null)
        setUsageCubic(null)
        setAmountDuePreview(null)
        setFormError(getInactiveCustomerMessage())
        return
      }

      try {
        const preview = await fetchLatestReading(selectedCustomer)
        setPreviousReading(preview.previousReading)
        setNextReadingDate(preview.nextReadingDate)
        setAmountDuePreview(null)
      } catch (error) {
        console.error("Error fetching last reading:", error)
        setPreviousReading(0)
        setNextReadingDate(resolveNextReadingDate())
      }
    }

    fetchLastReading()
  }, [customers, selectedCustomer])

  useEffect(() => {
    if (selectedCustomerInactive) {
      setUsageCubic(null)
      setAmountDuePreview(null)
      setFormError(getInactiveCustomerMessage())
      return
    }

    if (!currentReading) {
      setUsageCubic(null)
      setAmountDuePreview(null)
      setFormError(null)
      return
    }

    const parsedCurrentReading = parseMeterReadingInput(currentReading)
    if (parsedCurrentReading === null || previousReading === null) {
      setUsageCubic(null)
      setAmountDuePreview(null)
      return
    }

    if (parsedCurrentReading < previousReading) {
      setUsageCubic(null)
      setAmountDuePreview(null)
      setFormError("Current meter reading must be greater than or equal to the previous reading.")
      return
    }

    const usage = calculateMeterUsage(parsedCurrentReading, previousReading)
    setUsageCubic(usage)
    setAmountDuePreview(calculateWaterBill(usage))
    setFormError(null)
  }, [currentReading, previousReading, selectedCustomer, selectedCustomerInactive])

  function resetForm() {
    setCustomerPickerOpen(false)
    setSelectedCustomer("")
    setPreviousReading(null)
    setNextReadingDate(null)
    setCurrentReading("")
    setUsageCubic(null)
    setAmountDuePreview(null)
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedCustomer) return

    const parsedCurrentReading = parseMeterReadingInput(currentReading)
    if (parsedCurrentReading === null) {
      setFormError("Current meter reading must contain exactly 5 digits.")
      return
    }
    if (previousReading !== null && parsedCurrentReading < previousReading) {
      setFormError("Current meter reading must be greater than or equal to the previous reading.")
      return
    }

    setIsLoading(true)
    setFormError(null)

    try {
      const response = await fetch("/api/admin/readings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: selectedCustomer,
          current_reading: currentReading,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setFormError(payload.error || "Failed to save the meter reading.")
        return
      }

      setDialogOpen(false)
      resetForm()
      router.refresh()
      await onSaved?.(payload as AddReadingSuccessPayload)
    } catch (error) {
      console.error("Error saving reading:", error)
      setFormError("Failed to save the meter reading.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
    >
      {hideTrigger ? null : (
        <DialogTrigger asChild>
          <Button className={triggerClassName}>
            <Plus className="mr-2 h-4 w-4" />
            Add Reading
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[425px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[425px]">
        <DialogHeader className="shrink-0 px-4 pb-3 pt-5 pr-12 sm:px-6 sm:pb-4 sm:pt-6 sm:pr-12">
          <DialogTitle>Record Meter Reading</DialogTitle>
          <DialogDescription>
            Enter a new meter reading for a customer. Billing will be generated automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid max-h-[calc(100dvh-12rem)] gap-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6" onWheelCapture={(event) => event.stopPropagation()}>
            <div className="grid gap-2">
              <Label htmlFor="customer">Customer</Label>
              <Popover open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="customer"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerPickerOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {selectedCustomerData
                        ? `${selectedCustomerData.account_number} - ${getCustomerLabel(selectedCustomerData)}`
                        : "Select a customer"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-0 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search customer or account..." />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {customers.map((customer) => {
                          const customerLabel = `${customer.account_number} - ${getCustomerLabel(customer)}`
                          const meterIdLabel = getMeterIdLabel(customer)

                          return (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.account_number} ${meterIdLabel} ${getCustomerLabel(customer)}`}
                              onSelect={() => {
                                setSelectedCustomer(customer.id)
                                setCustomerPickerOpen(false)
                                if (customer.is_active === false) {
                                  setFormError(getInactiveCustomerMessage())
                                } else {
                                  setFormError(null)
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCustomer === customer.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className={cn("min-w-0", customer.is_active === false && "text-muted-foreground")}>
                                <span className="block truncate">
                                  {customerLabel}
                                  {customer.is_active === false ? " (Inactive)" : ""}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  Meter ID: {meterIdLabel}
                                </span>
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedCustomer && (
              <>
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
                    <div className="min-w-0 sm:flex-1">
                      <div className="min-w-0">
                        <p className="text-muted-foreground">Customer</p>
                        <p className="truncate font-medium">{selectedCustomerData ? getCustomerLabel(selectedCustomerData) : "-"}</p>
                      </div>
                      <div className="mt-2 min-w-0">
                        <p className="text-muted-foreground">Meter ID</p>
                        <p className="truncate font-medium">{getMeterIdLabel(selectedCustomerData)}</p>
                      </div>
                    </div>
                    <div className="min-w-0 sm:w-[150px] sm:shrink-0">
                      <div className="min-w-0">
                        <p className="text-muted-foreground">Account Number</p>
                        <p className="truncate font-medium">{selectedCustomerData?.account_number || "-"}</p>
                      </div>
                      <div className="mt-2 min-w-0">
                        <p className="text-muted-foreground">Stub Out</p>
                        <p className="truncate font-medium">{getStubOutLabel(selectedCustomerData, stubOutLabel)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="previous_reading">Previous Reading</Label>
                  <Input
                    id="previous_reading"
                    value={selectedCustomerInactive ? "Unavailable" : previousReading === null ? "Loading..." : formatMeterReading(previousReading)}
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
                    value={currentReading}
                    onChange={(e) => setCurrentReading(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    disabled={selectedCustomerInactive}
                    placeholder="00000"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Enter the actual 5-digit reading shown on the submeter.</p>
                </div>

                {usageCubic !== null && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calculator className="h-4 w-4 text-primary" />
                      Consumption
                    </div>
                    <div className="mt-2 text-2xl font-bold text-primary">
                      {usageCubic} cubic meter(s)
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Amount: ₱{(amountDuePreview ?? 0).toLocaleString()}
                    </div>
                    {readingMonthLabel ? (
                      <div className="mt-1 text-sm text-muted-foreground">
                        Reading Month: {readingMonthLabel}
                      </div>
                    ) : null}
                    {usageCubic === 0 ? (
                      <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">No consumption detected for this billing period.</p>
                    ) : null}
                  </div>
                )}

                {formError && (
                  <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {formError}
                  </p>
                )}
              </>
            )}
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:px-6">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={isLoading || usageCubic === null || !!formError || selectedCustomerData?.is_active === false}
            >
              {isLoading ? "Saving..." : "Save & Generate Bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
