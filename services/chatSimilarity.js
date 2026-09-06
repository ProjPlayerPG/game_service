const {
  normalizeForTerms,
  normalizeGameTitle,
  referenceTitleMatchesGameName,
} = require('./chatRequestUtils')

const genericSimilarityKeywords = new Set([
  'achievements',
  'action adventure',
  'anime',
  'digital distribution',
  'fantasy',
  'free to play',
  'human',
  'jrpg',
  'magic',
  'medieval',
  'movie games',
  'multiple endings',
  'prequel',
  'science fiction',
  'sequel',
  'turn based',
])

const distinctiveKeywordPatterns = [
  /monster|creature|breeding|taming|collect/,
  /grid|tactical|permadeath|recruit|party system|class change/,
  /relationship|romance|social link/,
  /politic|faction|warfare/,
  /choice|morality/,
  /craft|farming|deck|dungeon|rogue|souls|open world|school|time travel/,
]

const monsterCollectionKeywordIds = [
  7313, // monster capturing
  18218, // monster catching
  25792, // monster tamer
  42226, // monster raising
  44126, // monster collector
  53899, // monster taming
  38723, // creature collector
  55970, // creature collection
]

function relationIds(values) {
  const relations = Array.isArray(values) ? values : [values]

  return relations
    .map((relation) => Number(relation?.id ?? relation))
    .filter((id) => Number.isInteger(id) && id > 0)
}

function gameFranchiseIds(game) {
  return relationIds([game.franchise, ...(game.franchises || [])])
}

function gameCollectionIds(game) {
  return relationIds(game.collections || [])
}

function relationIdSet(games, field, { excludedIds = [] } = {}) {
  const excluded = new Set(excludedIds)

  return new Set(
    games
      .flatMap((game) => relationIds(game[field] || []))
      .filter((id) => !excluded.has(id)),
  )
}

function distinctiveKeywordIds(games, limit = 16) {
  const keywordsById = new Map()
  const rawKeywordIds = new Set()

  for (const keyword of (Array.isArray(games) ? games : []).flatMap(
    (game) => game.keywords || [],
  )) {
    const id = Number(keyword?.id ?? keyword)
    const name = normalizeGameTitle(keyword?.name)

    if (Number.isInteger(id) && id > 0) {
      rawKeywordIds.add(id)
    }

    if (
      Number.isInteger(id) &&
      id > 0 &&
      name &&
      !genericSimilarityKeywords.has(name) &&
      !name.includes('adapted to') &&
      !name.includes('virtual console') &&
      !name.includes('nintendo switch online') &&
      !name.includes('playstation network') &&
      !name.includes('xbox live')
    ) {
      keywordsById.set(id, {
        id,
        score: distinctiveKeywordPatterns.some((pattern) => pattern.test(name)) ? 1 : 0,
      })
    }
  }

  const keywords = Array.from(keywordsById.values()).sort((a, b) => b.score - a.score)
  const signaledKeywords = keywords.filter((keyword) => keyword.score > 0)
  const selectedKeywords = signaledKeywords.length ? signaledKeywords : keywords
  const hasMonsterCollectionConcept =
    (rawKeywordIds.has(98) && rawKeywordIds.has(511)) ||
    monsterCollectionKeywordIds.some((id) => rawKeywordIds.has(id))
  const selectedIds = selectedKeywords.map((keyword) => keyword.id)

  if (hasMonsterCollectionConcept) {
    return Array.from(
      new Set([
        ...monsterCollectionKeywordIds,
        ...selectedIds.filter((id) => id !== 98 && id !== 511),
      ]),
    ).slice(0, limit)
  }

  return selectedIds.slice(0, limit)
}

function buildReferenceExclusion(referenceTitles, games) {
  const titles = Array.isArray(referenceTitles) ? referenceTitles.filter(Boolean) : []
  const matchedGames = (Array.isArray(games) ? games : []).filter((game) =>
    titles.some((title) => referenceTitleMatchesGameName(title, game.name)),
  )
  const referenceGames = []

  for (const title of titles) {
    const matchingGames = matchedGames
      .filter((game) => referenceTitleMatchesGameName(title, game.name))
      .sort((a, b) => {
        const exactDifference =
          Number(normalizeGameTitle(b.name) === normalizeGameTitle(title)) -
          Number(normalizeGameTitle(a.name) === normalizeGameTitle(title))

        return exactDifference || (b.total_rating_count || 0) - (a.total_rating_count || 0)
      })
    const exactGames = matchingGames.filter(
      (game) => normalizeGameTitle(game.name) === normalizeGameTitle(title),
    )
    const selectedGames = exactGames.length ? exactGames.slice(0, 1) : matchingGames.slice(0, 1)

    for (const game of selectedGames) {
      if (!referenceGames.some((referenceGame) => referenceGame.id === game.id)) {
        referenceGames.push(game)
      }
    }
  }

  return {
    titles,
    matchedGames,
    referenceGames,
    gameIds: new Set(
      matchedGames.flatMap((game) => relationIds([game.id, game.version_parent])),
    ),
    franchiseIds: new Set(matchedGames.flatMap(gameFranchiseIds)),
    collectionIds: new Set(matchedGames.flatMap(gameCollectionIds)),
  }
}

function hasSharedRelation(gameIds, excludedIds) {
  return gameIds.some((id) => excludedIds.has(id))
}

function isExcludedReferenceGame(game, exclusion) {
  if (!exclusion?.titles?.length) return false
  if (exclusion.gameIds.has(Number(game.id))) return true
  if (hasSharedRelation(relationIds(game.version_parent), exclusion.gameIds)) return true
  if (hasSharedRelation(gameFranchiseIds(game), exclusion.franchiseIds)) return true
  if (hasSharedRelation(gameCollectionIds(game), exclusion.collectionIds)) return true

  return exclusion.titles.some((title) => referenceTitleMatchesGameName(title, game.name))
}

function buildReferenceProfile(referenceGames) {
  const games = Array.isArray(referenceGames) ? referenceGames.filter(Boolean) : []
  const keywordIds = distinctiveKeywordIds(games)

  return {
    hasReferenceGames: games.length > 0,
    referenceGameIds: new Set(games.flatMap((game) => relationIds(game.id))),
    similarGameIds: new Set(games.flatMap((game) => relationIds(game.similar_games || []))),
    secondaryGenreIds: relationIdSet(games, 'genres', { excludedIds: [12] }),
    themeIds: relationIdSet(games, 'themes'),
    keywordIds: new Set(keywordIds),
    allowsKeywordOnlySimilarity: keywordIds.some((id) =>
      monsterCollectionKeywordIds.includes(id),
    ),
    gameModeIds: relationIdSet(games, 'game_modes'),
    perspectiveIds: relationIdSet(games, 'player_perspectives'),
  }
}

function sharedRelationIndexes(values, referenceIds) {
  const sharedIndexes = new Set()

  for (const [index, relation] of (Array.isArray(values) ? values : []).entries()) {
    if (referenceIds.has(Number(relation?.id ?? relation))) {
      sharedIndexes.add(index)
    }
  }

  return sharedIndexes
}

function referenceSimilarity(game, profile) {
  const sharedGenreIndexes = sharedRelationIndexes(game.genres, profile.secondaryGenreIds)
  const sharedThemeIndexes = sharedRelationIndexes(game.themes, profile.themeIds)
  const sharedKeywordIndexes = sharedRelationIndexes(game.keywords, profile.keywordIds)
  const sharedGameModeIndexes = sharedRelationIndexes(game.game_modes, profile.gameModeIds)
  const sharedPerspectiveIndexes = sharedRelationIndexes(
    game.player_perspectives,
    profile.perspectiveIds,
  )
  const isSimilarGame = profile.similarGameIds.has(Number(game.id))
  const score =
    Number(isSimilarGame) * 4 +
    sharedGenreIndexes.size * 8 +
    sharedThemeIndexes.size * 2 +
    Math.min(sharedKeywordIndexes.size, 6) * 12 +
    sharedGameModeIndexes.size +
    sharedPerspectiveIndexes.size

  return {
    isSimilarGame,
    score,
    sharedGenreIndexes,
    sharedThemeIndexes,
    sharedKeywordIndexes,
    sharedGameModeIndexes,
    sharedPerspectiveIndexes,
  }
}

function hasReferenceSimilarity(game, profile) {
  if (!profile?.hasReferenceGames) return true

  const similarity = referenceSimilarity(game, profile)
  if (profile.allowsKeywordOnlySimilarity) {
    const requiredSharedGenres = Math.min(2, profile.secondaryGenreIds.size)

    return (
      similarity.sharedKeywordIndexes.size > 0 ||
      (requiredSharedGenres > 0 &&
        similarity.sharedGenreIndexes.size >= requiredSharedGenres)
    )
  }
  if (profile.secondaryGenreIds.size) return similarity.sharedGenreIndexes.size > 0

  return (
    similarity.isSimilarGame ||
    similarity.sharedThemeIndexes.size > 0 ||
    similarity.sharedKeywordIndexes.size > 0 ||
    similarity.sharedGameModeIndexes.size > 0
  )
}

function rankCandidates(games, message, { referenceProfile, preferenceProfile } = {}) {
  const normalizedMessage = normalizeForTerms(message)

  return [...games].sort((a, b) => {
    const aName = normalizeForTerms(a.name)
    const bName = normalizeForTerms(b.name)
    const aSummary = normalizeForTerms(a.summary)
    const bSummary = normalizeForTerms(b.summary)
    const aReferenceScore = referenceProfile?.hasReferenceGames
      ? referenceSimilarity(a, referenceProfile).score
      : 0
    const bReferenceScore = referenceProfile?.hasReferenceGames
      ? referenceSimilarity(b, referenceProfile).score
      : 0
    const aPreferenceScore = preferenceProfile?.hasReferenceGames
      ? Math.min(referenceSimilarity(a, preferenceProfile).score, 12) * 0.35
      : 0
    const bPreferenceScore = preferenceProfile?.hasReferenceGames
      ? Math.min(referenceSimilarity(b, preferenceProfile).score, 12) * 0.35
      : 0
    const aScore =
      aReferenceScore +
      aPreferenceScore +
      Number(normalizedMessage.includes(aName)) * 5 +
      Number(
        aName
          .split(/\s+/)
          .some((part) => part.length > 3 && normalizedMessage.includes(part)),
      ) *
        3 +
      Number(aSummary.includes('pokemon')) * Number(normalizedMessage.includes('pokemon')) * 3 +
      Math.log10(1 + (a.total_rating_count || 0)) * 0.2
    const bScore =
      bReferenceScore +
      bPreferenceScore +
      Number(normalizedMessage.includes(bName)) * 5 +
      Number(
        bName
          .split(/\s+/)
          .some((part) => part.length > 3 && normalizedMessage.includes(part)),
      ) *
        3 +
      Number(bSummary.includes('pokemon')) * Number(normalizedMessage.includes('pokemon')) * 3 +
      Math.log10(1 + (b.total_rating_count || 0)) * 0.2

    return bScore - aScore
  })
}

module.exports = {
  buildReferenceExclusion,
  buildReferenceProfile,
  distinctiveKeywordIds,
  hasReferenceSimilarity,
  isExcludedReferenceGame,
  rankCandidates,
  referenceSimilarity,
}
