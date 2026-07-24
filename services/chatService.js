const { askMistral, extractJsonObject } = require('./mistralService')
const {
  listRecommendationCandidates,
  listRequestedLicenseCandidates,
  listSimilarRecommendationCandidates,
  searchRecommendationCandidates,
} = require('./igdbService')
const { getFavoriteGameIds, getUserFromToken } = require('./supabaseRestService')
const {
  isAdultOrEroticGame,
  isLikelyUnofficialGame,
  isRpgGame,
  prioritizeOfficialGames,
} = require('./gameSafety')
const {
  extractRecommendationConstraints,
  extractReferenceTitles,
  extractRequestedFranchiseTitles,
  extractSearchTerms,
} = require('./chatRequestUtils')
const {
  buildReferenceProfile,
  buildReferenceExclusion,
  hasReferenceSimilarity,
  isExcludedReferenceGame,
  rankCandidates,
} = require('./chatSimilarity')
const {
  normalizeRecommendation,
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
  const referenceTitles = extractReferenceTitles(cleanMessage)
  const constraints = extractRecommendationConstraints(cleanMessage)
  const requestedFranchiseTitles = extractRequestedFranchiseTitles(cleanMessage).filter(
    (title) => !referenceTitles.some(
      (referenceTitle) =>
        referenceTitle.toLocaleLowerCase('fr-FR') === title.toLocaleLowerCase('fr-FR'),
    ),
  )
  const searchTerms = extractSearchTerms(cleanMessage)
  const targetedGames = await searchRecommendationCandidates({ searchTerms, limit: 10 })
  const requestedLicenseGames = await listRequestedLicenseCandidates({
    requestedTitles: requestedFranchiseTitles,
    seedGames: targetedGames,
    limit: 40,
  })
  const referenceExclusion = buildReferenceExclusion(referenceTitles, targetedGames)
  const referenceGames = referenceExclusion.referenceGames
  const referenceProfile = buildReferenceProfile(referenceGames)
  const similarGames = referenceGames.length
    ? await listSimilarRecommendationCandidates({ referenceGames, limit: 60 })
    : []
  const eligibleTargetedGames = targetedGames.filter(
    (game) => !isExcludedReferenceGame(game, referenceExclusion),
  )
  const fallbackGames =
    referenceGames.length || requestedLicenseGames.length || eligibleTargetedGames.length >= 8
      ? []
      : await listRecommendationCandidates({ limit: 25 })
  const requestedLicenseGameIds = new Set(requestedLicenseGames.map((game) => game.id))
  const eligibleCandidateGames = rankCandidates(
    uniqueById([
      ...requestedLicenseGames,
      ...targetedGames,
      ...similarGames,
      ...fallbackGames,
    ]),
    cleanMessage,
    { referenceProfile },
  )
    .filter((game) => !isExcludedReferenceGame(game, referenceExclusion))
    .filter((game) => hasReferenceSimilarity(game, referenceProfile))
    .filter(isRpgGame)
    .filter((game) => !constraints.excludeFanGames || !isLikelyUnofficialGame(game))
    .filter(
      (game) =>
        !constraints.officialOnly ||
        !requestedLicenseGameIds.size ||
        requestedLicenseGameIds.has(game.id),
    )
    .filter((game) => !isAdultOrEroticGame(game))
    .filter((game) => !favoriteIds.includes(game.id))
  const candidateGames = (
    constraints.communityContentRequested
      ? eligibleCandidateGames
      : prioritizeOfficialGames(eligibleCandidateGames)
  ).slice(0, 18)
  const candidates = candidateGames.map((game) => simplifyGame(game, referenceProfile))
  const candidatesById = new Map(candidateGames.map((game) => [game.id, game]))
  const referenceContext = referenceGames.map((game) => simplifyGame(game))

  if (!candidates.length) {
    return {
      recommendations: [],
      message: 'Aucun candidat RPG exploitable trouvé pour cette demande.',
    }
  }

  const content = await askMistral({
    temperature: 0.15,
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are PlayerPG RPG advisor. Recommend only games from the provided candidates by id. Never invent games. Respect all explicit constraints. Prefer candidates whose provenance is official over unverified or community content unless constraints.communityContentRequested is true. When constraints.officialOnly is true, never recommend a fan game, unofficial game, ROM hack or mod. Games listed as references are comparison context only: never recommend a reference game, another edition of it, or a game from the same franchise or collection. Prioritize concrete similarities shown in similarity_with_reference and the factual summaries or storylines. Popularity is not evidence of similarity. Never claim a gameplay mechanic unless it appears in the provided data. When at least 3 valid candidates satisfy the request, return between 3 and 5 distinct recommendations. Return fewer only when fewer valid candidates exist. Never recommend erotic, pornographic, NSFW, sexually explicit or adults-only games. Do not recommend favorite ids. Answer in French and only valid JSON.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          user_request: cleanMessage,
          search_terms_used: searchTerms,
          requested_franchises: requestedFranchiseTitles,
          constraints,
          reference_games: referenceContext,
          forbidden_reference_titles: referenceTitles,
          forbidden_reference_game_ids: Array.from(referenceExclusion.gameIds),
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
