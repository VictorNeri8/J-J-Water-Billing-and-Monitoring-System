"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { StructuredAddressFields, emptyAddressSelection } from "@/components/admin/structured-address-fields"
import { StubOutLocationCombobox } from "@/components/admin/stub-out-location-combobox"
import { formatAddress, parseAddress, toTitleCase, type AddressSelection } from "@/lib/address-data"
import {
  ACCOUNT_NUMBER_ERROR,
  ACCOUNT_NUMBER_MAX_DIGITS,
  ACCOUNT_NUMBER_PREFIX,
  METER_ID_ERROR,
  extractAccountNumberDigits,
  formatOptionalMeterId,
  formatAccountNumber,
  formatTitleCase,
  isValidAccountNumber,
  isValidMeterId,
  sanitizeMeterIdInput,
} from "@/lib/customer-input"
import type { Customer } from "@/lib/types"
import { CircleHelp } from "lucide-react"

interface EditCustomerDialogProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  statusOnly?: boolean
}

function getStatusTextClass(isActive: boolean) {
  return isActive
    ? "text-sm font-medium text-emerald-700 dark:text-emerald-400"
    : "text-sm font-medium text-red-700 dark:text-red-400"
}

export function EditCustomerDialog({
  customer,
  open,
  onOpenChange,
  statusOnly = false,
}: EditCustomerDialogProps) {
  const [accountNumber, setAccountNumber] = useState("")
  const [meterId, setMeterId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [address, setAddress] = useState("")
  const [addressSelection, setAddressSelection] = useState<AddressSelection>(emptyAddressSelection)
  const [stubOutLocationId, setStubOutLocationId] = useState<string | null>(null)
  const [hasStructuredAddress, setHasStructuredAddress] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusConfirmMode, setStatusConfirmMode] = useState<"status" | "full" | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!customer) {
      setAccountNumber("")
      setMeterId("")
      setCustomerName("")
      setContactNumber("")
      setAddress("")
      setAddressSelection(emptyAddressSelection)
      setStubOutLocationId(null)
      setHasStructuredAddress(false)
      setIsActive(true)
      setErrorMessage(null)
      setStatusConfirmMode(null)
      return
    }

    setAccountNumber(extractAccountNumberDigits(customer.account_number))
    setMeterId(customer.meter_id ?? "")
    setCustomerName(customer.customer_name)
    setContactNumber(customer.contact_number ?? "")
    setAddress(customer.address ?? "")
    setStubOutLocationId(customer.stub_out_location_id ?? null)
    const structuredAddress =
      customer.municipality && customer.barangay && customer.sitio && customer.purok
        ? {
            municipality: customer.municipality,
            barangay: customer.barangay,
            sitio: customer.sitio,
            purok: customer.purok,
            sitioId: customer.address_sitio_id ?? null,
            purokId: customer.address_purok_id ?? null,
          }
        : parseAddress(customer.address)
    setAddressSelection(structuredAddress ?? emptyAddressSelection)
    setHasStructuredAddress(!!structuredAddress)
    setIsActive(customer.is_active)
    setErrorMessage(null)
    setStatusConfirmMode(null)
  }, [customer])

  async function submitStatusOnlyUpdate() {
    if (!customer) {
      return
    }

    setStatusConfirmMode(null)
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: isActive }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setErrorMessage(payload.error || "Failed to update customer status.")
        return
      }

      onOpenChange(false)
      router.refresh()
    } catch {
      setErrorMessage("Failed to update customer status.")
    } finally {
      setIsLoading(false)
    }
  }

  async function submitFullUpdate() {
    if (!customer) {
      return
    }

    const trimmedAccountNumber = formatAccountNumber(accountNumber)
    const trimmedMeterId = formatOptionalMeterId(meterId)
    const trimmedCustomerName = formatTitleCase(customerName)
    const trimmedContactNumber = contactNumber.trim()
    const trimmedAddress = address.trim()
    const formattedAddress = formatAddress(addressSelection)
    const isPreservingLegacyAddress = !!customer.address && !hasStructuredAddress && trimmedAddress === customer.address
    setCustomerName(trimmedCustomerName)

    if (!isValidAccountNumber(trimmedAccountNumber)) {
      setErrorMessage(ACCOUNT_NUMBER_ERROR)
      return
    }

    if (trimmedMeterId && !isValidMeterId(trimmedMeterId)) {
      setErrorMessage(METER_ID_ERROR)
      return
    }

    if (!trimmedCustomerName) {
      setErrorMessage("Customer name is required.")
      return
    }

    if (!formattedAddress && !isPreservingLegacyAddress) {
      setErrorMessage("Municipality, barangay, sitio, and purok are required.")
      return
    }

    setErrorMessage(null)
    setIsLoading(true)
    setStatusConfirmMode(null)

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_number: trimmedAccountNumber,
          meter_id: trimmedMeterId,
          customer_name: trimmedCustomerName,
          contact_number: trimmedContactNumber,
          address: formattedAddress || trimmedAddress,
          municipality: addressSelection.municipality,
          barangay: addressSelection.barangay,
          sitio: addressSelection.sitio,
          purok: addressSelection.purok,
          stub_out_location_id: stubOutLocationId,
          is_active: isActive,
          preserve_legacy_address: isPreservingLegacyAddress,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setErrorMessage(payload.error || "Failed to update customer.")
        return
      }

      onOpenChange(false)
      router.refresh()
    } catch {
      setErrorMessage("Failed to update customer.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!customer) {
      return
    }

    if (statusOnly) {
      if (isActive === customer.is_active) {
        onOpenChange(false)
        return
      }

      setErrorMessage(null)
      setStatusConfirmMode("status")
      return
    }

    if (isActive !== customer.is_active) {
      setErrorMessage(null)
      setStatusConfirmMode("full")
      return
    }

    await submitFullUpdate()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[640px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader className="shrink-0 px-4 pb-3 pt-5 pr-12 sm:px-6 sm:pb-4 sm:pt-6 sm:pr-12">
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            {statusOnly
              ? "Update this customer's status only. Other customer details remain unchanged."
              : "Update this customer's water service information."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {errorMessage && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {errorMessage}
              </p>
            )}

            <div className="grid gap-2">
              <Label htmlFor="edit_account_number">Account Number</Label>
              <div className="flex">
                <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                  {ACCOUNT_NUMBER_PREFIX}
                </span>
                <Input
                  id="edit_account_number"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(extractAccountNumberDigits(event.target.value))}
                  disabled={statusOnly}
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
              <Label htmlFor="edit_meter_id">Meter ID</Label>
              <Input
                id="edit_meter_id"
                value={meterId}
                onChange={(event) => setMeterId(sanitizeMeterIdInput(event.target.value))}
                disabled={statusOnly}
                autoComplete="off"
                minLength={4}
                maxLength={10}
                pattern="[A-Za-z0-9]{4,10}"
                placeholder="MTR001"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit_customer_name">Customer Name</Label>
              <Input
                id="edit_customer_name"
                value={customerName}
                onChange={(event) => setCustomerName(toTitleCase(event.target.value))}
                onBlur={() => setCustomerName(formatTitleCase(customerName))}
                disabled={statusOnly}
                placeholder="Juan Dela Cruz"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit_contact_number">Contact Number (Optional)</Label>
              <Input
                id="edit_contact_number"
                type="tel"
                value={contactNumber}
                onChange={(event) => setContactNumber(event.target.value)}
                disabled={statusOnly}
                placeholder="09XX XXX XXXX"
              />
            </div>

            {customer?.address && !hasStructuredAddress ? (
              <div className="grid gap-2 rounded-md border p-3">
                <Label htmlFor="edit_legacy_address">Legacy Address</Label>
                <p className="text-sm text-muted-foreground">
                  This older address does not match the structured format.
                </p>
                <Textarea
                  id="edit_legacy_address"
                  value={address}
                  readOnly
                  disabled={statusOnly}
                  placeholder="Existing legacy address"
                />
              </div>
            ) : null}

            <StructuredAddressFields
              idPrefix="edit_address"
              value={addressSelection}
              disabled={statusOnly}
              onChange={(nextAddressSelection) => {
                setAddressSelection(nextAddressSelection)
                setHasStructuredAddress(true)
              }}
            />

            <StubOutLocationCombobox
              id="edit_stub_out_location_id"
              value={stubOutLocationId}
              onChange={setStubOutLocationId}
              disabled={statusOnly}
            />

            <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="edit_customer_status">Customer Status</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Customer status conditions"
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <CircleHelp className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-[260px] text-left leading-relaxed">
                      <div className="grid gap-1">
                        <p>Active: customer can receive new meter readings.</p>
                        <p>Inactive: customer stays in records, but new readings are blocked until set back to Active.</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isActive ? "This customer is active and can receive new readings." : "This customer is inactive and blocked from new readings."}
                </p>
              </div>
              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                <span className={getStatusTextClass(isActive)}>
                  {isActive ? "Active" : "Inactive"}
                </span>
                <Switch
                  id="edit_customer_status"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:px-6">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? "Saving..." : statusOnly ? "Update Status" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={statusConfirmMode !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setStatusConfirmMode(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Customer Status?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the customer status only. Other customer details will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoading}
              onClick={(event) => {
                event.preventDefault()
                if (statusConfirmMode === "full") {
                  void submitFullUpdate()
                  return
                }

                void submitStatusOnlyUpdate()
              }}
            >
              {isLoading ? "Updating..." : "Update Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
