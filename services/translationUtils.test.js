const {
  hasTranslation,
  isDifferentFromOriginal,
  normalizeText,
} = require('./translationUtils')

describe('validation du cache de traduction', () => {
  it('normalise la casse et les espaces avant comparaison', () => {
    expect(normalizeText('  Hello\n  WORLD  ')).toBe('hello world')
  })

  it('refuse un texte absent ou identique à l’original', () => {
    expect(isDifferentFromOriginal(null, 'Original text')).toBe(false)
    expect(isDifferentFromOriginal('  Original   Text ', 'original text')).toBe(false)
  })

  it('accepte une traduction réellement différente', () => {
    expect(isDifferentFromOriginal('Un texte traduit', 'Original text')).toBe(true)
  })

  it('n’exige aucune traduction lorsque le texte original est absent', () => {
    expect(isDifferentFromOriginal(null, null)).toBe(true)
  })

  it('valide un cache complet pour le contenu disponible', () => {
    expect(
      hasTranslation(
        {
          summary_fr: 'Un héros part à l’aventure.',
          storyline_fr: 'Le royaume est menacé.',
        },
        {
          summary: 'A hero goes on an adventure.',
          storyline: 'The kingdom is threatened.',
        },
      ),
    ).toBe(true)
  })

  it('refuse un cache partiel ou inchangé', () => {
    expect(
      hasTranslation(
        { summary_fr: 'Original summary', storyline_fr: null },
        { summary: 'Original summary', storyline: 'Original storyline' },
      ),
    ).toBe(false)
    expect(hasTranslation(null, { summary: 'Original summary' })).toBeFalsy()
  })

  it('ignore correctement un champ original absent', () => {
    expect(
      hasTranslation(
        { summary_fr: 'Résumé traduit', storyline_fr: null },
        { summary: 'Original summary' },
      ),
    ).toBe(true)
  })
})
