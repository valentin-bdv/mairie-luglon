// ============================================================
// reservation-storage.js — Contrat de stockage des demandes de salle
//
// Responsabilité unique : décider CE QUE le navigateur retient d'une demande,
// et COMBIEN DE TEMPS. Aucun affichage, aucun DOM.
//
// POURQUOI UN FICHIER À PART pour deux appelants seulement : script.js écrit
// les demandes, confirmation.js les relit, et la règle de péremption doit être
// LA MÊME des deux côtés. Recopiée dans les deux fichiers, elle finirait par
// diverger — c'est exactement la forme de bug (une seule règle, deux chemins
// de code) qui a déjà coûté cher à ce dépôt.
//
// LE PROBLÈME QU'IL RÉSOUT : le formulaire recueille un nom, un téléphone, un
// e-mail, un motif et un commentaire libre, et les écrivait tels quels dans le
// localStorage, sans limite de durée. Or le localStorage est attaché à
// l'APPAREIL, pas à la personne : sur un poste partagé (secrétariat de mairie,
// médiathèque, ordinateur familial), ouvrir /confirmation/ réaffichait le nom
// et le numéro de téléphone du visiteur précédent. Ici les champs personnels
// ne survivent que le temps d'afficher la confirmation à celui qui vient de
// l'envoyer ; passé ce délai il ne reste que les dates, seule information dont
// le calendrier a besoin pour griser une journée.
//
// À inclure APRÈS config.js (il complète window.LUGLON) et AVANT script.js /
// confirmation.js :
//     <script src="/mairie-luglon/reservation-storage.js"></script>
// ============================================================

(function () {

  const KEY_LIST = 'luglon_reservations';
  const KEY_LAST = 'luglon_last_reservation_timestamp';

  // Durée pendant laquelle les champs personnels restent lisibles. Assez long
  // pour afficher la confirmation, la relire, revenir en arrière ; assez court
  // pour que le visiteur suivant d'un poste partagé ne tombe jamais dessus.
  const PERSONAL_TTL_MS = 30 * 60 * 1000;        // 30 minutes

  // Au-delà, on ne garde même plus les dates : une demande d'il y a six mois
  // n'a plus de raison de griser une journée du calendrier.
  const ENTRY_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 jours

  // Champs à effacer une fois PERSONAL_TTL_MS écoulé. `dates` et `timestamp`
  // n'y sont pas : ils ne désignent personne et servent encore au calendrier.
  const PERSONAL_FIELDS = ['name', 'phone', 'email', 'people', 'motif', 'notes'];

  function readRaw() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY_LIST) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // localStorage illisible (mode privé strict, quota, JSON corrompu) :
      // on repart d'une liste vide plutôt que de casser la page. Le calendrier
      // affichera juste les journées témoin.
      return [];
    }
  }

  function writeRaw(list) {
    try { localStorage.setItem(KEY_LIST, JSON.stringify(list)); }
    catch { /* écriture impossible : la demande n'est pas mémorisée, tant pis */ }
  }

  // Vraie règle de péremption, appliquée à CHAQUE lecture — et non par une
  // minuterie, qui ne tournerait pas quand l'onglet est fermé, c'est-à-dire
  // précisément dans le cas qui nous intéresse.
  function purge(list, now) {
    const kept = [];
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue;
      const age = now - Number(entry.timestamp || 0);
      if (age > ENTRY_TTL_MS) continue;
      if (age > PERSONAL_TTL_MS) {
        for (const field of PERSONAL_FIELDS) delete entry[field];
      }
      kept.push(entry);
    }
    return kept;
  }

  // Une entrée « fraîche » a encore ses champs personnels. On teste `name` et
  // pas seulement l'âge : si le nettoyage est déjà passé, l'entrée est vidée
  // même si l'horloge de l'appareil a reculé entre temps.
  function isFresh(entry, now) {
    return !!entry && typeof entry.name === 'string'
        && (now - Number(entry.timestamp || 0)) <= PERSONAL_TTL_MS;
  }

  window.LUGLON = window.LUGLON || {};
  window.LUGLON.storage = {

    PERSONAL_TTL_MS: PERSONAL_TTL_MS,

    // Liste nettoyée, et réécrite si le nettoyage a retiré quelque chose :
    // sans cette réécriture les champs personnels resteraient sur le disque
    // en attendant la prochaine visite, ce qui viderait la mesure de son sens.
    //
    // PIÈGE, déjà tombé dedans une fois : purge() MUTE les objets de `raw`
    // (delete entry[champ]). Comparer après coup JSON.stringify(clean) à
    // JSON.stringify(raw) revient donc à comparer la liste avec elle-même —
    // les deux se ressemblent toujours, writeRaw() n'est jamais appelé, et
    // les données personnelles survivent sur le disque alors que l'affichage,
    // lui, semble correct. D'où l'empreinte prise AVANT la purge.
    load: function () {
      const now = Date.now();
      const raw = readRaw();
      const before = JSON.stringify(raw);
      const clean = purge(raw, now);
      if (JSON.stringify(clean) !== before) writeRaw(clean);
      return clean;
    },

    // Toutes les journées déjà prises sur cet appareil. Une demande porte un
    // TABLEAU de dates, d'où le flatMap.
    reservedDates: function () {
      return this.load().flatMap(r => Array.isArray(r.dates) ? r.dates : []);
    },

    add: function (entry) {
      const list = this.load();
      list.push(entry);
      writeRaw(list);
      try { localStorage.setItem(KEY_LAST, String(entry.timestamp)); }
      catch { /* idem : sans cette clé, la confirmation affichera « aucune demande » */ }
    },

    // La dernière demande, à condition qu'elle soit encore fraîche. Renvoie
    // null sinon — la page de confirmation bascule alors sur son bloc
    // « aucune demande récente », qui est le bon message pour quelqu'un qui
    // arrive sur cette URL sans venir du formulaire.
    lastFresh: function () {
      const now = Date.now();
      let last = null;
      try { last = localStorage.getItem(KEY_LAST); } catch { return null; }
      if (!last) return null;
      const found = this.load().find(r => String(r.timestamp) === last);
      return isFresh(found, now) ? found : null;
    },

    // Effacement à la demande de la personne (RGPD, droit d'effacement) :
    // tout part, y compris les dates, puisque c'est bien « mes données sur
    // cet appareil » qu'on promet de retirer.
    forgetAll: function () {
      try {
        localStorage.removeItem(KEY_LIST);
        localStorage.removeItem(KEY_LAST);
      } catch { /* rien à faire de plus */ }
    }

  };

})();
