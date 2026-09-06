// ============================================================
// config.js — Configuration PARTAGÉE du site
// À inclure AVANT script.js et confirmation.js :
//     <script src="/config.js"></script>
//
// Objectif : ne définir les tarifs et infos repas qu'à UN SEUL
// endroit pour le code. Avant, ils étaient recopiés dans
// script.js ET confirmation.js — risque d'oublier d'en mettre un
// à jour. Désormais, on modifie ici et les deux pages suivent.
//
// ⚠️ Les tarifs affichés en "dur" dans le texte des pages
// reservation/index.html et programme/index.html restent à mettre
// à jour à la main (ce sont des tableaux HTML, pas du calcul).
// ============================================================

window.LUGLON = {

  // Tarifs par soir et par type de menu (en euros)
  PRICES_BY_DAY: {
    'vendredi': { 'standard': 14.00, 'enfant': 7.00 },
    'samedi':   { 'standard': 16.00, 'enfant': 8.00 }
  },

  // Options de menu proposées (valeur technique → libellé affiché)
  MENU_OPTIONS: [
    { value: 'standard', label: 'Adulte' },
    { value: 'enfant', label: 'Menu enfant' }
  ],

  // Libellés courts des soirs
  DAY_LABELS: { vendredi: 'Vendredi', samedi: 'Samedi' },

  // Horaires et lieux du repas, par soir (récapitulatif avant envoi)
  EVENT_INFO_BY_DAY: {
    'vendredi': {
      label: 'Vendredi 31 Juillet',
      time: '20h00',
      location: 'Luglon (salle des fêtes)'
    },
    'samedi': {
      label: 'Samedi 1er Août',
      time: '20h00',
      location: 'Luglon (salle des fêtes)'
    }
  },

  // Nombre maximum de personnes par réservation (garde-fou formulaire)
  MAX_PEOPLE: 50

};
