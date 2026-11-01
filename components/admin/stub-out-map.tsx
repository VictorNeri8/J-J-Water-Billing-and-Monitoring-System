"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import L from "leaflet"
import type { GeoJsonObject } from "geojson"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { LocateFixed, Maximize2, Minimize2, Minus, Plus } from "lucide-react"
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet"
import { Button } from "@/components/ui/button"
import {
  CARTO_BASEMAP_CONFIGURED,
  CARTO_DARK_TILE_URL,
  CARTO_LIGHT_TILE_URL,
  CARTO_TILE_ATTRIBUTION,
} from "@/lib/carto-basemap"
import {
  INVALID_STUB_OUT_PLACEMENT_MESSAGE,
  SERVICE_AREA_BOUNDS,
  SERVICE_AREA_GEOJSON,
  isInsideStubOutServiceArea,
} from "@/lib/stub-out-service-area"
import { getAdminRoleLabel, type StubOutLocationSummary } from "@/lib/types"

interface StubOutMapProps {
  locations: StubOutLocationSummary[]
  previewPosition: { latitude: number; longitude: number } | null
  canAddPin: boolean
  placementMode: "create" | "replace" | null
  canSetPosition: boolean
  isEditingLocation: boolean
  isExpanded: boolean
  onStartPlacement: () => void
  onCancelPlacement: () => void
  onToggleExpanded: () => void
  onPositionSelect: (position: { latitude: number; longitude: number }) => void
  onViewCustomers: (location: StubOutLocationSummary) => void
}

const MAP_CENTER: [number, number] = [10.35, 123.95]

function MapClickHandler({
  enabled,
  onPositionSelect,
}: {
  enabled: boolean
  onPositionSelect: (position: { latitude: number; longitude: number }) => void
}) {
  useMapEvents({
    click(event) {
      if (!enabled) {
        return
      }

      const target = event.originalEvent.target
      if (target instanceof HTMLElement && target.closest("[data-stub-map-control='true']")) {
        return
      }

      const position = {
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      }

      if (!isInsideStubOutServiceArea(position)) {
        toast.error(INVALID_STUB_OUT_PLACEMENT_MESSAGE)
        return
      }

      onPositionSelect(position)
    },
  })

  return null
}

function DraggablePreviewMarker({
  position,
  icon,
  onPositionSelect,
}: {
  position: { latitude: number; longitude: number }
  icon: L.DivIcon
  onPositionSelect: (position: { latitude: number; longitude: number }) => void
}) {
  const eventHandlers = useMemo(
    () => ({
      dragend(event: L.DragEndEvent) {
        const marker = event.target as L.Marker
        const nextPosition = marker.getLatLng()
        const positionCandidate = {
          latitude: Number(nextPosition.lat.toFixed(6)),
          longitude: Number(nextPosition.lng.toFixed(6)),
        }

        if (!isInsideStubOutServiceArea(positionCandidate)) {
          toast.error(INVALID_STUB_OUT_PLACEMENT_MESSAGE)
          marker.setLatLng([position.latitude, position.longitude])
          return
        }

        onPositionSelect(positionCandidate)
      },
    }),
    [onPositionSelect, position.latitude, position.longitude],
  )

  return (
    <Marker
      position={[position.latitude, position.longitude]}
      icon={icon}
      draggable
      eventHandlers={eventHandlers}
    >
      <Popup>
        <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
          <p className="font-medium text-slate-950 dark:text-white">Pin preview</p>
          <p>Drag this marker to adjust the exact location.</p>
          <p className="font-mono">{position.latitude}, {position.longitude}</p>
        </div>
      </Popup>
    </Marker>
  )
}

function MapControls() {
  const map = useMap()

  return (
    <div className="absolute bottom-16 left-4 z-[8] flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white/90 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/85">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-none text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
        onClick={() => map.zoomIn()}
      >
        <Plus className="h-4 w-4" />
        <span className="sr-only">Zoom in</span>
      </Button>
      <div className="h-px bg-black/10 dark:bg-white/10" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-none text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
        onClick={() => map.zoomOut()}
      >
        <Minus className="h-4 w-4" />
        <span className="sr-only">Zoom out</span>
      </Button>
      <div className="h-px bg-black/10 dark:bg-white/10" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-none text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
        onClick={() => map.fitBounds(SERVICE_AREA_BOUNDS, { padding: [24, 24] })}
      >
        <LocateFixed className="h-4 w-4" />
        <span className="sr-only">Fit service boundary</span>
      </Button>
    </div>
  )
}

function ResizeMapOnExpand({ isExpanded }: { isExpanded: boolean }) {
  const map = useMap()

  useEffect(() => {
    const invalidate = () => map.invalidateSize({ animate: false })
    const frameId = window.requestAnimationFrame(invalidate)
    const timeoutIds = [100, 250, 500].map((delay) => window.setTimeout(invalidate, delay))
    const container = map.getContainer()
    const resizeObserver = new ResizeObserver(invalidate)

    resizeObserver.observe(container)

    return () => {
      window.cancelAnimationFrame(frameId)
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
      resizeObserver.disconnect()
    }
  }, [isExpanded, map])

  return null
}

function PlacementCursor({ enabled }: { enabled: boolean }) {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    container.classList.toggle("admin-leaflet-map--placing", enabled)

    return () => {
      container.classList.remove("admin-leaflet-map--placing")
    }
  }, [enabled, map])

  return null
}

function MapActionOverlay({
  canAddPin,
  placementMode,
  isExpanded,
  onStartPlacement,
  onCancelPlacement,
  onToggleExpanded,
}: {
  canAddPin: boolean
  placementMode: "create" | "replace" | null
  isExpanded: boolean
  onStartPlacement: () => void
  onCancelPlacement: () => void
  onToggleExpanded: () => void
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!overlayRef.current) {
      return
    }

    L.DomEvent.disableClickPropagation(overlayRef.current)
    L.DomEvent.disableScrollPropagation(overlayRef.current)
  }, [])

  function stopMapPropagation(event: React.SyntheticEvent) {
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }

  function stopMapClick(event: React.SyntheticEvent) {
    event.preventDefault()
    stopMapPropagation(event)
  }

  return (
    <div
      ref={overlayRef}
      data-stub-map-control="true"
      className="absolute right-3 top-3 z-[8] flex items-start gap-2 sm:right-4 sm:top-4"
      onClick={stopMapClick}
      onDoubleClick={stopMapClick}
      onMouseDown={stopMapPropagation}
      onMouseUp={stopMapPropagation}
      onPointerDown={stopMapPropagation}
      onPointerUp={stopMapPropagation}
      onTouchEnd={stopMapPropagation}
      onTouchStart={stopMapPropagation}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 bg-white/90 shadow-sm backdrop-blur-md dark:bg-zinc-950/88"
        onClick={(event) => {
          stopMapClick(event)
          onToggleExpanded()
        }}
      >
        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        <span className="sr-only">{isExpanded ? "Collapse map" : "Expand map"}</span>
      </Button>
      {placementMode ? (
        <div className="max-w-[min(260px,calc(100vw-5rem))] rounded-lg border border-emerald-500/20 bg-white/92 p-3 text-xs text-slate-600 shadow-sm backdrop-blur-md dark:border-emerald-400/20 dark:bg-zinc-950/88 dark:text-slate-300">
          <p className="font-medium text-slate-950 dark:text-white">Place Stub Out pin</p>
          <p className="mt-1">
            {placementMode === "replace"
              ? "Click inside the service boundary to place the replacement Stub Out pin."
              : "Pan freely, then click inside the service boundary."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 h-8 w-full bg-white/80 dark:bg-zinc-900/80"
            onClick={(event) => {
              stopMapClick(event)
              onCancelPlacement()
            }}
          >
            Cancel
          </Button>
        </div>
      ) : canAddPin ? (
        <Button
          type="button"
          size="sm"
          className="h-9 px-3 shadow-sm sm:px-4"
          onClick={(event) => {
            stopMapClick(event)
            onStartPlacement()
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Pin
        </Button>
      ) : null}
    </div>
  )
}

function createMarkerIcon(kind: "saved" | "preview" | "bad", isDark: boolean) {
  const savedFill = isDark ? "#38bdf8" : "#0369a1"
  const previewFill = isDark ? "#34d399" : "#059669"
  const badFill = isDark ? "#f87171" : "#dc2626"
  const fill = kind === "preview" ? previewFill : kind === "bad" ? badFill : savedFill
  const ring =
    kind === "preview"
      ? "rgba(52, 211, 153, 0.22)"
      : kind === "bad"
        ? "rgba(239, 68, 68, 0.22)"
        : "rgba(14, 165, 233, 0.22)"

  return L.divIcon({
    className: "admin-stub-marker",
    html: `
      <div style="height: 42px; width: 42px; border-radius: 999px; background: ${ring}; display: flex; align-items: center; justify-content: center;">
        <div style="height: 24px; width: 24px; border-radius: 999px; background: ${fill}; border: 3px solid ${isDark ? "#0f172a" : "#ffffff"}; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.25);"></div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -18],
  })
}

function getServiceAreaStyle(isDark: boolean) {
  return {
    color: isDark ? "#38bdf8" : "#0369a1",
    weight: 2,
    opacity: isDark ? 0.9 : 0.78,
    fillColor: isDark ? "#0ea5e9" : "#0284c7",
    fillOpacity: isDark ? 0.12 : 0.08,
    dashArray: "6 6",
    lineCap: "round" as const,
    lineJoin: "round" as const,
  }
}

function formatShortDate(date?: string | null) {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function StubOutMap({
  locations,
  previewPosition,
  canAddPin,
  placementMode,
  canSetPosition,
  isEditingLocation,
  isExpanded,
  onStartPlacement,
  onCancelPlacement,
  onToggleExpanded,
  onPositionSelect,
  onViewCustomers,
}: StubOutMapProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const isDark = mounted && resolvedTheme === "dark"
  const tileUrl = isDark ? CARTO_DARK_TILE_URL : CARTO_LIGHT_TILE_URL
  const savedIcon = useMemo(() => createMarkerIcon("saved", isDark), [isDark])
  const badIcon = useMemo(() => createMarkerIcon("bad", isDark), [isDark])
  const previewIcon = useMemo(() => createMarkerIcon("preview", isDark), [isDark])
  const isPlacementMode = placementMode !== null

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!CARTO_BASEMAP_CONFIGURED || !tileUrl) {
    return (
      <div
        className={`flex w-full items-center justify-center bg-[#f8f5ef] px-6 text-center text-sm text-slate-600 dark:bg-[#11100d] dark:text-slate-300 ${isExpanded ? "h-[calc(100dvh-0.5rem)] rounded-lg lg:h-[calc(100dvh-1.5rem)]" : "h-[620px] rounded-b-lg sm:h-[680px] md:rounded-lg xl:h-[720px]"}`}
      >
        Map unavailable: configure NEXT_PUBLIC_CARTO_BASEMAP_API_KEY.
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-[#f8f5ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:bg-[#11100d] ${isExpanded ? "h-[calc(100dvh-0.5rem)] rounded-lg lg:h-[calc(100dvh-1.5rem)]" : "rounded-b-lg md:rounded-lg"}`}>
      <MapContainer
        key={isExpanded ? "stub-out-map-expanded" : "stub-out-map-default"}
        center={MAP_CENTER}
        zoom={12}
        zoomControl={false}
        attributionControl
        scrollWheelZoom
        className={`admin-leaflet-map w-full ${isExpanded ? "" : "h-[620px] sm:h-[680px] xl:h-[720px]"}`}
        style={{ zIndex: 0, height: isExpanded ? "100%" : undefined }}
      >
        <TileLayer
          key={tileUrl}
          attribution={CARTO_TILE_ATTRIBUTION}
          url={tileUrl}
          subdomains="abcd"
          maxZoom={20}
        />
        <GeoJSON
          key={isDark ? "service-area-dark" : "service-area-light"}
          data={SERVICE_AREA_GEOJSON as GeoJsonObject}
          style={() => getServiceAreaStyle(isDark)}
          interactive={false}
        />
        <MapClickHandler enabled={canSetPosition} onPositionSelect={onPositionSelect} />
        <ResizeMapOnExpand isExpanded={isExpanded} />
        <PlacementCursor enabled={isPlacementMode} />
        <MapControls />
        <MapActionOverlay
          canAddPin={canAddPin}
          placementMode={placementMode}
          isExpanded={isExpanded}
          onStartPlacement={onStartPlacement}
          onCancelPlacement={onCancelPlacement}
          onToggleExpanded={onToggleExpanded}
        />
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[Number(location.latitude), Number(location.longitude)]}
            icon={location.status === "inactive" ? badIcon : savedIcon}
            interactive={!isPlacementMode}
          >
            <Popup>
              <div className="min-w-52 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {[location.code, location.name].filter(Boolean).join(" - ")}
                  </p>
                </div>
                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  <p>{[location.sitio, location.barangay, location.municipality].filter(Boolean).join(", ")}</p>
                  <p>{location.assigned_customer_count} assigned customer{location.assigned_customer_count === 1 ? "" : "s"}</p>
                  <p>Added by {getAdminRoleLabel(location.created_by_role)}</p>
                  <p className="break-all">Email: {location.created_by_email || "-"}</p>
                  <p>Created: {formatShortDate(location.created_at)}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 w-full"
                  onClick={() => onViewCustomers(location)}
                >
                  View Customers
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
        {previewPosition ? (
          <DraggablePreviewMarker
            position={previewPosition}
            icon={previewIcon}
            onPositionSelect={onPositionSelect}
          />
        ) : null}
      </MapContainer>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[7] h-20 bg-gradient-to-b from-white/30 to-transparent dark:from-black/30" />
      {canSetPosition ? (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[8] w-[min(320px,calc(100%-2rem))] -translate-x-1/2 rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/85 dark:text-slate-300">
          {placementMode === "replace"
            ? "Click inside the service boundary to place the replacement Stub Out pin."
            : previewPosition
              ? "Drag the preview marker inside the service boundary."
              : `Move the map freely, then click inside the service boundary to ${isEditingLocation ? "move" : "place"} the Stub Out pin.`}
        </div>
      ) : null}
    </div>
  )
}
