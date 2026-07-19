const stopWords = new Set([
  'je',
  'veux',
  'des',
  'de',
  'du',
  'un',
  'une',
  'le',
  'la',
  'les',
  'avec',
  'pour',
  'qui',
  'que',
  'sur',
  'dans',
  'rpg',
  'jeu',
  'jeux',
  'cherche',
  'aimerais',
  'recommande',
  'recommandes',
  'style',
  'genre',
])

function simplifyGame(game) {
  return {
    id: game.id,
    name: game.name,
    summary: game.summary || '',
    genres: game.genres?.map((genre) => genre.name) || [],
    themes: game.themes?.map((theme) => theme.name) || [],
    platforms: game.platforms?.map((platform) => platform.name) || [],
    release_year: game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : null,
  }
}

function normalizeForTerms(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function extractSearchTerms(message) {
  const normalized = normalizeForTerms(message)
  const terms = new Set()
  const words = normalized
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !stopWords.has(word))

  if (normalized.includes('pokemon')) {
    terms.add('Pokemon')
    terms.add('Pokemon RPG')
  }

  if (normalized.includes('fangame') || normalized.includes('fan game')) {
    terms.add('fan game')
  }

  if (normalized.includes('hack-rom') || normalized.includes('hack rom') || normalized.includes('rom hack')) {
    terms.add('rom hack')
  }

  if (normalized.includes('tactical') || normalized.includes('tactique')) {
    terms.add('tactical RPG')
  }

  if (normalized.includes('tour par tour') || normalized.includes('turn based')) {
    terms.add('turn based RPG')
  }

  for (const word of words.slice(0, 6)) {
    terms.add(word)
  }

  return Array.from(terms).slice(0, 5)
}

function rankCandidates(games, message) {
  const normalizedMessage = normalizeForTerms(message)

  return [...games].sort((a, b) => {
    const aName = normalizeForTerms(a.name)
    const bName = normalizeForTerms(b.name)
    const aSummary = normalizeForTerms(a.summary)
    const bSummary = normalizeForTerms(b.summary)
    const aScore =
      Number(normalizedMessage.includes(aName)) * 5 +
      Number(aName.split(/\s+/).some((part) => part.length > 3 && normalizedMessage.includes(part))) * 3 +
      Number(aSummary.includes('pokemon')) * Number(normalizedMessage.includes('pokemon')) * 3 +
      (a.total_rating_count || 0) / 1000
    const bScore =
      Number(normalizedMessage.includes(bName)) * 5 +
      Number(bName.split(/\s+/).some((part) => part.length > 3 && normalizedMessage.includes(part))) * 3 +
      Number(bSummary.includes('pokemon')) * Number(normalizedMessage.includes('pokemon')) * 3 +
      (b.total_rating_count || 0) / 1000

    return bScore - aScore
  })
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
  extractSearchTerms,
  normalizeForTerms,
  normalizeRecommendation,
  rankCandidates,
  simplifyGame,
  uniqueById,
}
