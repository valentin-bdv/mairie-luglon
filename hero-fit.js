/* AJUSTE LA TAILLE DU TITRE DE HÉROS POUR TENIR SUR 2 LIGNES MAXIMUM, ET
   RÉDUIT LE SOUS-TITRE EN PROPORTION QUAND C'ÉTAIT NÉCESSAIRE.

   .main-title n'a qu'une taille par palier de largeur d'écran (9rem desktop,
   4rem mobile, voir styles.css section 4) : ça marche pour un titre court
   ("CONTACT"), mais un titre plus long ("ARRÊTÉS MUNICIPAUX ET
   PRÉFECTORAUX") peut déborder sur 3 lignes ou plus selon la largeur réelle
   de la fenêtre, alors que le héros n'est prévu que pour 2. Plutôt qu'un
   plafond fixe par page (fragile : il faudrait le recalculer à chaque
   nouveau titre), ce script mesure le rendu réel et réduit la taille de
   police par petits paliers jusqu'à ce que le titre tienne sur 2 lignes — ou
   jusqu'à un plancher de lisibilité, pour qu'un titre extrêmement long ne
   finisse pas illisible plutôt que sur 3 lignes.

   .main-subtitle est superposé sur le tout début du titre par une marge
   négative en em (voir styles.css) : sa taille (--fs-sm) suppose un titre à
   sa taille CSS normale. Si fitTitle() a dû beaucoup réduire un titre très
   long, garder le sous-titre à sa taille fixe le fait grossir au même
   gabarit que le titre rétréci — les deux deviennent une bouillie de texte
   superposé à poids égal, illisible. fitSubtitle() le réduit donc en
   proportion de la taille RÉELLE du titre, jamais au-delà de sa taille CSS
   par défaut (un titre normal ne change donc jamais rien pour lui).

   Fail-open : si ce script ne s'exécute pas, .main-title et .main-subtitle
   gardent leur taille CSS normale (le comportement d'avant ce script) — un
   titre long déborde alors sur plus de 2 lignes, jamais un titre invisible
   ou tronqué. */
(function () {
  var MIN_TITLE_PX = 24;
  var MIN_SUBTITLE_PX = 11;
  var SUBTITLE_RATIO = 0.3;
  var MAX_STEPS = 30;

  function currentLineHeightPx(el) {
    var lh = parseFloat(getComputedStyle(el).lineHeight);
    // 'normal' ne se résout pas toujours en px selon le navigateur ; secours
    // sur le ratio réellement posé dans styles.css (line-height: 1.1).
    return isNaN(lh) ? parseFloat(getComputedStyle(el).fontSize) * 1.1 : lh;
  }

  function fitTitle(el) {
    el.style.fontSize = ""; // repart de la taille CSS avant de mesurer
    var fontSize = parseFloat(getComputedStyle(el).fontSize);
    var maxHeight = currentLineHeightPx(el) * 2;
    var steps = MAX_STEPS;

    while (el.scrollHeight > maxHeight + 1 && fontSize > MIN_TITLE_PX && steps-- > 0) {
      fontSize -= Math.max(1, fontSize * 0.04);
      el.style.fontSize = fontSize + "px";
      maxHeight = currentLineHeightPx(el) * 2;
    }
  }

  function fitSubtitle(titleEl, subEl) {
    if (!subEl) return;
    subEl.style.fontSize = ""; // repart de --fs-sm avant de mesurer
    var defaultPx = parseFloat(getComputedStyle(subEl).fontSize);
    var titlePx = parseFloat(getComputedStyle(titleEl).fontSize);
    var target = Math.max(MIN_SUBTITLE_PX, Math.min(defaultPx, titlePx * SUBTITLE_RATIO));
    if (target < defaultPx - 0.5) {
      subEl.style.fontSize = target + "px";
    }
  }

  function fitAll() {
    document.querySelectorAll(".main-title").forEach(function (title) {
      fitTitle(title);
      var hero = title.closest(".hero-content");
      fitSubtitle(title, hero && hero.querySelector(".main-subtitle"));
    });
  }

  fitAll();

  // Les polices auto-hébergées peuvent finir de charger après cette première
  // mesure et changer la largeur réelle du texte (glyphes différents de la
  // police de secours) : on remesure une fois qu'elles sont prêtes.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitAll);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitAll, 150);
  });
})();
