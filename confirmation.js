// ============================================================
// confirmation.js — Logique de la page /vie-pratique/reservation-salle/confirmation/
// Affiche la demande que le visiteur vient d'envoyer, et lui donne le moyen
// de l'effacer de cet appareil.
//
// Ce fichier NE DÉCIDE PAS de ce qui est conservé ni combien de temps : cette
// règle appartient à reservation-storage.js, inclus avant lui. `lastFresh()`
// ne renvoie une demande que si elle est encore récente ; sinon on affiche le
// bloc « aucune demande récente », qui est exactement le bon message pour
// quelqu'un qui arrive ici sans venir du formulaire — y compris le visiteur
// suivant d'un poste partagé, à qui le nom et le téléphone du précédent ne
// doivent jamais s'afficher.
// ============================================================

(function () {

  // Configuration partagée, définie dans /config.js (inclus avant ce fichier)
  const ROOM = window.LUGLON.ROOM;
  const STORE = window.LUGLON.storage;

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

  const foundBlock = document.getElementById('confirmation-found');
  const notFoundBlock = document.getElementById('confirmation-not-found');
  const detailsEl = document.getElementById('confirmation-details');
  const forgetBtn = document.getElementById('confirmation-forget');

  const lastReservation = STORE.lastFresh();

  if (!lastReservation) {
    // Visite directe de la page, demande trop ancienne, ou stockage vidé.
    notFoundBlock.style.display = 'block';
    return;
  }

  foundBlock.style.display = 'block';

  const dates = Array.isArray(lastReservation.dates) ? lastReservation.dates : [];
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

  // Effacement immédiat, sans confirm() : la modale native bloque tous les
  // évènements du navigateur (voir les mises en garde du dépôt), et il n'y a
  // rien de dangereux à effacer — la demande n'existe que sur cet appareil,
  // et le message qui suit le dit clairement.
  if (forgetBtn) {
    forgetBtn.addEventListener('click', function () {
      STORE.forgetAll();
      detailsEl.innerHTML =
        '<p class="confirmation-forgotten">Les informations de cette demande ont été effacées de cet appareil. ' +
        'La demande envoyée à la mairie, elle, n\'est pas concernée : pour la modifier ou l\'annuler, contactez le secrétariat.</p>';
      forgetBtn.disabled = true;
      forgetBtn.textContent = 'DONNÉES EFFACÉES';
    });
  }

})();
