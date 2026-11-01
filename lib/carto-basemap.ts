const CARTO_BASEMAP_API_KEY = process.env.NEXT_PUBLIC_CARTO_BASEMAP_API_KEY?.trim()

const LIGHT_TILE_PATH = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
const DARK_TILE_PATH = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"

export const CARTO_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

export const CARTO_BASEMAP_CONFIGURED = Boolean(CARTO_BASEMAP_API_KEY)

function withApiKey(tilePath: string) {
  if (!CARTO_BASEMAP_API_KEY) {
    return null
  }

  return `${tilePath}?key=${encodeURIComponent(CARTO_BASEMAP_API_KEY)}`
}

export const CARTO_LIGHT_TILE_URL = withApiKey(LIGHT_TILE_PATH)
export const CARTO_DARK_TILE_URL = withApiKey(DARK_TILE_PATH)
