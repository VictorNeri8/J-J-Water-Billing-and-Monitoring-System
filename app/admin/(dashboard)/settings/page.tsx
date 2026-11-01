import { requireAdminContext } from "@/lib/admin/auth"
import { SettingsTabs } from "@/components/admin/settings-tabs"

export default async function SettingsPage() {
  const { profile } = await requireAdminContext(["reader", "finance"])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and security settings.</p>
      </div>

      <SettingsTabs
        userId={profile.id}
        fullName={profile.full_name ?? ""}
        email={profile.email}
        role={profile.role}
      />
    </div>
  )
}
