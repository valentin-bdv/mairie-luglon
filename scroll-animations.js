// ============================================================
// scroll-animations.js — Apparition des blocs au défilement
//
// CONTRAT (voir aussi la section 18 de styles.css) :
//
//   • Le SEUL sélecteur partagé entre le CSS et ce fichier est
//     [data-reveal]. Aucun nom de classe de composant n'intervient :
//     renommer .day-card ou .about ne peut donc plus rendre du contenu
//     invisible.
//
//   • C'est CE FICHIER qui pose la classe .reveal-on sur <html>, et
//     c'est cette classe qui arme le masquage côté CSS. S'il est
//     absent, bloqué, ou plante au parsing, .reveal-on n'est jamais
//     posée : rien n'est masqué, tout s'affiche.
//
//     (Régression de juillet 2026, commit 9ebe72e : les pages légales
//      étaient invisibles parce que le masquage vivait dans le CSS et le
//      démasquage dans le JS. Deux fichiers, deux destins.)
//
//   • NE JAMAIS poser data-reveal sur un élément qui constitue à lui
//     seul tout le contenu d'une page (.legal-card, .confirmation-card).
//     Ces cartes ont une animation d'entrée purement CSS, sans JS.
//
// À inclure sur chaque page : <script src="/scroll-animations.js"></script>
// ============================================================

(function () {

  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  const root = document.documentElement;

  // --- Branche 1 : animations pilotées par le scroll, en CSS pur ---
  // (Chrome 115+, Safari 26+). On arme la classe et on s'arrête là : le
  // CSS fait tout le travail, l'observateur ne doit surtout pas tourner
  // en plus — deux moteurs d'apparition finiraient par se contredire.
  if (window.CSS && CSS.supports && CSS.supports('animation-timeline', 'view()')) {
    root.classList.add('reveal-on', 'reveal-css');
    return;
  }

  // --- Branche 2 : IntersectionObserver (tous les autres navigateurs) ---
  if (!('IntersectionObserver' in window)) return;   // rien n'est masqué

  root.classList.add('reveal-on');

  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      io.unobserve(entry.target);
    });
  // DÉCLENCHEMENT RETARDÉ — rootMargin bas à -22% de la hauteur du viewport,
  // et non plus -80px.
  //
  // Avec -80px, un bloc se révélait dès que son sommet passait 80px au-dessus
  // du bord bas de l'écran : l'animation se jouait entièrement pendant qu'il
  // était encore tout en bas, hors de la zone que l'œil regarde. On arrivait
  // dessus une fois qu'elle était finie.
  //
  // -22% (soit ~175px sur un écran de 800px) laisse le bloc monter dans le
  // tiers inférieur avant de déclencher. La DURÉE est inchangée : c'est le
  // point de départ qui recule, pas l'animation qui s'allonge.
  //
  // Un pourcentage plutôt qu'une valeur fixe : sur un téléphone en paysage
  // (400px de haut), -175px aurait mangé près de la moitié de l'écran.
  //
  // Doit rester cohérent avec `animation-range` de la branche CSS native
  // (section 18 de styles.css) : les deux décrivent le MÊME moment.
  
  const isSmallScreen = window.matchMedia('(max-width: 859px)').matches;
  const bottomMargin = isSmallScreen ? '-4%' : '-22%';

  }, { threshold: 0.05, rootMargin: '0px 0px ' + bottomMargin + ' 0px' });

  els.forEach(function (el) { io.observe(el); });

  // --- Filet de sécurité ---
  // Certains éléments peuvent ne jamais « entrer » dans le viewport :
  // conteneur de hauteur nulle, ancêtre display:none au chargement, bug
  // de rendu. 1,5 s après le chargement complet, on révèle tout ce qui
  // reste. Mieux vaut une animation manquée qu'un bloc invisible.
  window.addEventListener('load', function () {
    setTimeout(function () {
      document.querySelectorAll('[data-reveal]:not(.is-revealed)').forEach(function (el) {
        el.classList.add('is-revealed');
        io.unobserve(el);
      });
    }, 1500);
  }, { once: true });

})();
