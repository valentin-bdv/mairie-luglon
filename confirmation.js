// ============================================================
// confirmation.js — Logique de la page /reservation/confirmation/
// Lit la dernière réservation enregistrée dans localStorage et
// l'affiche clairement à l'utilisateur.
// ============================================================

(function () {

  // Configuration partagée, définie dans /config.js (inclus avant ce fichier)
  const PRICES_BY_DAY = window.LUGLON.PRICES_BY_DAY;
  const MENU_OPTIONS = window.LUGLON.MENU_OPTIONS;
  const DAY_LABELS = window.LUGLON.DAY_LABELS;

  function getMenuPrice(day, menuType) {
    return PRICES_BY_DAY[day] ? (PRICES_BY_DAY[day][menuType] || 0) : 0;
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
  const otherDayNotice = document.getElementById('confirmation-other-day-notice');
  const reserveOtherDayBtn = document.getElementById('reserve-other-day-btn');

  const lastTimestamp = localStorage.getItem('luglon_last_reservation_timestamp');
  const reservations = loadReservations();

  // On cherche la réservation correspondant exactement au dernier timestamp
  // enregistré (le plus fiable pour retrouver LA réservation qui vient
  // d'être faite, même si plusieurs réservations existent sur l'appareil).
  const lastReservation = lastTimestamp
    ? reservations.find(r => String(r.timestamp) === lastTimestamp)
    : null;

  if (!lastReservation) {
    // Pas de réservation récente trouvée : visite directe de la page,
    // ou localStorage vidé entre temps.
    notFoundBlock.style.display = 'block';
    return;
  }

  foundBlock.style.display = 'block';

  // --- Construction du récapitulatif détaillé ---
  const menuCounts = {};
  let totalPrice = 0;
  lastReservation.menus.forEach(menuValue => {
    menuCounts[menuValue] = (menuCounts[menuValue] || 0) + 1;
    totalPrice += getMenuPrice(lastReservation.soir, menuValue);
  });

  const menuLines = Object.keys(menuCounts).map(key => {
    const opt = MENU_OPTIONS.find(o => o.value === key);
    const label = opt ? opt.label : key;
    const unitPrice = getMenuPrice(lastReservation.soir, key);
    const formattedUnit = unitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 });
    return `<li>${menuCounts[key]} × ${label} (${formattedUnit}€ / pers.)</li>`;
  }).join('');

  const formattedTotal = totalPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 });
  const dayLabel = DAY_LABELS[lastReservation.soir] || lastReservation.soir;

  detailsEl.innerHTML = `
    <div class="confirmation-row"><span>Nom</span><strong>${escapeHTML(lastReservation.name)}</strong></div>
    <div class="confirmation-row"><span>Téléphone</span><strong>${escapeHTML(lastReservation.phone)}</strong></div>
    <div class="confirmation-row"><span>Soir réservé</span><strong>${escapeHTML(dayLabel)}</strong></div>
    <div class="confirmation-row"><span>Nombre de personnes</span><strong>${escapeHTML(lastReservation.people)}</strong></div>
    <div class="confirmation-row confirmation-menus"><span>Menus</span><ul>${menuLines}</ul></div>
    ${lastReservation.notes ? `<div class="confirmation-row"><span>Commentaire</span><strong>${escapeHTML(lastReservation.notes)}</strong></div>` : ''}
    <div class="confirmation-row confirmation-total-row"><span>Total à payer sur place</span><strong>${formattedTotal}€</strong></div>
  `;

  // --- Message pour l'autre soir, si pas encore réservé ---
  const otherDay = lastReservation.soir === 'vendredi' ? 'samedi' : 'vendredi';
  const hasOtherDay = reservations.some(r => r.soir === otherDay);

  if (!hasOtherDay) {
    otherDayNotice.style.display = 'block';
    otherDayNotice.textContent =
      `Pour rappel, votre réservation ne couvre que le ${dayLabel.toLowerCase()}. Si vous souhaitez aussi manger le ${DAY_LABELS[otherDay].toLowerCase()}, pensez à faire une réservation séparée.`;
    reserveOtherDayBtn.textContent = `RÉSERVER AUSSI LE ${DAY_LABELS[otherDay].toUpperCase()}`;
  } else {
    // Les deux soirs sont déjà réservés sur cet appareil : pas besoin
    // d'insister, on adoucit simplement le texte du bouton.
    reserveOtherDayBtn.textContent = 'FAIRE UNE AUTRE RÉSERVATION';
  }

})();
