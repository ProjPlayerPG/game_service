const { askMistral, extractJsonObject } = require('./mistralService')
const { listRecommendationCandidates, searchRecommendationCandidates } = require('./igdbService')
const { getFavoriteGameIds, getUserFromToken } = require('./supabaseRestService')
const { isAdultOrEroticGame } = require('./gameSafety')
const {
  extractSearchTerms,
  normalizeRecommendation,
  rankCandidates,
  simplifyGame,
  uniqueById,
} = require('./chatUtils')

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
