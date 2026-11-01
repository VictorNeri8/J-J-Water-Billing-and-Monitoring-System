export const INVALID_STUB_OUT_PLACEMENT_MESSAGE =
  "Invalid placement. Please place the pin within Consolacion or Liloan only."

export type StubOutCoordinate = {
  latitude: number
  longitude: number
}

type LinearRing = number[][]
type PolygonCoordinates = LinearRing[]
type MultiPolygonCoordinates = PolygonCoordinates[]

export const SERVICE_AREA_BOUNDS: [[number, number], [number, number]] = [
  [10.285, 123.865],
  [10.47, 124.06],
]

export const SERVICE_AREA_GEOJSON: {
  type: "FeatureCollection"
  features: Array<{
    type: "Feature"
    properties: {
      name: string
      municipality: string
    }
    geometry:
      | { type: "Polygon"; coordinates: PolygonCoordinates }
      | { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates }
  }>
} = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Consolacion Service Area",
        municipality: "Consolacion",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [123.875, 10.315],
            [123.895, 10.292],
            [123.938, 10.292],
            [123.986, 10.315],
            [124.012, 10.35],
            [123.999, 10.385],
            [123.956, 10.407],
            [123.912, 10.398],
            [123.878, 10.364],
            [123.875, 10.315],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Liloan Service Area",
        municipality: "Liloan",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [123.918, 10.374],
            [123.952, 10.354],
            [124.012, 10.364],
            [124.052, 10.394],
            [124.046, 10.441],
            [123.998, 10.466],
            [123.944, 10.454],
            [123.912, 10.418],
            [123.918, 10.374],
          ],
        ],
      },
    },
  ],
}

function isPointInRing(point: StubOutCoordinate, ring: LinearRing) {
  const x = point.longitude
  const y = point.latitude
  let inside = false

  for (let currentIndex = 0, previousIndex = ring.length - 1; currentIndex < ring.length; previousIndex = currentIndex++) {
    const current = ring[currentIndex]
    const previous = ring[previousIndex]
    const currentX = current[0]
    const currentY = current[1]
    const previousX = previous[0]
    const previousY = previous[1]

    const intersects =
      currentY > y !== previousY > y &&
      x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}

function isPointInPolygon(point: StubOutCoordinate, polygon: PolygonCoordinates) {
  const [outerRing, ...holes] = polygon

  if (!outerRing || !isPointInRing(point, outerRing)) {
    return false
  }

  return !holes.some((hole) => isPointInRing(point, hole))
}

function isPointInMultiPolygon(point: StubOutCoordinate, multipolygon: MultiPolygonCoordinates) {
  return multipolygon.some((polygon) => isPointInPolygon(point, polygon))
}

function isPointInServiceAreaBbox(point: StubOutCoordinate) {
  const [[south, west], [north, east]] = SERVICE_AREA_BOUNDS
  return (
    point.latitude >= south &&
    point.latitude <= north &&
    point.longitude >= west &&
    point.longitude <= east
  )
}

export function isInsideStubOutServiceArea(point: StubOutCoordinate) {
  if (
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    !isPointInServiceAreaBbox(point)
  ) {
    return false
  }

  return SERVICE_AREA_GEOJSON.features.some((feature) => {
    if (feature.geometry.type === "Polygon") {
      return isPointInPolygon(point, feature.geometry.coordinates)
    }

    if (feature.geometry.type === "MultiPolygon") {
      return isPointInMultiPolygon(point, feature.geometry.coordinates)
    }

    return false
  })
}
