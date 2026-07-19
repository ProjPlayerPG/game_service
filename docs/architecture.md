# Architecture game_service

`game_service` est un service Express qui sert de couche backend entre le frontend PlayerPG et les API externes.

## Responsabilités

- Obtenir un token Twitch pour accéder à IGDB.
- Exécuter les requêtes IGDB.
- Mettre en cache les réponses IGDB.
- Normaliser les données jeux pour le frontend.
- Filtrer les contenus non souhaités.
- Appeler Mistral pour la traduction et les recommandations.
- Utiliser Supabase REST avec la service role key pour le cache IA et les favoris.

## Flux principaux

```text
Frontend Next.js
  |
  v
game_service Express
  |-- IGDB API : catalogue, recherche, détail, nouvelles sorties, random
  |-- Mistral API : traduction, recommandations
  |-- Supabase REST : cache traductions, favoris utilisateur
```

## Services internes

- `api/api.js` : client IGDB, token Twitch, cache HTTP.
- `services/igdbService.js` : logique catalogue/recherche/détail/random et filtres.
- `services/translationService.js` : traduction Mistral + cache Supabase.
- `services/chatService.js` : génération de recommandations.
- `services/mistralService.js` : client Mistral.
- `services/supabaseRestService.js` : accès REST Supabase avec service role.

## Filtres de contenu

Le service évite de renvoyer :

- DLC et extensions dans le catalogue, la recherche et le random.
- Jeux avec catégorie non souhaitée pour les listes principales.
- Jeux adultes/érotiques détectés par age ratings ou mots-clés.

Les extensions restent accessibles depuis les fiches des jeux de base.

## Cache

Le cache IGDB limite les appels externes et améliore le temps de réponse. Il est configuré par :

- `IGDB_CACHE_TTL_MS`
- `IGDB_CACHE_MAX_ENTRIES`

Le cache des traductions est persistant dans Supabase via `game_translations`.

## Accès Supabase

Le service utilise `SUPABASE_SERVICE_ROLE_KEY` uniquement côté serveur pour :

- lire et écrire `game_translations` ;
- lire les identifiants IGDB présents dans `favorites` ;
- valider le JWT utilisateur transmis au chatbot.

La service role key contourne RLS, mais les tables doivent également accorder les privilèges SQL au rôle `service_role`. Le [script d'installation Supabase](../../../frontend/frontend/docs/supabase-setup.sql) configure ces grants, les clés étrangères et les policies utilisées par l'ensemble du projet.
