const {
  escapeSearchTerm,
  normalizeFilter,
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
})
