# Variables d'environnement game_service

Fichier local: `game_service/game_service/.env`

```env
PORT=3001

TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

MISTRAL_API_KEY=
MISTRAL_MODEL=mistral-small-latest

IGDB_CACHE_TTL_MS=600000
IGDB_CACHE_MAX_ENTRIES=200
```

## Details

`PORT`
: port HTTP du service Express.

`TWITCH_CLIENT_ID`
: identifiant client Twitch utilise pour obtenir un token IGDB.

`TWITCH_CLIENT_SECRET`
: secret Twitch utilise pour obtenir un token IGDB.

`SUPABASE_URL`
: URL du projet Supabase. `NEXT_PUBLIC_SUPABASE_URL` peut aussi etre lu en fallback.

`SUPABASE_SERVICE_ROLE_KEY`
: cle serveur Supabase. Elle sert au cache des traductions et a la lecture des favoris pour les recommandations.

`MISTRAL_API_KEY`
: cle API Mistral pour traduire et recommander.

`MISTRAL_MODEL`
: modele Mistral utilise. Valeur par defaut: `mistral-small-latest`.

`IGDB_CACHE_TTL_MS`
: duree de vie du cache IGDB en millisecondes.

`IGDB_CACHE_MAX_ENTRIES`
: nombre maximal d'entrees en cache.

## Securite

Ces variables ne doivent jamais etre exposees dans le frontend:

- `TWITCH_CLIENT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MISTRAL_API_KEY`
