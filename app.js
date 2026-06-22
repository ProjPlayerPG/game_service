const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '.env') })

const gamesRoutes = require('./routes/gamesRoutes')
const chatRoutes = require('./routes/chatRoutes')

const app = express()
const port = process.env.PORT || 3000

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => res.send('Game service OK'))

app.use('/api/games', gamesRoutes)
app.use('/api/chat', chatRoutes)

app.listen(port, () => {
  console.log(`Game service running on port ${port}`)
})
