// ============================================================
// map-consent.js — Chargement des cartes Google Maps sur clic
//
// POURQUOI : un <iframe> Google Maps posé directement dans la page contacte
// Google dès l'ouverture, avant toute action du visiteur — il transmet son
// adresse IP et dépose des traceurs. Sur un site public français, ce dépôt
// suppose un consentement préalable ; l'obtenir avec une bannière qui couvre
// tout le site serait disproportionné pour deux cartes sur une seule page.
// Le clic sur la carte EST le consentement, et il est explicite : tant que
// personne n'a cliqué, aucune requête ne part vers Google.
//
// Ce fichier est donc la seule chose qui sépare le visiteur d'un tiers : s'il
// ne s'exécute pas, la page reste utilisable (le bouton devient un lien vers
// Google Maps, voir le <noscript> de secours dans le HTML) mais AUCUNE carte
// ne se charge toute seule. C'est un fail-closed assumé, contrairement au
// reste du dépôt qui échoue plutôt en mode ouvert : ici, échouer « ouvert »
// voudrait dire pister le visiteur sans son accord.
//
// À inclure sur les pages qui portent un .map-consent :
//     <script src="/mairie-luglon/map-consent.js"></script>
// ============================================================

(function () {

  const placeholders = document.querySelectorAll('.map-consent');
  if (!placeholders.length) return;

  placeholders.forEach(function (button) {
    button.addEventListener('click', function () {
      const src = button.getAttribute('data-map-src');
      const title = button.getAttribute('data-map-title') || 'Carte';
      if (!src) return;

      const frame = document.createElement('iframe');
      frame.src = src;
      frame.title = title;
      frame.loading = 'lazy';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allowFullscreen = true;

      // On remplace le bouton par la carte : une fois le choix fait, garder le
      // bouton n'apporterait rien et décalerait la mise en page.
      button.replaceWith(frame);
    });
  });

})();
