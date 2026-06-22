function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    const err = new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
    err.status = 503
    throw err
  }

  return {
    url: url.endsWith('/') ? url.slice(0, -1) : url,
    serviceRoleKey,
  }
}

function serviceHeaders(extra = {}) {
  const { serviceRoleKey } = supabaseConfig()

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function getTranslation(gameId) {
  const { url } = supabaseConfig()
  const response = await fetch(
    `${url}/rest/v1/game_translations?igdb_game_id=eq.${gameId}&select=igdb_game_id,summary_fr,storyline_fr,updated_at&limit=1`,
    {
      headers: serviceHeaders(),
    },
  )

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Supabase translation read error: ${response.status} ${text}`)
  }

  const data = await response.json()
  return data?.[0] || null
}

async function saveTranslation({ gameId, summaryFr, storylineFr }) {
  const { url } = supabaseConfig()
  const response = await fetch(`${url}/rest/v1/game_translations?on_conflict=igdb_game_id`, {
    method: 'POST',
    headers: serviceHeaders({
      Prefer: 'resolution=merge-duplicates,return=representation',
    }),
    body: JSON.stringify({
      igdb_game_id: gameId,
      summary_fr: summaryFr || null,
      storyline_fr: storylineFr || null,
      updated_at: new Date().toISOString(),
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Supabase translation write error: ${response.status} ${text}`)
  }

  const data = await response.json()
  return data?.[0] || null
}

async function getUserFromToken(token) {
  if (!token) return null

  const { url } = supabaseConfig()
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: supabaseConfig().serviceRoleKey,
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null

  const user = await response.json()
  return user?.id ? user : null
}

async function getFavoriteGameIds(userId) {
  if (!userId) return []

  const { url } = supabaseConfig()
  const response = await fetch(
    `${url}/rest/v1/favorites?user_id=eq.${userId}&select=igdb_game_id`,
    {
      headers: serviceHeaders(),
    },
  )

  if (!response.ok) return []

  const data = await response.json()
  return data.map((favorite) => Number(favorite.igdb_game_id)).filter(Boolean)
}

module.exports = { getTranslation, saveTranslation, getUserFromToken, getFavoriteGameIds }
