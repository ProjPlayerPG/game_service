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

module.exports = {
  escapeSearchTerm,
  normalizeFilter,
  sortClause,
  todayUtcTimestamp,
  yearRange,
}
