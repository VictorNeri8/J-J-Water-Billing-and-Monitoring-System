type TurnstileVerificationResult = {
  errorCodes: string[]
  success: boolean
}

export async function verifyTurnstileToken(params: {
  ip: string
  token: string
}): Promise<TurnstileVerificationResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()

  if (!secret) {
    throw new Error("Missing TURNSTILE_SECRET_KEY")
  }

  const body = new URLSearchParams({
    secret,
    response: params.token,
  })

  if (params.ip !== "unknown") {
    body.set("remoteip", params.ip)
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    }
  )

  if (!response.ok) {
    return { success: false, errorCodes: ["siteverify_request_failed"] }
  }

  const payload = (await response.json()) as {
    success?: boolean
    "error-codes"?: string[]
  }

  return {
    success: Boolean(payload.success),
    errorCodes: payload["error-codes"] ?? [],
  }
}
