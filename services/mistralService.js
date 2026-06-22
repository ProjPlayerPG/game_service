const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'

async function askMistral({ messages, temperature = 0.2, responseFormat } = {}) {
  const apiKey = process.env.MISTRAL_API_KEY

  if (!apiKey) {
    const err = new Error('MISTRAL_API_KEY is not configured')
    err.status = 503
    throw err
  }

  const body = {
    model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
    messages,
    temperature,
  }

  if (responseFormat) {
    body.response_format = responseFormat
  }

  const response = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    const err = new Error(`Mistral error: ${response.status} ${text}`)
    err.status = response.status
    throw err
  }

  const data = await response.json()
  return data?.choices?.[0]?.message?.content || ''
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
