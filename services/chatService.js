const { askMistral, extractJsonObject } = require('./mistralService')
const { listRecommendationCandidates, searchRecommendationCandidates } = require('./igdbService')
const { getFavoriteGameIds, getUserFromToken } = require('./supabaseRestService')

const blockedAdultTerms = [
  '18+',
  'adult content',
  'adult game',
  'adults only',
  'eroge',
  'erotic',
  'erotica',
  'erotique',
  'explicit sexual',
  'hentai',
  'lewd',
  'mature sexual',
  'nsfw',
  'nude',
  'nudity',
  'porn',
  'pornographic',
  'sexual content',
  'sexually explicit',
]

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

function hasAdultsOnlyRating(game) {
  return game.age_ratings?.some((rating) => Number(rating.rating) === 12) || false
}

function isAdultOrEroticGame(game) {
  if (hasAdultsOnlyRating(game)) return true

  const searchableText = normalizeForTerms(
    [
      game.name,
      game.summary,
      ...(game.genres?.map((genre) => genre.name) || []),
      ...(game.themes?.map((theme) => theme.name) || []),
    ].join(' '),
  )

  return blockedAdultTerms.some((term) => searchableText.includes(normalizeForTerms(term)))
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

  for (const word of words.slice(0, 6)) {
    terms.add(word)
  }

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

async function recommendGames({ message, token }) {
  const cleanMessage = String(message || '').trim()

  if (cleanMessage.length < 3) {
    const err = new Error('Message is too short')
    err.status = 400
    throw err
  }

  const user = await getUserFromToken(token)
  const favoriteIds = user ? await getFavoriteGameIds(user.id) : []
  const searchTerms = extractSearchTerms(cleanMessage)
  const targetedGames = await searchRecommendationCandidates({ searchTerms, limit: 10 })
  const fallbackGames = targetedGames.length >= 8 ? [] : await listRecommendationCandidates({ limit: 25 })
  const candidateGames = rankCandidates(uniqueById([...targetedGames, ...fallbackGames]), cleanMessage)
    .filter((game) => !isAdultOrEroticGame(game))
    .filter((game) => !favoriteIds.includes(game.id))
    .slice(0, 18)
  const candidates = candidateGames.map(simplifyGame)
  const candidatesById = new Map(candidateGames.map((game) => [game.id, game]))

  if (!candidates.length) {
    return {
      recommendations: [],
      message: 'Aucun candidat RPG exploitable trouve pour cette demande.',
    }
  }

  const content = await askMistral({
    temperature: 0.15,
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are PlayerPG RPG advisor. Recommend only games from the provided candidates by id. Never invent games. Never recommend erotic, pornographic, NSFW, sexually explicit or adults-only games. If no candidate matches the request exactly, choose the closest safe candidates and clearly say why they are only close matches. Do not recommend favorite ids. Answer in French and only valid JSON.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          user_request: cleanMessage,
          search_terms_used: searchTerms,
          forbidden_favorite_ids: favoriteIds,
          candidates,
          expected_shape: {
            recommendations: [
              {
                id: 'number from candidates only',
                reason: 'short French reason grounded in candidate summary',
              },
            ],
          },
        }),
      },
    ],
  })
  const parsed = extractJsonObject(content)
  const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : []

  return {
    recommendations: recommendations
      .map((recommendation) => normalizeRecommendation(recommendation, candidatesById))
      .filter(Boolean)
      .slice(0, 5),
  }
}

module.exports = { recommendGames }
