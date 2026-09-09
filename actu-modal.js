// ============================================================
// actu-modal.js — Ouvre une actualité en grand, sans quitter la page.
//
// FAIL-OPEN, comme le reste du site. Chaque carte d'actualité EST DÉJÀ un lien
// vers la page de sa rubrique, où l'actualité s'affiche en entier. Ce script ne
// fait qu'intercepter le clic pour montrer la même chose dans une fenêtre. S'il
// ne s'exécute pas, si le réseau tombe, ou si le site est servi en statique
// (GitHub Pages, où l'API n'existe pas), le clic suit le lien et le visiteur
// arrive au même contenu — un peu moins vite, jamais nulle part.
//
// ATTENTION AU MOMENT DU preventDefault(). Il DOIT être appelé de façon
// synchrone, dans le même tour de boucle que le clic : après un `await`, le
// navigateur a déjà suivi le lien et l'appel n'a plus aucun effet. On coupe donc
// le lien d'abord, et si la requête échoue on refait la navigation à la main.
// Écrit dans l'autre sens, le clic partait vers la page pendant que la modale
// se préparait.
//
// À inclure sur les pages qui portent des .event-card[data-actu-id] :
//     <script src="/mairie-luglon/actu-modal.js"></script>
// ============================================================

(function () {

  const cartes = document.querySelectorAll('.event-card[data-actu-id]');
  if (!cartes.length) return;

  let boite = null;
  let declencheur = null;

  function fermer() {
    if (!boite) return;
    boite.remove();
    boite = null;
    document.body.style.overflow = '';
    // Le focus revient d'où il venait : sans ça, la navigation au clavier
    // repart du haut du document après chaque fermeture.
    if (declencheur) declencheur.focus();
  }

  function ouvrir(donnees) {
    fermer();
    document.body.style.overflow = 'hidden';

    boite = document.createElement('div');
    boite.className = 'modal-overlay actu-modal';
    boite.innerHTML = `
      <div class="modal-box modal-box--actu" role="dialog" aria-modal="true" aria-labelledby="actu-modal-titre">
        <button type="button" class="actu-modal__fermer" aria-label="Fermer">&times;</button>
        <p class="actu-modal__meta"></p>
        <h3 id="actu-modal-titre"></h3>
        <div class="actu-modal__corps actu__corps"></div>
        <p class="actu-modal__lien" hidden><a target="_blank" rel="noopener noreferrer">En savoir plus</a></p>
      </div>`;

    // textContent pour tout ce qui est du texte brut ; innerHTML UNIQUEMENT
    // pour `contenu`, qui a été assaini par le serveur à l'enregistrement
    // (backoffice/contenu.py). C'est le seul champ dans ce cas.
    boite.querySelector('#actu-modal-titre').textContent = donnees.titre;
    boite.querySelector('.actu-modal__meta').textContent =
      [donnees.rubrique, donnees.date, donnees.lieu].filter(Boolean).join(' · ');
    boite.querySelector('.actu-modal__corps').innerHTML = donnees.contenu || '';
    if (donnees.lien_url) {
      const p = boite.querySelector('.actu-modal__lien');
      p.hidden = false;
      p.querySelector('a').href = donnees.lien_url;
    }

    boite.querySelector('.actu-modal__fermer').addEventListener('click', fermer);
    boite.addEventListener('click', (e) => { if (e.target === boite) fermer(); });
    document.body.appendChild(boite);
    boite.querySelector('.actu-modal__fermer').focus();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fermer();
  });

  cartes.forEach((carte) => {
    const lien = carte.querySelector('.event-card__link');
    if (!lien) return;
    lien.addEventListener('click', async (e) => {
      // Ctrl/Cmd + clic, clic du milieu : la personne veut un nouvel onglet.
      // On la laisse faire.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const base = (window.LUGLON && window.LUGLON.API_BASE) || '';
      // API_BASE vide = site servi en statique (GitHub Pages), aucune API
      // derrière. On n'essaie même pas : sans ce test, `fetch('/actualites/5')`
      // atteindrait une PAGE, répondrait 200 avec du HTML, et l'erreur ne se
      // révélerait qu'au moment de lire le JSON.
      if (!base) return;

      e.preventDefault();               // synchrone, sinon sans effet
      declencheur = lien;
      try {
        const r = await fetch(`${base}/actualites/${carte.dataset.actuId}`,
                              { credentials: 'same-origin' });
        if (!r.ok) throw new Error('indisponible');
        ouvrir(await r.json());
      } catch (_) {
        // On a coupé le lien : c'est donc à nous de faire la navigation qu'il
        // aurait faite. Sans cette ligne, un clic sur une carte ne produirait
        // plus rien du tout dès que l'API hoquette.
        window.location.href = lien.href;
      }
    });
  });

})();
