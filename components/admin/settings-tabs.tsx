"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AdminRole } from "@/lib/types"

type SettingsTabsProps = {
  userId: string
  email: string
  fullName: string
  role: AdminRole
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine(({ newPassword, confirmPassword }, ctx) => {
    if (newPassword.length < 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "New password must be at least 11 characters long.",
      })
    }

    if (!/[A-Z]/.test(newPassword)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "New password must include at least one uppercase letter.",
      })
    }

    if (!/[a-z]/.test(newPassword)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "New password must include at least one lowercase letter.",
      })
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "New password must include at least one special character.",
      })
    }

    if (confirmPassword !== newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Confirm password must match the new password.",
      })
    }
  })

function formatRole(role: AdminRole) {
  return role === "finance" ? "Finance" : "Reader"
}

export function SettingsTabs({ userId, email, fullName, role }: SettingsTabsProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [name, setName] = useState(fullName)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [isSavingAccount, setIsSavingAccount] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [securityErrors, setSecurityErrors] = useState<Record<string, string>>({})
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  async function handleAccountSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setAccountError("Name is required.")
      return
    }

    setIsSavingAccount(true)
    setAccountError(null)

    const { error } = await supabase
      .from("admin_profiles")
      .update({ full_name: trimmedName })
      .eq("id", userId)

    setIsSavingAccount(false)

    if (error) {
      const message = error.message || "Failed to update your account details."
      setAccountError(message)
      toast.error(message)
      return
    }

    toast.success("Account details updated.")
    router.refresh()
  }

  function clearSecurityState() {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setSecurityErrors({})
  }

  async function handlePasswordSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = passwordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setSecurityErrors({
        currentPassword: fieldErrors.currentPassword?.[0] || "",
        newPassword: fieldErrors.newPassword?.[0] || "",
        confirmPassword: fieldErrors.confirmPassword?.[0] || "",
      })
      toast.error("Please fix the password validation errors.")
      return
    }

    setIsSavingPassword(true)
    setSecurityErrors({})

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })

    if (reauthError) {
      setIsSavingPassword(false)
      const message = reauthError.message || "Current password is incorrect."
      setSecurityErrors({ currentPassword: message })
      toast.error(message)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setIsSavingPassword(false)

    if (updateError) {
      const message = updateError.message || "Failed to update password."
      setSecurityErrors({ newPassword: message })
      toast.error(message)
      return
    }

    clearSecurityState()
    toast.success("Password updated successfully.")
  }

  return (
    <Tabs defaultValue="account" className="space-y-6">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
      </TabsList>

      <TabsContent value="account">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>View your account details and update your display name.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleAccountSave}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Name</Label>
                  <Input
                    id="full_name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={email} disabled className="bg-muted" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={formatRole(role)} disabled className="bg-muted" />
              </div>

              {accountError && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{accountError}</p>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSavingAccount}>
                  {isSavingAccount ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Change your password. Your current password is required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handlePasswordSave}>
              <div className="space-y-2">
                <Label htmlFor="current_password">Current Password</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                />
                {securityErrors.currentPassword && (
                  <p className="text-sm text-destructive">{securityErrors.currentPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <p className="text-sm text-muted-foreground">
                  Use at least 11 characters with uppercase, lowercase, and a special character.
                </p>
                {securityErrors.newPassword && (
                  <p className="text-sm text-destructive">{securityErrors.newPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
                {securityErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{securityErrors.confirmPassword}</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSavingPassword}>
                  {isSavingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
