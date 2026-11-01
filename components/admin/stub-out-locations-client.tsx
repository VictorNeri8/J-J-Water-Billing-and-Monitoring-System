"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Edit, Eye, Gauge, MapPin, PanelLeftOpen, Search, Trash2, TriangleAlert, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AddReadingDialog, type AddReadingSuccessPayload } from "@/components/admin/add-reading-dialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { getBarangays, getMunicipalities } from "@/lib/address-data"
import {
  formatCurrency,
  getAdminRoleLabel,
  type AdminRole,
  type StubOutCustomer,
  type StubOutLocationSummary,
} from "@/lib/types"

const StubOutMap = dynamic(
  () => import("@/components/admin/stub-out-map").then((module) => module.StubOutMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[420px] items-center justify-center rounded-b-lg border-t bg-muted/40 text-sm text-muted-foreground md:rounded-lg">
        Loading map...
      </div>
    ),
  },
)

interface StubOutLocationsClientProps {
  initialLocations: StubOutLocationSummary[]
  userRole: AdminRole
}

interface LocationFormState {
  code: string
  name: string
  municipality: string
  barangay: string
  sitio: string
  purok: string
  latitude: string
  longitude: string
  status: "active" | "inactive"
  notes: string
}

type PlacementMode = "create" | "replace" | null

const emptyForm: LocationFormState = {
  code: "",
  name: "",
  municipality: "Consolacion",
  barangay: "",
  sitio: "",
  purok: "",
  latitude: "",
  longitude: "",
  status: "active",
  notes: "",
}

function toFormState(location: StubOutLocationSummary): LocationFormState {
  return {
    code: location.code,
    name: location.name || "",
    municipality: location.municipality,
    barangay: location.barangay,
    sitio: location.sitio || "",
    purok: location.purok || "",
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    status: location.status,
    notes: location.notes || "",
  }
}

function getLocationTitle(location: StubOutLocationSummary) {
  const place = [location.sitio, location.barangay, location.municipality].filter(Boolean).join(", ")
  return `${location.code}${place ? ` - ${place}` : ""}`
}

function compareStubOutLocations(a: StubOutLocationSummary, b: StubOutLocationSummary) {
  const codeCompare = a.code.localeCompare(b.code, undefined, {
    numeric: true,
    sensitivity: "base",
  })

  if (codeCompare !== 0) {
    return codeCompare
  }

  return (a.name || "").localeCompare(b.name || "", undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

function getStatusClass(isActive: boolean) {
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700"
}

function getStubOutConditionLabel(status: StubOutLocationSummary["status"]) {
  return status === "inactive" ? "Bad" : "Good"
}

function getStubOutConditionClass(status: StubOutLocationSummary["status"]) {
  return status === "inactive"
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700"
}

function formatShortDate(date?: string | null) {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

function isMeterCheckValid(customer: StubOutCustomer) {
  if (!customer.meter_check_expires_at) {
    return false
  }

  return new Date(customer.meter_check_expires_at).getTime() > Date.now()
}

function getMeterCheckTitle(customer: StubOutCustomer) {
  if (!isMeterCheckValid(customer)) {
    return "Mark meter checked for 10 days"
  }

  const checkedUntil = formatShortDate(customer.meter_check_expires_at)
  const checkedBy = customer.meter_checked_by_email
    ? ` by ${customer.meter_checked_by_email}`
    : ""

  return `Checked until ${checkedUntil}${checkedBy}. Click to uncheck.`
}

function OverdueAccountBadge() {
  return (
    <Badge variant="destructive">
      <TriangleAlert className="h-3 w-3" />
      Overdue
    </Badge>
  )
}

interface StubOutMapListOverlayProps {
  locations: StubOutLocationSummary[]
  canModify: boolean
  onEdit: (location: StubOutLocationSummary) => void
  onDelete: (location: StubOutLocationSummary) => void
  onViewCustomers: (location: StubOutLocationSummary) => void
}

function StubOutMapListOverlay({
  locations,
  canModify,
  onEdit,
  onDelete,
  onViewCustomers,
}: StubOutMapListOverlayProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const trimmedSearchQuery = searchQuery.trim().toLowerCase()
  const sortedLocations = useMemo(
    () => [...locations].sort(compareStubOutLocations),
    [locations],
  )
  const filteredLocations = useMemo(() => {
    if (!trimmedSearchQuery) {
      return sortedLocations
    }

    return sortedLocations.filter((location) =>
      [location.code, location.name].some((value) =>
        (value || "").toLowerCase().includes(trimmedSearchQuery),
      ),
    )
  }, [sortedLocations, trimmedSearchQuery])

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        className="pointer-events-auto absolute left-3 top-3 z-[9] h-10 rounded-full border-black/10 bg-background/95 px-3 text-sm font-semibold text-slate-700 shadow-lg shadow-slate-950/10 backdrop-blur-md hover:bg-background dark:border-white/10 dark:bg-zinc-950/90 dark:text-slate-200 dark:hover:bg-zinc-900 sm:left-4 sm:top-4 sm:px-3.5"
        onClick={() => setIsOpen(true)}
      >
        <PanelLeftOpen className="mr-2 h-4 w-4" />
        Find Stub Outs
      </Button>
    )
  }

  return (
    <div
      className={`pointer-events-auto absolute left-3 top-3 z-[9] overflow-hidden rounded-xl border border-black/10 bg-background/92 shadow-lg shadow-slate-950/10 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/90 sm:left-4 sm:top-4 sm:w-[360px] ${
        canModify ? "w-[min(300px,calc(100%-6.5rem))]" : "w-[min(340px,calc(100%-1.5rem))]"
      }`}
    >
      <div className="border-b px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold leading-none text-foreground">Stub Out List</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Saved groups and assignment counts
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline" className="bg-background/70">
              {locations.length} pin{locations.length === 1 ? "" : "s"}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Close Stub Out list</span>
            </Button>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search stub out..."
            aria-label="Search stub out"
            className="h-8 w-full pl-8 text-xs"
          />
        </div>
      </div>

      {locations.length === 0 ? (
        <div className="px-4 py-5 text-sm text-muted-foreground">
          <div className="rounded-lg border border-dashed bg-background/50 p-4">
            <MapPin className="h-5 w-5" />
            <p className="mt-3 font-medium text-foreground">No Stub Out pins yet</p>
            <p className="mt-1 text-xs">
              Finance and reader admins can add verified field locations from the map.
            </p>
          </div>
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="px-4 py-5 text-sm text-muted-foreground">
          <div className="rounded-lg border border-dashed bg-background/50 p-4 text-center">
            No stub outs found.
          </div>
        </div>
      ) : (
        <div className="max-h-[330px] overflow-y-auto p-2 sm:max-h-[460px]">
          <div className="space-y-2">
            {filteredLocations.map((location) => (
              <div
                key={location.id}
                className="rounded-lg border bg-background/70 p-3 transition-colors hover:bg-muted/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold leading-none text-foreground">{location.code}</p>
                      <Badge
                        variant="outline"
                        className={getStubOutConditionClass(location.status)}
                      >
                        {getStubOutConditionLabel(location.status)}
                      </Badge>
                    </div>
                    <p className="mt-2 truncate text-xs text-muted-foreground">
                      {[location.name, location.sitio, location.barangay, location.municipality].filter(Boolean).join(", ")}
                    </p>
                  </div>

                  {canModify ? (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(location)}>
                        <Edit className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit {location.code}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDelete(location)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Delete {location.code}</span>
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 space-y-0.5 border-t pt-3 text-xs text-muted-foreground">
                  <p>
                    Added by <span className="font-medium text-foreground">{getAdminRoleLabel(location.created_by_role)}</span>
                  </p>
                  <p className="truncate">Email: {location.created_by_email || "-"}</p>
                  <p>Created: {formatShortDate(location.created_at)}</p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-muted-foreground">
                    {location.assigned_customer_count} assigned customer{location.assigned_customer_count === 1 ? "" : "s"}
                  </span>
                  <Button variant="outline" size="sm" className="h-8 shrink-0 bg-background/80" onClick={() => onViewCustomers(location)}>
                    <Users className="mr-1.5 h-3.5 w-3.5" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function StubOutLocationsClient({ initialLocations, userRole }: StubOutLocationsClientProps) {
  const [locations, setLocations] = useState<StubOutLocationSummary[]>(initialLocations)
  const [formOpen, setFormOpen] = useState(false)
  const [placementMode, setPlacementMode] = useState<PlacementMode>(null)
  const [replacementPreviousPosition, setReplacementPreviousPosition] = useState<{
    latitude: string
    longitude: string
  } | null>(null)
  const [editingLocation, setEditingLocation] = useState<StubOutLocationSummary | null>(null)
  const [formState, setFormState] = useState<LocationFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingLocation, setDeletingLocation] = useState<StubOutLocationSummary | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<StubOutLocationSummary | null>(null)
  const [customers, setCustomers] = useState<StubOutCustomer[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [meterCheckError, setMeterCheckError] = useState<string | null>(null)
  const [checkingCustomerId, setCheckingCustomerId] = useState<string | null>(null)
  const [readingDialogCustomerId, setReadingDialogCustomerId] = useState<string | null>(null)
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const router = useRouter()
  const canCreate = userRole === "finance" || userRole === "reader"
  const canModify = userRole === "finance"
  const barangays = getBarangays(formState.municipality)
  const previewPosition = useMemo(() => {
    const latitude = Number.parseFloat(formState.latitude)
    const longitude = Number.parseFloat(formState.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null
    }

    return { latitude, longitude }
  }, [formState.latitude, formState.longitude])
  const totalUnpaidBalance = useMemo(
    () => customers.reduce((total, customer) => total + customer.total_unpaid_balance, 0),
    [customers],
  )

  useEffect(() => {
    if (!isMapExpanded) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMapExpanded])

  async function refreshLocations() {
    const response = await fetch("/api/admin/stub-out-locations")
    const payload = await response.json()

    if (response.ok) {
      setLocations(payload.locations || [])
      router.refresh()
    }
  }

  function startPinPlacement() {
    setEditingLocation(null)
    setFormState(emptyForm)
    setFormError(null)
    setReplacementPreviousPosition(null)
    setFormOpen(false)
    setPlacementMode("create")
  }

  function startPinReplacement() {
    if (!editingLocation || !canModify) {
      return
    }

    setReplacementPreviousPosition({
      latitude: formState.latitude,
      longitude: formState.longitude,
    })
    setFormError(null)
    setFormOpen(false)
    setPlacementMode("replace")
  }

  function cancelPinPlacement() {
    if (placementMode === "replace") {
      setFormState((current) => ({
        ...current,
        latitude: replacementPreviousPosition?.latitude ?? current.latitude,
        longitude: replacementPreviousPosition?.longitude ?? current.longitude,
      }))
      setFormError(null)
      setPlacementMode(null)
      setReplacementPreviousPosition(null)
      setFormOpen(true)
      return
    }

    setEditingLocation(null)
    setFormState(emptyForm)
    setFormError(null)
    setReplacementPreviousPosition(null)
    setPlacementMode(null)
  }

  function handleFormOpenChange(nextOpen: boolean) {
    setFormOpen(nextOpen)

    if (!nextOpen) {
      setPlacementMode(null)
      setReplacementPreviousPosition(null)
      setFormError(null)

      if (!editingLocation) {
        setFormState(emptyForm)
      }

      setEditingLocation(null)
    }
  }

  function handleMapPositionSelect(position: { latitude: number; longitude: number }) {
    setFormState((current) => ({
      ...current,
      latitude: String(position.latitude),
      longitude: String(position.longitude),
    }))

    if (placementMode === "create" && !formOpen) {
      setEditingLocation(null)
      setFormError(null)
      setPlacementMode(null)
      setReplacementPreviousPosition(null)
      setFormOpen(true)
      return
    }

    if (placementMode === "replace" && !formOpen) {
      setFormError(null)
      setPlacementMode(null)
      setReplacementPreviousPosition(null)
      setFormOpen(true)
    }
  }

  function openEditForm(location: StubOutLocationSummary) {
    setPlacementMode(null)
    setReplacementPreviousPosition(null)
    setEditingLocation(location)
    setFormState(toFormState(location))
    setFormError(null)
    setFormOpen(true)
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setIsSaving(true)

    try {
      const endpoint = editingLocation
        ? `/api/admin/stub-out-locations/${editingLocation.id}`
        : "/api/admin/stub-out-locations"
      const response = await fetch(endpoint, {
        method: editingLocation ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      })
      const payload = await response.json()

      if (!response.ok) {
        setFormError(payload.error || "Failed to save Stub Out location.")
        return
      }

      setFormOpen(false)
      setPlacementMode(null)
      setReplacementPreviousPosition(null)
      setEditingLocation(null)
      setFormState(emptyForm)
      await refreshLocations()
    } catch {
      setFormError("Failed to save Stub Out location.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingLocation) {
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/admin/stub-out-locations/${deletingLocation.id}`, {
        method: "DELETE",
      })
      const payload = await response.json()

      if (!response.ok) {
        setDeleteError(payload.error || "Failed to delete Stub Out location.")
        return
      }

      setDeletingLocation(null)
      await refreshLocations()
    } catch {
      setDeleteError("Failed to delete Stub Out location.")
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleViewCustomers(location: StubOutLocationSummary) {
    setPlacementMode(null)
    setReplacementPreviousPosition(null)
    setSelectedLocation(location)
    setCustomers([])
    setCustomerError(null)
    setMeterCheckError(null)
    setIsLoadingCustomers(true)

    try {
      const response = await fetch(`/api/admin/stub-out-locations/${location.id}/customers`)
      const payload = await response.json()

      if (!response.ok) {
        setCustomerError(payload.error || "Failed to load assigned customers.")
        return
      }

      setCustomers(payload.customers || [])
    } catch {
      setCustomerError("Failed to load assigned customers.")
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  async function refreshSelectedCustomers(payload?: AddReadingSuccessPayload) {
    const customerCheck = payload?.customer_check

    if (customerCheck) {
      setCustomers((currentCustomers) =>
        currentCustomers.map((customer) =>
          customer.id === customerCheck.id
            ? { ...customer, ...customerCheck }
            : customer,
        ),
      )
      return
    }

    if (!selectedLocation) {
      return
    }

    try {
      const response = await fetch(`/api/admin/stub-out-locations/${selectedLocation.id}/customers`)
      const payload = await response.json()

      if (!response.ok) {
        setCustomerError(payload.error || "Failed to refresh assigned customers.")
        return
      }

      setCustomers(payload.customers || [])
    } catch {
      setCustomerError("Failed to refresh assigned customers.")
    }
  }

  async function handleMeterCheck(customer: StubOutCustomer) {
    const shouldCheck = !isMeterCheckValid(customer)
    setCheckingCustomerId(customer.id)
    setMeterCheckError(null)

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/meter-check`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: shouldCheck }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setMeterCheckError(payload.error || "Failed to update this meter check.")
        return
      }

      setCustomers((currentCustomers) =>
        currentCustomers.map((currentCustomer) =>
          currentCustomer.id === customer.id
            ? { ...currentCustomer, ...payload.customer }
            : currentCustomer,
        ),
      )
    } catch {
      setMeterCheckError("Failed to update this meter check.")
    } finally {
      setCheckingCustomerId(null)
    }
  }

  function renderMeterCheckButton(customer: StubOutCustomer) {
    const isChecked = isMeterCheckValid(customer)
    const isChecking = checkingCustomerId === customer.id

    return (
      <Button
        type="button"
        variant={isChecked ? "default" : "outline"}
        size="icon-sm"
        title={getMeterCheckTitle(customer)}
        aria-label={isChecked ? "Uncheck meter visit status" : "Mark meter checked"}
        className={
          isChecked
            ? "h-7 w-7 cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
            : "h-7 w-7 cursor-pointer border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        }
        disabled={isChecking}
        onClick={() => void handleMeterCheck(customer)}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
      </Button>
    )
  }

  function renderCustomerActions(customer: StubOutCustomer, layout: "mobile" | "desktop") {
    const isDesktop = layout === "desktop"
    const containerClass = layout === "mobile" ? "mt-4" : "flex items-center justify-end"

    return (
      <div className={containerClass}>
        <Button
          type="button"
          variant="outline"
          size={isDesktop ? "icon-sm" : "sm"}
          className={
            isDesktop
              ? "h-8 w-8 cursor-pointer border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              : "h-8 w-full cursor-pointer border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          }
          title="Add meter reading"
          aria-label="Add meter reading"
          onClick={() => setReadingDialogCustomerId(customer.id)}
        >
          <Gauge className={isDesktop ? "h-3.5 w-3.5" : "mr-1.5 h-3.5 w-3.5"} />
          {isDesktop ? <span className="sr-only">Add Meter</span> : "Add Meter"}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Stub Out Location</h1>
          <p className="text-muted-foreground">
            Monitor mapped Stub Out groups across Consolacion and Liloan.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Map View
              </CardTitle>
              <CardDescription>
                {canCreate && formOpen
                  ? "Click the map to set or move the pin coordinates."
                  : "Click a marker to inspect assigned customers."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:px-4 sm:pb-4">
          <div
            className={
              isMapExpanded
                ? "fixed inset-0 z-[45] bg-background p-1 sm:p-2 lg:inset-y-3 lg:left-20 lg:right-3 lg:rounded-xl lg:border lg:shadow-2xl"
                : "relative"
            }
          >
            <StubOutMap
              locations={locations}
              previewPosition={formOpen || placementMode === "replace" ? previewPosition : null}
              canAddPin={canCreate && !formOpen}
              placementMode={placementMode}
              canSetPosition={
                (formOpen && (editingLocation ? canModify : canCreate)) ||
                (placementMode === "create" && canCreate) ||
                (placementMode === "replace" && canModify)
              }
              isEditingLocation={!!editingLocation}
              isExpanded={isMapExpanded}
              onStartPlacement={startPinPlacement}
              onCancelPlacement={cancelPinPlacement}
              onToggleExpanded={() => setIsMapExpanded((current) => !current)}
              onPositionSelect={handleMapPositionSelect}
              onViewCustomers={handleViewCustomers}
            />
            <StubOutMapListOverlay
              locations={locations}
              canModify={canModify}
              onEdit={openEditForm}
              onDelete={(location) => {
                setPlacementMode(null)
                setReplacementPreviousPosition(null)
                setDeleteError(null)
                setDeletingLocation(location)
              }}
              onViewCustomers={handleViewCustomers}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[720px] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:gap-4 sm:p-6">
          <DialogHeader className="shrink-0 border-b px-4 py-4 pr-11 sm:border-0 sm:p-0 sm:pr-0">
            <DialogTitle>{editingLocation ? "Edit Stub Out Pin" : "Add Stub Out Pin"}</DialogTitle>
            <DialogDescription>
              Set the field location and customer grouping details for this Stub Out.
            </DialogDescription>
          </DialogHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSave}>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-4 py-4 sm:px-0">
              {formError ? (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{formError}</p>
              ) : null}
              <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                {previewPosition
                  ? "Drag the preview marker on the map to update latitude and longitude."
                  : "Click the map to place a draggable preview marker."}
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="stub_code">Stub Out Code</Label>
                  <Input
                    id="stub_code"
                    value={formState.code}
                    onChange={(event) => setFormState((current) => ({ ...current, code: event.target.value }))}
                    placeholder="ex. B31"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stub_name">Stub Out Name</Label>
                  <Input
                    id="stub_name"
                    value={formState.name}
                    onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                    placeholder="ex. Tinongs"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stub_municipality">Municipality</Label>
                  <Select
                    value={formState.municipality}
                    onValueChange={(municipality) => {
                      setFormState((current) => ({
                        ...current,
                        municipality,
                        barangay: "",
                      }))
                    }}
                  >
                    <SelectTrigger id="stub_municipality" className="w-full">
                      <SelectValue placeholder="Select municipality" />
                    </SelectTrigger>
                    <SelectContent>
                      {getMunicipalities().map((municipality) => (
                        <SelectItem key={municipality} value={municipality}>
                          {municipality}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stub_barangay">Barangay</Label>
                  <Select
                    value={formState.barangay}
                    onValueChange={(barangay) => setFormState((current) => ({ ...current, barangay }))}
                  >
                    <SelectTrigger id="stub_barangay" className="w-full">
                      <SelectValue placeholder="Select barangay" />
                    </SelectTrigger>
                    <SelectContent>
                      {barangays.map((barangay) => (
                        <SelectItem key={barangay} value={barangay}>
                          {barangay}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stub_sitio">Sitio</Label>
                  <Input
                    id="stub_sitio"
                    value={formState.sitio}
                    onChange={(event) => setFormState((current) => ({ ...current, sitio: event.target.value }))}
                    placeholder="ex. Tagaytay"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stub_purok">Purok</Label>
                  <Input
                    id="stub_purok"
                    value={formState.purok}
                    onChange={(event) => setFormState((current) => ({ ...current, purok: event.target.value }))}
                    placeholder="ex. Uno"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stub_latitude">Latitude</Label>
                  <Input
                    id="stub_latitude"
                    value={formState.latitude}
                    readOnly
                    placeholder="10.350000"
                    inputMode="decimal"
                    className="bg-muted font-mono"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stub_longitude">Longitude</Label>
                  <Input
                    id="stub_longitude"
                    value={formState.longitude}
                    readOnly
                    placeholder="123.950000"
                    inputMode="decimal"
                    className="bg-muted font-mono"
                    required
                  />
                </div>
                {editingLocation && canModify ? (
                  <div className="md:col-span-2">
                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">Map coordinates</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Replace the saved pin by selecting a new valid point on the map.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 bg-background"
                        onClick={startPinReplacement}
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        Replace Stub Out Pin
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="md:col-span-2">
                  <div className="flex flex-col gap-4 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <Label htmlFor="stub_status" className="text-sm font-medium text-foreground">
                        Stub Out Status
                      </Label>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formState.status === "active"
                          ? "This Stub Out is good and ready for field monitoring."
                          : "This Stub Out is marked bad and should be checked in the field."}
                      </p>
                    </div>
                    <div className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto sm:justify-start">
                      <span
                        className={
                          formState.status === "active"
                            ? "text-sm font-semibold text-emerald-700 dark:text-emerald-400"
                            : "text-sm font-semibold text-red-700 dark:text-red-400"
                        }
                      >
                        {getStubOutConditionLabel(formState.status)}
                      </span>
                      <Switch
                        id="stub_status"
                        checked={formState.status === "active"}
                        onCheckedChange={(checked) => {
                          setFormState((current) => ({
                            ...current,
                            status: checked ? "active" : "inactive",
                          }))
                        }}
                        aria-label="Toggle Stub Out status"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stub_notes">Notes</Label>
                <Textarea
                  id="stub_notes"
                  value={formState.notes}
                  onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional field notes"
                />
              </div>
            </div>
            <DialogFooter className="shrink-0 flex-col gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:border-0 sm:px-0 sm:pb-0 sm:pt-0">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => handleFormOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Pin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingLocation} onOpenChange={(open) => !open && setDeletingLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stub Out Location</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {deletingLocation?.code ?? "this Stub Out location"} permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{deleteError}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {readingDialogCustomerId ? (
        <AddReadingDialog
          customers={customers}
          open
          onOpenChange={(open) => {
            if (!open) {
              setReadingDialogCustomerId(null)
            }
          }}
          initialCustomerId={readingDialogCustomerId}
          stubOutLabel={selectedLocation ? getLocationTitle(selectedLocation) : null}
          hideTrigger
          onSaved={refreshSelectedCustomers}
        />
      ) : null}

      <Sheet
        open={!!selectedLocation}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLocation(null)
            setReadingDialogCustomerId(null)
            setMeterCheckError(null)
          }
        }}
      >
        <SheetContent className="w-full gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
          <SheetHeader className="border-b px-4 py-4 pr-12 sm:px-6">
            <SheetTitle className="pr-4">
              {selectedLocation ? `Customers under ${getLocationTitle(selectedLocation)}` : "Assigned Customers"}
            </SheetTitle>
            <SheetDescription>
              Customers are fetched only when a Stub Out pin is selected.
            </SheetDescription>
            {selectedLocation ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                <span>
                  Added by <span className="font-medium text-foreground">{getAdminRoleLabel(selectedLocation.created_by_role)}</span>
                </span>
                <span className="break-all">Email: {selectedLocation.created_by_email || "-"}</span>
                <span>Created: {formatShortDate(selectedLocation.created_at)}</span>
              </div>
            ) : null}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {customerError ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{customerError}</p>
            ) : isLoadingCustomers ? (
              <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                Loading customers...
              </div>
            ) : customers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No customers assigned to this Stub Out location.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Assigned customers</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{customers.length}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total unpaid balance</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {totalUnpaidBalance > 0 ? formatCurrency(totalUnpaidBalance) : "-"}
                    </p>
                  </div>
                </div>
                {meterCheckError ? (
                  <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{meterCheckError}</p>
                ) : null}

                <div className="space-y-3 md:hidden">
                  {customers.map((customer) => (
                    <div key={customer.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{customer.customer_name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            {renderMeterCheckButton(customer)}
                            <p className="min-w-0 truncate text-xs text-muted-foreground">{customer.account_number}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          {customer.is_overdue_account ? <OverdueAccountBadge /> : null}
                          <Badge variant="outline" className={getStatusClass(customer.is_active)}>
                            {customer.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Address</p>
                          <p className="mt-1 text-foreground">{customer.address || "-"}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</p>
                            <p className="mt-1 text-foreground">{customer.contact_number || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Meter ID</p>
                            <p className="mt-1 text-foreground">{customer.meter_id || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unpaid</p>
                            <p className="mt-1 font-medium tabular-nums text-foreground">
                              {customer.total_unpaid_balance > 0
                                ? formatCurrency(customer.total_unpaid_balance)
                                : "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                      {renderCustomerActions(customer, "mobile")}
                      <Button asChild variant="outline" size="sm" className="mt-2 h-8 w-full">
                        <Link href={`/admin/customers/${customer.id}`}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-lg border md:block">
                  <Table className="table-fixed">
                    <colgroup>
                      <col className="w-[145px]" />
                      <col className="w-[110px]" />
                      <col className="w-[22%]" />
                      <col />
                      <col className="w-[130px]" />
                      <col className="w-[100px]" />
                      <col className="w-[150px]" />
                      <col className="w-[92px]" />
                    </colgroup>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Account No</TableHead>
                        <TableHead>Meter ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="whitespace-normal text-right leading-tight">Total Unpaid Balance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="text-xs font-medium tabular-nums">
                            <div className="flex items-center gap-2">
                              {renderMeterCheckButton(customer)}
                              <span className="min-w-0 truncate">{customer.account_number}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium tabular-nums">
                            {customer.meter_id || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="truncate font-medium" title={customer.customer_name}>
                              {customer.customer_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate text-muted-foreground" title={customer.address || "-"}>
                              {customer.address || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{customer.contact_number || "-"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {customer.is_overdue_account ? <OverdueAccountBadge /> : null}
                              <Badge variant="outline" className={getStatusClass(customer.is_active)}>
                                {customer.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {customer.total_unpaid_balance > 0
                              ? formatCurrency(customer.total_unpaid_balance)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1.5">
                              {renderCustomerActions(customer, "desktop")}
                              <Button asChild variant="outline" size="icon-sm" className="h-8 w-8" title="View customer">
                                <Link href={`/admin/customers/${customer.id}`}>
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="sr-only">View customer</span>
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
