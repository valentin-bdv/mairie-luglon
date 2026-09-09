// ============================================================
// config.js — Configuration PARTAGÉE du site
// À inclure AVANT script.js et confirmation.js :
//     <script src="/mairie-luglon/config.js"></script>
//
// Objectif : ne définir les informations de la salle qu'à UN SEUL endroit
// pour le code. Le reste du site (script.js, confirmation.js) lit ces
// valeurs plutôt que de les recopier.
// ============================================================

window.LUGLON = {

  // ---------------------------------------------------------------------
  // OÙ PARTENT LES DEMANDES DE RÉSERVATION
  //
  // Vide  → aucun backend. Le formulaire se comporte en démonstration :
  //         la demande reste dans le navigateur (voir reservation-storage.js)
  //         et rien n'est envoyé. C'est l'état de GitHub Pages, qui ne sait
  //         servir que des fichiers statiques — et c'est suffisant pour la
  //         version montrée au maire, qui n'a rien à démontrer côté serveur.
  //
  // '/api' → un backend sert le site ET l'API depuis la même origine
  //         (FastAPI qui monte les fichiers statiques sous /mairie-luglon/ ;
  //         en développement via un tunnel, plus tard sur OVH). La demande
  //         part alors en POST sur API_BASE + '/reservation'.
  //
  // GARDER UN CHEMIN RELATIF, jamais une URL absolue : c'est ce qui fait
  // que la CSP n'a pas à changer d'un environnement à l'autre. Elle
  // autorise `connect-src 'self'`, donc une même origine — pas un domaine
  // d'API séparé, qui obligerait à rouvrir la politique sur les 26 pages
  // et, avec un tunnel dont l'URL change à chaque session, à la rouvrir
  // sans arrêt. Un backend hébergé ailleurs que le site n'est pas prévu.
  // ---------------------------------------------------------------------
  API_BASE: '',

  // Luglon ne propose qu'une seule salle à la réservation : la salle des
  // fêtes. Pas de liste ROOMS ni de TIME_SLOTS ici — reservation-salle/
  // réserve une JOURNÉE entière de cette unique salle via un calendrier,
  // il n'y a donc ni salle à choisir ni créneau dans la journée.
  ROOM: { label: 'Salle des fêtes', capacity: 50 },

  // Nombre maximum de personnes par réservation (garde-fou formulaire),
  // aligné sur la capacité de la salle.
  MAX_PEOPLE: 50

};
