const {
  escapeSearchTerm,
  normalizeFilter,
  paginationWindow,
  sortClause,
  yearRange,
} = require('./igdbQueryUtils')

describe('construction des requêtes IGDB', () => {
  it('normalise les filtres texte', () => {
    expect(normalizeFilter('  PlayStation 5 ')).toBe('playstation 5')
    expect(normalizeFilter()).toBe('')
  })

  it.each([
    ['name_asc', 'name asc'],
    ['name_desc', 'name desc'],
    ['release_asc', 'first_release_date asc'],
    ['release_desc', 'first_release_date desc'],
    ['inconnu', 'first_release_date desc'],
  ])('transforme le tri %s en clause IGDB', (input, expected) => {
    expect(sortClause(input)).toBe(expected)
  })

  it('calcule les bornes UTC exactes d’une année', () => {
    expect(yearRange(2024)).toEqual({
      start: Date.UTC(2024, 0, 1) / 1000,
      end: Date.UTC(2025, 0, 1) / 1000,
    })
  })

  it.each([0, 1969, 2101, 2024.5, 'abc'])('refuse l’année invalide %s', (year) => {
    expect(yearRange(year)).toBeNull()
  })

  it('échappe les guillemets dans une recherche IGDB', () => {
    expect(escapeSearchTerm('  Dragon "Quest"  ')).toBe('Dragon \\"Quest\\"')
  })

  it('calcule la fenêtre nécessaire pour une page filtrée', () => {
    expect(paginationWindow(13, 24)).toEqual({
      safeLimit: 13,
      safeOffset: 24,
      fetchLimit: 111,
    })
  })

  it('normalise et plafonne les valeurs de pagination', () => {
    expect(paginationWindow('abc', -4, { maxLimit: 20, maxPool: 60 })).toEqual({
      safeLimit: 10,
      safeOffset: 0,
      fetchLimit: 30,
    })
    expect(paginationWindow(80, 100, { maxLimit: 20, maxPool: 200 })).toEqual({
      safeLimit: 20,
      safeOffset: 100,
      fetchLimit: 200,
    })
  })
})
