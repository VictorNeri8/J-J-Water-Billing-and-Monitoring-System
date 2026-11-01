const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

export function isCustomerArchiveExpired(archiveExpiresAt?: string | null) {
  if (!archiveExpiresAt) {
    return true
  }

  return new Date(archiveExpiresAt).getTime() <= Date.now()
}

export function getCustomerArchiveDaysRemaining(archiveExpiresAt?: string | null) {
  if (!archiveExpiresAt) {
    return 0
  }

  return Math.max(
    0,
    Math.ceil((new Date(archiveExpiresAt).getTime() - Date.now()) / DAY_IN_MILLISECONDS),
  )
}
