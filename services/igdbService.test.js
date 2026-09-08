const { catalogWhereParts } = require('./igdbService')

describe('filtres de genres IGDB', () => {
  it('filtre sur un identifiant de genre dynamique', () => {
    expect(catalogWhereParts({ tagId: 25 })).toContain('genres = (25)')
  })

  it('préfère l’identifiant sécurisé au libellé prédéfini', () => {
    const whereParts = catalogWhereParts({ tag: 'Simulator', tagId: 32 })

    expect(whereParts).toContain('genres = (32)')
    expect(whereParts).not.toContain('genres = (13)')
  })

  it('ignore un identifiant invalide et conserve le filtre RPG obligatoire', () => {
    expect(catalogWhereParts({ tagId: '../25', sort: 'release_desc' })).toEqual([
      'genres = (12)',
      'version_parent = null',
    ])
  })

  it('écarte les dates trop lointaines du tri éditorial par défaut', () => {
    const whereParts = catalogWhereParts()

    expect(whereParts).toContain('first_release_date != null')
    expect(whereParts.some((part) => part.startsWith('first_release_date <= '))).toBe(true)
  })
})
