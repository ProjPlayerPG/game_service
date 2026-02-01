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

module.exports = { listRpgGames, getGameById }
