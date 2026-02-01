const express = require('express')
const { listRpgGames } = require('../services/igdbService')
const { getGameById } = require('../services/igdbService')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10)
    const games = await listRpgGames({ limit })
    res.json(games)
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: 'Failed to fetch RPG games', details: err.message })
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

module.exports = router
