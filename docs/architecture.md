# Architecture game_service

`game_service` est un service Express qui sert de couche backend entre le frontend PlayerPG et les APIs externes.

## Responsabilites

- Obtenir un token Twitch pour acceder a IGDB.
- Executer les requetes IGDB.
- Mettre en cache les reponses IGDB.
- Normaliser les donnees jeux pour le frontend.
- Filtrer les contenus non souhaites.
- Appeler Mistral pour la traduction et les recommandations.
- Utiliser Supabase REST avec la service role key pour le cache IA et les favoris.

## Flux principaux

```text
Frontend Next.js
  |
  v
game_service Express
  |-- IGDB API: catalogue, recherche, detail, nouvelles sorties, random
  |-- Mistral API: traduction, recommandations
  |-- Supabase REST: cache traductions, favoris utilisateur
```

## Services internes

- `api/api.js`: client IGDB, token Twitch, cache HTTP.
- `services/igdbService.js`: logique catalogue/recherche/detail/random et filtres.
- `services/translationService.js`: traduction Mistral + cache Supabase.
- `services/chatService.js`: generation de recommandations.
- `services/mistralService.js`: client Mistral.
- `services/supabaseRestService.js`: acces REST Supabase avec service role.

## Filtres de contenu

Le service evite de renvoyer:

- DLC et extensions dans le catalogue, la recherche et le random.
- Jeux avec categorie non souhaitee pour les listes principales.
- Jeux adultes/erotiques detectes par age ratings ou mots cles.

Les extensions restent accessibles depuis les fiches des jeux de base.

## Cache

Le cache IGDB limite les appels externes et ameliore le temps de reponse. Il est configure par:

- `IGDB_CACHE_TTL_MS`
- `IGDB_CACHE_MAX_ENTRIES`

Le cache des traductions est persistant dans Supabase via `game_translations`.
