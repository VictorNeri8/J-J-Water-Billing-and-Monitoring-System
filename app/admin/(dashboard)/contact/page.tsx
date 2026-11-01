import { Mail } from "lucide-react"
import { requireAdminContext } from "@/lib/admin/auth"
import { ContactSubmissionsInbox } from "@/components/admin/contact-submissions-inbox"

export default async function ContactInboxPage() {
  const { supabase } = await requireAdminContext(["finance"])

  const { data: submissions } = await supabase
    .from("contact_submissions")
    .select("*")
    .order("created_at", { ascending: false })

  const unreadCount = submissions?.filter((submission) => !submission.is_read).length || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Contact Inbox
          </h1>
          <p className="text-muted-foreground">
            Review public-site inquiries submitted through the contact form.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Mail className="h-4 w-4 text-primary" />
          <span>{unreadCount} unread message{unreadCount === 1 ? "" : "s"}</span>
        </div>
      </div>

      <ContactSubmissionsInbox submissions={submissions || []} />
    </div>
  )
}
