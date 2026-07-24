const {
  classifyGameProvenance,
  filterPrimaryGames,
  filterRpgGames,
  hasAdultsOnlyRating,
  isAdultOrEroticGame,
  isPrimaryGame,
  isRpgGame,
  normalizeSafetyText,
  prioritizeOfficialGames,
  withGameProvenance,
} = require('./gameSafety')

describe('sécurité du catalogue', () => {
  it('autorise un jeu principal et les catégories absentes', () => {
    expect(isPrimaryGame({ category: 0 })).toBe(true)
    expect(isPrimaryGame({})).toBe(true)
    expect(isPrimaryGame({ category: 0, version_parent: 42 })).toBe(false)
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

  it('reconnaît un RPG par son identifiant IGDB, y compris lorsqu’il est hybride', () => {
    expect(isRpgGame({ genres: [{ id: 12, name: 'Role-playing (RPG)' }] })).toBe(true)
    expect(
      isRpgGame({
        genres: [
          { id: 12, name: 'Role-playing (RPG)' },
          { id: 14, name: 'Sport' },
        ],
      }),
    ).toBe(true)
    expect(isRpgGame({ genres: [{ id: 14, name: 'Sport' }] })).toBe(false)
    expect(isRpgGame({ genres: [{ id: 31, name: 'Adventure' }] })).toBe(false)
    expect(isRpgGame({})).toBe(false)
  })

  it('écarte les jeux non-RPG même lorsqu’ils sont des jeux principaux sûrs', () => {
    const hybridRpg = {
      id: 1,
      name: 'Mario Golf',
      category: 0,
      genres: [{ id: 12 }, { id: 14 }],
    }
    const games = [
      hybridRpg,
      {
        id: 2,
        name: 'Mario & Sonic at the Olympic Winter Games',
        category: 0,
        genres: [{ id: 14 }],
      },
      {
        id: 3,
        name: 'The Legend of Zelda: Oracle of Ages',
        category: 0,
        genres: [{ id: 9 }, { id: 31 }],
      },
    ]

    expect(filterRpgGames(games)).toEqual([hybridRpg])
    expect(filterRpgGames(null)).toEqual([])
  })

  it('distingue les jeux officiels, communautaires et non confirmés', () => {
    const officialGame = {
      id: 1,
      name: 'Pokémon White Version 2',
      franchises: [{ id: 60, name: 'Pokémon' }],
      involved_companies: [
        {
          publisher: true,
          company: { id: 70, name: 'Nintendo' },
        },
      ],
    }
    const communityGame = {
      id: 2,
      name: 'Zelda Randomizer',
      summary: 'A ROM hack and fan project.',
      involved_companies: [
        {
          publisher: true,
          company: { id: 999, name: 'Community Team' },
        },
      ],
    }

    expect(classifyGameProvenance(officialGame)).toBe('official')
    expect(classifyGameProvenance(communityGame)).toBe('community')
    expect(classifyGameProvenance({ id: 3, name: 'Jeu ancien' })).toBe('unverified')
    expect(withGameProvenance(officialGame)).toEqual({
      ...officialGame,
      provenance: 'official',
    })
  })

  it('place les jeux officiels avant les statuts inconnus et communautaires', () => {
    const communityGame = { id: 1, summary: 'A fan-made ROM hack.' }
    const unknownGame = { id: 2, name: 'Unknown RPG' }
    const officialGame = {
      id: 3,
      franchises: [{ id: 60, name: 'Pokémon' }],
    }

    expect(
      prioritizeOfficialGames([communityGame, unknownGame, officialGame]).map(
        (game) => game.id,
      ),
    ).toEqual([3, 2, 1])
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
