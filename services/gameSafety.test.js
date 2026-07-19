const {
  filterPrimaryGames,
  hasAdultsOnlyRating,
  isAdultOrEroticGame,
  isPrimaryGame,
  normalizeSafetyText,
} = require('./gameSafety')

describe('sécurité du catalogue', () => {
  it('autorise un jeu principal et les catégories absentes', () => {
    expect(isPrimaryGame({ category: 0 })).toBe(true)
    expect(isPrimaryGame({})).toBe(true)
  })

  it.each([1, 2, 3, 4, 5, 6, 7, 12, 13, 14])('bloque la catégorie IGDB %s', (category) => {
    expect(isPrimaryGame({ category })).toBe(false)
  })

  it('détecte la classification Adults Only', () => {
    const game = { age_ratings: [{ rating: 10 }, { rating: 12 }] }
    expect(hasAdultsOnlyRating(game)).toBe(true)
    expect(isAdultOrEroticGame(game)).toBe(true)
  })

  it('détecte les termes interdits sans dépendre des accents ou de la casse', () => {
    expect(isAdultOrEroticGame({ name: 'Aventure ÉROTIQUE' })).toBe(true)
    expect(isAdultOrEroticGame({ summary: 'Contains explicit sexual content' })).toBe(true)
  })

  it('conserve un RPG sûr', () => {
    expect(
      isAdultOrEroticGame({
        name: 'Dragon Quest',
        summary: 'A heroic fantasy adventure.',
        genres: [{ name: 'Role-playing' }],
      }),
    ).toBe(false)
  })

  it('filtre en une seule passe les extensions et les contenus adultes', () => {
    const safeGame = { id: 1, name: 'Safe RPG', category: 0 }
    const games = [
      safeGame,
      { id: 2, name: 'Expansion', category: 2 },
      { id: 3, name: 'NSFW RPG', category: 0 },
    ]

    expect(filterPrimaryGames(games)).toEqual([safeGame])
    expect(filterPrimaryGames(null)).toEqual([])
  })

  it('normalise le texte utilisé par les filtres', () => {
    expect(normalizeSafetyText('  Érotique  ')).toBe('  erotique  ')
  })
})
