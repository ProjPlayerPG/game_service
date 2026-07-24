const { referenceSimilarity } = require('./chatSimilarity')
const { normalizeGameTitle } = require('./chatRequestUtils')

function relationNames(values, limit = 12) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((relation) => relation?.name)
        .filter(Boolean),
    ),
  ).slice(0, limit)
}

function involvedCompanyNames(values, role) {
  return relationNames(
    (Array.isArray(values) ? values : [])
      .filter((entry) => entry?.[role])
      .map((entry) => entry.company),
  )
}

function isLikelyUnofficialGame(game) {
  const searchableText = normalizeGameTitle(
    [
      game.name,
      game.summary,
      game.storyline,
      ...(game.keywords?.map((keyword) => keyword.name) || []),
      ...(game.collections?.map((collection) => collection.name) || []),
    ].join(' '),
  )

  return [
    /\bfan ?game\b/,
    /\bfan ?made\b/,
    /\bfan ?created\b/,
    /\bfan ?project\b/,
    /\brom ?hack\b/,
    /\bhack ?rom\b/,
    /\bunofficial\b/,
  ].some((pattern) => pattern.test(searchableText))
}

function simplifyGame(game, referenceProfile) {
  const franchises = relationNames([game.franchise, ...(game.franchises || [])])
  const collections = relationNames([game.collection, ...(game.collections || [])])
  const simplified = {
    id: game.id,
    name: game.name,
    summary: game.summary || '',
    storyline: game.storyline || '',
    genres: relationNames(game.genres),
    themes: relationNames(game.themes),
    keywords: relationNames(game.keywords),
    game_modes: relationNames(game.game_modes),
    player_perspectives: relationNames(game.player_perspectives),
    platforms: relationNames(game.platforms),
    franchises,
    collections,
    developers: involvedCompanyNames(game.involved_companies, 'developer'),
    publishers: involvedCompanyNames(game.involved_companies, 'publisher'),
    release_year: game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : null,
  }

  if (referenceProfile?.hasReferenceGames) {
    const similarity = referenceSimilarity(game, referenceProfile)
    simplified.similarity_with_reference = {
      listed_as_similar_by_igdb: similarity.isSimilarGame,
      shared_secondary_genres: relationNames(game.genres).filter((name, index) =>
        similarity.sharedGenreIndexes.has(index),
      ),
      shared_themes: relationNames(game.themes).filter((name, index) =>
        similarity.sharedThemeIndexes.has(index),
      ),
      shared_keywords: relationNames(game.keywords).filter((name, index) =>
        similarity.sharedKeywordIndexes.has(index),
      ),
      shared_game_modes: relationNames(game.game_modes).filter((name, index) =>
        similarity.sharedGameModeIndexes.has(index),
      ),
    }
  }

  return simplified
}

function uniqueById(games) {
  const seen = new Set()
  const unique = []

  for (const game of games) {
    if (!seen.has(game.id)) {
      seen.add(game.id)
      unique.push(game)
    }
  }

  return unique
}

function normalizeRecommendation(recommendation, candidatesById) {
  const candidate = candidatesById.get(Number(recommendation.id))
  if (!candidate || !recommendation.reason) return null

  return {
    id: candidate.id,
    name: candidate.name,
    reason: String(recommendation.reason).trim(),
  }
}

module.exports = {
  isLikelyUnofficialGame,
  normalizeRecommendation,
  simplifyGame,
  uniqueById,
}
