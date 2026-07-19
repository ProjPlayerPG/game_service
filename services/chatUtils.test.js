const {
  extractSearchTerms,
  normalizeRecommendation,
  rankCandidates,
  simplifyGame,
  uniqueById,
} = require('./chatUtils')

describe('préparation des recommandations', () => {
  it('retire les mots vides et reconnaît une demande tactique', () => {
    const terms = extractSearchTerms('Je veux un RPG tactique avec une bonne histoire')

    expect(terms).toContain('tactique')
    expect(terms).toContain('histoire')
    expect(terms).toContain('tactical RPG')
    expect(terms).not.toContain('veux')
  })

  it('ajoute les recherches spécialisées Pokémon et rom hack', () => {
    const terms = extractSearchTerms('Je cherche un Pokémon rom hack')

    expect(terms).toContain('pokemon')
    expect(terms).toContain('Pokemon')
    expect(terms).toContain('rom hack')
    expect(terms.length).toBeLessThanOrEqual(5)
  })

  it('déduplique les candidats en conservant leur premier ordre', () => {
    const first = { id: 1, name: 'Premier' }
    expect(uniqueById([first, { id: 1, name: 'Doublon' }, { id: 2, name: 'Second' }])).toEqual([
      first,
      { id: 2, name: 'Second' },
    ])
  })

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
      genres: ['RPG'],
      themes: ['Fantasy'],
      platforms: ['SNES'],
      release_year: 1995,
    })
  })

  it('n’accepte que les recommandations correspondant aux candidats', () => {
    const candidates = new Map([[7, { id: 7, name: 'Final Fantasy IX' }]])

    expect(normalizeRecommendation({ id: '7', reason: '  Une grande aventure.  ' }, candidates)).toEqual({
      id: 7,
      name: 'Final Fantasy IX',
      reason: 'Une grande aventure.',
    })
    expect(normalizeRecommendation({ id: 99, reason: 'Invention' }, candidates)).toBeNull()
    expect(normalizeRecommendation({ id: 7 }, candidates)).toBeNull()
  })
})
