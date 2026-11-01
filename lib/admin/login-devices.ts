import { createHash } from "crypto"

import { getClientIp } from "@/lib/admin/login-lockout"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export type AdminLoginDeviceDetails = {
  browser: string
  os: string
  ipAddress: string
  userAgent: string
  approximateLocation: string
  deviceFingerprint: string
  loginTime: string
}

export type AdminLoginDeviceResult = {
  isNewDevice: boolean
  details: AdminLoginDeviceDetails
}

type LoginDeviceRow = {
  id: string
}

function trimHeaderValue(value: string | null) {
  return value?.trim() || ""
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

function decodeHeaderValue(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function getFirstHeaderValue(request: Request, names: string[]) {
  for (const name of names) {
    const value = trimHeaderValue(request.headers.get(name))
    if (value) {
      return decodeHeaderValue(value)
    }
  }

  return ""
}

function parseBrowser(userAgent: string) {
  const ua = userAgent.toLowerCase()

  if (ua.includes("edg/") || ua.includes("edgios/") || ua.includes("edga/")) {
    return "Microsoft Edge"
  }

  if (ua.includes("opr/") || ua.includes("opera/")) {
    return "Opera"
  }

  if (ua.includes("samsungbrowser/")) {
    return "Samsung Internet"
  }

  if (ua.includes("firefox/") || ua.includes("fxios/")) {
    return "Firefox"
  }

  if (ua.includes("crios/") || ua.includes("chrome/") || ua.includes("chromium/")) {
    return "Chrome"
  }

  if (ua.includes("safari/")) {
    return "Safari"
  }

  return "Unknown browser"
}

function parseOperatingSystem(userAgent: string) {
  const ua = userAgent.toLowerCase()

  if (ua.includes("windows nt")) {
    return "Windows"
  }

  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    return "iOS"
  }

  if (ua.includes("android")) {
    return "Android"
  }

  if (ua.includes("mac os x") || ua.includes("macintosh")) {
    return "macOS"
  }

  if (ua.includes("cros")) {
    return "ChromeOS"
  }

  if (ua.includes("linux")) {
    return "Linux"
  }

  return "Unknown OS"
}

function getApproximateLocation(request: Request) {
  const city = getFirstHeaderValue(request, [
    "x-vercel-ip-city",
    "cf-ipcity",
    "cloudfront-viewer-city",
  ])
  const region = getFirstHeaderValue(request, [
    "x-vercel-ip-country-region",
    "cf-region",
    "cloudfront-viewer-country-region",
  ])
  const country = getFirstHeaderValue(request, [
    "x-vercel-ip-country",
    "cf-ipcountry",
    "cloudfront-viewer-country",
  ])

  const parts = [city, region, country].filter(Boolean)
  return parts.length > 0 ? truncate(parts.join(", "), 180) : "Unknown"
}

function buildDeviceFingerprint(userAgent: string, browser: string, os: string) {
  const fingerprintSource = [
    userAgent.trim().toLowerCase(),
    browser.trim().toLowerCase(),
    os.trim().toLowerCase(),
  ].join("|")

  return createHash("sha256").update(fingerprintSource).digest("hex")
}

function extractLoginDeviceDetails(request: Request, loginTime: string): AdminLoginDeviceDetails {
  const rawUserAgent = trimHeaderValue(request.headers.get("user-agent")) || "unknown"
  const userAgent = truncate(rawUserAgent, 1024)
  const browser = parseBrowser(userAgent)
  const os = parseOperatingSystem(userAgent)

  return {
    browser,
    os,
    ipAddress: truncate(getClientIp(request), 128),
    userAgent,
    approximateLocation: getApproximateLocation(request),
    deviceFingerprint: buildDeviceFingerprint(userAgent, browser, os),
    loginTime,
  }
}

async function updateExistingDevice(id: string, details: AdminLoginDeviceDetails) {
  const serviceRole = createServiceRoleClient()
  const { error } = await serviceRole
    .from("admin_login_devices")
    .update({
      browser: details.browser,
      os: details.os,
      ip_address: details.ipAddress,
      user_agent: details.userAgent,
      approximate_location: details.approximateLocation,
      last_login_at: details.loginTime,
    })
    .eq("id", id)

  if (error) {
    throw error
  }
}

export async function recordAdminLoginDevice(params: {
  adminUserId: string
  email: string
  request: Request
  loginTime?: string
}): Promise<AdminLoginDeviceResult> {
  const loginTime = params.loginTime ?? new Date().toISOString()
  const details = extractLoginDeviceDetails(params.request, loginTime)
  const serviceRole = createServiceRoleClient()

  const { data: existingDevice, error: existingDeviceError } = await serviceRole
    .from("admin_login_devices")
    .select("id")
    .eq("email", params.email)
    .eq("device_fingerprint", details.deviceFingerprint)
    .maybeSingle()

  if (existingDeviceError) {
    throw existingDeviceError
  }

  if (existingDevice) {
    await updateExistingDevice((existingDevice as LoginDeviceRow).id, details)
    return {
      isNewDevice: false,
      details,
    }
  }

  const { error: insertError } = await serviceRole
    .from("admin_login_devices")
    .insert({
      admin_user_id: params.adminUserId,
      email: params.email,
      device_fingerprint: details.deviceFingerprint,
      browser: details.browser,
      os: details.os,
      ip_address: details.ipAddress,
      user_agent: details.userAgent,
      approximate_location: details.approximateLocation,
      first_login_at: loginTime,
      last_login_at: loginTime,
      is_trusted: true,
    })

  if (!insertError) {
    return {
      isNewDevice: true,
      details,
    }
  }

  if (insertError.code === "23505") {
    const { data: racedDevice, error: racedDeviceError } = await serviceRole
      .from("admin_login_devices")
      .select("id")
      .eq("email", params.email)
      .eq("device_fingerprint", details.deviceFingerprint)
      .maybeSingle()

    if (racedDeviceError || !racedDevice) {
      throw racedDeviceError || insertError
    }

    await updateExistingDevice((racedDevice as LoginDeviceRow).id, details)
    return {
      isNewDevice: false,
      details,
    }
  }

  throw insertError
}
