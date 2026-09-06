const { recommendGames } = require('./chatService')

describe('validation des demandes avant recommandation', () => {
  it('refuse une formulation libre avant tout appel à un service externe', async () => {
    await expect(
      recommendGames({ message: 'Je cherche un RPG tactique', token: null }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'La demande doit commencer par « Je veux ».',
    })
  })

  it('refuse un préfixe sans demande suffisamment précise', async () => {
    await expect(recommendGames({ message: 'Je veux un', token: null })).rejects.toMatchObject({
      status: 400,
      message: 'Complète la phrase « Je veux » pour décrire le RPG recherché.',
    })
  })
})
