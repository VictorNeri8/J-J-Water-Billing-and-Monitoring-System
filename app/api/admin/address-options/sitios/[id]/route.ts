import { NextResponse } from "next/server"
import {
  ADDRESS_OPTION_IN_USE_MESSAGE,
  getSitioById,
  getSitioDeletionUsage,
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
    return NextResponse.json({ error: "Sitio id is required." }, { status: 400 })
  }

  try {
    const serviceRole = createServiceRoleClient()
    const sitio = await getSitioById(serviceRole, id)

    if (!sitio) {
      return NextResponse.json({ error: "Sitio was not found." }, { status: 404 })
    }

    if (!sitio.is_custom) {
      return NextResponse.json({ error: "Default address options cannot be deleted." }, { status: 400 })
    }

    if (await getSitioDeletionUsage(serviceRole, sitio)) {
      return NextResponse.json({ error: ADDRESS_OPTION_IN_USE_MESSAGE }, { status: 400 })
    }

    const { error } = await serviceRole.from("address_sitios").delete().eq("id", id)

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to delete sitio." },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete sitio." },
      { status: 400 },
    )
  }
}
