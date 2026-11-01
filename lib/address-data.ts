export interface AddressSelection {
  municipality: string
  barangay: string
  sitio: string
  purok: string
  sitioId?: string | null
  purokId?: string | null
}

export interface AddressOption {
  id: string
  name: string
  normalized_name: string
  is_custom: boolean
}

export interface NormalizedAddressText {
  value: string
  normalized: string
}

interface MunicipalityAddressData {
  barangays: readonly string[]
}

export const defaultSitioPuroks: Record<string, readonly string[]> = {
  "Sitio Proper": ["Purok 1", "Purok 2", "Purok 3"],
  "Sitio Riverside": ["Purok 1", "Purok 2"],
  "Sitio Upper": ["Purok 1", "Purok 2"],
}

export const addressData = {
  Liloan: {
    barangays: [
      "Cabadiangan",
      "Calero",
      "Catarman",
      "Cotcot",
      "Jubay",
      "Lataban",
      "Mulao",
      "Poblacion",
      "San Roque",
      "San Vicente",
      "Santa Cruz",
      "Tabla",
      "Tayud",
      "Yati",
    ],
  },
  Consolacion: {
    barangays: [
      "Cabangahan",
      "Cansaga",
      "Casili",
      "Danglag",
      "Garing",
      "Jugan",
      "Lamac",
      "Lanipga",
      "Nangka",
      "Panas",
      "Panoypoy",
      "Pitogo",
      "Poblacion Occidental",
      "Poblacion Oriental",
      "Polog",
      "Pulpogan",
      "Sacsac",
      "Tayud",
      "Tilhaong",
      "Tolotolo",
      "Tugbongan",
    ],
  },
} satisfies Record<string, MunicipalityAddressData>

export function getMunicipalities() {
  return Object.keys(addressData)
}

export function isAllowedMunicipality(municipality: string) {
  return Object.prototype.hasOwnProperty.call(addressData, municipality)
}

export function getBarangays(municipality: string) {
  return isAllowedMunicipality(municipality)
    ? [...addressData[municipality as keyof typeof addressData].barangays]
    : []
}

export function isAllowedBarangay(municipality: string, barangay: string) {
  return getBarangays(municipality).includes(barangay)
}

export function normalizeAddressKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

export function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|[\s.'-])(\p{L}|\p{N})/gu, (match, prefix: string, character: string) => {
      return `${prefix}${character.toUpperCase()}`
    })
}

export function formatTitleCase(value: string) {
  return toTitleCase(value.trim().replace(/\s+/g, " "))
}

export function normalizeAddressText(value: string, maxLength = 80): NormalizedAddressText | null {
  const withoutControlCharacters = value.replace(/[\u0000-\u001F\u007F]/g, "")
  const collapsed = withoutControlCharacters.trim().replace(/\s+/g, " ")

  if (!collapsed || collapsed.length > maxLength) {
    return null
  }

  if (!/^[\p{L}\p{N} .,'-]+$/u.test(collapsed)) {
    return null
  }

  const titleCased = formatTitleCase(collapsed)

  return {
    value: titleCased,
    normalized: normalizeAddressKey(titleCased),
  }
}

export function isCompleteAddressSelection(selection: AddressSelection) {
  return Boolean(
    selection.municipality &&
      selection.barangay &&
      normalizeAddressText(selection.sitio) &&
      normalizeAddressText(selection.purok) &&
      isAllowedBarangay(selection.municipality, selection.barangay),
  )
}

export function formatAddress(selection: AddressSelection) {
  const sitio = normalizeAddressText(selection.sitio)
  const purok = normalizeAddressText(selection.purok)

  if (!sitio || !purok || !isAllowedBarangay(selection.municipality, selection.barangay)) {
    return null
  }

  return `${purok.value}, ${sitio.value}, ${selection.barangay}, ${selection.municipality}, Cebu`
}

export function parseAddress(address: string | null | undefined): AddressSelection | null {
  if (!address) {
    return null
  }

  const parts = address.split(",").map((part) => part.trim()).filter(Boolean)

  if (parts.length !== 5 || parts[4].toLowerCase() !== "cebu") {
    return null
  }

  const purok = normalizeAddressText(parts[0])
  const sitio = normalizeAddressText(parts[1])
  const barangay = parts[2]
  const municipality = parts[3]

  if (!purok || !sitio || !isAllowedBarangay(municipality, barangay)) {
    return null
  }

  return {
    purok: purok.value,
    sitio: sitio.value,
    barangay,
    municipality,
    sitioId: null,
    purokId: null,
  }
}
