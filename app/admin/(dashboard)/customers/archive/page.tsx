import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireAdminContext } from "@/lib/admin/auth"
import { ArchivedCustomersTable } from "@/components/admin/archived-customers-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ArchivedCustomersPage() {
  const { supabase, profile } = await requireAdminContext(["reader", "finance"])
  const { data: customers } = await supabase
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
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Archived Customers</h1>
          <p className="text-muted-foreground">Review retention status and restore eligible customer accounts.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/customers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Active Customers
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Archive ({customers?.length || 0})</CardTitle>
          <CardDescription>
            Customers can be restored for 60 days. Before expiration, permanent deletion requires a zero billing balance.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <ArchivedCustomersTable customers={customers || []} userRole={profile.role} />
        </CardContent>
      </Card>
    </div>
  )
}
