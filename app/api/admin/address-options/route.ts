import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { getAddressPuroks, getAddressSitios } from "@/lib/admin/address-options"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const adminContext = await getCurrentAdminContext()

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const puroksForSitioId = searchParams.get("puroksForSitioId")?.trim()
  const municipality = searchParams.get("municipality")?.trim() || ""
  const barangay = searchParams.get("barangay")?.trim() || ""
  const serviceRole = createServiceRoleClient()

  try {
    if (puroksForSitioId) {
      const puroks = await getAddressPuroks(serviceRole, puroksForSitioId)
      return NextResponse.json({ puroks })
    }

    if (!municipality || !barangay) {
      return NextResponse.json({ error: "Municipality and barangay are required." }, { status: 400 })
    }

    const sitios = await getAddressSitios(serviceRole, municipality, barangay)
    return NextResponse.json({ sitios })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load address options." },
      { status: 400 },
    )
  }
}
