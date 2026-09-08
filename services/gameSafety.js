const blockedGameCategories = new Set([
  1, // DLC/addon
  2, // expansion
  3, // bundle
  4, // standalone expansion
  6, // episode
  7, // season
  12, // fork
  13, // pack
  14, // update
])

const RPG_GENRE_ID = 12
const gameProvenanceOrder = {
  official: 0,
  unverified: 1,
  community: 2,
}

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

function normalizeSafetyText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isPrimaryGame(game) {
  if (Number(game?.version_parent?.id ?? game?.version_parent) > 0) return false
  if (game.category === undefined || game.category === null) return true

  return !blockedGameCategories.has(Number(game.category))
}

function hasAdultsOnlyRating(game) {
  return game.age_ratings?.some((rating) => Number(rating.rating) === 12) || false
}

function isAdultOrEroticGame(game) {
  if (hasAdultsOnlyRating(game)) return true

  const searchableText = normalizeSafetyText(
    [
      game.name,
      game.summary,
      ...(game.genres?.map((genre) => genre.name) || []),
      ...(game.themes?.map((theme) => theme.name) || []),
    ].join(' '),
  )

  return blockedAdultTerms.some((term) => searchableText.includes(normalizeSafetyText(term)))
}

function filterPrimaryGames(games) {
  return Array.isArray(games)
    ? games.filter((game) => isPrimaryGame(game) && !isAdultOrEroticGame(game))
    : []
}

function isRpgGame(game) {
  return (
    Array.isArray(game?.genres) &&
    game.genres.some((genre) => Number(genre?.id ?? genre) === RPG_GENRE_ID)
  )
}

function filterRpgGames(games) {
  return filterPrimaryGames(games).filter(isRpgGame)
}

function isLikelyUnofficialGame(game) {
  if (Number(game?.category) === 5) return true

  const searchableText = normalizeSafetyText(
    [
      game?.name,
      game?.summary,
      game?.storyline,
      ...(game?.keywords?.map((keyword) => keyword.name) || []),
      ...(game?.collections?.map((collection) => collection.name) || []),
    ].join(' '),
  )
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  return [
    /\bbootleg\b/,
    /\bfan game\b/,
    /\bfangame\b/,
    /\bfan made\b/,
    /\bfan created\b/,
    /\bfan expansion\b/,
    /\bfan project\b/,
    /\bfanmade\b/,
    /\bgame jam\b/,
    /\bmod of\b/,
    /\bmods for\b/,
    /\bmod which\b/,
    /\bpokecommunity\b/,
    /\brandomizer\b/,
    /\bremake by\b/,
    /\bremake of\b.*\bby\b/,
    /\brelic castle\b/,
    /\brom hack\b/,
    /\bromhack\b/,
    /\bthis hack\b/,
    /\btitle hack\b/,
    /\btotal conversion\b/,
    /\bunofficial\b/,
  ].some((pattern) => pattern.test(searchableText))
}

function hasStructuredOfficialMetadata(game) {
  const relations = [
    game?.franchise,
    game?.collection,
    ...(game?.franchises || []),
    ...(game?.collections || []),
  ]
  const hasFranchiseOrCollection = relations.some(
    (relation) => Number(relation?.id ?? relation) > 0,
  )
  return hasFranchiseOrCollection
}

function classifyGameProvenance(game) {
  if (isLikelyUnofficialGame(game)) return 'community'
  if (hasStructuredOfficialMetadata(game)) return 'official'

  return 'unverified'
}

function withGameProvenance(game) {
  return {
    ...game,
    provenance: classifyGameProvenance(game),
  }
}

function prioritizeOfficialGames(games) {
  return (Array.isArray(games) ? games : [])
    .map((game, index) => ({
      game,
      index,
      rank: gameProvenanceOrder[classifyGameProvenance(game)],
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ game }) => game)
}

function filterGamesByContent(games, content = '') {
  const safeGames = Array.isArray(games) ? games : []

  if (String(content).trim().toLowerCase() === 'community') {
    return safeGames.filter((game) => classifyGameProvenance(game) === 'community')
  }

  return safeGames
}

function editorialQualityRank(game, nowTimestamp, upcomingHorizonTimestamp) {
  if (classifyGameProvenance(game) === 'community') return 3

  const releaseTimestamp = Number(game?.first_release_date || 0)
  const hasEditorialContent = Boolean(
    releaseTimestamp > 0 && game?.cover?.url && String(game?.summary || '').trim(),
  )

  if (hasEditorialContent && releaseTimestamp <= nowTimestamp) return 0
  if (hasEditorialContent && releaseTimestamp <= upcomingHorizonTimestamp) return 1
  return 2
}

function prioritizeEditorialGames(
  games,
  {
    nowTimestamp = Math.floor(Date.now() / 1000),
    upcomingHorizonTimestamp = nowTimestamp + 18 * 31 * 24 * 60 * 60,
  } = {},
) {
  return (Array.isArray(games) ? games : [])
    .map((game, index) => ({
      game,
      index,
      rank: editorialQualityRank(game, nowTimestamp, upcomingHorizonTimestamp),
    }))
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank

      const ratingDifference =
        Number(right.game?.total_rating_count || 0) -
        Number(left.game?.total_rating_count || 0)
      if (ratingDifference) return ratingDifference

      const releaseDifference =
        Number(right.game?.first_release_date || 0) -
        Number(left.game?.first_release_date || 0)
      return releaseDifference || left.index - right.index
    })
    .map(({ game }) => game)
}

module.exports = {
  classifyGameProvenance,
  editorialQualityRank,
  filterGamesByContent,
  filterPrimaryGames,
  filterRpgGames,
  hasAdultsOnlyRating,
  hasStructuredOfficialMetadata,
  isAdultOrEroticGame,
  isLikelyUnofficialGame,
  isPrimaryGame,
  isRpgGame,
  normalizeSafetyText,
  prioritizeOfficialGames,
  prioritizeEditorialGames,
  RPG_GENRE_ID,
  withGameProvenance,
}
