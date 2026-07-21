const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '.env') })

const gamesRoutes = require('./routes/gamesRoutes')
const chatRoutes = require('./routes/chatRoutes')

const app = express()
const port = process.env.PORT || 3000
const allowedOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('Origin not allowed by CORS'))
  },
}))
app.use(express.json())

app.get('/', (req, res) => res.send('Game service OK'))
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }))

app.use('/api/games', gamesRoutes)
app.use('/api/chat', chatRoutes)

app.listen(port, () => {
  console.log(`Game service running on port ${port}`)
})
