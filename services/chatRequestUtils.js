const stopWords = new Set([
  'je',
  'veux',
  'des',
  'de',
  'du',
  'un',
  'une',
  'le',
  'la',
  'les',
  'avec',
  'pour',
  'qui',
  'que',
  'sur',
  'dans',
  'rpg',
  'jeu',
  'jeux',
  'cherche',
  'aimerais',
  'recommande',
  'recommandes',
  'style',
  'genre',
  'comme',
  'similaire',
  'similaires',
  'alternative',
  'alternatives',
  'proche',
  'meme',
  'maniere',
  'serie',
  'saga',
  'licence',
])

const referencePattern =
  /(?:comme|similaires?\s+(?:a|à|au|aux)|dans\s+le\s+style\s+(?:de|du|des)|alternatives?\s+(?:a|à|au|aux)|(?:qui\s+)?ressembl(?:e|ent)\s+(?:a|à|au|aux)|du\s+m[êe]me\s+genre\s+que|[àa]\s+la\s+mani[èe]re\s+(?:de|du|des)|proche\s+(?:de|du|des)|like|similar\s+to)\s+(.+?)(?=$|[,.!?;]|\s+(?:mais|avec|sans|sur|pour|qui)\b)/gi

function normalizeForTerms(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function normalizeGameTitle(value) {
  return normalizeForTerms(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function cleanReferenceTitle(value) {
  return String(value || '')
    .trim()
    .replace(/^(?:dans\s+|le\s+jeu\s+|la\s+(?:s[ée]rie|saga|licence)\s+)/i, '')
    .replace(/^[\s"'«»“”]+|[\s"'«»“”]+$/g, '')
    .split(/\s+/)
    .slice(0, 8)
    .join(' ')
}

function extractReferenceTitles(message) {
  const references = []
  const seen = new Set()

  for (const match of String(message || '').matchAll(referencePattern)) {
    const title = cleanReferenceTitle(match[1])
    const normalizedTitle = normalizeGameTitle(title)

    if (normalizedTitle.length >= 2 && !seen.has(normalizedTitle)) {
      seen.add(normalizedTitle)
      references.push(title)
    }
  }

  return references
}

function extractSearchTerms(message) {
  const normalized = normalizeForTerms(message)
  const terms = new Set()
  const referenceTitles = extractReferenceTitles(message)
  const referenceWords = new Set(
    referenceTitles.flatMap((title) => normalizeGameTitle(title).split(/\s+/)),
  )
  const words = normalized
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) => word.length >= 3 && !stopWords.has(word) && !referenceWords.has(word),
    )

  for (const referenceTitle of referenceTitles) {
    terms.add(referenceTitle)
  }

  if (normalized.includes('pokemon') && !referenceWords.has('pokemon')) {
    terms.add('Pokemon')
    terms.add('Pokemon RPG')
  }

  if (normalized.includes('fangame') || normalized.includes('fan game')) {
    terms.add('fan game')
  }

  if (
    normalized.includes('hack-rom') ||
    normalized.includes('hack rom') ||
    normalized.includes('rom hack')
  ) {
    terms.add('rom hack')
  }

  if (normalized.includes('tactical') || normalized.includes('tactique')) {
    terms.add('tactical RPG')
  }

  if (normalized.includes('tour par tour') || normalized.includes('turn based')) {
    terms.add('turn based RPG')
  }

  for (const word of words.slice(0, 6)) {
    terms.add(word)
  }

  return Array.from(terms).slice(0, 5)
}

function referenceTitleMatchesGameName(referenceTitle, gameName) {
  const reference = normalizeGameTitle(referenceTitle)
  const name = normalizeGameTitle(gameName)

  if (!reference || !name) return false

  return (
    name === reference ||
    name.startsWith(`${reference} `) ||
    reference.startsWith(`${name} `)
  )
}

module.exports = {
  extractReferenceTitles,
  extractSearchTerms,
  normalizeForTerms,
  normalizeGameTitle,
  referenceTitleMatchesGameName,
}
