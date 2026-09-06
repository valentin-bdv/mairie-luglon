// ============================================================
// rail-dots.js — Points de navigation des rails à défilement magnétique
//
// UN SEUL MÉCANISME PARTOUT : IntersectionObserver avec root = le rail.
//
// L'API dédiée (`scrollsnapchange`) n'existe que sur Chromium et
// Safari 18.2+ ; il faudrait donc de toute façon un repli sur un
// écouteur de scroll anti-rebondi, qui servirait la majorité du trafic.
// Deux implémentations dont la « moderne » n'est qu'un ornement, dans un
// dépôt dont le pire bug historique venait justement de deux chemins de
// code qui divergeaient. Ici : une seule implémentation, la même
// primitive que la sentinelle de la barre de navigation, aucun délai
// d'anti-rebond à régler.
//
// À inclure sur les pages qui ont un rail :
//     <script src="/rail-dots.js"></script>
// ============================================================

(function () {

  function init(rail, dotsBox) {
    if (!rail || !dotsBox) return;

    const cards = Array.prototype.slice.call(rail.children);
    if (cards.length < 2) { dotsBox.hidden = true; return; }

    const dots = cards.map(function (card, i) {
      const b = document.createElement('button');
      b.type = 'button';
      const title = card.querySelector('h2, h3, figcaption');
      b.setAttribute(
        'aria-label',
        'Aller à ' + (title ? title.textContent.trim() : 'l’élément ' + (i + 1))
      );
      b.addEventListener('click', function () {
        card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
      dotsBox.appendChild(b);
      return b;
    });

    function mark(i) {
      dots.forEach(function (d, j) {
        if (j === i) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }
    mark(0);

    if (!('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) mark(cards.indexOf(e.target));
      });
    }, { root: rail, threshold: 0.6 });

    cards.forEach(function (c) { io.observe(c); });
  }

  // DÉCOUVERTE AUTOMATIQUE, plutôt qu'une liste d'identifiants en dur.
  //
  // Ce fichier listait '#day-rail' et '#galerie-rail'. Avec les carrousels
  // ajoutés sur l'accueil, la page Évènements et les fiches d'évènement, il
  // aurait fallu y penser à chaque nouveau rail — et un rail oublié n'aurait
  // simplement PAS de points, sans que rien ne le signale.
  //
  // La convention est désormais structurelle : tout élément .rail dont le
  // frère IMMÉDIATEMENT SUIVANT porte .rail-dots reçoit ses points. Rien à
  // déclarer ici, rien à synchroniser.
  Array.prototype.forEach.call(
    document.querySelectorAll('.rail'),
    function (rail) {
      const next = rail.nextElementSibling;
      if (next && next.classList.contains('rail-dots')) init(rail, next);
    }
  );

})();
