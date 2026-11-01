"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"

interface ManualSMSCustomer {
  id: string
  customer_name: string
  account_number: string
  contact_number: string
}

interface SendManualSMSDialogProps {
  customers: ManualSMSCustomer[]
  smsEnabled?: boolean
}

export function SendManualSMSDialog({ customers, smsEnabled = true }: SendManualSMSDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [customerId, setCustomerId] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const router = useRouter()
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId) ?? null,
    [customerId, customers]
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!smsEnabled) {
      setResult({ success: false, message: "SMS notifications are currently disabled." })
      return
    }

    setIsLoading(true)
    setResult(null)

    if (!customerId) {
      setResult({ success: false, message: "Please select a customer first." })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message, customerId }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: "SMS sent successfully!" })
        setCustomerId("")
        setPhone("")
        setMessage("")
        router.refresh()
      } else {
        setResult({ success: false, message: data.message || data.error || "Failed to send SMS" })
      }
    } catch {
      setResult({ success: false, message: "An error occurred" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!smsEnabled} title={!smsEnabled ? "SMS notifications are currently disabled." : undefined}>
          <Send className="mr-2 h-4 w-4" />
          Send SMS
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Manual SMS</DialogTitle>
          <DialogDescription>
            {smsEnabled
              ? "Send a custom SMS message to a customer."
              : "SMS notifications are currently disabled."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="customer">Customer</Label>
              <Select
                value={customerId}
                onValueChange={(value) => {
                  setCustomerId(value)
                  const customer = customers.find((item) => item.id === value)
                  setPhone(customer?.contact_number || "")
                }}
              >
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.account_number} - {customer.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="09XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              {selectedCustomer && (
                <p className="text-xs text-muted-foreground">
                  Sending as {selectedCustomer.customer_name} ({selectedCustomer.account_number})
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={160}
                required
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/160 characters
              </p>
            </div>
            {result && (
              <div
                className={`rounded-md p-3 text-sm ${
                  result.success
                    ? "bg-green-500/10 text-green-600"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {result.message}
              </div>
            )}
            {!smsEnabled && (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                SMS notifications are currently disabled.
              </div>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !smsEnabled}>
              {isLoading ? "Sending..." : "Send SMS"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
