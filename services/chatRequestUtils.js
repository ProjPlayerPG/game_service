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
  'ne',
  'pas',
  'sont',
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

const fanGameTermPattern = /(?:fan\s*games?|rom\s*hacks?|hack\s*roms?|mods?)/i
const referencePattern =
  /(?:comme|similaires?\s+(?:a|à|au|aux)|dans\s+le\s+style\s+(?:de|du|des)|alternatives?\s+(?:a|à|au|aux)|(?:qui\s+)?ressembl(?:e|ent)\s+(?:a|à|au|aux)|du\s+m[êe]me\s+genre\s+que|[àa]\s+la\s+mani[èe]re\s+(?:de|du|des)|proche\s+(?:de|du|des)|like|similar\s+to)\s+(.+?)(?=$|[,.!?;]|\s+(?:mais|avec|sans|sur|pour|qui)\b)/gi
const requestedFranchisePatterns = [
  /(?:s[ée]rie|saga|licence|franchise)\s+(.+?)(?=$|[,.!?;]|\s+(?:qui|que|dont|sans|avec|sur|pour|mais|officiels?|non|pas|comme|similaire)\b)/gi,
  /(?:jeux?|titres?|[ée]pisodes?|opus)\s+(?:officiels?\s+)?(?:de\s+(?:la\s+)?(?:s[ée]rie|saga|licence|franchise)\s+)?(?!comme\b|similaires?\b)(.+?)(?=$|[,.!?;]|\s+(?:qui|que|dont|sans|avec|sur|pour|mais|officiels?|non|pas|comme|similaire)\b)/gi,
]

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

function cleanRequestedFranchiseTitle(value) {
  return String(value || '')
    .trim()
    .replace(/^(?:de\s+la|de\s+l['’]|du|des|la|le|les)\s+/i, '')
    .replace(/^[\s"'«»“”]+|[\s"'«»“”]+$/g, '')
    .split(/\s+/)
    .slice(0, 5)
    .join(' ')
}

function extractRecommendationConstraints(message) {
  const normalized = normalizeForTerms(message)
  const fanGameMentioned = fanGameTermPattern.test(normalized)
  const fanGameExcluded =
    new RegExp(
      `\\b(?:sans|hors|eviter?|exclure|pas\\s+(?:(?:de|des|un|une)\\s+)?|non\\s+)${fanGameTermPattern.source}\\b`,
      'i',
    ).test(normalized) ||
    new RegExp(
      `\\bne\\b[^.!?]{0,40}\\bpas\\b[^.!?]{0,20}\\b${fanGameTermPattern.source}\\b`,
      'i',
    ).test(normalized)
  const officialMentioned = /\bofficiels?\b/.test(normalized)
  const officialExcluded =
    /\b(?:non\s+|pas\s+(?:(?:de|des|un|une)\s+)?)officiels?\b/.test(normalized)

  return {
    communityContentRequested: fanGameMentioned && !fanGameExcluded,
    excludeFanGames: fanGameMentioned && fanGameExcluded,
    officialOnly:
      (officialMentioned && !officialExcluded) || (fanGameMentioned && fanGameExcluded),
  }
}

function extractRequestedFranchiseTitles(message) {
  const titles = []
  const seen = new Set()
  const genericTitles = new Set([
    'action',
    'aventure',
    'officiel',
    'officiels',
    'recent',
    'recents',
    'role playing',
    'rpg',
    'tactique',
    'tactical rpg',
  ])

  for (const pattern of requestedFranchisePatterns) {
    for (const match of String(message || '').matchAll(pattern)) {
      const title = cleanRequestedFranchiseTitle(match[1])
      const normalizedTitle = normalizeGameTitle(title)

      if (
        normalizedTitle.length >= 2 &&
        !genericTitles.has(normalizedTitle) &&
        !seen.has(normalizedTitle)
      ) {
        seen.add(normalizedTitle)
        titles.push(title)
      }
    }
  }

  return titles.slice(0, 3)
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
  const normalizedTerms = new Set()
  const constraints = extractRecommendationConstraints(message)
  const referenceTitles = extractReferenceTitles(message)
  const referenceWords = new Set(
    referenceTitles.flatMap((title) => normalizeGameTitle(title).split(/\s+/)),
  )
  const words = normalized
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length >= 3 &&
        !stopWords.has(word) &&
        !referenceWords.has(word) &&
        !(constraints.excludeFanGames && fanGameTermPattern.test(word)),
    )

  function addTerm(term) {
    const normalizedTerm = normalizeGameTitle(term).replace(/\s+/g, '')
    if (!normalizedTerm || normalizedTerms.has(normalizedTerm)) return

    normalizedTerms.add(normalizedTerm)
    terms.add(term)
  }

  for (const referenceTitle of referenceTitles) {
    addTerm(referenceTitle)
  }

  if (normalized.includes('pokemon') && !referenceWords.has('pokemon')) {
    addTerm('Pokemon')
    addTerm('Pokemon RPG')
  }

  if (fanGameTermPattern.test(normalized) && !constraints.excludeFanGames) {
    addTerm('fan game')
  }

  if (
    normalized.includes('hack-rom') ||
    normalized.includes('hack rom') ||
    normalized.includes('rom hack')
  ) {
    addTerm('rom hack')
  }

  if (normalized.includes('tactical') || normalized.includes('tactique')) {
    addTerm('tactical RPG')
  }

  if (normalized.includes('tour par tour') || normalized.includes('turn based')) {
    addTerm('turn based RPG')
  }

  for (const word of words.slice(0, 6)) {
    addTerm(word)
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
  extractRecommendationConstraints,
  extractReferenceTitles,
  extractRequestedFranchiseTitles,
  extractSearchTerms,
  normalizeForTerms,
  normalizeGameTitle,
  referenceTitleMatchesGameName,
}
