const blockedGameCategories = new Set([
  1, // DLC/addon
  2, // expansion
  3, // bundle
  4, // standalone expansion
  5, // mod
  6, // episode
  7, // season
  12, // fork
  13, // pack
  14, // update
])

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

module.exports = {
  filterPrimaryGames,
  hasAdultsOnlyRating,
  isAdultOrEroticGame,
  isPrimaryGame,
  normalizeSafetyText,
}
