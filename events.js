// ============================================================
// events.js — Statut automatique des cartes d'évènement
//
// CE QUE FAIT CE FICHIER, ET RIEN D'AUTRE :
// il lit la date portée par chaque carte d'évènement
// (<time datetime="…">) et met le badge à jour :
//     date future  → « À venir »
//     date passée  → « Terminé »   (+ la carte passe en sourdine)
//
// LE CONTENU DES ÉVÈNEMENTS EST DANS LE HTML, PAS ICI.
// Voir evenements/index.html. C'est volontaire : les cartes
// doivent exister pour Google et pour un visiteur sans
// JavaScript. Un fichier de données JS rendrait la page
// Évènements vide aux yeux des moteurs de recherche.
//
// FAIL-OPEN : si ce fichier est absent, bloqué ou plante, les
// badges écrits en dur dans le HTML restent affichés. Rien ne
// disparaît. C'est le comportement sûr — l'inverse de la
// réservation, où la panne doit FERMER (voir reservation-gate.js).
//
// ------------------------------------------------------------
// POUR AJOUTER UN ÉVÈNEMENT :
//   1. copier un bloc <article class="event-card"> dans
//      evenements/index.html
//   2. renseigner data-date="YYYY-MM-DD" — c'est cette valeur,
//      et elle seule, qui pilote le badge
//   3. ne pas toucher à ce fichier
//
// ⚠️ ÉVÈNEMENT SUR PLUSIEURS JOURS : mettez le DERNIER jour dans
//    data-date, pas le premier. Les fêtes durent quatre jours ;
//    avec la date de début, le badge afficherait « Terminé » dès
//    le vendredi matin, alors que la fête bat son plein. Le texte
//    lisible de la carte (« Fin juillet 2027 ») est indépendant :
//    il s'écrit à la main dans le HTML.
// ------------------------------------------------------------
//
// À inclure sur les pages qui affichent des cartes d'évènement :
//     <script src="/events.js"></script>
// ============================================================

(function () {

  var cards = document.querySelectorAll('.event-card[data-date]');
  if (!cards.length) return;

  // Minuit aujourd'hui : un évènement qui a lieu AUJOURD'HUI reste
  // « À venir » toute la journée, et ne bascule qu'au lendemain.
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  Array.prototype.forEach.call(cards, function (card) {
    var raw = card.getAttribute('data-date');

    // 'YYYY-MM-DD' passé à new Date() est interprété en UTC par la
    // spec ; découpé à la main, il reste en heure locale. Sans cela,
    // un évènement bascule à 2h du matin la veille en été.
    var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!parts) return;   // date mal formée : on laisse le badge du HTML

    var when = new Date(+parts[1], +parts[2] - 1, +parts[3]);
    var isPast = when < today;

    var badge = card.querySelector('.event-card__badge');
    if (badge) {
      badge.textContent = isPast ? 'Terminé' : 'À venir';
      badge.classList.toggle('event-card__badge--past', isPast);
    }

    card.classList.toggle('event-card--past', isPast);
  });

})();
