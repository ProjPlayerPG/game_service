const {
  buildReferenceExclusion,
  buildReferenceProfile,
  distinctiveKeywordIds,
  hasReferenceSimilarity,
  isExcludedReferenceGame,
  rankCandidates,
  referenceSimilarity,
} = require('./chatSimilarity')

describe('similarité des recommandations', () => {
  it('classe en priorité un titre cité dans la demande', () => {
    const ranked = rankCandidates(
      [
        { id: 1, name: 'Autre jeu', summary: '', total_rating_count: 5000 },
        { id: 2, name: 'Dragon Quest', summary: '', total_rating_count: 10 },
      ],
      'Je voudrais Dragon Quest',
    )

    expect(ranked[0].id).toBe(2)
  })

  it('exclut le jeu de référence ainsi que sa franchise et sa collection', () => {
    const reference = {
      id: 1,
      name: 'Fire Emblem',
      franchise: 10,
      franchises: [11],
      collections: [20],
    }
    const exclusion = buildReferenceExclusion(['Fire Emblem'], [reference])

    expect(exclusion.referenceGames).toEqual([reference])
    expect(isExcludedReferenceGame(reference, exclusion)).toBe(true)
    expect(
      isExcludedReferenceGame(
        { id: 2, name: 'Fire Emblem Engage', franchise: 10 },
        exclusion,
      ),
    ).toBe(true)
    expect(
      isExcludedReferenceGame(
        { id: 6, name: 'Fire Emblem: Complete Edition', version_parent: 1 },
        exclusion,
      ),
    ).toBe(true)
    expect(
      isExcludedReferenceGame(
        { id: 3, name: 'Un épisode lié', franchises: [{ id: 11 }] },
        exclusion,
      ),
    ).toBe(true)
    expect(
      isExcludedReferenceGame(
        { id: 4, name: 'Un jeu de la collection', collections: [{ id: 20 }] },
        exclusion,
      ),
    ).toBe(true)
    expect(
      isExcludedReferenceGame(
        { id: 5, name: 'Tactics Ogre: Reborn', franchise: 99, collections: [98] },
        exclusion,
      ),
    ).toBe(false)
  })

  it('exclut une licence par son titre même si IGDB ne fournit pas ses relations', () => {
    const exclusion = buildReferenceExclusion(['Pokémon'], [])

    expect(isExcludedReferenceGame({ id: 1, name: 'Pokémon Écarlate' }, exclusion)).toBe(true)
    expect(isExcludedReferenceGame({ id: 2, name: 'Cassette Beasts' }, exclusion)).toBe(false)
  })

  it('n’exclut rien lorsque la demande ne contient aucun jeu de référence', () => {
    const exclusion = buildReferenceExclusion([], [{ id: 1, name: 'Fire Emblem' }])

    expect(isExcludedReferenceGame({ id: 1, name: 'Fire Emblem' }, exclusion)).toBe(false)
  })

  it('privilégie les genres secondaires communs plutôt que la popularité', () => {
    const reference = {
      id: 1,
      name: 'Fire Emblem',
      genres: [
        { id: 12, name: 'Role-playing (RPG)' },
        { id: 15, name: 'Strategy' },
        { id: 24, name: 'Tactical' },
      ],
      themes: [{ id: 17, name: 'Fantasy' }],
      keywords: [{ id: 100, name: 'Grid-based movement' }],
      game_modes: [{ id: 1, name: 'Single player' }],
      similar_games: [2],
    }
    const tacticsOgre = {
      id: 2,
      name: 'Tactics Ogre: Reborn',
      summary: 'Un RPG tactique sur une grille.',
      genres: [
        { id: 12, name: 'Role-playing (RPG)' },
        { id: 15, name: 'Strategy' },
        { id: 24, name: 'Tactical' },
      ],
      themes: [{ id: 17, name: 'Fantasy' }],
      keywords: [{ id: 100, name: 'Grid-based movement' }],
      game_modes: [{ id: 1, name: 'Single player' }],
      total_rating_count: 100,
    }
    const undertale = {
      id: 3,
      name: 'Undertale',
      summary: 'Un RPG narratif populaire.',
      genres: [
        { id: 12, name: 'Role-playing (RPG)' },
        { id: 31, name: 'Adventure' },
      ],
      themes: [{ id: 17, name: 'Fantasy' }],
      game_modes: [{ id: 1, name: 'Single player' }],
      total_rating_count: 100000,
    }
    const profile = buildReferenceProfile([reference])
    const ranked = rankCandidates(
      [undertale, tacticsOgre],
      'Je veux un jeu comme Fire Emblem',
      { referenceProfile: profile },
    )

    expect(profile.secondaryGenreIds).toEqual(new Set([15, 24]))
    expect(referenceSimilarity(tacticsOgre, profile).score).toBeGreaterThan(
      referenceSimilarity(undertale, profile).score,
    )
    expect(hasReferenceSimilarity(tacticsOgre, profile)).toBe(true)
    expect(hasReferenceSimilarity(undertale, profile)).toBe(false)
    expect(ranked[0].name).toBe('Tactics Ogre: Reborn')
  })

  it('élargit le concept de collection de monstres à ses mots-clés spécialisés', () => {
    const reference = {
      id: 1,
      name: 'Un jeu de monstres',
      genres: [{ id: 12, name: 'Role-playing (RPG)' }],
      keywords: [
        { id: 98, name: 'monsters' },
        { id: 511, name: 'breeding' },
        { id: 78, name: 'anime' },
      ],
    }
    const cassetteBeasts = {
      id: 2,
      name: 'Cassette Beasts',
      genres: [{ id: 12, name: 'Role-playing (RPG)' }],
      keywords: [{ id: 44126, name: 'monster collector' }],
    }
    const undertale = {
      id: 3,
      name: 'Undertale',
      genres: [
        { id: 12, name: 'Role-playing (RPG)' },
        { id: 31, name: 'Adventure' },
      ],
      keywords: [],
    }
    const keywordIds = distinctiveKeywordIds([reference])
    const profile = buildReferenceProfile([reference])

    expect(keywordIds).toContain(44126)
    expect(keywordIds).toContain(53899)
    expect(keywordIds).not.toContain(78)
    expect(profile.allowsKeywordOnlySimilarity).toBe(true)
    expect(hasReferenceSimilarity(cassetteBeasts, profile)).toBe(true)
    expect(hasReferenceSimilarity(undertale, profile)).toBe(false)
  })
})
