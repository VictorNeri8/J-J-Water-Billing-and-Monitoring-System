import { requireAdminContext } from "@/lib/admin/auth"
import { StubOutLocationsClient } from "@/components/admin/stub-out-locations-client"
import type { StubOutLocationSummary } from "@/lib/types"

function normalizeLocation(location: StubOutLocationSummary): StubOutLocationSummary {
  return {
    ...location,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    assigned_customer_count: Number(location.assigned_customer_count || 0),
  }
}

export default async function StubOutLocationsPage() {
  const { supabase, profile } = await requireAdminContext(["reader", "finance"])
  const { data: locations } = await supabase
    .from("stub_out_location_summaries")
    .select("*")
    .order("code", { ascending: true })

  return (
    <StubOutLocationsClient
      initialLocations={((locations || []) as StubOutLocationSummary[]).map(normalizeLocation)}
      userRole={profile.role}
    />
  )
}
