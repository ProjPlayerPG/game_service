const {
  extractRecommendationConstraints,
  extractReferenceTitles,
  extractRequestedFranchiseTitles,
  extractSearchTerms,
  referenceTitleMatchesGameName,
} = require('./chatRequestUtils')

describe('analyse des demandes de recommandation', () => {
  it('retire les mots vides et reconnaît une demande tactique', () => {
    const terms = extractSearchTerms('Je veux un RPG tactique avec une bonne histoire')

    expect(terms).toContain('tactique')
    expect(terms).toContain('histoire')
    expect(terms).toContain('tactical RPG')
    expect(terms).not.toContain('veux')
  })

  it('ajoute les recherches spécialisées Pokémon et rom hack', () => {
    const terms = extractSearchTerms('Je cherche un Pokémon rom hack')

    expect(terms).toContain('Pokemon')
    expect(terms).toContain('rom hack')
    expect(terms.length).toBeLessThanOrEqual(5)
  })

  it('traite les fangames comme une exclusion lorsqu’ils sont niés', () => {
    const message = 'Je veux des jeux Pokemon qui ne sont pas des fangames'

    expect(extractRecommendationConstraints(message)).toEqual({
      communityContentRequested: false,
      excludeFanGames: true,
      officialOnly: true,
    })
    expect(extractRequestedFranchiseTitles(message)).toEqual(['Pokemon'])
    expect(extractSearchTerms(message)).toEqual(['Pokemon', 'Pokemon RPG'])
  })

  it('conserve la recherche de fangames lorsqu’elle est demandée explicitement', () => {
    const message = 'Je cherche des fangames Pokémon'

    expect(extractRecommendationConstraints(message)).toEqual({
      communityContentRequested: true,
      excludeFanGames: false,
      officialOnly: false,
    })
    expect(extractSearchTerms(message)).toContain('fan game')
  })

  it('reconnaît aussi une demande formulée avec le mot officiel', () => {
    expect(extractRecommendationConstraints('Je veux des jeux Pokémon officiels')).toEqual({
      communityContentRequested: false,
      excludeFanGames: false,
      officialOnly: true,
    })
    expect(extractRecommendationConstraints('Je cherche des jeux non officiels')).toEqual({
      communityContentRequested: false,
      excludeFanGames: false,
      officialOnly: false,
    })
  })

  it('reconnaît les demandes portant sur une licence précise', () => {
    expect(
      extractRequestedFranchiseTitles('Je veux des jeux Final Fantasy sans multijoueur'),
    ).toEqual(['Final Fantasy'])
    expect(
      extractRequestedFranchiseTitles('Des titres de la licence Dragon Quest sur Switch'),
    ).toEqual(['Dragon Quest'])
  })

  it('reconnaît les jeux utilisés comme références', () => {
    expect(extractReferenceTitles('Je veux un tactical RPG comme Fire Emblem')).toEqual([
      'Fire Emblem',
    ])
    expect(extractReferenceTitles('Un jeu similaire à Persona 5, mais sur Switch')).toEqual([
      'Persona 5',
    ])
    expect(extractReferenceTitles('Une alternative à la série Pokémon avec des monstres')).toEqual([
      'Pokémon',
    ])
  })

  it('recherche la référence comme un titre complet sans favoriser chaque mot du titre', () => {
    const terms = extractSearchTerms('Je veux un tactical RPG comme Fire Emblem')

    expect(terms).toContain('Fire Emblem')
    expect(terms).toContain('tactical RPG')
    expect(terms).not.toContain('fire')
    expect(terms).not.toContain('emblem')
    expect(terms).not.toContain('comme')
  })

  it('reconnaît les titres d’une même série même avec un sous-titre', () => {
    expect(referenceTitleMatchesGameName('Fire Emblem', 'Fire Emblem: Radiant Dawn')).toBe(true)
    expect(referenceTitleMatchesGameName('Persona 5', 'Persona 5 Royal')).toBe(true)
    expect(referenceTitleMatchesGameName('Fire Emblem', 'Tactics Ogre: Reborn')).toBe(false)
  })
})
