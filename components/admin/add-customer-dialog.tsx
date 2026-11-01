"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { Switch } from "@/components/ui/switch"
import { StructuredAddressFields, emptyAddressSelection } from "@/components/admin/structured-address-fields"
import { StubOutLocationCombobox } from "@/components/admin/stub-out-location-combobox"
import { formatAddress, getBarangays, normalizeAddressKey, toTitleCase, type AddressSelection } from "@/lib/address-data"
import {
  ACCOUNT_NUMBER_ERROR,
  ACCOUNT_NUMBER_MAX_DIGITS,
  ACCOUNT_NUMBER_PREFIX,
  METER_ID_ERROR,
  extractAccountNumberDigits,
  formatAccountNumber,
  formatTitleCase,
  isValidAccountNumber,
  isValidMeterId,
  normalizeMeterId,
  sanitizeMeterIdInput,
} from "@/lib/customer-input"
import type { StubOutLocationSummary } from "@/lib/types"
import { calculateWaterBill } from "@/lib/types"
import { parseCubicConsumedInput, parseMeterReadingInput } from "@/lib/meter-reading"
import { Plus } from "lucide-react"

function getTodayDateOnly() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function AddCustomerDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [accountNumber, setAccountNumber] = useState("")
  const [meterId, setMeterId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [addressSelection, setAddressSelection] = useState<AddressSelection>(emptyAddressSelection)
  const [stubOutLocationId, setStubOutLocationId] = useState<string | null>(null)
  const [oldCustomerMode, setOldCustomerMode] = useState(false)
  const [startingReading, setStartingReading] = useState("")
  const [cubicConsumed, setCubicConsumed] = useState("")
  const [importDate, setImportDate] = useState(getTodayDateOnly)
  const router = useRouter()

  function handleStubOutLocationChange(value: string | null, location?: StubOutLocationSummary | null) {
    setStubOutLocationId(value)

    if (!location) {
      setAddressSelection(emptyAddressSelection)
      return
    }

    const barangay =
      getBarangays(location.municipality).find(
        (option) => normalizeAddressKey(option) === normalizeAddressKey(location.barangay),
      ) ?? location.barangay

    setAddressSelection({
      municipality: location.municipality,
      barangay,
      sitio: "",
      purok: "",
      sitioId: null,
      purokId: null,
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (!nextOpen) {
      setErrorMessage(null)
      setAccountNumber("")
      setMeterId("")
      setCustomerName("")
      setAddressSelection(emptyAddressSelection)
      setStubOutLocationId(null)
      setOldCustomerMode(false)
      setStartingReading("")
      setCubicConsumed("")
      setImportDate(getTodayDateOnly())
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)

    const account_number = formatAccountNumber(accountNumber)
    const meter_id = normalizeMeterId(meterId)
    const customer_name = formatTitleCase(customerName)
    const contact_number = (formData.get("contact_number") as string)?.trim()
    const address = formatAddress(addressSelection)
    setCustomerName(customer_name)

    if (!isValidAccountNumber(account_number)) {
      setErrorMessage(ACCOUNT_NUMBER_ERROR)
      setIsLoading(false)
      return
    }

    if (!isValidMeterId(meter_id)) {
      setErrorMessage(METER_ID_ERROR)
      setIsLoading(false)
      return
    }

    if (!customer_name || !stubOutLocationId) {
      setErrorMessage("Customer name and Stub Out location are required.")
      setIsLoading(false)
      return
    }

    if (!address) {
      setErrorMessage("Municipality, barangay, sitio, and purok are required.")
      setIsLoading(false)
      return
    }

    const parsedStartingReading = oldCustomerMode
      ? parseMeterReadingInput(startingReading)
      : null
    const parsedCubicConsumed = oldCustomerMode
      ? parseCubicConsumedInput(cubicConsumed)
      : null

    if (oldCustomerMode && parsedStartingReading === null) {
      setErrorMessage("Starting meter reading must contain exactly 5 digits.")
      setIsLoading(false)
      return
    }

    if (oldCustomerMode && parsedCubicConsumed === null) {
      setErrorMessage("Cubic consumed must be an integer between 0 and 99999.")
      setIsLoading(false)
      return
    }

    const response = await fetch("/api/admin/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_number,
        meter_id,
        customer_name,
        contact_number,
        municipality: addressSelection.municipality,
        barangay: addressSelection.barangay,
        sitio: addressSelection.sitio,
        purok: addressSelection.purok,
        stub_out_location_id: stubOutLocationId,
        old_customer_mode: oldCustomerMode,
        starting_reading: oldCustomerMode ? startingReading : undefined,
        cubic_consumed: oldCustomerMode ? parsedCubicConsumed : undefined,
        import_date: oldCustomerMode ? importDate : undefined,
      }),
    })
    const payload = await response.json()

    setIsLoading(false)

    if (!response.ok) {
      const msg = payload.error || "Failed to add customer."
      setErrorMessage(msg)
      return
    }

    handleOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[640px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader className="shrink-0 px-4 pb-3 pt-5 pr-12 sm:px-6 sm:pb-4 sm:pt-6 sm:pr-12">
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Register a new customer for water service.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {errorMessage && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {errorMessage}
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="account_number">Account Number</Label>
              <div className="flex">
                <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                  {ACCOUNT_NUMBER_PREFIX}
                </span>
                <Input
                  id="account_number"
                  name="account_number"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(extractAccountNumberDigits(event.target.value))}
                  inputMode="numeric"
                  autoComplete="off"
                  pattern={`[0-9]{1,${ACCOUNT_NUMBER_MAX_DIGITS}}`}
                  placeholder="123456"
                  className="rounded-l-none"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meter_id">Meter ID *</Label>
              <Input
                id="meter_id"
                name="meter_id"
                value={meterId}
                onChange={(event) => setMeterId(sanitizeMeterIdInput(event.target.value))}
                autoComplete="off"
                minLength={4}
                maxLength={10}
                pattern="[A-Za-z0-9]{4,10}"
                placeholder="MTR001"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                name="customer_name"
                value={customerName}
                onChange={(event) => setCustomerName(toTitleCase(event.target.value))}
                onBlur={() => setCustomerName(formatTitleCase(customerName))}
                placeholder="Juan Dela Cruz"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact_number">Contact Number (Optional)</Label>
              <Input
                id="contact_number"
                name="contact_number"
                type="tel"
                placeholder="09XX XXX XXXX"
              />
            </div>
            <StubOutLocationCombobox
              value={stubOutLocationId}
              onChange={handleStubOutLocationChange}
              allowUnassigned={false}
              placeholder="Select Stub Out location"
            />
            <StructuredAddressFields
              value={addressSelection}
              onChange={setAddressSelection}
            />
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="old_customer_mode">Old Customer / Existing Meter Record</Label>
                  <p className="text-xs text-muted-foreground">
                    Import the physical meter baseline and one consumption entry from the manual book.
                  </p>
                </div>
                <Switch
                  id="old_customer_mode"
                  checked={oldCustomerMode}
                  onCheckedChange={(checked) => {
                    setOldCustomerMode(checked)
                    setErrorMessage(null)
                    if (!checked) {
                      setStartingReading("")
                      setCubicConsumed("")
                      setImportDate(getTodayDateOnly())
                    }
                  }}
                />
              </div>

              {oldCustomerMode ? (
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="manual_book_date">Manual Book Date</Label>
                    <Input
                      id="manual_book_date"
                      type="date"
                      value={importDate}
                      onChange={(event) => setImportDate(event.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="starting_reading">Starting Reading</Label>
                      <Input
                        id="starting_reading"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{5}"
                        maxLength={5}
                        value={startingReading}
                        onChange={(event) => setStartingReading(event.target.value.replace(/\D/g, "").slice(0, 5))}
                        placeholder="01045"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cubic_consumed">Cubic Consumed</Label>
                      <Input
                        id="cubic_consumed"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{1,5}"
                        maxLength={5}
                        value={cubicConsumed}
                        onChange={(event) => setCubicConsumed(event.target.value.replace(/\D/g, "").slice(0, 5))}
                        placeholder="15"
                        required
                      />
                    </div>
                  </div>

                  {parseMeterReadingInput(startingReading) !== null && parseCubicConsumedInput(cubicConsumed) !== null ? (
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">
                      <p className="font-medium">Starting Reading Setup</p>
                      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                        <div>
                          <dt className="text-muted-foreground">Baseline Reading</dt>
                          <dd className="font-semibold tabular-nums">{startingReading}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Initial Consumption</dt>
                          <dd className="font-semibold">{Number(cubicConsumed)} m³</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Initial Bill</dt>
                          <dd className="font-semibold">₱{calculateWaterBill(Number(cubicConsumed)).toLocaleString()}</dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-xs text-muted-foreground">
                        The starting reading will be used as the baseline for the next meter entry.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter className="shrink-0 flex-col gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:px-6">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
