# Endpoints game_service

Les endpoints exacts peuvent évoluer, mais le service expose les routes principales suivantes.

URL locale recommandée : `http://localhost:3001`.

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

Recherche de RPG pour l'autocomplete du header et la page catalogue.

Le service exige le genre IGDB `Role-playing (RPG)` (`id = 12`) dans la requête puis
vérifie de nouveau cet identifiant dans les résultats. Il exclut aussi les extensions
et contenus adultes.

Les résultats sont classés par provenance :

- jeux reliés par IGDB à une franchise ou collection officielle ;
- jeux dont le statut ne peut pas être confirmé ;
- fangames, mods, ROM hacks et autres contenus communautaires détectés.

La réponse expose `provenance` avec les valeurs `official`, `unverified` ou `community`
afin que le frontend affiche clairement ce statut. Un pool interne plus large est
inspecté pour le classement, sans augmenter le nombre de résultats retournés.

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

Retourne jusqu'à 5 recommandations RPG. Le service peut volontairement en renvoyer moins
si les correspondances disponibles sont trop faibles.

Le backend :

- Analyse la demande utilisateur.
- Transforme les contraintes négatives comme « pas de fangames » en exclusions au lieu
  de les utiliser comme termes de recherche.
- Lorsqu'une licence précise est demandée, utilise les relations de franchise et de
  collection IGDB pour retrouver ses jeux officiels sans élargir la réponse finale.
- Distingue les jeux demandés des jeux cités uniquement comme références.
- Construit un profil du jeu de référence à partir de ses genres secondaires, thèmes,
  mots-clés distinctifs, résumé et histoire.
- Cherche en une multi-requête IGDB les jeux associés, les genres communs et les
  concepts spécialisés, y compris parmi des titres moins connus.
- Classe les candidats selon leurs similarités concrètes ; la popularité ne sert plus
  que de critère secondaire.
- Vérifie de nouveau que chaque candidat possède le genre IGDB RPG avant l'appel à
  Mistral.
- Privilégie les jeux officiels avant les contenus non confirmés ou communautaires,
  sauf lorsque l'utilisateur demande explicitement un fangame, mod ou ROM hack.
- Exclut le jeu de référence, ses éditions et les jeux de la même franchise ou collection.
- Exclut les favoris de l'utilisateur si une session est fournie.
- Exclut les contenus adultes/érotiques.
- Demande à Mistral de choisir parmi les candidats et lui transmet les ressemblances
  factuelles, le contexte narratif, les franchises, les collections, les studios et les
  éditeurs disponibles.

Le frontend ne doit pas envoyer tout le catalogue à Mistral.
