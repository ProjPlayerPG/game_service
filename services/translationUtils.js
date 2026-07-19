function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function isDifferentFromOriginal(translated, original) {
  if (!original) return true
  if (!translated) return false

  return normalizeText(translated) !== normalizeText(original)
}

function hasTranslation(translation, game) {
  const needsSummary = Boolean(game.summary)
  const needsStoryline = Boolean(game.storyline)

  return (
    translation &&
    (!needsSummary || isDifferentFromOriginal(translation.summary_fr, game.summary)) &&
    (!needsStoryline || isDifferentFromOriginal(translation.storyline_fr, game.storyline))
  )
}

module.exports = {
  hasTranslation,
  isDifferentFromOriginal,
  normalizeText,
}
