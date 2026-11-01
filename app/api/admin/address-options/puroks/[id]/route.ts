import { NextResponse } from "next/server"
import {
  ADDRESS_OPTION_IN_USE_MESSAGE,
  getPurokDeletionUsage,
  getPurokWithSitioById,
} from "@/lib/admin/address-options"
import { getCurrentAdminContext } from "@/lib/admin/auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminContext = await getCurrentAdminContext()

  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: "Purok id is required." }, { status: 400 })
  }

  try {
    const serviceRole = createServiceRoleClient()
    const option = await getPurokWithSitioById(serviceRole, id)

    if (!option?.purok || !option.sitio) {
      return NextResponse.json({ error: "Purok was not found." }, { status: 404 })
    }

    if (!option.purok.is_custom) {
      return NextResponse.json({ error: "Default address options cannot be deleted." }, { status: 400 })
    }

    if (await getPurokDeletionUsage(serviceRole, option.sitio, option.purok)) {
      return NextResponse.json({ error: ADDRESS_OPTION_IN_USE_MESSAGE }, { status: 400 })
    }

    const { error } = await serviceRole.from("address_puroks").delete().eq("id", id)

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to delete purok." },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete purok." },
      { status: 400 },
    )
  }
}
