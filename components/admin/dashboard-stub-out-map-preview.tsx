"use client"

import dynamic from "next/dynamic"
import type { StubOutLocationSummary } from "@/lib/types"

const DashboardStubOutMapPreviewLeaflet = dynamic(
  () =>
    import("@/components/admin/dashboard-stub-out-map-preview-leaflet").then(
      (module) => module.DashboardStubOutMapPreviewLeaflet,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] w-full items-center justify-center rounded-md border bg-muted/40 text-sm text-muted-foreground sm:h-[360px]">
        Loading map...
      </div>
    ),
  },
)

interface DashboardStubOutMapPreviewProps {
  locations: StubOutLocationSummary[]
}

export function DashboardStubOutMapPreview({ locations }: DashboardStubOutMapPreviewProps) {
  return <DashboardStubOutMapPreviewLeaflet locations={locations} />
}
