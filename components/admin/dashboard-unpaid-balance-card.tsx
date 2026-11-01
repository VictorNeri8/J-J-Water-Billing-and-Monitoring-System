"use client"

import { useState } from "react"
import { Eye, EyeOff, WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type DashboardUnpaidBalanceCardProps = {
  amount: string
  monthLabel: string
}

export function DashboardUnpaidBalanceCard({ amount, monthLabel }: DashboardUnpaidBalanceCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const actionLabel = isVisible ? "Hide unpaid balance" : "Show unpaid balance"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Unpaid Balance for This Month ({monthLabel})</CardTitle>
        <div className="flex items-center gap-1">
          <WalletCards className="h-4 w-4 text-yellow-600" aria-hidden="true" />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label={actionLabel}
            aria-pressed={isVisible}
            onClick={() => setIsVisible((visible) => !visible)}
          >
            {isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" aria-label={isVisible ? undefined : "Unpaid balance hidden"}>
          {isVisible ? amount : "\u20B1\u2022\u2022\u2022\u2022\u2022\u2022"}
        </div>
        <p className="text-xs text-muted-foreground">Open balances billed this month</p>
      </CardContent>
    </Card>
  )
}
