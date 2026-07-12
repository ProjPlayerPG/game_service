# Endpoints game_service

Les endpoints exacts peuvent évoluer, mais le service expose les routes principales suivantes.

## Jeux

### `GET /api/games`

Retourne le catalogue RPG paginé et filtré.

Paramètres courants :

- `page`
- `tag`
- `platform`
- `year`
- `sort`

### `GET /api/games/search`

Recherche de jeux pour l'autocomplete du header.

Le service exclut les extensions et contenus adultes.

### `GET /api/games/spotlight`

Retourne une sélection de jeux récents ou mis en avant pour la section "Nouvelles sorties RPG".

### `GET /api/games/random`

Retourne un RPG aléatoire valide.

Contraintes :

- RPG.
- Pas DLC/extension.
- Pas contenu adulte/érotique.

### `GET /api/games/:id`

Retourne une fiche détaillée :

- titre
- genres
- summary
- storyline
- date de sortie
- plateformes
- studio
- éditeur
- extensions liées
- jeu de base si la fiche est une extension

### `POST /api/games/:id/translation`

Traduit `summary` et `storyline` en français.

Comportement :

- Retourne le cache Supabase si disponible.
- Appelle Mistral uniquement si nécessaire.
- Ne traduit pas les titres, noms propres, plateformes, genres, studios ou éditeurs.

## Chatbot

### `POST /api/chat/recommendations`

Retourne 3 à 5 recommandations RPG.

Le backend :

- Analyse la demande utilisateur.
- Cherche une sélection limitée de candidats IGDB.
- Exclut les favoris de l'utilisateur si une session est fournie.
- Exclut les contenus adultes/érotiques.
- Demande à Mistral de choisir parmi les candidats.

Le frontend ne doit pas envoyer tout le catalogue à Mistral.
