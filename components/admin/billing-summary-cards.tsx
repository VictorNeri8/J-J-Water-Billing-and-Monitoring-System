"use client"

import { useState, type ReactNode } from "react"
import { Droplets, Eye, EyeOff, Wallet, WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type BillingSummaryCardsProps = {
  totalBalance: number
  totalPaid: number
  totalWaterConsumption: number
}

type SummaryCardProps = {
  label: string
  value: string
  hiddenValue: string
  visible: boolean
  icon: ReactNode
  onToggle: () => void
}

function SummaryCard({ label, value, hiddenValue, visible, icon, onToggle }: SummaryCardProps) {
  const actionLabel = visible ? "Hide " + label.toLowerCase() : "Show " + label.toLowerCase()

  return (
    <Card>
      <CardContent className="flex items-center gap-3 px-4 py-2.5">
        {icon}
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground" aria-label={visible ? undefined : label + " hidden"}>
            {visible ? value : hiddenValue}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-muted-foreground"
          aria-label={actionLabel}
          aria-pressed={visible}
          onClick={onToggle}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      </CardContent>
    </Card>
  )
}

export function BillingSummaryCards({
  totalBalance,
  totalPaid,
  totalWaterConsumption,
}: BillingSummaryCardsProps) {
  const [isVisible, setIsVisible] = useState(false)
  const toggleVisibility = () => setIsVisible((visible) => !visible)

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[640px] xl:grid-cols-3">
      <SummaryCard
        label="Total Balance"
        value={"\u20B1" + totalBalance.toLocaleString()}
        hiddenValue={"\u20B1\u2022\u2022\u2022\u2022\u2022\u2022"}
        visible={isVisible}
        icon={<WalletCards className="h-5 w-5 shrink-0 text-yellow-600" aria-hidden="true" />}
        onToggle={toggleVisibility}
      />
      <SummaryCard
        label="Total Paid"
        value={"\u20B1" + totalPaid.toLocaleString()}
        hiddenValue={"\u20B1\u2022\u2022\u2022\u2022\u2022\u2022"}
        visible={isVisible}
        icon={<Wallet className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />}
        onToggle={toggleVisibility}
      />
      <SummaryCard
        label="Total Water Consumption"
        value={totalWaterConsumption.toLocaleString() + " m3"}
        hiddenValue={"\u2022\u2022\u2022\u2022\u2022\u2022 m3"}
        visible={isVisible}
        icon={<Droplets className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />}
        onToggle={toggleVisibility}
      />
    </div>
  )
}
