function normalizeFilter(value) {
  return String(value || '').trim().toLowerCase()
}

function sortClause(value) {
  switch (normalizeFilter(value)) {
    case 'name_asc':
      return 'name asc'
    case 'name_desc':
      return 'name desc'
    case 'release_asc':
      return 'first_release_date asc'
    case 'release_desc':
    default:
      return 'first_release_date desc'
  }
}

function yearRange(year) {
  const value = Number(year || 0)
  if (!Number.isInteger(value) || value < 1970 || value > 2100) return null

  const start = Math.floor(Date.UTC(value, 0, 1) / 1000)
  const end = Math.floor(Date.UTC(value + 1, 0, 1) / 1000)

  return { start, end }
}

function todayUtcTimestamp() {
  const now = new Date()
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000)
}

function escapeSearchTerm(term) {
  return String(term || '').trim().replace(/"/g, '\\"')
}

function paginationWindow(
  limit = 10,
  offset = 0,
  { maxLimit = 50, maxPool = 500, multiplier = 3 } = {},
) {
  const parsedLimit = Number(limit)
  const parsedOffset = Number(offset)
  const safeLimit = Number.isInteger(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, maxLimit)
    : Math.min(10, maxLimit)
  const safeOffset = Number.isInteger(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0
  const fetchLimit = Math.min(
    Math.max((safeOffset + safeLimit) * multiplier, safeLimit),
    maxPool,
  )

  return { safeLimit, safeOffset, fetchLimit }
}

module.exports = {
  escapeSearchTerm,
  normalizeFilter,
  paginationWindow,
  sortClause,
  todayUtcTimestamp,
  yearRange,
}
