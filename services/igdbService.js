const { igdbQuery } = require('../api/api')

const genreFilters = {
  rpg: 12,
  'role-playing (rpg)': 12,
  simulator: 13,
  sport: 14,
  strategy: 15,
  adventure: 31,
  indie: 32,
  tactical: 24,
  fighting: 4,
}

const platformFilters = {
  pc: 6,
  'playstation 5': 167,
  ps5: 167,
  'xbox series x|s': 169,
  'xbox series': 169,
  'nintendo switch': 130,
  switch: 130,
}

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

async function listRpgGames({ limit = 10, offset = 0, tag = '', platform = '', releaseYear = 0, sort = 'release_desc' } = {}) {
  const safeLimit = Math.min(Number(limit || 10), 50)
  const safeOffset = Math.max(Number(offset || 0), 0)
  const tagId = genreFilters[normalizeFilter(tag)]
  const platformId = platformFilters[normalizeFilter(platform)]
  const releaseRange = yearRange(releaseYear)
  const whereParts = ['genres = (12)']

  if (tagId && tagId !== 12) {
    whereParts.push(`genres = (${tagId})`)
  }

  if (platformId) {
    whereParts.push(`platforms = (${platformId})`)
  }

  if (releaseRange) {
    whereParts.push(`first_release_date >= ${releaseRange.start}`)
    whereParts.push(`first_release_date < ${releaseRange.end}`)
  }

  const query = `
    fields id,name,slug,first_release_date,cover.url,genres.name,platforms.name;
    where ${whereParts.join(' & ')};
    sort ${sortClause(sort)};
    limit ${safeLimit};
    offset ${safeOffset};
  `

  return igdbQuery('/games', query)
}

async function listSpotlightGames({ limit = 6, mode = 'recent' } = {}) {
  const safeLimit = Math.min(Number(limit || 6), 12)
  const today = todayUtcTimestamp()
  const selectedMode = normalizeFilter(mode)
  const whereParts = ['genres = (12)']
  let sort = 'first_release_date desc'

  if (selectedMode === 'upcoming') {
    whereParts.push(`first_release_date >= ${today}`)
    sort = 'first_release_date asc'
  } else if (selectedMode === 'trending') {
    whereParts.push('hypes > 0')
    sort = 'hypes desc'
  } else {
    whereParts.push(`first_release_date < ${today}`)
  }

  const query = `
    fields id,name,slug,summary,first_release_date,cover.url,genres.name,hypes,total_rating,total_rating_count;
    where ${whereParts.join(' & ')};
    sort ${sort};
    limit ${safeLimit};
  `

  return igdbQuery('/games', query)
}

async function getGameById(id) {
  const gameId = Number(id)
  if (!Number.isInteger(gameId) || gameId <= 0) {
    const err = new Error('Invalid game id')
    err.status = 400
    throw err
  }

  const query = `
    fields id,name,slug,first_release_date,cover.url,genres.name,platforms.name,summary;
    where id = ${gameId};
    limit 1;
  `

  const data = await igdbQuery('/games', query)
  return data?.[0] || null
}


/**
 * Recherche IGDB (tous jeux) pour autocomplete
 * GET /api/games/search?q=zelda&limit=10&offset=0
 */
async function searchGames({ q, limit = 10, offset = 0 } = {}) {
  const term = String(q || '').trim()

  // On renvoie un tableau vide si query trop courte (évite spam IGDB)
  if (term.length < 2) return []

  const safeLimit = Math.min(Number(limit || 10), 20)
  const safeOffset = Math.max(Number(offset || 0), 0)

  // échappe les guillemets pour éviter de casser la requête IGDB
  const safeTerm = term.replace(/"/g, '\\"')

  const query = `
    fields id,name,cover.url;
    search "${safeTerm}";
    limit ${safeLimit};
    offset ${safeOffset};
  `

  return igdbQuery('/games', query)
}

module.exports = { listRpgGames, listSpotlightGames, getGameById, searchGames }
