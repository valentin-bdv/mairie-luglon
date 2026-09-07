# Mairie de Luglon - Site officiel (gabarit de démonstration)

Ce dépôt contient un gabarit de site pour la Mairie de Luglon (Landes, 40630) : site
statique (HTML/CSS/JS, sans backend ni dépendance), pensé pour être présenté comme
proposition avant une éventuelle mise en ligne réelle.

## Structure du projet

- `index.html` : Accueil (bienvenue, accès rapide, actualités récentes, contact).
- `mairie/` : La mairie — équipe municipale, conseils municipaux, arrêtés, agence
  postale, sécurité et prévention, signalement.
- `vie-municipale/` : Budget, commissions et communauté de communes (rattaché à la
  mairie, voir les liens dans `mairie/index.html`).
- `vie-pratique/` : Démarches administratives (état civil, urbanisme, déchets, CCAS et
  seniors), horaires, commerces de proximité.
- `vie-pratique/reservation-salle/` (+ `.../confirmation/`) : Demande de réservation
  d'une salle municipale.
- `enfance-jeunesse/` : École, périscolaire, transport scolaire, centre de loisirs.
- `actualites/` : Liste des actualités (aucune page détaillée, toutes ne sont que
  des cartes).
- `contact/` : Coordonnées de la mairie.
- `mentions-legales/`, `confidentialite/` : pages légales.
- `styles.css`, `nav.js`, `scroll-animations.js`, `rail-dots.js`, `events.js`,
  `calendar-export.js`, `config.js`, `script.js`, `confirmation.js` : le système
  technique du site (mise en page, animations, formulaire de réservation).

Il n'y a pas de page galerie séparée : les photos sont réparties directement dans les
pages concernées (bannières et vignettes), plutôt que centralisées à un seul endroit.

## À savoir avant une mise en ligne réelle

- Les contenus (adresse, horaires, équipe municipale, actualités, commerces de
  proximité) sont des **exemples plausibles à valider ou remplacer**.
- Les photos utilisées (mairie, salle, commerces...) sont des photos fournies pour la
  démo, à remplacer par de vraies photos de Luglon avant mise en ligne.
- Le formulaire de réservation de salle est fonctionnel côté navigateur (validation,
  détection de doublon, récapitulatif) mais **n'est relié à aucun backend réel** : les
  demandes ne sont enregistrées que dans le navigateur de la personne qui les envoie. Un
  circuit de traitement réel (e-mail, tableur partagé, etc.) reste à brancher.
