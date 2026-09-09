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
  // OÙ PARTENT LES DEMANDES DE RÉSERVATION — décidé tout seul
  //
  // Le dépôt contient TOUJOURS tout, backend compris, et on pousse toujours
  // tout. Il n'y a rien à modifier avant un commit, rien à en exclure : ce
  // n'est pas le contenu du dépôt qui change d'un environnement à l'autre,
  // c'est l'ENDROIT D'OÙ LA PAGE EST SERVIE.
  //
  //   servi depuis *.github.io  → ''      Aucun backend ne peut y tourner :
  //                                       GitHub Pages sert des fichiers et
  //                                       n'exécute rien. Le formulaire reste
  //                                       une démonstration (script.js simule
  //                                       l'envoi, la demande ne quitte pas le
  //                                       navigateur). C'est le lien montrable
  //                                       en permanence, qui ne peut pas
  //                                       tomber en erreur.
  //
  //   servi depuis autre chose  → '/api'  Un serveur tourne et sert le site ET
  //                                       l'API à la même adresse : tunnel
  //                                       Cloudflare en développement, OVH
  //                                       ensuite. La demande part en POST sur
  //                                       API_BASE + '/reservation'.
  //
  // Rien à lister comme domaine autorisé : tout ce qui n'est pas GitHub Pages
  // est supposé avoir un backend. Une seule exception à connaître — servir le
  // site en statique pur sur localhost (python3 -m http.server, pour vérifier
  // une page) tentera un envoi et affichera une erreur. C'est sans gravité, et
  // c'est le prix de n'avoir aucune liste à tenir à jour.
  //
  // ATTENTION si le site passait un jour sur GitHub Pages avec un domaine
  // personnalisé : le test ci-dessous ne le reconnaîtrait plus et le
  // formulaire tenterait un envoi impossible. Ce n'est pas le plan (la
  // production ira sur OVH), mais c'est la seule façon de casser cette règle.
  //
  // CHEMIN RELATIF, jamais une URL absolue : c'est ce qui garde la CSP
  // identique partout (`connect-src 'self'`, même origine), y compris derrière
  // un tunnel dont l'URL change à chaque session. Un backend hébergé ailleurs
  // que le site obligerait à rouvrir la politique sur les 26 pages.
  // ---------------------------------------------------------------------
  API_BASE: location.hostname.endsWith('.github.io') ? '' : '/api',

  // Luglon ne propose qu'une seule salle à la réservation : la salle des
  // fêtes. Pas de liste ROOMS ni de TIME_SLOTS ici — reservation-salle/
  // réserve une JOURNÉE entière de cette unique salle via un calendrier,
  // il n'y a donc ni salle à choisir ni créneau dans la journée.
  ROOM: { label: 'Salle des fêtes', capacity: 50 },

  // Nombre maximum de personnes par réservation (garde-fou formulaire),
  // aligné sur la capacité de la salle.
  MAX_PEOPLE: 50

};
