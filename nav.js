// ============================================================
// nav.js — Barre de navigation : état « scrollé » + panneau mobile
//
// AUCUN ÉCOUTEUR DE SCROLL. L'état rétréci est piloté par un
// IntersectionObserver posé sur une sentinelle de 1px placée en haut
// de page. Un écouteur `scroll` se déclencherait 60 à 120 fois par
// seconde ; combiné au backdrop-filter de la barre, c'est la recette
// classique des saccades sur iOS Safari. Ici : 2 à 4 appels par visite.
//
// À inclure sur les 6 pages : <script src="/nav.js"></script>
// ============================================================

(function () {

  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  // ----------------------------------------------------------
  // 1. État « scrollé » (barre rétrécie + verre)
  // ----------------------------------------------------------
  const sentinel = document.querySelector('.site-nav__sentinel');
  if (sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      function (entries) {
        nav.classList.toggle('is-scrolled', !entries[0].isIntersecting);
      },
      { threshold: 0 }
    ).observe(sentinel);
  }
  // Si IntersectionObserver manque, la barre reste déployée : c'est un
  // état valide, pas une panne.

  // ----------------------------------------------------------
  // 2. Sous-menu « Évènements » — touche Échap uniquement
  //
  // L'ouverture et la fermeture sont 100 % CSS (:hover et
  // :focus-within, voir la section 8 de styles.css). Ce bloc ne gère
  // qu'un seul cas, que le CSS ne sait pas exprimer : Échap doit
  // refermer le menu ET rendre le focus à l'onglet parent. Or rendre le
  // focus au parent le fait matcher :focus-within, ce qui rouvre le menu
  // aussitôt. D'où la classe .is-collapsed, qui force la fermeture le
  // temps que le focus quitte l'élément.
  //
  // Si ce bloc ne s'exécute pas, le menu fonctionne toujours : on perd
  // seulement le raccourci Échap.
  // ----------------------------------------------------------
  const menuItem = nav.querySelector('.site-nav__item--has-menu');
  if (menuItem) {
    const trigger = menuItem.querySelector('a');

    menuItem.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      // Panneau mobile ouvert : Échap doit fermer le PANNEAU, pas le
      // sous-menu (qui y est de toute façon déroulé en permanence).
      // Ce cas est traité par onKeydown ci-dessous, en phase de capture.
      if (nav.classList.contains('is-open')) return;
      e.stopPropagation();
      menuItem.classList.add('is-collapsed');
      if (trigger) trigger.focus();
    });

    // Le focus quitte réellement l'élément : on réarme.
    menuItem.addEventListener('focusout', function (e) {
      if (!menuItem.contains(e.relatedTarget)) {
        menuItem.classList.remove('is-collapsed');
      }
    });
    // La souris ressort : on réarme aussi, sinon un survol suivant
    // resterait sans effet.
    menuItem.addEventListener('mouseleave', function () {
      menuItem.classList.remove('is-collapsed');
    });
  }

  // ----------------------------------------------------------
  // 3. Panneau mobile
  // ----------------------------------------------------------
  const toggle = nav.querySelector('.site-nav__toggle');
  const panel  = document.getElementById('site-nav-panel');
  const scrim  = document.querySelector('.site-nav__scrim');
  if (!toggle || !panel) return;

  let lastFocused = null;

  // getClientRects() et non offsetParent : offsetParent vaut null pour
  // tout élément situé dans un parent position:fixed — c'est le cas ici.
  function focusables() {
    const all = [toggle].concat(
      Array.prototype.slice.call(panel.querySelectorAll('a[href], button:not([disabled])'))
    );
    return all.filter(function (el) { return el.getClientRects().length > 0; });
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      // capture:true + stopPropagation : ce gestionnaire passe AVANT
      // celui de script.js (page réservation), qui écoute en phase de
      // bulle pour fermer ses modales. Sans cela, Échap fermerait les
      // deux à la fois.
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;

    const items = focusables();
    if (items.length < 2) return;
    const first = items[0];
    const last  = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function open() {
    lastFocused = document.activeElement;
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Fermer le menu');
    document.addEventListener('keydown', onKeydown, true);
    const first = panel.querySelector('a[href]');
    if (first) first.focus();
  }

  function close(restoreFocus) {
    if (!nav.classList.contains('is-open')) return;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Ouvrir le menu');
    document.removeEventListener('keydown', onKeydown, true);
    if (restoreFocus === false) return;
    // On rend le focus à ce qui l'avait ; si ce n'est pas un élément
    // focalisable (cas d'une ouverture programmatique, où activeElement vaut
    // <body>), on le rend au bouton — jamais au début du document.
    const target = (lastFocused && lastFocused !== document.body &&
                    lastFocused.getClientRects().length) ? lastFocused : toggle;
    target.focus();
  }

  toggle.addEventListener('click', function () {
    if (nav.classList.contains('is-open')) close(); else open();
  });

  if (scrim) {
    scrim.addEventListener('click', function () { close(); });
  }

  // Clic sur un lien : on ferme sans rendre le focus, on change de page.
  panel.addEventListener('click', function (e) {
    if (e.target.closest('a')) close(false);
  });

  // Retour en desktop alors que le panneau est ouvert.
  const mq = window.matchMedia('(min-width: 860px)');
  function onViewportChange(e) { if (e.matches) close(false); }
  if (mq.addEventListener) mq.addEventListener('change', onViewportChange);
  else if (mq.addListener) mq.addListener(onViewportChange);

})();
