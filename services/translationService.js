const { askMistral, extractJsonObject } = require('./mistralService')
const { getGameById } = require('./igdbService')
const { getTranslation, saveTranslation } = require('./supabaseRestService')

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

async function translateGame(gameId) {
  const game = await getGameById(gameId)

  if (!game) {
    const err = new Error('Game not found')
    err.status = 404
    throw err
  }

  const cachedTranslation = await getTranslation(game.id)
  if (hasTranslation(cachedTranslation, game)) {
    return {
      cached: true,
      igdb_game_id: game.id,
      summary_fr: cachedTranslation.summary_fr,
      storyline_fr: cachedTranslation.storyline_fr,
    }
  }

  if (!game.summary && !game.storyline) {
    return {
      cached: false,
      igdb_game_id: game.id,
      summary_fr: null,
      storyline_fr: null,
    }
  }

  const content = await askMistral({
    temperature: 0.1,
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a professional English to French translator. Translate RPG game summaries and storylines into natural French. Keep proper names, game titles, places, studios, platforms and acronyms unchanged. Do not add information. Never return the English text unchanged except for proper names. Return only valid JSON.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          task: 'Translate summary and storyline to French.',
          expected_shape: {
            summary_fr: 'string|null',
            storyline_fr: 'string|null',
          },
          game_name: game.name,
          summary: game.summary || null,
          storyline: game.storyline || null,
        }),
      },
    ],
  })

  const parsed = extractJsonObject(content)
  const summaryFr = isDifferentFromOriginal(parsed.summary_fr, game.summary) ? parsed.summary_fr : null
  const storylineFr = isDifferentFromOriginal(parsed.storyline_fr, game.storyline)
    ? parsed.storyline_fr
    : null

  if ((game.summary && !summaryFr) || (game.storyline && !storylineFr)) {
    const err = new Error('Mistral did not return a usable French translation')
    err.status = 502
    throw err
  }

  const saved = await saveTranslation({
    gameId: game.id,
    summaryFr,
    storylineFr,
  })

  return {
    cached: false,
    igdb_game_id: game.id,
    summary_fr: saved?.summary_fr || summaryFr,
    storyline_fr: saved?.storyline_fr || storylineFr,
  }
}

module.exports = { translateGame }
