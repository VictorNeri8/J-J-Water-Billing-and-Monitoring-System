"use client"

import { useEffect, useMemo, useState } from "react"
import L from "leaflet"
import type { GeoJsonObject } from "geojson"
import { useTheme } from "next-themes"
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from "react-leaflet"
import {
  CARTO_BASEMAP_CONFIGURED,
  CARTO_DARK_TILE_URL,
  CARTO_LIGHT_TILE_URL,
  CARTO_TILE_ATTRIBUTION,
} from "@/lib/carto-basemap"
import {
  SERVICE_AREA_BOUNDS,
  SERVICE_AREA_GEOJSON,
} from "@/lib/stub-out-service-area"
import type { StubOutLocationSummary } from "@/lib/types"

interface DashboardStubOutMapPreviewLeafletProps {
  locations: StubOutLocationSummary[]
}

const MAP_CENTER: [number, number] = [10.35, 123.95]

function FitServiceArea() {
  const map = useMap()

  useEffect(() => {
    map.fitBounds(SERVICE_AREA_BOUNDS, { padding: [18, 18] })
    const timeoutId = window.setTimeout(() => map.invalidateSize({ animate: false }), 150)

    return () => window.clearTimeout(timeoutId)
  }, [map])

  return null
}

function createPreviewMarkerIcon(status: StubOutLocationSummary["status"], isDark: boolean) {
  const isBad = status === "inactive"
  const fill = isBad ? (isDark ? "#f87171" : "#dc2626") : isDark ? "#38bdf8" : "#0369a1"
  const ring = isBad ? "rgba(239, 68, 68, 0.22)" : "rgba(14, 165, 233, 0.22)"

  return L.divIcon({
    className: "admin-stub-marker",
    html: `
      <div style="height: 34px; width: 34px; border-radius: 999px; background: ${ring}; display: flex; align-items: center; justify-content: center;">
        <div style="height: 19px; width: 19px; border-radius: 999px; background: ${fill}; border: 3px solid ${isDark ? "#0f172a" : "#ffffff"}; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);"></div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

function getServiceAreaStyle(isDark: boolean) {
  return {
    color: isDark ? "#38bdf8" : "#0369a1",
    weight: 1.8,
    opacity: isDark ? 0.78 : 0.68,
    fillColor: isDark ? "#0ea5e9" : "#0284c7",
    fillOpacity: isDark ? 0.08 : 0.06,
    dashArray: "6 6",
    lineCap: "round" as const,
    lineJoin: "round" as const,
  }
}

export function DashboardStubOutMapPreviewLeaflet({ locations }: DashboardStubOutMapPreviewLeafletProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const isDark = mounted && resolvedTheme === "dark"
  const tileUrl = isDark ? CARTO_DARK_TILE_URL : CARTO_LIGHT_TILE_URL
  const goodIcon = useMemo(() => createPreviewMarkerIcon("active", isDark), [isDark])
  const badIcon = useMemo(() => createPreviewMarkerIcon("inactive", isDark), [isDark])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!CARTO_BASEMAP_CONFIGURED || !tileUrl) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center rounded-md border bg-[#f8f5ef] px-6 text-center text-sm text-slate-600 sm:h-[360px] dark:bg-[#11100d] dark:text-slate-300">
        Map unavailable: configure NEXT_PUBLIC_CARTO_BASEMAP_API_KEY.
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-md border bg-[#f8f5ef] dark:bg-[#11100d]">
      <MapContainer
        center={MAP_CENTER}
        zoom={12}
        zoomControl
        attributionControl
        scrollWheelZoom
        dragging
        className="admin-leaflet-map h-[320px] w-full sm:h-[360px]"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          key={tileUrl}
          attribution={CARTO_TILE_ATTRIBUTION}
          url={tileUrl}
          subdomains="abcd"
          maxZoom={20}
        />
        <GeoJSON
          key={isDark ? "dashboard-service-area-dark" : "dashboard-service-area-light"}
          data={SERVICE_AREA_GEOJSON as GeoJsonObject}
          style={() => getServiceAreaStyle(isDark)}
          interactive={false}
        />
        <FitServiceArea />
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[Number(location.latitude), Number(location.longitude)]}
            icon={location.status === "inactive" ? badIcon : goodIcon}
            interactive={false}
          />
        ))}
      </MapContainer>
    </div>
  )
}
