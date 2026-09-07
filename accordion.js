// ============================================================
// accordion.js — Accordéon des listes dépliables (associations, entreprises)
//
// Le HTML fonctionne sans ce script : <details>/<summary> est nativement
// dépliable, clavier et lecteur d'écran compris. Ce script ajoute deux
// raffinements que le HTML seul ne peut pas faire :
//
//   1. Une seule catégorie ouverte à la fois par bloc (.accordion-group) :
//      ouvrir une catégorie referme les autres.
//   2. Une animation de hauteur à l'ouverture/fermeture (Web Animations
//      API) au lieu du « snap » instantané par défaut du navigateur.
//
// Si ce fichier ne charge pas, ou si le navigateur ne connaît pas
// Element.animate, on ne touche à rien : chaque <details> reste
// utilisable indépendamment, simplement sans exclusivité ni animation —
// repli valide, jamais une panne.
//
// Pourquoi pas <details name="…"> (exclusivité native, sans JS) : ça ne
// couvrirait que le point 1, pas l'animation — et ce script serait de
// toute façon nécessaire pour le point 2. Autant garder les deux
// comportements au même endroit plutôt que de les répartir entre le
// HTML et le JS.
//
// À inclure sur les pages qui ont un .accordion-group :
//     <script src="/accordion.js"></script>
// ============================================================

(function () {

  if (!('Element' in window) || !Element.prototype.animate) return;

  var DURATION = 260;
  var EASING = 'ease-in-out';

  function initItem(item, group) {
    var summary = item.querySelector('summary');
    var body = item.querySelector('.accordion__body');
    if (!summary || !body) return;

    var animation = null;
    var isClosing = false;
    var isExpanding = false;

    summary.addEventListener('click', function (e) {
      e.preventDefault();
      if (isClosing || !item.open) {
        openItem();
      } else if (isExpanding || item.open) {
        closeItem();
      }
    });

    function closeItem() {
      isClosing = true;
      var startHeight = item.offsetHeight + 'px';
      var endHeight = summary.offsetHeight + 'px';
      item.style.overflow = 'hidden';
      if (animation) animation.cancel();
      animation = item.animate(
        { height: [startHeight, endHeight] },
        { duration: DURATION, easing: EASING }
      );
      animation.onfinish = function () { finish(false); };
      animation.oncancel = function () { isClosing = false; };
    }

    function openItem() {
      // Referme les autres catégories du même bloc avant d'ouvrir
      // celle-ci — en déclenchant leur propre clic plutôt qu'en
      // appelant closeItem() depuis l'extérieur, chaque <details> garde
      // la responsabilité de son propre état (isClosing, animation…).
      Array.prototype.forEach.call(group.querySelectorAll('.accordion'), function (other) {
        if (other !== item && other.open) other.querySelector('summary').click();
      });

      // Geler la hauteur AVANT de poser [open] : sans ça, le navigateur
      // affiche le contenu déplié instantanément (la hauteur passe à
      // "auto"), et l'animation démarrerait depuis la hauteur finale.
      item.style.overflow = 'hidden';
      item.style.height = item.offsetHeight + 'px';
      item.open = true;
      isExpanding = true;

      // Un cadre d'animation plus tard : la mise en page a eu lieu,
      // .accordion__body a maintenant une hauteur mesurable.
      window.requestAnimationFrame(function () {
        var startHeight = item.offsetHeight + 'px';
        var endHeight = (summary.offsetHeight + body.offsetHeight) + 'px';
        if (animation) animation.cancel();
        animation = item.animate(
          { height: [startHeight, endHeight] },
          { duration: DURATION, easing: EASING }
        );
        animation.onfinish = function () { finish(true); };
        animation.oncancel = function () { isExpanding = false; };
      });
    }

    function finish(open) {
      item.open = open;
      animation = null;
      isClosing = false;
      isExpanding = false;
      item.style.height = '';
      item.style.overflow = '';
    }
  }

  document.querySelectorAll('.accordion-group').forEach(function (group) {
    Array.prototype.forEach.call(group.querySelectorAll('.accordion'), function (item) {
      initItem(item, group);
    });
  });

})();
