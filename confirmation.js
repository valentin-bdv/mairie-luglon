// ============================================================
// confirmation.js — Logique de la page /vie-pratique/reservation-salle/confirmation/
// Lit la dernière demande enregistrée dans localStorage et l'affiche
// clairement à l'utilisateur.
// ============================================================

(function () {

  // Configuration partagée, définie dans /config.js (inclus avant ce fichier)
  const ROOM = window.LUGLON.ROOM;

  function formatDateFR(isoDate) {
    if (!isoDate) return '';
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
    if (!parts) return isoDate;
    return `${parts[3]}/${parts[2]}/${parts[1]}`;
  }

  // Échappe le HTML d'un texte saisi par l'utilisateur avant insertion
  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loadReservations() {
    try { return JSON.parse(localStorage.getItem('luglon_reservations') || '[]'); }
    catch { return []; }
  }

  const foundBlock = document.getElementById('confirmation-found');
  const notFoundBlock = document.getElementById('confirmation-not-found');
  const detailsEl = document.getElementById('confirmation-details');

  const lastTimestamp = localStorage.getItem('luglon_last_reservation_timestamp');
  const reservations = loadReservations();

  // On cherche la demande correspondant exactement au dernier timestamp
  // enregistré (le plus fiable pour retrouver LA demande qui vient d'être
  // faite, même si plusieurs demandes existent sur l'appareil).
  const lastReservation = lastTimestamp
    ? reservations.find(r => String(r.timestamp) === lastTimestamp)
    : null;

  if (!lastReservation) {
    // Pas de demande récente trouvée : visite directe de la page, ou
    // localStorage vidé entre temps.
    notFoundBlock.style.display = 'block';
    return;
  }

  foundBlock.style.display = 'block';

  const dates = lastReservation.dates || [];
  const datesLabel = dates.length > 1 ? 'Journées' : 'Journée';
  const datesValue = dates.map(formatDateFR).join(', ');

  detailsEl.innerHTML = `
    <div class="confirmation-row"><span>Nom</span><strong>${escapeHTML(lastReservation.name)}</strong></div>
    <div class="confirmation-row"><span>Téléphone</span><strong>${escapeHTML(lastReservation.phone)}</strong></div>
    <div class="confirmation-row"><span>Salle</span><strong>${escapeHTML(ROOM.label)}</strong></div>
    <div class="confirmation-row"><span>${datesLabel}</span><strong>${escapeHTML(datesValue)}</strong></div>
    <div class="confirmation-row"><span>Nombre de personnes</span><strong>${escapeHTML(lastReservation.people)}</strong></div>
    <div class="confirmation-row"><span>Motif</span><strong>${escapeHTML(lastReservation.motif)}</strong></div>
    ${lastReservation.notes ? `<div class="confirmation-row"><span>Commentaire</span><strong>${escapeHTML(lastReservation.notes)}</strong></div>` : ''}
  `;

})();
