import { NextResponse } from "next/server"
import { getCurrentAdminContext } from "@/lib/admin/auth"

async function authorizeFinanceAdmin() {
  const context = await getCurrentAdminContext()

  if (!context) {
    return { authorized: false as const, status: 401 }
  }

  if (context.profile.role !== "finance") {
    return { authorized: false as const, status: 403 }
  }

  return { supabase: context.supabase, authorized: true as const, status: 200 }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authorizeFinanceAdmin()

    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: auth.status }
      )
    }

    const { data, error } = await auth.supabase
      .from("contact_submissions")
      .update({ is_read: true })
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to update submission" }, { status: 500 })
    }

    return NextResponse.json({ success: true, submission: data })
  } catch (error) {
    console.error("Error updating contact submission:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authorizeFinanceAdmin()

    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: auth.status }
      )
    }

    const { error } = await auth.supabase
      .from("contact_submissions")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to delete submission" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting contact submission:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
