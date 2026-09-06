const { askMistral } = require('./mistralService')

describe('gestion des limites Mistral', () => {
  beforeEach(() => {
    process.env.MISTRAL_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.MISTRAL_API_KEY
  })

  it('réessaie une fois après une limite temporaire', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'retry-after': '0' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(askMistral({ messages: [], maxTokens: 400 })).resolves.toBe('{"ok":true}')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).max_tokens).toBe(400)
  })

  it('renvoie un message lisible lorsque la limite reste atteinte', async () => {
    const limitedResponse = () =>
      new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'retry-after': '0' },
      })
    vi.stubGlobal('fetch', vi.fn().mockImplementation(limitedResponse))

    await expect(askMistral({ messages: [] })).rejects.toMatchObject({
      status: 429,
      provider: 'mistral',
      message:
        'Le guide reçoit trop de demandes pour le moment. Attends quelques instants avant de réessayer.',
    })
  })
})
