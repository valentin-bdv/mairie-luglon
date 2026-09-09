// Configuration partagée (salle unique, capacité) : définie dans
// /config.js, inclus AVANT ce fichier.
const ROOM = window.LUGLON.ROOM;
const MAX_PEOPLE = window.LUGLON.MAX_PEOPLE;

// Échappe le HTML d'un texte saisi par l'utilisateur (nom, commentaire...)
// avant de l'insérer dans la page via innerHTML. Empêche qu'un texte
// contenant du code (ex: une balise) soit exécuté par le navigateur.
function escapeHTML(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDateFR(isoDate) {
    if (!isoDate) return '';
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
    if (!parts) return isoDate;
    return `${parts[3]}/${parts[2]}/${parts[1]}`;
}

function toISODate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 1. GESTION DES RÉSERVATIONS (Stockage Local)
// Client-side-only, comme le reste du gabarit : ces demandes ne sont
// enregistrées QUE dans le navigateur de la personne qui les envoie.
// La durée de vie des champs personnels (nom, téléphone, e-mail, motif,
// commentaire) est décidée par reservation-storage.js, inclus avant ce
// fichier — surtout ne pas relire `luglon_reservations` en direct ici, ce
// serait contourner ce nettoyage.
const STORE = window.LUGLON.storage;

// Quelques journées déjà retenues, pour que le calendrier de démonstration
// ne soit pas entièrement vide au premier chargement. À remplacer par les
// vraies dates déjà réservées avant mise en ligne.
const MOCK_RESERVED_DATES = [
    '2026-09-12', '2026-09-19', '2026-09-26',
    '2026-10-03', '2026-10-17', '2026-10-31'
];

// Renvoie l'ensemble des dates (ISO) indisponibles : les journées « témoin »
// ci-dessus, plus celles déjà réservées sur cet appareil. Chaque demande
// peut porter sur plusieurs journées (tableau `dates`), d'où le flatMap.
function getReservedDates() {
    return new Set([...MOCK_RESERVED_DATES, ...STORE.reservedDates()]);
}

// 2. CALENDRIER DE RÉSERVATION
const calendarEl = document.getElementById('res-calendar');
const calendarGridEl = document.getElementById('res-calendar-grid');
const calendarLabelEl = document.getElementById('res-calendar-label');
const calendarPrevBtn = document.getElementById('res-calendar-prev');
const calendarNextBtn = document.getElementById('res-calendar-next');
const selectedDateNote = document.getElementById('res-selected-date');
const reserveButton = document.getElementById('res-reserve-button');

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const today = new Date();
today.setHours(0, 0, 0, 0);
const todayISO = toISODate(today.getFullYear(), today.getMonth(), today.getDate());

let viewYear = today.getFullYear();
let viewMonth = today.getMonth();
// Plusieurs journées peuvent être choisies (une seule demande peut porter
// sur plusieurs jours) : un Set, indépendant du mois affiché, pour qu'il
// survive la navigation mois précédent/suivant sans se vider.
const selectedDates = new Set();

function renderCalendar() {
    if (!calendarGridEl) return;

    const reserved = getReservedDates();
    calendarLabelEl.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

    // On ne laisse pas remonter avant le mois courant : pas de journée
    // passée à réserver.
    calendarPrevBtn.disabled = (viewYear === today.getFullYear() && viewMonth === today.getMonth());

    calendarGridEl.innerHTML = '';

    DAY_NAMES.forEach(label => {
        const head = document.createElement('div');
        head.className = 'res-calendar__weekday';
        head.textContent = label;
        calendarGridEl.appendChild(head);
    });

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    // getDay() : 0 = dimanche. On veut une semaine commençant le lundi.
    const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i = 0; i < leadingBlanks; i++) {
        const blank = document.createElement('div');
        blank.className = 'res-calendar__day res-calendar__day--empty';
        calendarGridEl.appendChild(blank);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const iso = toISODate(viewYear, viewMonth, day);
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'res-calendar__day';
        cell.textContent = String(day);

        const isPast = iso < todayISO;
        const isReserved = reserved.has(iso);

        if (isPast || isReserved) {
            cell.classList.add('res-calendar__day--unavailable');
            cell.disabled = true;
            cell.setAttribute('aria-disabled', 'true');
            cell.setAttribute('aria-label', `${day} ${MONTH_NAMES[viewMonth]} : indisponible`);
        } else {
            cell.classList.add('res-calendar__day--available');
            cell.setAttribute('aria-label', `${day} ${MONTH_NAMES[viewMonth]} : disponible`);
            if (selectedDates.has(iso)) {
                cell.classList.add('res-calendar__day--selected');
                cell.setAttribute('aria-pressed', 'true');
            } else {
                cell.setAttribute('aria-pressed', 'false');
            }
            // Un clic ne fait qu'ajouter/retirer CETTE journée du Set : le
            // reste de la sélection, même dans un autre mois, ne bouge pas.
            cell.addEventListener('click', () => {
                if (selectedDates.has(iso)) {
                    selectedDates.delete(iso);
                } else {
                    selectedDates.add(iso);
                }
                renderCalendar();
            });
        }

        calendarGridEl.appendChild(cell);
    }

    if (selectedDates.size > 0) {
        const sorted = Array.from(selectedDates).sort();
        const label = sorted.length === 1 ? 'Journée choisie' : `${sorted.length} journées choisies`;
        selectedDateNote.textContent = `${label} : ${sorted.map(formatDateFR).join(', ')}`;
        reserveButton.disabled = false;
        reserveButton.textContent = sorted.length === 1 ? 'RÉSERVER CETTE JOURNÉE' : 'RÉSERVER CES JOURNÉES';
    } else {
        selectedDateNote.textContent = 'Choisissez une ou plusieurs journées disponibles dans le calendrier.';
        reserveButton.disabled = true;
        reserveButton.textContent = 'RÉSERVER CETTE JOURNÉE';
    }
}

if (calendarPrevBtn) {
    calendarPrevBtn.addEventListener('click', () => {
        viewMonth -= 1;
        if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
        renderCalendar();
    });
    calendarNextBtn.addEventListener('click', () => {
        viewMonth += 1;
        if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
        renderCalendar();
    });
}

// 3. MODALE DE DEMANDE (formulaire, ouverte depuis le calendrier)
const bookingModal = document.getElementById('booking-modal');
const bookingDate = document.getElementById('booking-date');
const form = document.getElementById('resForm');

const nameInput = document.getElementById('name');
const nameError = document.getElementById('name-error');
const phoneInput = document.getElementById('phone');
const phoneError = document.getElementById('phone-error');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('email-error');
const peopleInput = document.getElementById('people');
const peopleError = document.getElementById('people-error');
const motifInput = document.getElementById('motif');
const motifError = document.getElementById('motif-error');

const submitButton = document.getElementById('submit-button');
const submissionStatus = document.getElementById('submission-status');
const bookingCancelBtn = document.getElementById('booking-cancel');

if (reserveButton) {
    reserveButton.addEventListener('click', () => {
        if (selectedDates.size === 0) return;
        const sorted = Array.from(selectedDates).sort();
        bookingDate.textContent = `${ROOM.label} — ${sorted.map(formatDateFR).join(', ')}`;
        bookingModal.style.display = 'flex';
        nameInput.focus();
    });
}

bookingCancelBtn.addEventListener('click', closeBookingModal);

function closeBookingModal() {
    bookingModal.style.display = 'none';
    form.reset();
    if (peopleInput) peopleInput.value = 1;
    [nameError, phoneError, emailError, peopleError, motifError].forEach(el => { if (el) el.textContent = ''; });
    [nameInput, phoneInput, emailInput, peopleInput, motifInput].forEach(el => { if (el) el.classList.remove('input-error'); });
}

// 4. FORMATAGE DU TÉLÉPHONE (AJOUT DE L'ESPACE AUTO)
if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
        const input = e.target;
        let value = input.value.replace(/[^0-9]/g, '');

        if (value.length > 0) {
            value = value.match(/.{1,2}/g).join(' ');
        }
        if (value.length > 14) {
            value = value.substring(0, 14);
        }
        input.value = value;
    });
}

// 5. VALIDATION DES CHAMPS
function validateContactFields() {
    let isValid = true;
    const nameValue = nameInput.value.trim();
    const phoneValue = phoneInput.value.replace(/\s/g, '').trim();
    const emailValue = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const numPersonsValue = parseInt(peopleInput.value, 10) || 0;
    const motifValue = motifInput.value.trim();
    const errorMessage = 'Remplir ce champ';

    if (nameValue === '') {
        nameError.textContent = errorMessage;
        nameInput.classList.add('input-error');
        isValid = false;
    } else {
        nameError.textContent = '';
        nameInput.classList.remove('input-error');
    }

    if (phoneValue.length == 0) {
        phoneError.textContent = errorMessage;
        phoneInput.classList.add('input-error');
        isValid = false;
    } else if (phoneValue.length !== 10) {
        phoneError.textContent = 'Numéro invalide (10 chiffres)';
        phoneInput.classList.add('input-error');
        isValid = false;
    } else {
        phoneError.textContent = '';
        phoneInput.classList.remove('input-error');
    }

    if (emailValue === '') {
        emailError.textContent = errorMessage;
        emailInput.classList.add('input-error');
        isValid = false;
    } else if (!emailRegex.test(emailValue)) {
        emailError.textContent = 'Le format d\'e-mail est invalide';
        emailInput.classList.add('input-error');
        isValid = false;
    } else {
        emailError.textContent = '';
        emailInput.classList.remove('input-error');
    }

    if (numPersonsValue < 1 || numPersonsValue > MAX_PEOPLE) {
        peopleError.textContent = `Entre 1 et ${MAX_PEOPLE} personnes (capacité de la salle).`;
        peopleInput.classList.add('input-error');
        isValid = false;
    } else {
        peopleError.textContent = '';
        peopleInput.classList.remove('input-error');
    }

    if (motifValue === '') {
        motifError.textContent = errorMessage;
        motifInput.classList.add('input-error');
        isValid = false;
    } else {
        motifError.textContent = '';
        motifInput.classList.remove('input-error');
    }

    return isValid;
}

// Fonction pour afficher le statut de soumission
let statusTimeout;
function setSubmissionStatus(status, message = '') {
    submissionStatus.className = '';
    submissionStatus.style.display = 'none';
    clearTimeout(statusTimeout);

    if (status) {
        submissionStatus.classList.add(status);
        submissionStatus.textContent = message;
        submissionStatus.style.display = 'flex';
    }

    if (status === 'success' || status === 'error') {
        statusTimeout = setTimeout(() => {
            submissionStatus.style.display = 'none';
        }, 5000);
    }
}

// 6. ENVOI DE LA DEMANDE

form.addEventListener('submit', e => {
    e.preventDefault();
    if (selectedDates.size === 0) return;
    if (!validateContactFields()) return;

    const formData = {
        name: nameInput.value.trim(),
        phone: phoneInput.value.replace(/\s/g, '').trim(),
        email: emailInput.value.trim(),
        people: Number(peopleInput.value),
        dates: Array.from(selectedDates).sort(),
        motif: motifInput.value.trim(),
        notes: form.notes.value.trim()
    };

    submitReservation(formData);
});

// Simule l'envoi de la demande. CE GABARIT DE DÉMONSTRATION N'A PAS DE
// BACKEND RÉEL : la demande est seulement enregistrée dans le navigateur
// (localStorage), avec un court délai simulé pour reproduire la sensation
// d'un envoi réseau. Avant mise en production, il faudrait brancher un
// vrai destinataire (formulaire d'e-mail, tableur partagé via Apps
// Script, service tiers...) pour que les demandes arrivent réellement aux
// services municipaux.
function submitReservationOnServer() {
    return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 700);
    });
}

function submitReservation(formData) {
    submitButton.disabled = true;
    setSubmissionStatus('sending', 'Envoi en cours...');

    submitReservationOnServer().then((res) => {
        if (res && res.success) {
            const entry = {
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                people: formData.people,
                dates: formData.dates,
                motif: formData.motif,
                notes: formData.notes,
                timestamp: Date.now() // horodatage réel, utilisé par la page de confirmation
            };

            // add() enregistre la demande ET la marque comme « la dernière
            // effectuée », pour que la page de confirmation sache laquelle
            // afficher.
            STORE.add(entry);

            window.location.href = '/mairie-luglon/vie-pratique/reservation-salle/confirmation/';
        } else {
            setSubmissionStatus('error', "La demande n'a pas pu être enregistrée. Merci de réessayer ou de nous contacter.");
            submitButton.disabled = false;
        }
    });
}

// --- Fermeture de la modale (accessibilité) ---
// Touche Échap ou clic sur le fond sombre = fermeture (identique à
// "annuler" : on referme et on n'envoie rien).
bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) closeBookingModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bookingModal.style.display === 'flex') {
        closeBookingModal();
    }
});

// Initialisation
if (peopleInput) {
    peopleInput.value = 1;
}
renderCalendar();
