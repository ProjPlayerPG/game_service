# Variables d'environnement game_service

Fichier local : `game_service/game_service/.env`

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

## Détails

`PORT`
: port HTTP du service Express. Utiliser `3001` en local afin de laisser `3000` au frontend Next.js.

`TWITCH_CLIENT_ID`
: identifiant client Twitch utilisé pour obtenir un token IGDB.

`TWITCH_CLIENT_SECRET`
: secret Twitch utilisé pour obtenir un token IGDB.

`SUPABASE_URL`
: URL du projet Supabase. `NEXT_PUBLIC_SUPABASE_URL` peut aussi être lu en fallback.

`SUPABASE_SERVICE_ROLE_KEY`
: clé legacy `service_role` Supabase, au format JWT. Elle sert au cache des traductions et à la lecture des favoris pour les recommandations. Les nouvelles clés `sb_secret_...` ne sont pas encore compatibles avec les appels REST manuels de la version actuelle.

`MISTRAL_API_KEY`
: clé API Mistral pour traduire et recommander.

`MISTRAL_MODEL`
: modèle Mistral utilisé. Valeur par défaut : `mistral-small-latest`.

`IGDB_CACHE_TTL_MS`
: durée de vie du cache IGDB en millisecondes.

`IGDB_CACHE_MAX_ENTRIES`
: nombre maximal d'entrées en cache.

## Sécurité

Ces variables ne doivent jamais être exposées dans le frontend :

- `TWITCH_CLIENT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MISTRAL_API_KEY`

Le [guide d'installation global](../../../frontend/frontend/docs/installation.md) indique où récupérer ces valeurs et dans quel ordre lancer les deux applications.
