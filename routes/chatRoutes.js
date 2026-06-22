const express = require('express')
const { recommendGames } = require('../services/chatService')

const router = express.Router()

router.post('/recommendations', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const result = await recommendGames({ message: req.body?.message, token })
    res.json(result)
  } catch (err) {
    console.error(err.message)
    res.status(err.status || 500).json({ error: 'Failed to recommend RPG games', details: err.message })
  }
})

module.exports = router
