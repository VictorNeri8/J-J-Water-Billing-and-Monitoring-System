import { requireAdminContext } from "@/lib/admin/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CustomersTable } from "@/components/admin/customers-table"
import { AddCustomerDialog } from "@/components/admin/add-customer-dialog"
import { Button } from "@/components/ui/button"
import { Archive } from "lucide-react"
import Link from "next/link"

export default async function CustomersPage() {
  const { supabase, profile } = await requireAdminContext(["reader", "finance"])
  const [{ data: customers }, { count: archivedCount }] = await Promise.all([
    supabase
      .from("customers")
      .select(`
        *,
        stub_out_locations (
          code,
          name,
          municipality,
          barangay,
          sitio,
          purok
        )
      `)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .not("archived_at", "is", null),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Customers</h1>
          <p className="text-muted-foreground">Manage water district customers and their accounts</p>
        </div>
        <div className="sm:self-start">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/customers/archive">
                <Archive className="mr-2 h-4 w-4" />
                Archived Customers ({archivedCount || 0})
              </Link>
            </Button>
            <AddCustomerDialog />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Active Customers</CardTitle>
          <CardDescription>
            Registered customers that are currently available for account management
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <CustomersTable customers={customers || []} userRole={profile.role} />
        </CardContent>
      </Card>
    </div>
  )
}
