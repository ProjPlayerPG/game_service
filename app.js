const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
require('dotenv').config()

const gamesRoutes = require('./routes/gamesRoutes')

const app = express()
const port = process.env.PORT || 3000

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => res.send('Game service OK'))

app.use('/api/games', gamesRoutes)

app.listen(port, () => {
  console.log(`Game service running on port ${port}`)
})
