# Endpoints game_service

Les endpoints exacts peuvent evoluer, mais le service expose les routes principales suivantes.

## Jeux

### `GET /api/games`

Retourne le catalogue RPG pagine et filtre.

Parametres courants:

- `page`
- `tag`
- `platform`
- `year`
- `sort`

### `GET /api/games/search`

Recherche de jeux pour l'autocomplete du header.

Le service exclut les extensions et contenus adultes.

### `GET /api/games/spotlight`

Retourne une selection de jeux recents ou mis en avant pour la section "Nouvelles sorties RPG".

### `GET /api/games/random`

Retourne un RPG aleatoire valide.

Contraintes:

- RPG.
- Pas DLC/extension.
- Pas contenu adulte/erotique.

### `GET /api/games/:id`

Retourne une fiche detaillee:

- titre
- genres
- summary
- storyline
- date de sortie
- plateformes
- studio
- editeur
- extensions liees
- jeu de base si la fiche est une extension

### `POST /api/games/:id/translation`

Traduit `summary` et `storyline` en francais.

Comportement:

- Retourne le cache Supabase si disponible.
- Appelle Mistral uniquement si necessaire.
- Ne traduit pas les titres, noms propres, plateformes, genres, studios ou editeurs.

## Chatbot

### `POST /api/chat/recommendations`

Retourne 3 a 5 recommandations RPG.

Le backend:

- Analyse la demande utilisateur.
- Cherche une selection limitee de candidats IGDB.
- Exclut les favoris de l'utilisateur si une session est fournie.
- Exclut les contenus adultes/erotiques.
- Demande a Mistral de choisir parmi les candidats.

Le frontend ne doit pas envoyer tout le catalogue a Mistral.
