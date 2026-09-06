// ============================================================
// gallery.js — Agrandissement des photos au clic (lightbox)
//
// POURQUOI UN <dialog> ET PAS UNE DIV
// Le navigateur fournit gratuitement, et correctement : le piège à
// focus, la fermeture par Échap, la mise en inertie du reste de la
// page, le retour du focus à l'élément déclencheur, et ::backdrop.
// Réimplémenter tout cela à la main est la manière habituelle de
// produire une modale dont on ne peut plus ressortir au clavier.
//
// FAIL-OPEN, ET MÊME MIEUX
// Chaque photo est déjà un <a href="/images/..."> dans le HTML. Si ce
// fichier est absent, bloqué, ou si <dialog> n'est pas pris en charge,
// le clic ouvre simplement l'image — comportement natif du lien. Ce
// script ne fait qu'INTERCEPTER ce clic pour offrir mieux. Rien à
// masquer, rien à réactiver.
//
// ⚠️ NE PAS réutiliser .modal-overlay / .modal-box de script.js : ces
// classes ont un contrat explicite (ouverture par style.display, que
// script.js relit pour gérer Échap). Deux mécanismes sur les mêmes
// classes finiraient par se marcher dessus.
//
// À inclure sur les pages qui affichent des photos :
//     <script src="/gallery.js"></script>
// ============================================================

(function () {

  const links = document.querySelectorAll('.gallery-figure a[href]');
  if (!links.length) return;

  // Pas de <dialog> utilisable : on ne touche à rien, les liens
  // fonctionnent tels quels.
  const dialog = document.createElement('dialog');
  if (typeof dialog.showModal !== 'function') return;

  dialog.className = 'lightbox';
  dialog.innerHTML =
    '<div class="lightbox__inner">' +
      '<button type="button" class="lightbox__close" aria-label="Fermer">&times;</button>' +
      '<img class="lightbox__img" alt="">' +
      '<p class="lightbox__caption"></p>' +
    '</div>';
  document.body.appendChild(dialog);

  const img     = dialog.querySelector('.lightbox__img');
  const caption = dialog.querySelector('.lightbox__caption');
  const closeBtn = dialog.querySelector('.lightbox__close');

  function open(link) {
    const source = link.querySelector('img');
    img.src = link.getAttribute('href');
    // On reprend le texte alternatif de la vignette : il décrit la même
    // image. Le recopier à la main dans deux attributs, c'est se garantir
    // qu'un des deux finira périmé.
    img.alt = source ? source.alt : '';

    // La légende se trouve à deux endroits selon la présentation :
    //   flux alterné  → un <h3> dans le .gallery-caption voisin
    //   grille        → un <figcaption> dans la <figure> englobante
    // On cherche les deux, dans cet ordre, plutôt que d'imposer une
    // structure unique aux deux mises en page.
    const fig  = link.closest('.gallery-figure');
    const row  = fig && fig.parentElement;
    const label =
      (row && row.querySelector('.gallery-caption h3')) ||
      (link.closest('figure') && link.closest('figure').querySelector('figcaption'));

    caption.textContent = label ? label.textContent.trim() : '';
    caption.hidden = !caption.textContent;

    dialog.showModal();
  }

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      // On laisse passer les gestes d'ouverture dans un nouvel onglet
      // (ctrl/cmd + clic, molette) : intercepter ceux-là est une des
      // façons les plus sûres d'agacer un utilisateur.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      open(link);
    });
  });

  closeBtn.addEventListener('click', function () { dialog.close(); });

  // Clic sur le fond. La cible est le <dialog> lui-même uniquement quand on
  // clique en dehors de .lightbox__inner — un clic sur l'image remonte avec
  // e.target = l'image, et ne ferme donc pas.
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });

  // Libère la source à la fermeture : sinon la photo précédente reste
  // affichée le temps que la suivante se charge, ce qui donne un
  // clignotement à chaque ouverture.
  dialog.addEventListener('close', function () {
    img.removeAttribute('src');
  });

})();
