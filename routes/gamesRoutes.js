const express = require('express')
const { countRpgGames, listRpgGames } = require('../services/igdbService')
const { getGameById } = require('../services/igdbService')
const { searchGames } = require('../services/igdbService')
const { listSpotlightGames } = require('../services/igdbService')
const { getRandomRpgGame } = require('../services/igdbService')
const { translateGame } = require('../services/translationService')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10)
    const offset = Number(req.query.offset || 0)
    const tag = String(req.query.tag || '')
    const platform = String(req.query.platform || '')
    const platformId = Number(req.query.platformId || 0)
    const companyId = Number(req.query.companyId || 0)
    const companyRole = String(req.query.companyRole || '')
    const releaseYear = Number(req.query.releaseYear || 0)
    const sort = String(req.query.sort || 'release_desc')

    const games = await listRpgGames({
      limit,
      offset,
      tag,
      platform,
      platformId,
      companyId,
      companyRole,
      releaseYear,
      sort,
    })
    res.json(games)
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: 'Failed to fetch RPG games', details: err.message })
  }
})

router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '')
    const limit = Number(req.query.limit || 10)
    const offset = Number(req.query.offset || 0)

    const games = await searchGames({ q, limit, offset })
    res.json(games)
  } catch (err) {
    console.error(err.message)
    res.status(err.status || 500).json({ error: 'Failed to search games', details: err.message })
  }
})

router.get('/count', async (req, res) => {
  try {
    const total = await countRpgGames({
      q: String(req.query.q || ''),
      tag: String(req.query.tag || ''),
      platform: String(req.query.platform || ''),
      platformId: Number(req.query.platformId || 0),
      companyId: Number(req.query.companyId || 0),
      companyRole: String(req.query.companyRole || ''),
      releaseYear: Number(req.query.releaseYear || 0),
    })

    res.json({ total })
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: 'Failed to count RPG games', details: err.message })
  }
})

router.get('/spotlight', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 6)
    const mode = String(req.query.mode || 'recent')

    const games = await listSpotlightGames({ limit, mode })
    res.json(games)
  } catch (err) {
    console.error(err.message)
    res.status(err.status || 500).json({ error: 'Failed to fetch spotlight games', details: err.message })
  }
})

router.get('/random', async (_req, res) => {
  try {
    const game = await getRandomRpgGame()

    if (!game) return res.status(404).json({ error: 'Random RPG not found' })

    res.json(game)
  } catch (err) {
    console.error(err.message)
    res.status(err.status || 500).json({ error: 'Failed to fetch random RPG', details: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const game = await getGameById(req.params.id)

    if (!game) return res.status(404).json({ error: 'Game not found' })

    res.json(game)
  } catch (err) {
    console.error(err.message)
    res.status(err.status || 500).json({ error: 'Failed to fetch game', details: err.message })
  }
})

router.post('/:id/translation', async (req, res) => {
  try {
    const translation = await translateGame(req.params.id)
    res.json(translation)
  } catch (err) {
    console.error(err.message)
    res.status(err.status || 500).json({ error: 'Failed to translate game', details: err.message })
  }
})

module.exports = router
