"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { MailOpen, CheckCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ContactSubmission } from "@/lib/types"

interface ContactSubmissionsInboxProps {
  submissions: ContactSubmission[]
}

function getSubmissionStatusTextClass(isRead: boolean) {
  return isRead
    ? "font-medium text-muted-foreground"
    : "font-medium text-emerald-700 dark:text-emerald-400"
}

export function ContactSubmissionsInbox({ submissions }: ContactSubmissionsInboxProps) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  const selectedSubmission = useMemo(
    () => submissions.find((submission) => submission.id === selectedSubmissionId) ?? null,
    [selectedSubmissionId, submissions]
  )

  async function markAsRead(submissionId: string) {
    setUpdatingId(submissionId)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/contact/${submissionId}`, {
        method: "PATCH",
      })

      const data = await response.json()
      if (!response.ok) {
        setErrorMessage(data.error || "Failed to mark submission as read.")
        return
      }

      router.refresh()
    } catch {
      setErrorMessage("Failed to mark submission as read.")
    } finally {
      setUpdatingId(null)
    }
  }

  async function deleteSubmission(submissionId: string) {
    setDeletingId(submissionId)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/contact/${submissionId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (!response.ok) {
        setErrorMessage(data.error || "Failed to delete submission.")
        return
      }

      if (selectedSubmissionId === submissionId) {
        setSelectedSubmissionId(null)
      }
      router.refresh()
    } catch {
      setErrorMessage("Failed to delete submission.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Inbox</CardTitle>
        <CardDescription>Review incoming messages from the public contact form.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {errorMessage && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-3 md:hidden">
          {submissions.length === 0 ? (
            <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
              No contact submissions found.
            </div>
          ) : (
            submissions.map((submission) => (
              <div key={submission.id} className="rounded-lg border p-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{submission.subject}</p>
                    <p className="text-sm text-muted-foreground">{submission.name}</p>
                  </div>
                  <span className={getSubmissionStatusTextClass(submission.is_read)}>
                    {submission.is_read ? "Read" : "Unread"}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    <span>{submission.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Received: </span>
                    <span>{format(new Date(submission.created_at), "MMM d, yyyy HH:mm")}</span>
                  </div>
                  <div>
                    <p className="mb-1 text-muted-foreground">Message</p>
                    <p className="line-clamp-3 rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
                      {submission.message}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" className="cursor-pointer" onClick={() => setSelectedSubmissionId(submission.id)}>
                    View Message
                  </Button>
                  {!submission.is_read && (
                    <Button
                      className="cursor-pointer"
                      onClick={() => markAsRead(submission.id)}
                      disabled={updatingId === submission.id}
                    >
                      {updatingId === submission.id ? "Updating..." : "Mark as Read"}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => deleteSubmission(submission.id)}
                    disabled={deletingId === submission.id}
                  >
                    {deletingId === submission.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-md border md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium">Subject</th>
                <th className="px-4 py-3 text-left font-medium">Sender</th>
                <th className="px-4 py-3 text-left font-medium">Received</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Message</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-muted-foreground">
                    No contact submissions found.
                  </td>
                </tr>
              ) : (
                submissions.map((submission) => (
                  <tr key={submission.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{submission.subject}</td>
                    <td className="px-4 py-3">
                      <div>{submission.name}</div>
                      <div className="text-xs text-muted-foreground">{submission.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(submission.created_at), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={getSubmissionStatusTextClass(submission.is_read)}>
                        {submission.is_read ? "Read" : "Unread"}
                      </span>
                    </td>
                    <td className="max-w-[320px] px-4 py-3 text-muted-foreground">
                      <p className="truncate">{submission.message}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setSelectedSubmissionId(submission.id)}>
                          View
                        </Button>
                        {!submission.is_read && (
                          <Button
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => markAsRead(submission.id)}
                            disabled={updatingId === submission.id}
                          >
                            {updatingId === submission.id ? "Updating..." : "Mark Read"}
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => deleteSubmission(submission.id)}
                          disabled={deletingId === submission.id}
                        >
                          {deletingId === submission.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Dialog
          open={!!selectedSubmission}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSubmissionId(null)
            }
          }}
        >
          <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl">
            {selectedSubmission && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <MailOpen className="h-5 w-5 text-primary" />
                    <DialogTitle>{selectedSubmission.subject}</DialogTitle>
                  </div>
                  <DialogDescription>
                    From {selectedSubmission.name} ({selectedSubmission.email}) on{" "}
                    {format(new Date(selectedSubmission.created_at), "MMMM d, yyyy 'at' HH:mm")}
                  </DialogDescription>
                </DialogHeader>

                <div className="rounded-md border bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
                  {selectedSubmission.message}
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  {!selectedSubmission.is_read && (
                    <Button
                      onClick={async () => {
                        await markAsRead(selectedSubmission.id)
                        setSelectedSubmissionId(null)
                      }}
                      disabled={updatingId === selectedSubmission.id}
                    >
                      <CheckCheck className="mr-2 h-4 w-4" />
                      {updatingId === selectedSubmission.id ? "Updating..." : "Mark as Read"}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => deleteSubmission(selectedSubmission.id)}
                    disabled={deletingId === selectedSubmission.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletingId === selectedSubmission.id ? "Deleting..." : "Delete"}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedSubmissionId(null)}>
                    Close
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
