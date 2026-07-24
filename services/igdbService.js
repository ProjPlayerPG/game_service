const { igdbQuery } = require('../api/api')
const { filterPrimaryGames } = require('./gameSafety')
const { distinctiveKeywordIds } = require('./chatSimilarity')
const { normalizeGameTitle } = require('./chatRequestUtils')
const {
  escapeSearchTerm,
  normalizeFilter,
  paginationWindow,
  sortClause,
  todayUtcTimestamp,
  yearRange,
} = require('./igdbQueryUtils')

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

const recommendationFields =
  'id,name,category,summary,storyline,first_release_date,genres.name,platforms.name,themes.name,keywords.name,game_modes.name,player_perspectives.name,age_ratings.rating,total_rating,total_rating_count,hypes,franchise.name,franchises.name,collection.name,collections.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,version_parent,similar_games'

function relationIds(values) {
  const relations = Array.isArray(values) ? values : [values]

  return relations
    .map((relation) => Number(relation?.id ?? relation))
    .filter((id) => Number.isInteger(id) && id > 0)
}

async function listRpgGames({ limit = 10, offset = 0, tag = '', platform = '', releaseYear = 0, sort = 'release_desc' } = {}) {
  const { safeLimit, safeOffset, fetchLimit } = paginationWindow(limit, offset)
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
    fields id,name,slug,category,summary,first_release_date,cover.url,genres.name,platforms.name,themes.name,age_ratings.rating;
    where ${whereParts.join(' & ')};
    sort ${sortClause(sort)};
    limit ${fetchLimit};
  `

  return filterPrimaryGames(await igdbQuery('/games', query)).slice(
    safeOffset,
    safeOffset + safeLimit,
  )
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
    fields id,name,slug,category,summary,first_release_date,cover.url,genres.name,themes.name,age_ratings.rating,hypes,total_rating,total_rating_count;
    where ${whereParts.join(' & ')};
    sort ${sort};
    limit ${Math.min(safeLimit * 3, 60)};
  `

  return filterPrimaryGames(await igdbQuery('/games', query)).slice(0, safeLimit)
}

async function getRandomRpgGame() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const offset = Math.floor(Math.random() * 3000)
    const query = `
      fields id,name,category,summary,themes.name,age_ratings.rating;
      where genres = (12) & cover != null & summary != null;
      limit 5;
      offset ${offset};
    `
    const data = filterPrimaryGames(await igdbQuery('/games', query))

    if (data?.[0]?.id) {
      return data[0]
    }
  }

  const fallbackQuery = `
    fields id,name,category,summary,themes.name,age_ratings.rating;
    where genres = (12) & cover != null;
    sort first_release_date desc;
    limit 10;
  `
  const fallback = filterPrimaryGames(await igdbQuery('/games', fallbackQuery))
  return fallback?.[0] || null
}

async function listRecommendationCandidates({ limit = 30 } = {}) {
  const safeLimit = Math.min(Number(limit || 30), 50)
  const query = `
    fields ${recommendationFields};
    where genres = (12) & summary != null;
    sort total_rating_count desc;
    limit ${Math.min(safeLimit * 2, 100)};
  `

  return filterPrimaryGames(await igdbQuery('/games', query)).slice(0, safeLimit)
}

async function searchRecommendationCandidates({ searchTerms = [], limit = 12 } = {}) {
  const safeLimit = Math.min(Number(limit || 12), 20)
  const results = []
  const seenIds = new Set()

  for (const term of searchTerms.map(escapeSearchTerm).filter(Boolean).slice(0, 5)) {
    const query = `
      fields ${recommendationFields};
      search "${term}";
      where genres = (12) & summary != null;
      limit ${safeLimit};
    `
    const games = filterPrimaryGames(await igdbQuery('/games', query))

    for (const game of games) {
      if (!seenIds.has(game.id)) {
        seenIds.add(game.id)
        results.push(game)
      }
    }
  }

  return results
}

function namedRelationIds(games, fields, requestedTitles) {
  const normalizedTitles = requestedTitles.map(normalizeGameTitle).filter(Boolean)
  const ids = new Set()

  for (const game of games) {
    for (const field of fields) {
      const relations = Array.isArray(game[field]) ? game[field] : [game[field]]

      for (const relation of relations) {
        const relationName = normalizeGameTitle(relation?.name)
        const relationId = Number(relation?.id)
        const matchesTitle = normalizedTitles.some(
          (title) =>
            relationName === title ||
            relationName.startsWith(`${title} `),
        )

        if (matchesTitle && Number.isInteger(relationId) && relationId > 0) {
          ids.add(relationId)
        }
      }
    }
  }

  return Array.from(ids)
}

async function listRequestedLicenseCandidates({
  requestedTitles = [],
  seedGames = [],
  limit = 40,
} = {}) {
  if (!requestedTitles.length || !seedGames.length) return []

  const safeLimit = Math.min(Math.max(Number(limit || 40), 10), 60)
  const franchiseIds = namedRelationIds(
    seedGames,
    ['franchise', 'franchises'],
    requestedTitles,
  ).slice(0, 12)
  const collectionIds = namedRelationIds(
    seedGames,
    ['collection', 'collections'],
    requestedTitles,
  ).slice(0, 12)
  const queries = []

  if (franchiseIds.length) {
    queries.push(`
      query games "requested_franchises" {
        fields ${recommendationFields};
        where genres = (12) & franchises = (${franchiseIds.join(',')}) & summary != null;
        sort total_rating_count desc;
        limit ${safeLimit};
      };
    `)
  }

  if (collectionIds.length) {
    queries.push(`
      query games "requested_collections" {
        fields ${recommendationFields};
        where genres = (12) & collections = (${collectionIds.join(',')}) & summary != null;
        sort total_rating_count desc;
        limit ${safeLimit};
      };
    `)
  }

  if (!queries.length) return []

  const batches = await igdbQuery('/multiquery', queries.join('\n'))
  const candidates = Array.isArray(batches)
    ? batches.flatMap((batch) => (Array.isArray(batch.result) ? batch.result : []))
    : []

  return filterPrimaryGames(candidates)
}

async function listSimilarRecommendationCandidates({ referenceGames = [], limit = 60 } = {}) {
  const games = Array.isArray(referenceGames) ? referenceGames.filter(Boolean) : []
  if (!games.length) return []

  const safeLimit = Math.min(Math.max(Number(limit || 60), 10), 100)
  const similarGameIds = Array.from(
    new Set(games.flatMap((game) => relationIds(game.similar_games || []))),
  ).slice(0, 100)
  const secondaryGenreIds = Array.from(
    new Set(games.flatMap((game) => relationIds(game.genres || [])).filter((id) => id !== 12)),
  ).slice(0, 12)
  const themeIds = Array.from(
    new Set(games.flatMap((game) => relationIds(game.themes || []))),
  ).slice(0, 10)
  const keywordIds = distinctiveKeywordIds(games, 16)
  const queries = []

  if (similarGameIds.length) {
    queries.push(`
      query games "igdb_similar_games" {
        fields ${recommendationFields};
        where genres = (12) & summary != null & id = (${similarGameIds.join(',')});
        limit ${safeLimit};
      };
    `)
  }

  if (secondaryGenreIds.length) {
    queries.push(`
      query games "shared_genres" {
        fields ${recommendationFields};
        where genres = (12) & genres = (${secondaryGenreIds.join(',')}) & summary != null;
        sort total_rating_count desc;
        limit ${safeLimit};
      };
    `)
  }

  if (keywordIds.length) {
    queries.push(`
      query games "shared_keywords" {
        fields ${recommendationFields};
        where genres = (12) & keywords = (${keywordIds.join(',')}) & summary != null;
        sort total_rating_count desc;
        limit ${safeLimit};
      };
    `)
  }

  if (themeIds.length) {
    queries.push(`
      query games "shared_themes" {
        fields ${recommendationFields};
        where genres = (12) & themes = (${themeIds.join(',')}) & summary != null;
        sort total_rating_count desc;
        limit ${safeLimit};
      };
    `)
  }

  if (!queries.length) return []

  const batches = await igdbQuery('/multiquery', queries.join('\n'))
  const candidates = Array.isArray(batches)
    ? batches.flatMap((batch) => (Array.isArray(batch.result) ? batch.result : []))
    : []

  return filterPrimaryGames(candidates)
}

async function getGameById(id) {
  const gameId = Number(id)
  if (!Number.isInteger(gameId) || gameId <= 0) {
    const err = new Error('Invalid game id')
    err.status = 400
    throw err
  }

  const query = `
    fields id,name,slug,category,first_release_date,cover.url,genres.name,platforms.name,summary,storyline,parent_game.id,parent_game.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,dlcs.id,dlcs.name,dlcs.cover.url,expansions.id,expansions.name,expansions.cover.url;
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

  const { safeLimit, safeOffset, fetchLimit } = paginationWindow(limit, offset, {
    maxLimit: 20,
  })
  const safeTerm = escapeSearchTerm(term)

  const query = `
    fields id,name,category,summary,first_release_date,cover.url,genres.name,platforms.name,themes.name,age_ratings.rating;
    search "${safeTerm}";
    limit ${fetchLimit};
  `

  return filterPrimaryGames(await igdbQuery('/games', query)).slice(
    safeOffset,
    safeOffset + safeLimit,
  )
}

module.exports = {
  listRpgGames,
  listSpotlightGames,
  getRandomRpgGame,
  listRecommendationCandidates,
  listRequestedLicenseCandidates,
  listSimilarRecommendationCandidates,
  searchRecommendationCandidates,
  getGameById,
  searchGames,
}
