const { igdbQuery } = require('../api/api')

async function listRpgGames({ limit = 10 } = {}) {
  const safeLimit = Math.min(Number(limit || 10), 50)

  const query = `
    fields id,name,slug,first_release_date,cover.url,genres.name;
    where genres = (12);
    limit ${safeLimit};
  `

  return igdbQuery('/games', query)
}

async function getGameById(id) {
  const gameId = Number(id)
  if (!Number.isInteger(gameId) || gameId <= 0) {
    const err = new Error('Invalid game id')
    err.status = 400
    throw err
  }

  const query = `
    fields id,name,slug,first_release_date,cover.url,genres.name,summary;
    where id = ${gameId};
    limit 1;
  `

  const data = await igdbQuery('/games', query)
  return data?.[0] || null
}


/**
 * Recherche IGDB (tous jeux) pour autocomplete
 * GET /api/games/search?q=zelda&limit=10&offset=0
 */
async function searchGames({ q, limit = 10, offset = 0 } = {}) {
  const term = String(q || '').trim()

  // On renvoie un tableau vide si query trop courte (évite spam IGDB)
  if (term.length < 2) return []

  const safeLimit = Math.min(Number(limit || 10), 20)
  const safeOffset = Math.max(Number(offset || 0), 0)

  // échappe les guillemets pour éviter de casser la requête IGDB
  const safeTerm = term.replace(/"/g, '\\"')

  const query = `
    fields id,name,cover.url;
    search "${safeTerm}";
    limit ${safeLimit};
    offset ${safeOffset};
  `

  return igdbQuery('/games', query)
}

module.exports = { listRpgGames, getGameById, searchGames }
