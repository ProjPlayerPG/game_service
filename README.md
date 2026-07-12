# game_service

`game_service` est le backend Express dédié aux données jeux et aux traitements IA de PlayerPG.

Il centralise :

- Les appels IGDB via Twitch.
- Le cache des requêtes IGDB.
- Les filtres de qualité : RPG, exclusion des extensions dans les listes, exclusion des contenus adultes/érotiques.
- La traduction des fiches via Mistral.
- Les recommandations du chatbot via Mistral.
- La lecture/écriture du cache IA dans Supabase.

## Lancer le service

```bash
npm install
npm run dev
```

Par défaut, le service écoute sur `PORT`, ou `3000` si la variable n'est pas définie.

## Documentation

- [Architecture](docs/architecture.md)
- [Variables d'environnement](docs/env.md)
- [Endpoints](docs/endpoints.md)

## Dépôt lié

Le frontend Next.js consomme ce service via `NEXT_PUBLIC_GAME_SERVICE_URL`.

- [Documentation frontend](../../frontend/frontend/README.md)
