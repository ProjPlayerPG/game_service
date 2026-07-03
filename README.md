# game_service

`game_service` est le backend Express dedie aux donnees jeux et aux traitements IA de PlayerPG.

Il centralise:

- Les appels IGDB via Twitch.
- Le cache des requetes IGDB.
- Les filtres de qualite: RPG, exclusion des extensions dans les listes, exclusion des contenus adultes/erotiques.
- La traduction des fiches via Mistral.
- Les recommandations du chatbot via Mistral.
- La lecture/ecriture du cache IA dans Supabase.

## Lancer le service

```bash
npm install
npm run dev
```

Par defaut, le service ecoute sur `PORT`, ou `3000` si la variable n'est pas definie.

## Documentation

- [Architecture](docs/architecture.md)
- [Variables d'environnement](docs/env.md)
- [Endpoints](docs/endpoints.md)

## Repo lie

Le frontend Next.js consomme ce service via `NEXT_PUBLIC_GAME_SERVICE_URL`.

- [Documentation frontend](../../frontend/frontend/README.md)
