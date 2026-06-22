const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

let cachedToken = null
let tokenExpiresAt = 0 // timestamp ms
const queryCache = new Map()
const cacheTtlMs = Number(process.env.IGDB_CACHE_TTL_MS || 10 * 60 * 1000)
const maxCacheEntries = Number(process.env.IGDB_CACHE_MAX_ENTRIES || 200)

function cacheKey(endpoint, query) {
  return `${endpoint}:${query.replace(/\s+/g, ' ').trim()}`
}

function getCachedQuery(key) {
  const entry = queryCache.get(key)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    queryCache.delete(key)
    return null
  }

  return entry.data
}

function setCachedQuery(key, data) {
  if (queryCache.size >= maxCacheEntries) {
    const oldestKey = queryCache.keys().next().value
    if (oldestKey) queryCache.delete(oldestKey)
  }

  queryCache.set(key, {
    data,
    expiresAt: Date.now() + cacheTtlMs,
  })
}

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
  const key = cacheKey(endpoint, query)
  const cached = getCachedQuery(key)

  if (cached) {
    console.log('[IGDB CACHE HIT]', endpoint)
    return cached
  }

  console.log('[IGDB CACHE MISS]', endpoint, '\n' + query)

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

  const data = await resp.json()
  setCachedQuery(key, data)

  return data
}


module.exports = { igdbQuery }
