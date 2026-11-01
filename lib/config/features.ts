export const SMS_FEATURE_ENABLED = process.env.SMS_FEATURE_ENABLED === "true"

export const SMS_DISABLED_MESSAGE =
  "SMS functionality is currently disabled. Set SMS_FEATURE_ENABLED=true and configure Semaphore credentials to enable it again."

export const SMS_DISABLED_RESPONSE = {
  success: false,
  disabled: true,
  message: SMS_DISABLED_MESSAGE,
} as const
