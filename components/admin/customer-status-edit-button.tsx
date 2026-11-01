"use client"

import { useState } from "react"
import { Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditCustomerDialog } from "@/components/admin/edit-customer-dialog"
import type { Customer } from "@/lib/types"

export function CustomerStatusEditButton({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </Button>
      <EditCustomerDialog
        customer={customer}
        open={open}
        statusOnly
        onOpenChange={setOpen}
      />
    </>
  )
}
