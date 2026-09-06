// Configuration partagée (tarifs, menus, infos repas) : définie dans
// /config.js, inclus AVANT ce fichier. On récupère les valeurs ici pour
// que le reste du code n'ait pas à changer.
const PRICES_BY_DAY = window.LUGLON.PRICES_BY_DAY;
const EVENT_INFO_BY_DAY = window.LUGLON.EVENT_INFO_BY_DAY;
const MENU_OPTIONS = window.LUGLON.MENU_OPTIONS;

// Constante pour la valeur par défaut pour l'initialisation
const DEFAULT_PEOPLE = 1;
// Garde-fou : nombre maximum de personnes par réservation
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

// *************************************************************************
// NOUVELLE URL : Colle ici l'URL obtenue lors du déploiement Google Apps Script
const WEB_APP_URL = 'https://EXEMPLE-ENDPOINT-RETIRE/exec';
// *************************************************************************

// PARTIE RÉSERVATION
const form = document.getElementById('resForm');
const list = document.getElementById('list');
const countEl = document.getElementById('count');
const menuContainer = document.getElementById('menu-container');
const totalCountMessage = document.getElementById('total-count-message');
const soirSelect = document.getElementById('soir');
// Éléments d'erreur
const nameInput = document.getElementById('name');
const nameError = document.getElementById('name-error');
const phoneInput = document.getElementById('phone');
const phoneError = document.getElementById('phone-error');
const phoneMasker = document.getElementById('phone');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('email-error');
const peopleInput = document.getElementById('people');
const peopleError = document.getElementById('people-error');

// Élément pour l'affichage du total en temps réel
const totalAmountEl = document.getElementById('total-amount');
// Nouveaux éléments pour la gestion du statut de soumission
const submitButton = document.getElementById('submit-button');
const submissionStatus = document.getElementById('submission-status');

// Éléments pour la détection de double réservation
const existingReservationNotice = document.getElementById('existing-reservation-notice');
const duplicateModal = document.getElementById('duplicate-modal');
const duplicateDayLabel = document.getElementById('duplicate-day-label');
const duplicateSummary = document.getElementById('duplicate-summary');
const duplicateCancelBtn = document.getElementById('duplicate-cancel');
const duplicateConfirmBtn = document.getElementById('duplicate-confirm');

// Éléments pour la modale de récapitulatif final (étape avant envoi réel)
const recapModal = document.getElementById('recap-modal');
const recapDayTitle = document.getElementById('recap-day-title');
const recapEventTime = document.getElementById('recap-event-time');
const recapEventLocation = document.getElementById('recap-event-location');
const recapName = document.getElementById('recap-name');
const recapPhone = document.getElementById('recap-phone');
const recapEmail = document.getElementById('recap-email');
const recapPeople = document.getElementById('recap-people');
const recapMenus = document.getElementById('recap-menus');
const recapNotesRow = document.getElementById('recap-notes-row');
const recapNotes = document.getElementById('recap-notes');
const recapTotal = document.getElementById('recap-total');
const recapCancelBtn = document.getElementById('recap-cancel');
const recapConfirmBtn = document.getElementById('recap-confirm');

const DAY_LABELS = window.LUGLON.DAY_LABELS;


// FONCTION UTILITAIRE : Calcule le prix d'un seul menu en fonction du jour
function getMenuPrice(day, menuType) {
    return PRICES_BY_DAY[day] ? (PRICES_BY_DAY[day][menuType] || 0) : 0;
}

// 1. GESTION DES RÉSERVATIONS (Stockage Local)
function loadReservations(){
  try{return JSON.parse(localStorage.getItem('luglon_reservations')||'[]');}catch{return[];}
}
function saveReservations(arr){localStorage.setItem('luglon_reservations',JSON.stringify(arr));}

// Renvoie la réservation existante pour un soir donné (ou null si aucune)
function findReservationForDay(day){
  const data = loadReservations();
  return data.find(r => r.soir === day) || null;
}

// VÉRIFICATION CÔTÉ SERVEUR : interroge le Google Sheet (via Apps Script)
// pour savoir si ce numéro de téléphone a déjà réservé pour ce soir-là,
// tous appareils confondus. Contrairement au check localStorage (qui ne
// voit que cet appareil), celui-ci détecte les doublons faits depuis un
// autre téléphone/ordinateur.
//
// Le serveur répond uniquement { found: true/false } : il ne renvoie
// JAMAIS le détail de la réservation (nom, menus...), pour qu'on ne
// puisse pas récupérer les données d'autrui en testant des numéros.
//
// Apps Script ne renvoie pas les en-têtes CORS nécessaires à un fetch()
// classique cross-origin : on utilise donc du JSONP (balise <script>
// dynamique) plutôt qu'un fetch, pour contourner cette limitation.
//
// Ne bloque jamais le flux en cas d'échec réseau : si le serveur ne
// répond pas (ou met trop de temps), on considère simplement qu'on n'a
// "rien trouvé" et on laisse l'utilisateur continuer normalement.
function checkPhoneOnServer(telephone, soir) {
    return new Promise((resolve) => {
        const callbackName = 'luglonCheckPhoneCallback_' + Date.now();
        let settled = false;

        // Sécurité : si Apps Script ne répond pas sous 4 secondes
        // (lenteur réseau, script en veille...), on abandonne sans bloquer.
        const timeout = setTimeout(() => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(null);
        }, 4000);

        function cleanup() {
            clearTimeout(timeout);
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
        }

        window[callbackName] = (data) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(data && data.found ? true : null);
        };

        const url = `${WEB_APP_URL}?action=checkPhone&telephone=${encodeURIComponent(telephone)}&soir=${encodeURIComponent(soir)}&callback=${callbackName}`;
        const script = document.createElement('script');
        script.src = url;
        script.onerror = () => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(null);
        };
        document.body.appendChild(script);
    });
}

// Formate la date/heure RÉELLE d'une réservation (figée, basée sur son
// timestamp d'origine) — affiche "aujourd'hui à HH:MM" si c'est le jour
// même, sinon "JJ/MM à HH:MM". Gère aussi le cas d'anciennes réservations
// enregistrées avant l'ajout du timestamp (fallback "heure inconnue").
function formatReservationDate(timestamp) {
    if (!timestamp) return 'heure inconnue';

    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

    if (isToday) {
        return `${time} (aujourd'hui)`;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${time} (${day}/${month})`;
}

// 2. RENDU DE LA LISTE DES RÉSERVATIONS (Version complète restaurée)
function render(){
  const data=loadReservations();
  countEl.textContent=data.length;
  list.innerHTML='';
  if(!data.length){list.innerHTML='<div class="empty">Aucune réservation pour l\'instant.</div>';return;}
  
  data.slice().reverse().forEach(r=>{
    const el=document.createElement('div');
    el.className='res-item';
    
    // Calculer la répartition des menus et le prix total en fonction du jour
    const menuCounts = {};
    let totalPrice = 0;
    const day = r.soir;

    r.menus.forEach(menuValue => {
        menuCounts[menuValue] = (menuCounts[menuValue] || 0) + 1;
        totalPrice += getMenuPrice(day, menuValue);
    });
    
    // Transformer l'objet des comptes en une chaîne lisible avec les prix par personne
    const menuSummary = Object.keys(menuCounts).map(key => {
        const menuOption = MENU_OPTIONS.find(opt => opt.value === key);
        const price = getMenuPrice(day, key);
        const formattedPrice = price.toLocaleString('fr-FR', { minimumFractionDigits: 2 });
        const label = menuOption ? `${menuOption.label} (${formattedPrice}€)` : key;
        return `${menuCounts[key]} x ${label}`;
    }).join(' / ');

    const formattedDate = formatReservationDate(r.timestamp);
    const formattedTotal = totalPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 });
    
    el.innerHTML=`
      <h4>${escapeHTML(r.name)} (${escapeHTML(r.phone)}) — ${escapeHTML(r.people)} pers
      <span class="total-price">Total: ${formattedTotal}€</span></h4>
      <div class="meta">${escapeHTML(r.soir)} • Menus: ${menuSummary} • Réservé à ${formattedDate}</div>
      <div>Commentaire : ${escapeHTML(r.notes || 'Aucun')}</div>
    `;
    
    list.appendChild(el);
  });
}

// FONCTION UTILITAIRE CONSERVÉE POUR LA CLARTÉ
function updatePriceRecap() {
    calculateTotalPrice();
}

// Construit un résumé HTML lisible d'une réservation existante (utilisé par
// le message d'info et par la modale de double réservation)
function buildReservationSummaryHTML(r) {
    const menuCounts = {};
    let totalPrice = 0;
    r.menus.forEach(menuValue => {
        menuCounts[menuValue] = (menuCounts[menuValue] || 0) + 1;
        totalPrice += getMenuPrice(r.soir, menuValue);
    });
    const menuSummary = Object.keys(menuCounts).map(key => {
        const menuOption = MENU_OPTIONS.find(opt => opt.value === key);
        const label = menuOption ? menuOption.label : key;
        return `${menuCounts[key]} x ${label}`;
    }).join(' / ');
    const formattedTotal = totalPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 });

    return `
        <strong>${escapeHTML(r.name)}</strong> (${escapeHTML(r.phone)}) — ${escapeHTML(r.people)} pers.<br>
        Menus : ${menuSummary}<br>
        Total : ${formattedTotal}€
    `;
}

// Message générique affiché quand le doublon est détecté CÔTÉ SERVEUR.
// Le serveur ne renvoie volontairement aucun détail (voir
// checkPhoneOnServer), on ne peut donc rien afficher de plus précis.
function buildServerReservationSummaryHTML() {
    return `
        Une réservation a déjà été enregistrée pour ce soir-là avec ce
        numéro de téléphone (probablement depuis un autre appareil).
    `;
}

// Affiche (ou masque) le message informatif "vous avez déjà réservé pour [autre jour]"
// Se déclenche au changement du select "soir"
function checkExistingReservationForDay() {
    const selectedDay = soirSelect.value;
    const existing = findReservationForDay(selectedDay);

    if (existing) {
        // Une réservation existe déjà PILE pour le jour actuellement sélectionné :
        // on prévient, mais le vrai blocage se fera à la soumission (modale).
        existingReservationNotice.style.display = 'block';
        existingReservationNotice.textContent =
            `Attention : vous avez déjà une réservation pour ${DAY_LABELS[selectedDay]}.`;
        return;
    }

    // Sinon, on regarde si une réservation existe pour l'AUTRE jour, pour informer
    // (sans bloquer) que la personne peut aussi réserver celui-ci en plus.
    const otherDay = selectedDay === 'vendredi' ? 'samedi' : 'vendredi';
    const otherExisting = findReservationForDay(otherDay);

    if (otherExisting) {
        existingReservationNotice.style.display = 'block';
        existingReservationNotice.textContent =
            `Note : vous êtes en train de réserver pour ${DAY_LABELS[selectedDay] === 'Vendredi' ? 'le vendredi' : 'le samedi'} et avez déjà réservé pour ${DAY_LABELS[otherDay]}.`;
    } else {
        existingReservationNotice.style.display = 'none';
        existingReservationNotice.textContent = '';
    }
}

// FONCTION : Calcule et affiche le prix total en temps réel
function calculateTotalPrice() {
    const selectedDay = soirSelect.value;
    const numPeople = Number(peopleInput.value);
    let currentTotal = 0;

    if (numPeople >= 1 && PRICES_BY_DAY[selectedDay]) {
        // Parcourt tous les sélecteurs de menu générés dynamiquement
        for (let i = 0; i < numPeople; i++) {
            const menuSelect = document.getElementById(`menu-${i}`);
            if (menuSelect && menuSelect.value) {
                const menuType = menuSelect.value;
                currentTotal += getMenuPrice(selectedDay, menuType);
            } else if (menuSelect) {
                currentTotal += getMenuPrice(selectedDay, MENU_OPTIONS[0].value);
            }
        }
    }

    const formattedTotal = currentTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 });
    totalAmountEl.textContent = `${formattedTotal}€`;
}


// 3. GÉNÉRATION DYNAMIQUE DES CHAMPS DE MENUS
function generateMenuInputs() {
    // Garde-fou : on borne le nombre de personnes entre 1 et MAX_PEOPLE
    // pour éviter qu'une saisie énorme (ex: 9999) ne fige la page en
    // générant des milliers de menus.
    let numPeople = Number(peopleInput.value);
    if (numPeople > MAX_PEOPLE) {
        numPeople = MAX_PEOPLE;
        peopleInput.value = MAX_PEOPLE;
    }
    menuContainer.innerHTML = '';
    
    totalCountMessage.textContent = `Veuillez choisir le menu pour chacune des ${numPeople} personne${numPeople > 1 ? 's' : ''}.`;

    if (numPeople < 1) return;

    for (let i = 0; i < numPeople; i++) {
        const group = document.createElement('div');
        group.className = 'menu-selection-group';
        group.innerHTML = `
            <h5>Personne ${i + 1}</h5> 
            <div class="menu-options">
                <div>
                    <select id="menu-${i}" name="menu-${i}" required>
                        ${MENU_OPTIONS.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
        menuContainer.appendChild(group);
        
        // Écouteur pour mettre à jour le total quand un menu est changé
        document.getElementById(`menu-${i}`).addEventListener('change', calculateTotalPrice);
    }
    calculateTotalPrice();
}

// 4. FORMATAGE DU TÉLÉPHONE (AJOUT DE L'ESPACE AUTO)
phoneMasker.addEventListener('input', (e) => {
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

// 5. FONCTION DE VALIDATION DES CHAMPS DE CONTACT
function validateContactFields() {
    let isValid = true;
    const nameValue = nameInput.value.trim();
    const phoneValue = phoneInput.value.replace(/\s/g, '').trim();
    const emailValue = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const numPersonsValue = parseInt(peopleInput.value, 10) || 0;
    const errorMessage = 'Remplir ce champ';

    // Validation du Nom
    if (nameValue === '') {
        nameError.textContent = errorMessage;
        nameInput.classList.add('input-error');
        isValid = false;
    } else {
        nameError.textContent = '';
        nameInput.classList.remove('input-error');
    }

    // Validation du Téléphone
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
    
    // Validation de l'Email
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
    
    // 4. Validation du Nombre de Personnes (Minimum 1)
    if (numPersonsValue < 1) {
        peopleError.textContent = 'Minimum 1 personne requise.';
        peopleInput.classList.add('input-error');
        isValid = false;
    } else {
        peopleError.textContent = '';
        peopleInput.classList.remove('input-error');
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


// 6. GESTION DE LA SOUMISSION DU FORMULAIRE

// Stocke temporairement les données validées en attendant la confirmation
// finale de l'utilisateur (via la modale de récapitulatif, et éventuellement
// la modale de double réservation avant elle).
let pendingSubmission = null;

form.addEventListener('submit', async e => {
    e.preventDefault();

    // Validation des champs de contact
    if (!validateContactFields()) {
        return;
    }
    const numPeople = Number(peopleInput.value);
    const selectedDay = form.soir.value;

    // On prépare nos compteurs pour la base de données
    let nbViande = 0;
    let nbEnfant = 0;

    // Récupérer tous les choix de menus dynamiques (et vérifier qu'ils sont choisis)
    const selectedMenus = [];
    for (let i = 0; i < numPeople; i++) {
        const menuSelect = document.getElementById(`menu-${i}`);
        if (!menuSelect || !menuSelect.value) {
            setSubmissionStatus('error', `Le type de repas n'a pas été sélectionné pour la personne ${i + 1}.`);
            return;
        }

        // On incrémente le compteur correspondant
        if (menuSelect.value === 'standard') nbViande++;
        if (menuSelect.value === 'enfant') nbEnfant++;

        selectedMenus.push(menuSelect.value);
    }

    // Préparer les données pour l'envoi au script Google (Format clé:valeur)
    const formData = {
        'Nom': nameInput.value.trim(),
        'Email': emailInput.value.trim(),
        'Telephone': phoneInput.value.replace(/\s/g, '').trim(),
        'NbPersonnes': numPeople,
        'Soir': selectedDay,
        'Viande': nbViande,
        'Enfant': nbEnfant,
        'Notes': form.notes.value.trim(),
        'Total_Euros': parseFloat(totalAmountEl.textContent.replace('€', '').replace(',', '.').replace(/\s/g, '')),
        'Timestamp': new Date().toLocaleString('fr-FR'),
    };

    pendingSubmission = { formData, selectedMenus };

    // VÉRIFICATION ANTI DOUBLE-RÉSERVATION (LOCAL) : si une réservation existe
    // déjà pour ce jour précis sur CET APPAREIL, on avertit en premier (pas
    // besoin d'aller interroger le serveur dans ce cas, c'est déjà détecté).
    const existingLocal = findReservationForDay(selectedDay);
    if (existingLocal) {
        duplicateDayLabel.textContent = DAY_LABELS[selectedDay] || selectedDay;
        duplicateSummary.innerHTML = buildReservationSummaryHTML(existingLocal);
        duplicateModal.style.display = 'flex';
        return; // on attend la décision de l'utilisateur via la modale
    }

    // VÉRIFICATION ANTI DOUBLE-RÉSERVATION (SERVEUR) : ce téléphone a-t-il
    // déjà réservé ce soir-là, depuis n'importe quel appareil ? Court
    // délai pendant l'appel réseau, sans bloquer le flux si ça échoue.
    submitButton.disabled = true;
    setSubmissionStatus('sending', 'Vérification en cours...');
    const existingServer = await checkPhoneOnServer(formData.Telephone, selectedDay);
    setSubmissionStatus(null);
    submitButton.disabled = false;

    if (existingServer) {
        duplicateDayLabel.textContent = DAY_LABELS[selectedDay] || selectedDay;
        duplicateSummary.innerHTML = buildServerReservationSummaryHTML();
        duplicateModal.style.display = 'flex';
        return;
    }

    openRecapModal();
});

// Bouton "Annuler" de la modale de double réservation
duplicateCancelBtn.addEventListener('click', () => {
    duplicateModal.style.display = 'none';
    pendingSubmission = null;
});

// Bouton "Oui, réserver quand même" de la modale doublon : on passe ensuite
// par l'étape récapitulatif, comme pour un envoi normal.
duplicateConfirmBtn.addEventListener('click', () => {
    duplicateModal.style.display = 'none';
    if (pendingSubmission) {
        openRecapModal();
    }
});

// --- ÉTAPE 1 : Affichage du récapitulatif détaillé avant tout envoi réel ---
function openRecapModal() {
    if (!pendingSubmission) return;
    const { formData, selectedMenus } = pendingSubmission;
    const day = formData.Soir;
    const info = EVENT_INFO_BY_DAY[day];

    recapDayTitle.textContent = info ? info.label : DAY_LABELS[day];
    recapEventTime.textContent = info ? info.time : '';
    recapEventLocation.textContent = info ? info.location : '';

    recapName.textContent = formData.Nom;
    recapPhone.textContent = formData.Telephone;
    recapEmail.textContent = formData.Email;
    recapPeople.textContent = formData.NbPersonnes;

    // Détail des menus, ex : "4 × Viande / 2 × Menu enfant"
    const menuCounts = {};
    selectedMenus.forEach(m => { menuCounts[m] = (menuCounts[m] || 0) + 1; });
    recapMenus.innerHTML = Object.keys(menuCounts).map(key => {
        const opt = MENU_OPTIONS.find(o => o.value === key);
        const label = opt ? opt.label : key;
        return `<li>${menuCounts[key]} × ${label}</li>`;
    }).join('');

    if (formData.Notes) {
        recapNotesRow.style.display = 'flex';
        recapNotes.textContent = formData.Notes;
    } else {
        recapNotesRow.style.display = 'none';
    }

    const formattedTotal = formData.Total_Euros.toLocaleString('fr-FR', { minimumFractionDigits: 2 });
    recapTotal.textContent = `${formattedTotal}€`;

    recapModal.style.display = 'flex';
}

// Bouton "Modifier" de la modale récap : on referme, l'utilisateur peut
// corriger le formulaire avant de re-soumettre.
recapCancelBtn.addEventListener('click', () => {
    recapModal.style.display = 'none';
    pendingSubmission = null;
});

// Bouton "Confirmer la réservation" : c'est SEULEMENT ici que l'envoi réel
// est déclenché, après validation explicite du récapitulatif complet.
recapConfirmBtn.addEventListener('click', () => {
    recapModal.style.display = 'none';
    if (pendingSubmission) {
        submitReservation(pendingSubmission.formData, pendingSubmission.selectedMenus);
        pendingSubmission = null;
    }
});

// Envoie la réservation au serveur en JSONP (même canal que le check
// anti-doublon), ce qui permet de LIRE la réponse de Google et donc de
// confirmer le RÉEL enregistrement. Impossible avec un fetch no-cors, qui
// renvoyait une réponse opaque : on affichait "confirmée" même si le Sheet
// n'avait rien enregistré.
//
// Résout avec l'objet réponse du serveur ({ success: true/false, error })
// ou avec null en cas d'échec réseau / timeout.
function submitReservationOnServer(formData) {
    return new Promise((resolve) => {
        const callbackName = 'luglonSubmitCallback_' + Date.now();
        let settled = false;

        // Apps Script peut être lent à démarrer (veille froide) : on laisse
        // jusqu'à 15 secondes avant d'abandonner.
        const timeout = setTimeout(() => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(null);
        }, 15000);

        function cleanup() {
            clearTimeout(timeout);
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
        }

        window[callbackName] = (data) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(data);
        };

        const params = new URLSearchParams(formData);
        params.set('action', 'submit');
        params.set('callback', callbackName);

        const script = document.createElement('script');
        script.src = `${WEB_APP_URL}?${params.toString()}`;
        script.onerror = () => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(null);
        };
        document.body.appendChild(script);
    });
}

// Envoi effectif de la réservation (factorisé pour être appelé directement,
// ou après confirmation explicite d'une double réservation)
function submitReservation(formData, selectedMenus) {
    // Désactiver le bouton et afficher le statut "Envoi en cours..."
    submitButton.disabled = true;
    setSubmissionStatus('sending', 'Réservation en cours...');

    submitReservationOnServer(formData).then((res) => {
        if (res && res.success) {
            // Le serveur a CONFIRMÉ l'enregistrement.

            // 1. Logique de confirmation pour le stockage local
            const data = loadReservations();
            const entry = {
                name: formData.Nom,
                phone: formData.Telephone,
                people: formData.NbPersonnes,
                soir: formData.Soir,
                menus: selectedMenus,
                notes: formData.Notes,
                timestamp: Date.now() // horodatage réel, utilisé par la page de confirmation
            };

            data.push(entry);
            saveReservations(data);
            // On garde une trace de "la dernière réservation effectuée" pour que
            // la page de confirmation sache laquelle afficher.
            localStorage.setItem('luglon_last_reservation_timestamp', String(entry.timestamp));
            render();

            // 2. Redirection vers la page de confirmation dédiée
            window.location.href = '/reservation/confirmation/';
        } else {
            // Échec : soit le serveur a renvoyé une erreur, soit le réseau a
            // échoué / le délai a expiré. Dans tous les cas, on n'affiche PAS
            // "confirmée" et on laisse l'utilisateur réessayer.
            if (res && res.error) {
                console.error('Erreur serveur lors de l\'envoi :', res.error);
                setSubmissionStatus('error', "La réservation n'a pas pu être enregistrée. Merci de réessayer ou de nous contacter.");
            } else {
                setSubmissionStatus('error', "Connexion au serveur impossible. Vérifiez votre connexion internet et réessayez.");
            }
            submitButton.disabled = false;
        }
    });
}

// --- Fermeture des modales (accessibilité) ---
// On peut désormais fermer une modale avec la touche Échap ou en cliquant
// sur le fond sombre, en plus des boutons. Cela revient à "annuler" :
// on referme et on oublie la réservation en attente.
function closeModals() {
    if (recapModal) recapModal.style.display = 'none';
    if (duplicateModal) duplicateModal.style.display = 'none';
    pendingSubmission = null;
}

// Clic sur le fond sombre (et pas sur le contenu de la boîte) = fermeture
[recapModal, duplicateModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModals();
    });
});

// Touche Échap = fermeture, uniquement si une modale est ouverte
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const recapOpen = recapModal && recapModal.style.display === 'flex';
    const dupOpen = duplicateModal && duplicateModal.style.display === 'flex';
    if (recapOpen || dupOpen) closeModals();
});

// Initialisation
if (peopleInput) {
    peopleInput.value = DEFAULT_PEOPLE;
    generateMenuInputs();
    calculateTotalPrice();
}
checkExistingReservationForDay();
render();
