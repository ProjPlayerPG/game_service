require('dotenv').config()

let cachedToken = null
let tokenExpiresAt = 0 // timestamp ms

async function getAppAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken
  }

  const url = new URL('https://id.twitch.tv/oauth2/token')
  url.searchParams.set('client_id', process.env.TWITCH_CLIENT_ID)
  url.searchParams.set('client_secret', process.env.TWITCH_CLIENT_SECRET)
  url.searchParams.set('grant_type', 'client_credentials')

  const resp = await fetch(url, { method: 'POST' })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Twitch token error: ${resp.status} ${text}`)
  }

  const data = await resp.json()
  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + data.expires_in * 1000

  return cachedToken
}

async function igdbQuery(endpoint, query) {
  console.log('[IGDB QUERY]', endpoint, '\n' + query)

  const token = await getAppAccessToken() 

  const resp = await fetch(`https://api.igdb.com/v4${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`, 
      'Accept': 'application/json',       
      'Content-Type': 'text/plain',
    },
    body: query,
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`IGDB error: ${resp.status} ${text}`)
  }

  return resp.json()
}


module.exports = { igdbQuery }
