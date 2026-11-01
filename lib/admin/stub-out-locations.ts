import { getBarangays, isAllowedBarangay, normalizeAddressText } from "@/lib/address-data"
import {
  INVALID_STUB_OUT_PLACEMENT_MESSAGE,
  isInsideStubOutServiceArea,
} from "@/lib/stub-out-service-area"
import type { StubOutLocationSummary } from "@/lib/types"

export const STUB_OUT_DELETE_BLOCKED_MESSAGE =
  "This Stub Out location is currently assigned to customer records and cannot be deleted."

export interface StubOutLocationInput {
  code: string
  name: string | null
  municipality: string
  barangay: string
  sitio: string | null
  purok: string | null
  latitude: number
  longitude: number
  status: "active" | "inactive"
  notes: string | null
}

export function formatStubOutLocationLabel(location: Pick<StubOutLocationSummary, "code" | "name" | "sitio" | "barangay" | "municipality">) {
  const place = [location.sitio, location.barangay, location.municipality].filter(Boolean).join(", ")
  return `${location.code}${location.name ? ` - ${location.name}` : ""}${place ? ` (${place})` : ""}`
}

function normalizeOptionalText(value: unknown, maxLength = 120) {
  const rawValue = typeof value === "string" ? value.trim() : ""

  if (!rawValue) {
    return null
  }

  const normalized = normalizeAddressText(rawValue, maxLength)
  return normalized?.value ?? null
}

export function parseStubOutLocationInput(body: Record<string, unknown>): {
  data: StubOutLocationInput | null
  error: string | null
} {
  const code = String(body.code || "").trim().toUpperCase()
  const municipality = String(body.municipality || "").trim()
  const barangay = String(body.barangay || "").trim()
  const latitude = Number.parseFloat(String(body.latitude ?? ""))
  const longitude = Number.parseFloat(String(body.longitude ?? ""))
  const status = body.status === "inactive" ? "inactive" : "active"
  const name = normalizeOptionalText(body.name)
  const sitio = normalizeOptionalText(body.sitio)
  const purok = normalizeOptionalText(body.purok)
  const notesRaw = typeof body.notes === "string" ? body.notes.trim() : ""
  const notes = notesRaw ? notesRaw.slice(0, 1000) : null

  if (!code) {
    return { data: null, error: "Stub Out code is required." }
  }

  if (code.length > 40 || !/^[A-Z0-9][A-Z0-9 ._-]*$/.test(code)) {
    return { data: null, error: "Stub Out code can only contain letters, numbers, spaces, dots, underscores, and hyphens." }
  }

  if (!municipality || !["Consolacion", "Liloan"].includes(municipality)) {
    return { data: null, error: "Municipality must be Consolacion or Liloan." }
  }

  if (!barangay || !isAllowedBarangay(municipality, barangay)) {
    return {
      data: null,
      error: `Barangay is required and must be one of the saved ${municipality} barangays.`,
    }
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { data: null, error: "Latitude must be a valid number between -90 and 90." }
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { data: null, error: "Longitude must be a valid number between -180 and 180." }
  }

  if (!isInsideStubOutServiceArea({ latitude, longitude })) {
    return { data: null, error: INVALID_STUB_OUT_PLACEMENT_MESSAGE }
  }

  if (!getBarangays(municipality).includes(barangay)) {
    return { data: null, error: "Selected barangay is not supported." }
  }

  return {
    data: {
      code,
      name,
      municipality,
      barangay,
      sitio,
      purok,
      latitude,
      longitude,
      status,
      notes,
    },
    error: null,
  }
}
