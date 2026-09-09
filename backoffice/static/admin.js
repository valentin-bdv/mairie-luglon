// ============================================================
// admin.js — Comportement de l'application d'administration.
//
// CONTRAT : ce script ne détient aucun secret et n'en fabrique aucun. Il envoie
// un mot de passe une seule fois, à la connexion ; le serveur répond avec un
// cookie HttpOnly que ce script ne peut PAS lire — c'est justement l'intérêt.
// Il n'y a donc rien à voler dans l'application installée chez le client.
//
// Toutes les URL sont RELATIVES à /admin/. Le back-office ne sait pas s'il est
// servi depuis un tunnel Cloudflare, depuis localhost ou depuis le domaine
// définitif, et n'a pas à le savoir : c'est ce qui permet de déployer le même
// fichier partout (même principe qu'API_BASE côté site public).
// ============================================================

(function () {

  const $ = (id) => document.getElementById(id);

  const ecranConnexion = $('ecran-connexion');
  const ecranTravail = $('ecran-travail');
  const horsLigne = $('hors-ligne');
  const boutonDeconnexion = $('deconnexion');

  let enUne = 5;   // remplacé par la valeur du serveur au premier chargement

  // --- Accès réseau --------------------------------------------------------

  async function api(chemin, options = {}) {
    const reponse = await fetch('api/' + chemin, {
      credentials: 'same-origin',
      ...options,
    });
    // Un 401 sur une action veut dire « session expirée » : on renvoie à la
    // connexion plutôt que d'afficher une erreur incompréhensible sur un
    // formulaire. Mais un 401 SUR la connexion veut dire « mot de passe faux » —
    // sans cette exception, une faute de frappe affiche « session expirée » à
    // quelqu'un qui n'a jamais été connecté, ce qui n'a aucun sens pour lui.
    if (reponse.status === 401 && chemin !== 'connexion') {
      montrer('connexion');
      throw new Error('Session expirée, reconnectez-vous.');
    }
    if (!reponse.ok) {
      let message = 'Erreur ' + reponse.status;
      try {
        const corps = await reponse.json();
        if (corps.detail) message = corps.detail;
      } catch (_) { /* réponse non JSON : on garde le message générique */ }
      throw new Error(message);
    }
    return reponse.json();
  }

  function montrer(ecran) {
    ecranConnexion.hidden = ecran !== 'connexion';
    ecranTravail.hidden = ecran !== 'travail';
    boutonDeconnexion.hidden = ecran !== 'travail';
  }

  function erreur(id, message) {
    const el = $(id);
    el.textContent = message;
    el.className = 'erreur';
    el.hidden = false;
  }

  function succes(id, message) {
    const el = $(id);
    el.textContent = message;
    el.className = 'succes';
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 4000);
  }

  // --- Rendu des listes ----------------------------------------------------

  function ligne(titre, detail, archive, surSupprimer) {
    const li = document.createElement('li');

    const infos = document.createElement('div');
    infos.className = 'infos';

    const t = document.createElement('div');
    t.className = 'titre';
    // textContent et non innerHTML : ces valeurs viennent de la base, donc de
    // ce qu'a saisi le secrétariat. Rien de ce qui est tapé dans un champ ne
    // doit pouvoir devenir du balisage exécutable, même de sa part.
    t.textContent = titre;
    if (archive) {
      const marque = document.createElement('span');
      marque.className = 'archive';
      marque.textContent = 'hors sommaire, sur sa page de rubrique';
      t.appendChild(marque);
    }

    const d = document.createElement('div');
    d.className = 'detail';
    d.textContent = detail;

    infos.append(t, d);

    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'supprimer';
    bouton.textContent = 'Supprimer';
    // Confirmation par second clic, sans confirm() : une modale native fige
    // tous les évènements du navigateur. Le bouton devient rouge et le libellé
    // change, l'intention est claire sans bloquer quoi que ce soit.
    bouton.addEventListener('click', async () => {
      if (bouton.dataset.confirme !== '1') {
        bouton.dataset.confirme = '1';
        bouton.textContent = 'Confirmer ?';
        setTimeout(() => {
          bouton.dataset.confirme = '';
          bouton.textContent = 'Supprimer';
        }, 5000);
        return;
      }
      bouton.disabled = true;
      try {
        await surSupprimer();
        await rafraichir();
      } catch (e) {
        bouton.disabled = false;
        alert(e.message);
      }
    });

    li.append(infos, bouton);
    return li;
  }

  function listeVide(ul, message) {
    const li = document.createElement('li');
    li.className = 'vide';
    li.textContent = message;
    ul.appendChild(li);
  }

  function rendreActualites(actualites) {
    const ul = $('liste-actualites');
    ul.textContent = '';
    $('resume-actualites').textContent = actualites.length
      ? `${actualites.length} actualité${actualites.length > 1 ? 's' : ''} en ligne.`
      : '';
    if (!actualites.length) {
      listeVide(ul, 'Aucune actualité publiée.');
      return;
    }
    // Le rang se compte PAR RUBRIQUE, pas sur la liste entière : c'est chaque
    // rubrique qui montre ses cinq premières sur le sommaire. Sans ce compteur,
    // la sixième actualité toutes rubriques confondues serait marquée « hors
    // sommaire » alors qu'elle est peut-être la première de la sienne.
    const rang = {};
    actualites.forEach((a) => {
      rang[a.rubrique] = (rang[a.rubrique] || 0) + 1;
      ul.appendChild(ligne(
        a.titre,
        `${libelleRubrique(a.rubrique)} · ${a.date_evenement}${a.lieu ? ' · ' + a.lieu : ''}`,
        rang[a.rubrique] > enUne,
        () => api('actualites/' + a.id, { method: 'DELETE' })
      ));
    });
  }

  // Le <select> du formulaire porte déjà la correspondance clé → libellé :
  // inutile de la recopier ici, elle divergerait.
  function libelleRubrique(cle) {
    const opt = document.querySelector(`#a-rubrique option[value="${CSS.escape(cle)}"]`);
    return opt ? opt.textContent : cle;
  }

  function rendreDocuments(documents) {
    const ul = $('liste-documents');
    ul.textContent = '';
    if (!documents.length) {
      listeVide(ul, 'Aucun document déposé.');
      return;
    }
    documents.forEach((d) => {
      ul.appendChild(ligne(
        d.titre,
        `${d.rubrique} · ${d.date_document} · ${Math.round(d.taille_octets / 1024)} Ko`,
        false,
        () => api('documents/' + d.id, { method: 'DELETE' })
      ));
    });
  }

  // --- Chargement ----------------------------------------------------------

  async function rafraichir() {
    const etat = await api('etat');
    if (!etat.connecte) {
      montrer('connexion');
      return;
    }
    enUne = etat.en_une;
    rendreActualites(etat.actualites);
    rendreDocuments(etat.documents);
    montrer('travail');
  }

  // --- Formulaires ---------------------------------------------------------

  $('form-connexion').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('erreur-connexion').hidden = true;
    try {
      await api('connexion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mot_de_passe: $('mot_de_passe').value }),
      });
      $('mot_de_passe').value = '';
      await rafraichir();
    } catch (err) {
      erreur('erreur-connexion', err.message);
    }
  });

  boutonDeconnexion.addEventListener('click', async () => {
    try { await api('deconnexion', { method: 'POST' }); } catch (_) { /* sans importance */ }
    montrer('connexion');
  });

  // --- Éditeur de texte ----------------------------------------------------
  //
  // contenteditable + document.execCommand. execCommand est officiellement
  // déconseillé, et pourtant : il est implémenté partout, il gère l'annulation
  // (Ctrl+Z) et la sélection sans une ligne de code, et l'alternative — piloter
  // les Range et Selection à la main — représente des milliers de lignes qu'il
  // faudrait maintenir. Pour une barre d'outils de six boutons dans un outil
  // interne, le compromis est clairement du bon côté.
  //
  // Ce que produit l'éditeur n'a AUCUNE valeur de confiance : le serveur
  // ré-assainit tout à l'enregistrement (backoffice/contenu.py). Ici on cherche
  // le confort de saisie, pas la sécurité.
  const zone = $('a-contenu');

  function conserverSelection(action) {
    // execCommand agit sur la sélection courante : sans ce focus préalable, un
    // clic sur un bouton de la barre a déjà déplacé le curseur hors de la zone
    // et la commande ne s'applique à rien.
    zone.focus();
    action();
  }

  function elementDeBloc() {
    // Remonte de la sélection jusqu'au bloc qui la contient, sans sortir de la
    // zone éditable.
    let n = document.getSelection().anchorNode;
    if (!n) return null;
    if (n.nodeType === 3) n = n.parentNode;
    while (n && n !== zone && !/^(P|H3|H4|LI|BLOCKQUOTE|DIV)$/.test(n.nodeName)) {
      n = n.parentNode;
    }
    return (n && n !== zone) ? n : null;
  }

  document.querySelectorAll('.editeur__barre [data-cmd]').forEach((b) => {
    b.addEventListener('click', () => conserverSelection(
      () => document.execCommand(b.dataset.cmd, false, null)));
  });

  document.querySelectorAll('.editeur__barre [data-bloc]').forEach((b) => {
    b.addEventListener('click', () => conserverSelection(
      () => document.execCommand('formatBlock', false, b.dataset.bloc)));
  });

  // Alignement et couleur passent par des CLASSES du site, jamais par
  // execCommand('justifyCenter') ni ('foreColor') qui posent des styles en
  // ligne — l'assainisseur les retirerait, et la mise en forme serait perdue
  // sans que personne comprenne pourquoi.
  document.querySelectorAll('.editeur__barre [data-classe]').forEach((b) => {
    b.addEventListener('click', () => conserverSelection(() => {
      const bloc = elementDeBloc();
      if (!bloc) return;
      bloc.classList.remove('ta-left', 'ta-center', 'ta-right');
      bloc.classList.add(b.dataset.classe);
    }));
  });

  document.querySelectorAll('.editeur__barre [data-couleur]').forEach((b) => {
    b.addEventListener('click', () => conserverSelection(() => {
      const couleur = b.dataset.couleur;
      const bloc = elementDeBloc();
      if (!bloc) return;
      bloc.classList.remove('co-marine', 'co-discret', 'co-alerte');
      if (couleur) bloc.classList.add(couleur);
    }));
  });

  $('btn-lien').addEventListener('click', () => {
    const url = prompt('Adresse du lien (https://…)');
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      erreur('erreur-actualite', 'Le lien doit commencer par https://');
      return;
    }
    conserverSelection(() => document.execCommand('createLink', false, url));
  });

  // Image : on envoie d'abord le fichier, puis on insère l'URL renvoyée. Aucune
  // image n'est jamais mise en base64 dans le contenu — un JPEG de 2 Mo encodé
  // ferait une ligne de base de 3 Mo, illisible et impossible à mettre en cache.
  $('btn-image').addEventListener('click', () => $('a-image').click());
  $('a-image').addEventListener('change', async () => {
    const champ = $('a-image');
    if (!champ.files.length) return;
    const fd = new FormData();
    fd.append('fichier', champ.files[0]);
    try {
      const r = await api('medias', { method: 'POST', body: fd });
      const img = document.createElement('img');
      img.src = r.url;
      img.alt = '';
      zone.focus();
      document.execCommand('insertHTML', false, img.outerHTML + '<p><br></p>');
    } catch (err) {
      erreur('erreur-actualite', err.message);
    } finally {
      champ.value = '';    // pour pouvoir redéposer le même fichier
    }
  });

  // Collage : on force le texte brut. Un copier-coller depuis Word ou une page
  // web amène des dizaines de balises et de styles en ligne, que l'assainisseur
  // retirerait de toute façon — autant ne pas les laisser entrer, sinon
  // l'aperçu à l'écran ne ressemble pas à ce qui sera publié.
  zone.addEventListener('paste', (e) => {
    e.preventDefault();
    const texte = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, texte);
  });

  $('form-actualite').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('erreur-actualite').hidden = true;
    const f = e.target;
    const bouton = f.querySelector('button[type=submit]');
    bouton.disabled = true;
    try {
      const données = Object.fromEntries(new FormData(f));
      données.contenu = zone.innerHTML;
      await api('actualites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(données),
      });
      f.reset();
      zone.innerHTML = '';
      await rafraichir();
      succes('erreur-actualite', 'Actualité publiée. Elle est en ligne immédiatement.');
    } catch (err) {
      erreur('erreur-actualite', err.message);
    } finally {
      bouton.disabled = false;
    }
  });

  $('form-document').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('erreur-document').hidden = true;
    const f = e.target;
    const bouton = f.querySelector('button[type=submit]');
    bouton.disabled = true;
    try {
      // FormData brut, sans en-tête Content-Type posé à la main : le navigateur
      // doit fabriquer lui-même la frontière multipart. La poser casse l'envoi.
      await api('documents', { method: 'POST', body: new FormData(f) });
      f.reset();
      await rafraichir();
      succes('erreur-document', 'Document déposé. Il est en ligne immédiatement.');
    } catch (err) {
      erreur('erreur-document', err.message);
    } finally {
      bouton.disabled = false;
    }
  });

  // --- Démarrage -----------------------------------------------------------

  rafraichir().catch(() => {
    // Serveur injoignable au lancement : on le dit franchement. Un back-office
    // ne peut pas travailler hors ligne sans inventer de la résolution de
    // conflits — mieux vaut une phrase claire qu'une illusion de fonctionnement.
    horsLigne.hidden = false;
    montrer('connexion');
  });

  if ('serviceWorker' in navigator) {
    // Échec silencieux volontaire : sans service worker l'application reste
    // parfaitement utilisable, elle n'est simplement plus installable.
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

})();
