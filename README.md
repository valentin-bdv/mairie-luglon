# Mairie de Luglon - Site officiel (gabarit de démonstration)

Ce dépôt contient un gabarit de site pour la Mairie de Luglon (Landes, 40630) : site
statique (HTML/CSS/JS, sans backend ni dépendance), pensé pour être présenté comme
proposition avant une éventuelle mise en ligne réelle.

## Structure du projet

- `index.html` : Accueil (bienvenue, accès rapide, actualités récentes, contact).
- `mairie/` : La mairie — équipe municipale, conseils municipaux, arrêtés et
  publications, vos démarches (état civil), agence postale, urbanisme, sécurité et
  prévention, signalement. S'y ajoutent `budget/`, `commissions/` et
  `communaute-de-communes/`, atteignables depuis `mairie/index.html` et non depuis le
  menu (ils occupaient auparavant un dossier `vie-municipale/` à la racine).
- `vie-pratique/` : Démarches administratives (déchets, CCAS et seniors), horaires,
  commerces de proximité.
- `vie-pratique/reservation-salle/` (+ `.../confirmation/`) : Demande de réservation
  d'une salle municipale.
- `vie-pratique/enfance-jeunesse/` : École, périscolaire, transport scolaire, centre de
  loisirs.
- `actualites/` : Liste des actualités (aucune page détaillée, toutes ne sont que
  des cartes).
- `contact/` : Coordonnées de la mairie.
- `mentions-legales/`, `confidentialite/` : pages légales.
- `styles.css`, `nav.js`, `scroll-animations.js`, `rail-dots.js`, `events.js`,
  `calendar-export.js`, `config.js`, `script.js`, `confirmation.js` : le système
  technique du site (mise en page, animations, formulaire de réservation).

Il n'y a pas de page galerie séparée : les photos sont réparties directement dans les
pages concernées (bannières et vignettes), plutôt que centralisées à un seul endroit.

Le chemin d'une page suit toujours sa rubrique dans le menu, et tout dossier qui est une
URL possède son `index.html` — c'est ce qui évite qu'une adresse comme `/vie-municipale/`
renvoie une 404 alors que ses pages filles fonctionnent.

## À savoir avant une mise en ligne réelle

- Les contenus (adresse, horaires, équipe municipale, actualités, commerces de
  proximité) sont des **exemples plausibles à valider ou remplacer**.
- Les photos utilisées (mairie, salle, commerces...) sont des photos fournies pour la
  démo, à remplacer par de vraies photos de Luglon avant mise en ligne.
- Le formulaire de réservation de salle est fonctionnel côté navigateur (validation,
  détection de doublon, récapitulatif) mais **n'est relié à aucun backend réel** : les
  demandes ne sont enregistrées que dans le navigateur de la personne qui les envoie. Un
  circuit de traitement réel (e-mail, tableur partagé, etc.) reste à brancher.
