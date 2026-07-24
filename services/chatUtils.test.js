const {
  normalizeRecommendation,
  simplifyGame,
  uniqueById,
} = require('./chatUtils')
const { isLikelyUnofficialGame } = require('./gameSafety')
const { buildReferenceProfile } = require('./chatSimilarity')

describe('formatage des recommandations', () => {
  it('déduplique les candidats en conservant leur premier ordre', () => {
    const first = { id: 1, name: 'Premier' }

    expect(uniqueById([first, { id: 1, name: 'Doublon' }, { id: 2, name: 'Second' }])).toEqual([
      first,
      { id: 2, name: 'Second' },
    ])
  })

  it('simplifie les données envoyées à Mistral', () => {
    expect(
      simplifyGame({
        id: 4,
        name: 'Chrono Trigger',
        summary: 'Voyage temporel',
        genres: [{ name: 'RPG' }],
        themes: [{ name: 'Fantasy' }],
        platforms: [{ name: 'SNES' }],
        first_release_date: Date.UTC(1995, 2, 11) / 1000,
      }),
    ).toEqual({
      id: 4,
      name: 'Chrono Trigger',
      summary: 'Voyage temporel',
      storyline: '',
      genres: ['RPG'],
      themes: ['Fantasy'],
      keywords: [],
      game_modes: [],
      player_perspectives: [],
      platforms: ['SNES'],
      franchises: [],
      collections: [],
      developers: [],
      publishers: [],
      provenance: 'unverified',
      release_year: 1995,
    })
  })

  it('transmet les informations permettant de vérifier le caractère officiel', () => {
    expect(
      simplifyGame({
        id: 8353,
        name: 'Pokémon White Version 2',
        franchises: [{ id: 60, name: 'Pokémon' }],
        collections: [{ id: 314, name: 'Pokémon' }],
        involved_companies: [
          {
            developer: true,
            publisher: false,
            company: { id: 1617, name: 'Game Freak' },
          },
          {
            developer: false,
            publisher: true,
            company: { id: 70, name: 'Nintendo' },
          },
        ],
      }),
    ).toMatchObject({
      franchises: ['Pokémon'],
      collections: ['Pokémon'],
      developers: ['Game Freak'],
      publishers: ['Nintendo'],
      provenance: 'official',
    })
  })

  it('détecte les fangames et ROM hacks déclarés dans les données', () => {
    expect(
      isLikelyUnofficialGame({
        name: 'Pokémon Example',
        summary: 'An unofficial fan-made monster catching game.',
      }),
    ).toBe(true)
    expect(
      isLikelyUnofficialGame({
        name: 'Pokémon White Version 2',
        summary: 'The official sequel developed by Game Freak.',
      }),
    ).toBe(false)
  })

  it('ajoute uniquement les similitudes factuelles avec le jeu de référence', () => {
    const referenceProfile = buildReferenceProfile([
      {
        id: 1,
        name: 'Fire Emblem',
        genres: [
          { id: 12, name: 'Role-playing (RPG)' },
          { id: 15, name: 'Strategy' },
        ],
        themes: [{ id: 17, name: 'Fantasy' }],
        keywords: [{ id: 100, name: 'Grid-based movement' }],
        game_modes: [{ id: 1, name: 'Single player' }],
        similar_games: [2],
      },
    ])

    expect(
      simplifyGame(
        {
          id: 2,
          name: 'Tactics Ogre',
          genres: [
            { id: 12, name: 'Role-playing (RPG)' },
            { id: 15, name: 'Strategy' },
          ],
          themes: [{ id: 17, name: 'Fantasy' }],
          keywords: [{ id: 100, name: 'Grid-based movement' }],
          game_modes: [{ id: 1, name: 'Single player' }],
        },
        referenceProfile,
      ).similarity_with_reference,
    ).toEqual({
      listed_as_similar_by_igdb: true,
      shared_secondary_genres: ['Strategy'],
      shared_themes: ['Fantasy'],
      shared_keywords: ['Grid-based movement'],
      shared_game_modes: ['Single player'],
    })
  })

  it('n’accepte que les recommandations correspondant aux candidats', () => {
    const candidates = new Map([[7, { id: 7, name: 'Final Fantasy IX' }]])

    expect(
      normalizeRecommendation(
        { id: '7', reason: '  Une grande aventure.  ' },
        candidates,
      ),
    ).toEqual({
      id: 7,
      name: 'Final Fantasy IX',
      reason: 'Une grande aventure.',
    })
    expect(normalizeRecommendation({ id: 99, reason: 'Invention' }, candidates)).toBeNull()
    expect(normalizeRecommendation({ id: 7 }, candidates)).toBeNull()
  })
})
