import type { SupabaseClient } from "@supabase/supabase-js"
import {
  type AddressOption,
  type AddressSelection,
  formatAddress,
  isAllowedBarangay,
  normalizeAddressText,
  parseAddress,
} from "@/lib/address-data"

export const ADDRESS_OPTION_IN_USE_MESSAGE =
  "This address option is currently used by customer records and cannot be deleted."

interface AddressSitioRow extends AddressOption {
  municipality: string
  barangay: string
}

interface AddressPurokRow extends AddressOption {
  sitio_id: string
}

export interface ResolvedAddressSelection {
  address: string
  municipality: string
  barangay: string
  sitio: string
  purok: string
  address_sitio_id: string
  address_purok_id: string
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505"
}

export async function getAddressSitios(
  supabase: SupabaseClient,
  municipality: string,
  barangay: string,
) {
  if (!isAllowedBarangay(municipality, barangay)) {
    return []
  }

  const { data, error } = await supabase
    .from("address_sitios")
    .select("id, name, normalized_name, is_custom")
    .eq("municipality", municipality)
    .eq("barangay", barangay)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(error.message || "Failed to load sitios.")
  }

  return (data || []) as AddressOption[]
}

export async function getAddressPuroks(supabase: SupabaseClient, sitioId: string) {
  if (!sitioId) {
    return []
  }

  const { data, error } = await supabase
    .from("address_puroks")
    .select("id, name, normalized_name, is_custom")
    .eq("sitio_id", sitioId)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(error.message || "Failed to load puroks.")
  }

  return (data || []) as AddressOption[]
}

async function getSitioByNormalizedName(
  supabase: SupabaseClient,
  municipality: string,
  barangay: string,
  normalizedName: string,
) {
  const { data, error } = await supabase
    .from("address_sitios")
    .select("id, municipality, barangay, name, normalized_name, is_custom")
    .eq("municipality", municipality)
    .eq("barangay", barangay)
    .eq("normalized_name", normalizedName)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || "Failed to load sitio.")
  }

  return data as AddressSitioRow | null
}

async function getPurokByNormalizedName(
  supabase: SupabaseClient,
  sitioId: string,
  normalizedName: string,
) {
  const { data, error } = await supabase
    .from("address_puroks")
    .select("id, sitio_id, name, normalized_name, is_custom")
    .eq("sitio_id", sitioId)
    .eq("normalized_name", normalizedName)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || "Failed to load purok.")
  }

  return data as AddressPurokRow | null
}

export async function resolveOrCreateSitio(
  supabase: SupabaseClient,
  municipality: string,
  barangay: string,
  sitioName: string,
  userId: string,
) {
  const normalizedSitio = normalizeAddressText(sitioName)

  if (!normalizedSitio || !isAllowedBarangay(municipality, barangay)) {
    throw new Error("A valid municipality, barangay, and sitio are required.")
  }

  const existingSitio = await getSitioByNormalizedName(
    supabase,
    municipality,
    barangay,
    normalizedSitio.normalized,
  )

  if (existingSitio) {
    return existingSitio
  }

  const { data, error } = await supabase
    .from("address_sitios")
    .insert({
      municipality,
      barangay,
      name: normalizedSitio.value,
      normalized_name: normalizedSitio.normalized,
      is_custom: true,
      created_by: userId,
    })
    .select("id, municipality, barangay, name, normalized_name, is_custom")
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      const duplicateSitio = await getSitioByNormalizedName(
        supabase,
        municipality,
        barangay,
        normalizedSitio.normalized,
      )

      if (duplicateSitio) {
        return duplicateSitio
      }
    }

    throw new Error(error.message || "Failed to save sitio.")
  }

  return data as AddressSitioRow
}

export async function resolveOrCreatePurok(
  supabase: SupabaseClient,
  sitioId: string,
  purokName: string,
  userId: string,
) {
  const normalizedPurok = normalizeAddressText(purokName)

  if (!sitioId || !normalizedPurok) {
    throw new Error("A valid sitio and purok are required.")
  }

  const existingPurok = await getPurokByNormalizedName(
    supabase,
    sitioId,
    normalizedPurok.normalized,
  )

  if (existingPurok) {
    return existingPurok
  }

  const { data, error } = await supabase
    .from("address_puroks")
    .insert({
      sitio_id: sitioId,
      name: normalizedPurok.value,
      normalized_name: normalizedPurok.normalized,
      is_custom: true,
      created_by: userId,
    })
    .select("id, sitio_id, name, normalized_name, is_custom")
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      const duplicatePurok = await getPurokByNormalizedName(
        supabase,
        sitioId,
        normalizedPurok.normalized,
      )

      if (duplicatePurok) {
        return duplicatePurok
      }
    }

    throw new Error(error.message || "Failed to save purok.")
  }

  return data as AddressPurokRow
}

export async function resolveAddressSelection(
  supabase: SupabaseClient,
  selection: AddressSelection,
  userId: string,
): Promise<ResolvedAddressSelection> {
  const sitio = await resolveOrCreateSitio(
    supabase,
    selection.municipality,
    selection.barangay,
    selection.sitio,
    userId,
  )
  const purok = await resolveOrCreatePurok(supabase, sitio.id, selection.purok, userId)
  const address = formatAddress({
    municipality: selection.municipality,
    barangay: selection.barangay,
    sitio: sitio.name,
    purok: purok.name,
  })

  if (!address) {
    throw new Error("A valid Liloan or Consolacion address is required.")
  }

  return {
    address,
    municipality: selection.municipality,
    barangay: selection.barangay,
    sitio: sitio.name,
    purok: purok.name,
    address_sitio_id: sitio.id,
    address_purok_id: purok.id,
  }
}

export async function getSitioDeletionUsage(
  supabase: SupabaseClient,
  sitio: AddressSitioRow,
) {
  const { data, error } = await supabase
    .from("customers")
    .select("id, address, address_sitio_id, municipality, barangay, sitio")
    .limit(1000)

  if (error) {
    throw new Error(error.message || "Failed to check customer usage.")
  }

  return (data || []).some((customer) => {
    if (customer.address_sitio_id === sitio.id) {
      return true
    }

    if (
      customer.municipality === sitio.municipality &&
      customer.barangay === sitio.barangay &&
      normalizeAddressText(customer.sitio || "")?.normalized === sitio.normalized_name
    ) {
      return true
    }

    const parsedAddress = parseAddress(customer.address)
    return (
      parsedAddress?.municipality === sitio.municipality &&
      parsedAddress.barangay === sitio.barangay &&
      normalizeAddressText(parsedAddress.sitio)?.normalized === sitio.normalized_name
    )
  })
}

export async function getPurokDeletionUsage(
  supabase: SupabaseClient,
  sitio: AddressSitioRow,
  purok: AddressPurokRow,
) {
  const { data, error } = await supabase
    .from("customers")
    .select("id, address, address_purok_id, municipality, barangay, sitio, purok")
    .limit(1000)

  if (error) {
    throw new Error(error.message || "Failed to check customer usage.")
  }

  return (data || []).some((customer) => {
    if (customer.address_purok_id === purok.id) {
      return true
    }

    if (
      customer.municipality === sitio.municipality &&
      customer.barangay === sitio.barangay &&
      normalizeAddressText(customer.sitio || "")?.normalized === sitio.normalized_name &&
      normalizeAddressText(customer.purok || "")?.normalized === purok.normalized_name
    ) {
      return true
    }

    const parsedAddress = parseAddress(customer.address)
    return (
      parsedAddress?.municipality === sitio.municipality &&
      parsedAddress.barangay === sitio.barangay &&
      normalizeAddressText(parsedAddress.sitio)?.normalized === sitio.normalized_name &&
      normalizeAddressText(parsedAddress.purok)?.normalized === purok.normalized_name
    )
  })
}

export async function getSitioById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("address_sitios")
    .select("id, municipality, barangay, name, normalized_name, is_custom")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || "Failed to load sitio.")
  }

  return data as AddressSitioRow | null
}

export async function getPurokWithSitioById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("address_puroks")
    .select(`
      id,
      sitio_id,
      name,
      normalized_name,
      is_custom,
      address_sitios (
        id,
        municipality,
        barangay,
        name,
        normalized_name,
        is_custom
      )
    `)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || "Failed to load purok.")
  }

  if (!data) {
    return null
  }

  const typedData = data as unknown as AddressPurokRow & {
    address_sitios: AddressSitioRow | AddressSitioRow[] | null
  }
  const sitio = Array.isArray(typedData.address_sitios)
    ? typedData.address_sitios[0] ?? null
    : typedData.address_sitios

  return {
    purok: typedData,
    sitio,
  }
}
