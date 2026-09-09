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

  // Luglon ne propose qu'une seule salle à la réservation : la salle des
  // fêtes. Pas de liste ROOMS ni de TIME_SLOTS ici — reservation-salle/
  // réserve une JOURNÉE entière de cette unique salle via un calendrier,
  // il n'y a donc ni salle à choisir ni créneau dans la journée.
  ROOM: { label: 'Salle des fêtes', capacity: 50 },

  // Nombre maximum de personnes par réservation (garde-fou formulaire),
  // aligné sur la capacité de la salle.
  MAX_PEOPLE: 50

};
