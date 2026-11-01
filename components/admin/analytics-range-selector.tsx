"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type RangeOption = {
  label: string
  value: string
}

type AnalyticsRangeSelectorProps = {
  value: string
  options: readonly RangeOption[]
}

export function AnalyticsRangeSelector({ value, options }: AnalyticsRangeSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleValueChange(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", nextValue)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="grid w-full gap-2 md:w-72">
      {/* <Label htmlFor="analytics-range">Range</Label> */}
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger id="analytics-range" className="w-full">
          <SelectValue placeholder="Select a range" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
