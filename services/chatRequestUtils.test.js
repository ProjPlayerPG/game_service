const {
  extractReferenceTitles,
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

    expect(terms).toContain('pokemon')
    expect(terms).toContain('Pokemon')
    expect(terms).toContain('rom hack')
    expect(terms.length).toBeLessThanOrEqual(5)
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
