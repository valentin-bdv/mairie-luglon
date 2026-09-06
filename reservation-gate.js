// ============================================================
// reservation-gate.js — Ouverture / fermeture du formulaire
//
// PRINCIPE : le formulaire est FERMÉ dans le HTML (le <main
// id="reservation-card"> porte l'attribut `hidden`). Ce script ne fait
// qu'une seule chose : l'OUVRIR si la date du jour tombe dans la
// fenêtre configurée ci-dessous.
//
// Conséquence voulue : si ce fichier est absent, bloqué par le
// navigateur, ou contient une erreur, le formulaire RESTE FERMÉ.
// C'est le comportement sûr.
//
// (L'ancien countdown.js faisait l'inverse : le formulaire était ouvert
//  dans le HTML et le JS devait le fermer. La moindre panne — fichier
//  404, JS désactivé, bannière du compte à rebours supprimée — le
//  rouvrait silencieusement, et des réservations seraient arrivées dans
//  un Google Sheet que plus personne ne surveille.)
//
// POUR ROUVRIR LES RÉSERVATIONS L'AN PROCHAIN :
//   1. modifier les deux dates ci-dessous
//   2. mettre à jour le texte de #closed-message dans
//      reservation/index.html
//   3. rien d'autre — ne touchez pas à l'attribut `hidden` du HTML
//
// À inclure UNIQUEMENT sur la page réservation, AVANT script.js :
//     <script src="/reservation-gate.js"></script>
// ============================================================

(function () {

  // *************************************************************************
  // FENÊTRE D'OUVERTURE DES RÉSERVATIONS
  // Format : 'YYYY-MM-DDTHH:MM:SS' (heure locale, fuseau de Luglon)
  const RESERVATIONS_OPEN  = new Date('2027-06-01T00:00:00');
  const RESERVATIONS_CLOSE = new Date('2027-07-27T23:59:59');
  // *************************************************************************

  const now = new Date();
  const isOpen = (now >= RESERVATIONS_OPEN && now < RESERVATIONS_CLOSE);

  // HORS SAISON : on sort sans rien toucher. Tout ce que ce script peut
  // faire est OUVRIR ; ne rien faire laisse donc tout fermé. C'est le
  // comportement sûr, et c'est aussi ce qui se produit si le fichier est
  // absent, bloqué ou plante avant cette ligne.
  if (!isOpen) return;

  // --- 1. La page /reservation/ elle-même ---
  const card   = document.getElementById('reservation-card');
  const closed = document.getElementById('closed-message');
  if (card && closed) {
    card.hidden = false;
    closed.hidden = true;
  }

  // --- 2. Le bandeau d'appel des pages évènement ---
  // Même fenêtre, même source de vérité : impossible que la page des Fêtes
  // annonce « réservez » alors que le formulaire est encore fermé, ou
  // l'inverse. C'est tout l'intérêt de le piloter d'ici plutôt que de
  // retirer un attribut à la main dans le HTML une fois par an.
  const promo = document.getElementById('reservation-promo');
  if (promo) promo.hidden = false;

})();
