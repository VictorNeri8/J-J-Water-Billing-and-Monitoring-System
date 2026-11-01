"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type DashboardSearchStubOutLocation = {
  code: string | null
  name: string | null
  municipality: string | null
  barangay: string | null
  sitio: string | null
  purok: string | null
}

export type DashboardSearchCustomer = {
  id: string
  account_number: string | null
  customer_name: string | null
  meter_id: string | null
  address: string | null
  contact_number: string | null
  is_active: boolean | null
  stub_out_locations?: DashboardSearchStubOutLocation | DashboardSearchStubOutLocation[] | null
}

function getStubOutLocation(customer: DashboardSearchCustomer) {
  const stubOutLocation = customer.stub_out_locations

  return Array.isArray(stubOutLocation) ? stubOutLocation[0] : stubOutLocation
}

function getStubOutLabel(customer: DashboardSearchCustomer) {
  return getStubOutLocation(customer)?.code || "-"
}

function getStubOutSearchText(customer: DashboardSearchCustomer) {
  const stubOutLocation = getStubOutLocation(customer)

  return [
    getStubOutLabel(customer),
    stubOutLocation?.name,
    stubOutLocation?.municipality,
    stubOutLocation?.barangay,
    stubOutLocation?.sitio,
    stubOutLocation?.purok,
  ]
    .filter(Boolean)
    .join(" ")
}

function getCustomerSearchValue(customer: DashboardSearchCustomer) {
  return [
    customer.customer_name,
    customer.account_number,
    customer.meter_id,
    customer.address,
    customer.contact_number,
    getStubOutSearchText(customer),
  ]
    .filter(Boolean)
    .join(" ")
}

function getMeterIdLabel(customer: DashboardSearchCustomer) {
  return customer.meter_id || "-"
}

export function DashboardCustomerSearch({ customers }: { customers: DashboardSearchCustomer[] }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const router = useRouter()

  function setDialogOpen(nextOpen: boolean) {
    setOpen(nextOpen)

    if (!nextOpen) {
      setSearch("")
    }
  }

  function openCustomer(customerId: string) {
    setDialogOpen(false)
    router.push(`/admin/customers/${customerId}`)
  }

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="group w-full justify-start border-slate-200 bg-background text-black shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:text-black hover:shadow-md active:translate-y-0 active:scale-[0.98] sm:w-auto dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:shadow-[0_10px_30px_-18px_rgba(148,163,184,0.55)] dark:hover:border-sky-400/60 dark:hover:bg-sky-400/10 dark:hover:text-white dark:hover:shadow-[0_14px_36px_-20px_rgba(56,189,248,0.75)]"
        >
          <Search
            className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary dark:group-hover:text-sky-300"
            aria-hidden="true"
          />
          Search customer or account
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-4 pb-3 pt-5 pr-12 sm:px-6 sm:pb-4 sm:pt-6 sm:pr-12">
          <DialogTitle>Search customer or account</DialogTitle>
          <DialogDescription>
            Find a customer by name, account number, meter, address, contact, or stub-out location.
          </DialogDescription>
        </DialogHeader>

        <Command className="min-h-0 border-t" shouldFilter>
          <CommandInput
            placeholder="Search customers, accounts, or meters..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[min(60dvh,420px)]">
            <CommandEmpty>No customers found.</CommandEmpty>
            <CommandGroup>
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={getCustomerSearchValue(customer)}
                  onSelect={() => openCustomer(customer.id)}
                  className="items-start gap-3 px-3 py-3"
                >
                  <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">
                        {customer.customer_name || "Unknown Customer"}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          customer.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }
                      >
                        {customer.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Account: {customer.account_number || "-"}</span>
                      <span>Meter ID: {getMeterIdLabel(customer)}</span>
                      <span>Stub Out: {getStubOutLabel(customer)}</span>
                    </div>
                    {customer.address ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{customer.address}</p>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
