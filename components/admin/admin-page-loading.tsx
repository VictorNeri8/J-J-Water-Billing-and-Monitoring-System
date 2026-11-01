import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type AdminPageLoadingProps = {
  showStats?: boolean
  statsCount?: number
  showTabs?: boolean
  tabCount?: number
  tableColumns?: number
}

export function AdminPageLoading({
  showStats = false,
  statsCount = 3,
  showTabs = false,
  tabCount = 4,
  tableColumns = 6,
}: AdminPageLoadingProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {showStats && (
        <div className={`grid gap-4 ${statsCount >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {Array.from({ length: statsCount }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="space-y-2 pb-2">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          {showTabs && (
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: tabCount }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-24 shrink-0" />
              ))}
            </div>
          )}

          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-sm" />

            <div className="grid gap-3 md:hidden">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-lg border p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-md border md:block">
              <div className="min-w-full">
                <div className="grid border-b px-4 py-3" style={{ gridTemplateColumns: `repeat(${tableColumns}, minmax(0, 1fr))` }}>
                  {Array.from({ length: tableColumns }).map((_, index) => (
                    <Skeleton key={index} className="h-4 w-16" />
                  ))}
                </div>
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="grid items-center gap-4"
                      style={{ gridTemplateColumns: `repeat(${tableColumns}, minmax(0, 1fr))` }}
                    >
                      {Array.from({ length: tableColumns }).map((__, cellIndex) => (
                        <Skeleton key={cellIndex} className="h-4 w-full" />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
