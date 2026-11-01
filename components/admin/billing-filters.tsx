"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

interface BillingFiltersProps {
  selectedMonth: number
  selectedYear: number
  isAll: boolean
  selectedPaymentMethod: "all" | "cash" | "online"
  yearOptions: number[]
}

export function BillingFilters({
  selectedMonth,
  selectedYear,
  isAll,
  selectedPaymentMethod,
  yearOptions,
}: BillingFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const safeYearOptions = useMemo(() => {
    if (yearOptions.length > 0) return yearOptions
    return [selectedYear]
  }, [selectedYear, yearOptions])

  function updateFilters(
    nextMonth: number,
    nextYear: number,
    nextIsAll: boolean,
    nextPaymentMethod: "all" | "cash" | "online",
  ) {
    const params = new URLSearchParams(searchParams.toString())

    if (nextIsAll) {
      params.set("all", "true")
      params.delete("month")
      params.delete("year")
    } else {
      params.delete("all")
      params.set("month", String(nextMonth))
      params.set("year", String(nextYear))
    }

    if (nextPaymentMethod === "all") {
      params.delete("paymentMethod")
    } else {
      params.set("paymentMethod", nextPaymentMethod)
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select
        value={String(selectedMonth)}
        onValueChange={(value) => updateFilters(Number(value), selectedYear, false, selectedPaymentMethod)}
        disabled={isAll}
      >
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((month) => (
            <SelectItem key={month.value} value={month.value}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(selectedYear)}
        onValueChange={(value) => updateFilters(selectedMonth, Number(value), false, selectedPaymentMethod)}
        disabled={isAll}
      >
        <SelectTrigger className="w-full sm:w-[120px]">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {safeYearOptions.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedPaymentMethod}
        onValueChange={(value: "all" | "cash" | "online") => updateFilters(selectedMonth, selectedYear, isAll, value)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Payment method" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Methods</SelectItem>
          <SelectItem value="cash">Cash</SelectItem>
          <SelectItem value="online">Online</SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant={isAll ? "default" : "outline"}
        onClick={() => updateFilters(selectedMonth, selectedYear, !isAll, selectedPaymentMethod)}
        className="w-full sm:w-auto"
      >
        All
      </Button>
    </div>
  )
}
