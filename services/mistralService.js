const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'
const MAX_RATE_LIMIT_ATTEMPTS = 2
const MAX_RETRY_DELAY_MS = 10_000

function retryDelayMs(response, attempt) {
  const retryAfter = response.headers.get('retry-after')

  if (retryAfter) {
    const seconds = Number(retryAfter)

    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS)
    }

    const retryDate = Date.parse(retryAfter)
    if (Number.isFinite(retryDate)) {
      return Math.min(Math.max(retryDate - Date.now(), 0), MAX_RETRY_DELAY_MS)
    }
  }

  return Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS)
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

function providerErrorMessage(status, responseText) {
  if (status === 429) {
    return 'Le guide reçoit trop de demandes pour le moment. Attends quelques instants avant de réessayer.'
  }

  try {
    const payload = JSON.parse(responseText)
    return payload?.message
      ? `Mistral error: ${status} ${payload.message}`
      : `Mistral error: ${status}`
  } catch {
    return `Mistral error: ${status}`
  }
}

async function askMistral({ messages, temperature = 0.2, responseFormat, maxTokens } = {}) {
  const apiKey = process.env.MISTRAL_API_KEY

  if (!apiKey) {
    const err = new Error('MISTRAL_API_KEY is not configured')
    err.status = 503
    throw err
  }

  const body = {
    model: process.env.MISTRAL_MODEL || 'ministral-14b-2512',
    messages,
    temperature,
  }

  if (responseFormat) {
    body.response_format = responseFormat
  }

  if (Number.isInteger(maxTokens) && maxTokens > 0) {
    body.max_tokens = maxTokens
  }

  for (let attempt = 0; attempt < MAX_RATE_LIMIT_ATTEMPTS; attempt += 1) {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (response.ok) {
      const data = await response.json()
      return data?.choices?.[0]?.message?.content || ''
    }

    const text = await response.text().catch(() => '')
    const canRetry = response.status === 429 && attempt < MAX_RATE_LIMIT_ATTEMPTS - 1

    if (canRetry) {
      await wait(retryDelayMs(response, attempt))
      continue
    }

    const err = new Error(providerErrorMessage(response.status, text))
    err.status = response.status
    err.provider = 'mistral'
    throw err
  }

  throw new Error('Mistral request failed')
}

function extractJsonObject(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Mistral did not return a JSON object')
  }

  return JSON.parse(text.slice(start, end + 1))
}

module.exports = { askMistral, extractJsonObject }
