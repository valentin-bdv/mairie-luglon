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
- `mentions-legales/`, `confidentialite/`, `accessibilite/` : pages légales. La
  déclaration d'accessibilité est obligatoire pour un site public, et son niveau de
  conformité doit être rappelé dans le pied de page de chaque page.
- `styles.css`, `nav.js`, `scroll-animations.js`, `rail-dots.js`, `events.js`,
  `calendar-export.js`, `accordion.js`, `hero-fit.js`, `map-consent.js`, `config.js`,
  `reservation-storage.js`, `script.js`, `confirmation.js` : le système technique du
  site (mise en page, animations, cartes sur consentement, formulaire de réservation).

Il n'y a pas de page galerie séparée : les photos sont réparties directement dans les
pages concernées (bannières et vignettes), plutôt que centralisées à un seul endroit.

Le chemin d'une page suit toujours sa rubrique dans le menu, et tout dossier qui est une
URL possède son `index.html` — c'est ce qui évite qu'une adresse comme `/vie-municipale/`
renvoie une 404 alors que ses pages filles fonctionnent.

## À savoir avant une mise en ligne réelle

- Les contenus (adresse, horaires, actualités) sont des **exemples plausibles à valider
  ou remplacer**. L'équipe municipale, les associations, les entreprises et les
  commerces de proximité, eux, sont réels.
- Les photos utilisées (mairie, salle, commerces...) sont des photos fournies pour la
  démo, à remplacer par de vraies photos de Luglon avant mise en ligne.
- Le formulaire de réservation de salle est fonctionnel côté navigateur (validation,
  détection de doublon, récapitulatif) mais **n'est relié à aucun backend réel** : les
  demandes ne sont enregistrées que dans le navigateur de la personne qui les envoie. Un
  circuit de traitement réel (e-mail, tableur partagé, etc.) reste à brancher.

  Le point de bascule existe déjà : `API_BASE` dans `config.js`. Vide (valeur commitée),
  le formulaire reste en démonstration — c'est ce que sert GitHub Pages en permanence.
  Renseigné à `/api`, il poste vers un backend qui sert le site depuis la même origine.
  Ne jamais commiter une valeur non vide : GitHub Pages n'a pas d'API.

  Pour développer ce backend et le tester depuis un téléphone, `tools/dev-server.py`
  (FastAPI) sert le site et l'API à la même adresse, à exposer au besoin par un tunnel
  (`cloudflared tunnel --url http://localhost:8000`). Ce n'est ni une étape de build ni
  le backend de production : le site reste 100 % statique.
- Le site ne charge **aucun script tiers** et ne dépose aucun cookie. Les deux cartes
  Google Maps de la page « Déchets » ne se chargent qu'après un clic explicite du
  visiteur, pour ne rien transmettre à Google sans son accord.
- Une politique de sécurité du contenu (CSP) est posée en `<meta>` sur chaque page,
  faute de pouvoir envoyer des en-têtes HTTP depuis GitHub Pages. Elle est recopiée à
  l'identique partout : la modifier veut dire la modifier sur les 26 pages.
- Tant que le site est hébergé sur GitHub Pages, il reste **encadrable dans une iframe
  par un tiers** : `frame-ancestors` est ignoré en `<meta>`, et GitHub Pages n'envoie pas
  `X-Frame-Options`. Un hébergement capable d'envoyer de vrais en-têtes réglerait ce
  point, avec la CSP complète.
