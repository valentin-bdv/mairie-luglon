// ============================================================
// admin.js — Comportement de l'application d'administration.
//
// CONTRAT : ce script ne détient aucun secret et n'en fabrique aucun. Il envoie
// un mot de passe une seule fois, à la connexion ; le serveur répond avec un
// cookie HttpOnly que ce script ne peut PAS lire — c'est justement l'intérêt.
// Il n'y a donc rien à voler dans l'application installée chez le client.
//
// Toutes les URL sont RELATIVES au dossier de l'administration. Le back-office
// ne sait pas s'il est servi depuis un tunnel Cloudflare, depuis localhost ou
// depuis le domaine définitif, et n'a pas à le savoir : c'est ce qui permet de
// déployer le même fichier partout (même principe qu'API_BASE côté site).
//
// UN SEUL ÉTAT, UN SEUL REDESSIN. `etat` contient tout ce que le serveur sait ;
// `dessiner()` reconstruit l'écran à partir de lui. Aucune fonction ne retouche
// le DOM « au passage » après une action : on écrit en base, on relit, on
// redessine. C'est plus de travail pour le navigateur et beaucoup moins de
// place pour un écran qui ment sur ce qui est réellement publié.
// ============================================================

(function () {

  const $ = (id) => document.getElementById(id);

  let etat = { connecte: false, actualites: [], documents: [],
               rubriques_actualites: [], rubriques_documents: [], en_une: 5 };
  let ongletCourant = 'actualites';
  let actualiteEnEdition = null;   // null = création
  let documentEnEdition = null;
  let categorieEnEdition = null;

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
      montrerEcran('connexion');
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

  // --- Écrans et panneaux --------------------------------------------------

  function montrerEcran(quoi) {
    const connecte = quoi !== 'connexion';
    $('ecran-connexion').hidden = connecte;
    $('onglets').hidden = !connecte;
    $('deconnexion').hidden = !connecte;
    $('onglet-actualites').hidden = !connecte || ongletCourant !== 'actualites';
    $('onglet-documents').hidden = !connecte || ongletCourant !== 'documents';
  }

  function ouvrirPanneau(id) {
    document.querySelectorAll('.panneau').forEach((p) => { p.hidden = p.id !== id; });
    $('voile').hidden = false;
    // Le focus part sur le premier champ : sans ça, la tabulation repart du
    // haut du document, c'est-à-dire derrière le panneau.
    const premier = $(id).querySelector('input, select, textarea, button');
    if (premier) premier.focus();
  }

  // Appelé à la fermeture, pour qu'une promesse en attente (confirmer()) ne
  // reste pas suspendue si la personne ferme le panneau au lieu de répondre.
  let panneauFerme = null;

  function fermerPanneau() {
    $('voile').hidden = true;
    document.querySelectorAll('.panneau').forEach((p) => { p.hidden = true; });
    const rappel = panneauFerme;
    panneauFerme = null;
    if (rappel) rappel();
  }

  document.addEventListener('click', (e) => {
    const ouvrir = e.target.closest('[data-ouvrir]');
    if (ouvrir) {
      const id = ouvrir.dataset.ouvrir;
      if (id === 'form-actualite') preparerFormActualite(null);
      if (id === 'form-document') preparerFormDocument(null);
      ouvrirPanneau(id);
      return;
    }
    if (e.target.closest('[data-fermer]')) fermerPanneau();
    // Clic sur le voile lui-même (pas sur un panneau) = fermeture.
    if (e.target === $('voile')) fermerPanneau();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('voile').hidden) fermerPanneau();
  });

  document.querySelectorAll('.onglet').forEach((b) => {
    b.addEventListener('click', () => {
      ongletCourant = b.dataset.onglet;
      document.querySelectorAll('.onglet').forEach((o) => {
        if (o.dataset.onglet === ongletCourant) o.setAttribute('aria-current', 'page');
        else o.removeAttribute('aria-current');
      });
      montrerEcran('travail');
    });
  });

  function erreur(id, message) {
    const el2 = $(id);
    el2.textContent = message;
    el2.className = 'erreur';
    el2.hidden = false;
  }

  function succes(id, message) {
    const el2 = $(id);
    el2.textContent = message;
    el2.className = 'succes';
    el2.hidden = false;
    setTimeout(() => { el2.hidden = true; }, 4000);
  }

  // --- Fabrique de petits éléments ----------------------------------------

  function el(balise, classe, texte) {
    const n = document.createElement(balise);
    if (classe) n.className = classe;
    // textContent et non innerHTML : ces valeurs viennent de la base, donc de
    // ce qu'a saisi le secrétariat. Rien de ce qui est tapé dans un champ ne
    // doit pouvoir devenir du balisage exécutable, même de sa part.
    if (texte !== undefined) n.textContent = texte;
    return n;
  }

  function boutonIcone(classe, titre, surClic) {
    const b = el('button', 'icone ' + classe);
    b.type = 'button';
    b.title = titre;
    b.setAttribute('aria-label', titre);
    b.addEventListener('click', (e) => { e.stopPropagation(); surClic(b); });
    return b;
  }

  // AUCUNE BOÎTE DE DIALOGUE NATIVE DANS CETTE APPLICATION. Ni confirm(), ni
  // prompt(), ni alert() : elles sont impossibles à styler, elles n'ont rien à
  // voir avec le reste de l'écran, et elles figent tous les évènements du
  // navigateur. Tout passe par les panneaux du document.
  //
  // `confirmer()` rend une promesse : le code appelant s'écrit du haut vers le
  // bas comme avec confirm(), sans imbriquer des fonctions de rappel.
  function confirmer(message) {
    return new Promise((resoudre) => {
      $('confirmer-message').textContent = message;
      const oui = $('confirmer-oui');
      // On remplace le bouton par un clone : ça détache d'un coup tous les
      // écouteurs de l'appel précédent. Sans ça, une deuxième confirmation
      // déclencherait aussi la suppression de la première.
      const neuf = oui.cloneNode(true);
      oui.replaceWith(neuf);
      neuf.addEventListener('click', () => { fermerPanneau(); resoudre(true); });
      panneauFerme = () => resoudre(false);
      ouvrirPanneau('confirmer');
    });
  }

  function boutonSupprimer(quoi, surSupprimer) {
    return boutonIcone('icone--supprimer', 'Supprimer ' + quoi, async (b) => {
      if (!await confirmer('Supprimer ' + quoi + ' ? Cette action est définitive.')) return;
      b.disabled = true;
      try { await surSupprimer(); await rafraichir(); }
      catch (err) { b.disabled = false; signaler(err.message); }
    });
  }

  // Erreur qui n'a pas de champ où s'afficher (une suppression, par exemple).
  // Elle réutilise le panneau de confirmation, sans le bouton d'action.
  function signaler(message) {
    $('confirmer-titre').textContent = 'Impossible';
    $('confirmer-message').textContent = message;
    $('confirmer-oui').hidden = true;
    ouvrirPanneau('confirmer');
    panneauFerme = () => {
      $('confirmer-titre').textContent = 'Confirmer la suppression';
      $('confirmer-oui').hidden = false;
    };
  }

  // --- Rails horizontaux ---------------------------------------------------
  // Une catégorie peut contenir deux cents actualités. Les empiler
  // verticalement rendrait la page interminable ; elles défilent latéralement,
  // comme sur mobile. Les flèches servent à la souris, le doigt et la molette
  // font le reste tout seuls.

  function rail(cartes) {
    const enveloppe = el('div', 'rail-admin');
    const piste = el('div', 'rail-admin__piste');
    cartes.forEach((c) => piste.appendChild(c));

    const glisser = (sens) => {
      // On défile d'un peu moins d'une largeur visible : garder une carte
      // commune entre deux écrans évite de perdre le fil.
      piste.scrollBy({ left: sens * piste.clientWidth * 0.85, behavior: 'smooth' });
    };
    const gauche = boutonIcone('rail-admin__fleche rail-admin__fleche--gauche',
                               'Voir les plus récentes', () => glisser(-1));
    const droite = boutonIcone('rail-admin__fleche rail-admin__fleche--droite',
                               'Voir les plus anciennes', () => glisser(1));

    // Les flèches ne servent à rien si tout tient à l'écran : on les cache
    // plutôt que de les laisser inertes, ce qui donnerait l'impression d'un
    // bouton cassé.
    const ajuster = () => {
      const debordement = piste.scrollWidth > piste.clientWidth + 4;
      gauche.hidden = !debordement || piste.scrollLeft <= 2;
      droite.hidden = !debordement ||
        piste.scrollLeft >= piste.scrollWidth - piste.clientWidth - 2;
    };
    piste.addEventListener('scroll', ajuster);
    window.addEventListener('resize', ajuster);
    setTimeout(ajuster, 0);      // après insertion dans le document

    enveloppe.append(gauche, piste, droite);
    return enveloppe;
  }

  // --- Onglet Actualités ---------------------------------------------------

  function carteActualite(a, rangDansRubrique) {
    const c = el('article', 'carte-mini');
    c.tabIndex = 0;
    c.setAttribute('role', 'button');
    c.setAttribute('aria-label', 'Ouvrir « ' + a.titre + ' »');

    const haut = el('div', 'carte-mini__haut');
    haut.appendChild(el('span', 'carte-mini__date', a.date_evenement));
    if (rangDansRubrique > etat.en_une) {
      haut.appendChild(el('span', 'carte-mini__marque', 'hors sommaire'));
    }
    c.appendChild(haut);
    c.appendChild(el('h3', 'carte-mini__titre', a.titre));
    c.appendChild(el('p', 'carte-mini__extrait', a.extrait));

    const actions = el('div', 'carte-mini__actions');
    actions.appendChild(boutonIcone('icone--modifier', 'Modifier cette actualité', () => {
      preparerFormActualite(a);
      ouvrirPanneau('form-actualite');
    }));
    actions.appendChild(boutonSupprimer('cette actualité',
      () => api('actualites/' + a.id, { method: 'DELETE' })));
    c.appendChild(actions);

    const ouvrir = () => apercu(a);
    c.addEventListener('click', ouvrir);
    c.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); }
    });
    return c;
  }

  function dessinerActualites() {
    const hote = $('listes-actualites');
    hote.textContent = '';
    $('resume-actualites').textContent = etat.actualites.length
      ? `${etat.actualites.length} actualité${etat.actualites.length > 1 ? 's' : ''} en ligne, `
        + `dans ${etat.rubriques_actualites.length} catégorie${etat.rubriques_actualites.length > 1 ? 's' : ''}.`
      : 'Aucune actualité publiée pour le moment.';

    if (!etat.rubriques_actualites.length) {
      hote.appendChild(el('p', 'vide', 'Aucune catégorie : créez-en une pour pouvoir publier.'));
      return;
    }

    etat.rubriques_actualites.forEach((r) => {
      const bloc = el('section', 'bloc');
      const tete = el('div', 'bloc__tete');
      tete.appendChild(el('h2', null, r.libelle));
      const dans = etat.actualites.filter((a) => a.rubrique === r.cle);
      tete.appendChild(el('span', 'compteur', String(dans.length)));
      bloc.appendChild(tete);

      if (!dans.length) {
        bloc.appendChild(el('p', 'vide', 'Aucune actualité dans cette catégorie.'));
      } else {
        bloc.appendChild(rail(dans.map((a, i) => carteActualite(a, i + 1))));
      }
      hote.appendChild(bloc);
    });
  }

  // --- Onglet Documents ----------------------------------------------------

  function carteDocument(d) {
    const c = el('article', 'carte-mini');
    const haut = el('div', 'carte-mini__haut');
    haut.appendChild(el('span', 'carte-mini__date', d.date_document));
    c.appendChild(haut);
    c.appendChild(el('h3', 'carte-mini__titre', d.titre));
    c.appendChild(el('p', 'carte-mini__extrait',
      `PDF · ${d.taille_octets < 1024 ? 'moins de 1' : Math.round(d.taille_octets / 1024)} Ko`));

    const actions = el('div', 'carte-mini__actions');
    const voir = el('a', 'icone icone--voir');
    voir.href = '../documents/' + d.fichier;
    voir.target = '_blank';
    voir.rel = 'noopener';
    voir.title = 'Ouvrir le PDF';
    voir.setAttribute('aria-label', 'Ouvrir le PDF');
    actions.appendChild(voir);
    actions.appendChild(boutonIcone('icone--modifier', 'Modifier ce document', () => {
      preparerFormDocument(d);
      ouvrirPanneau('form-document');
    }));
    actions.appendChild(boutonSupprimer('ce document',
      () => api('documents/' + d.id, { method: 'DELETE' })));
    c.appendChild(actions);
    return c;
  }

  function dessinerDocuments() {
    const hote = $('listes-documents');
    hote.textContent = '';
    $('resume-documents').textContent = etat.documents.length
      ? `${etat.documents.length} document${etat.documents.length > 1 ? 's' : ''} en ligne.`
      : 'Aucun document déposé pour le moment.';

    if (!etat.rubriques_documents.length) {
      hote.appendChild(el('p', 'vide', 'Aucune catégorie : créez-en une pour pouvoir déposer.'));
      return;
    }

    etat.rubriques_documents.forEach((r) => {
      const bloc = el('section', 'bloc');
      const tete = el('div', 'bloc__tete');
      tete.appendChild(el('h2', null, r.libelle));
      const dans = etat.documents.filter((d) => d.rubrique === r.cle);
      tete.appendChild(el('span', 'compteur', String(dans.length)));
      bloc.appendChild(tete);

      if (!dans.length) {
        bloc.appendChild(el('p', 'vide', 'Aucun document dans cette catégorie.'));
      } else {
        bloc.appendChild(rail(dans.map(carteDocument)));
      }
      hote.appendChild(bloc);
    });
  }

  // --- Aperçu d'une actualité ---------------------------------------------

  function apercu(a) {
    $('apercu-titre').textContent = a.titre;
    const r = etat.rubriques_actualites.find((x) => x.cle === a.rubrique);
    $('apercu-meta').textContent =
      [r ? r.libelle : a.rubrique, a.date_evenement, a.lieu].filter(Boolean).join(' · ');
    // innerHTML ici est délibéré et sûr : `contenu` a été assaini par le
    // serveur à l'enregistrement (backoffice/contenu.py), et c'est le SEUL
    // champ dans ce cas. Titre, lieu et extrait passent par textContent — eux
    // sont du texte brut.
    $('apercu-contenu').innerHTML = a.contenu || '';
    $('apercu-modifier').onclick = () => {
      preparerFormActualite(a);
      ouvrirPanneau('form-actualite');
    };
    ouvrirPanneau('apercu');
  }

  // --- Listes déroulantes de catégories ------------------------------------

  function remplirSelect(select, rubriques, valeur) {
    select.textContent = '';
    rubriques.forEach((r) => {
      const o = document.createElement('option');
      o.value = r.cle;
      o.textContent = r.libelle;
      select.appendChild(o);
    });
    if (valeur) select.value = valeur;
  }

  // --- Formulaires actualité / document ------------------------------------

  function preparerFormActualite(a) {
    actualiteEnEdition = a;
    $('form-actualite-titre').textContent = a ? "Modifier l'actualité" : 'Nouvelle actualité';
    $('a-envoyer').textContent = a ? 'Enregistrer les modifications' : "Publier l'actualité";
    $('erreur-actualite').hidden = true;
    remplirSelect($('a-rubrique'), etat.rubriques_actualites, a ? a.rubrique : null);
    $('a-titre').value = a ? a.titre : '';
    $('a-date').value = a ? a.date_evenement : '';
    $('a-lieu').value = a ? (a.lieu || '') : '';
    $('a-lien-url').value = a ? (a.lien_url || '') : '';
    $('a-contenu').innerHTML = a ? (a.contenu || '') : '';
  }

  function preparerFormDocument(d) {
    documentEnEdition = d;
    $('form-document-titre').textContent = d ? 'Modifier le document' : 'Nouveau document';
    $('d-envoyer').textContent = d ? 'Enregistrer les modifications' : 'Déposer le document';
    $('erreur-document').hidden = true;
    remplirSelect($('d-rubrique'), etat.rubriques_documents, d ? d.rubrique : null);
    $('d-titre').value = d ? d.titre : '';
    $('d-date').value = d ? d.date_document : '';
    // En modification, le fichier n'est pas remplaçable : le champ disparaît
    // plutôt que d'être présent et sans effet, ce qui laisserait croire qu'on
    // peut changer le PDF.
    $('champ-fichier').hidden = !!d;
    $('d-fichier').required = !d;
    $('d-fichier').value = '';
  }

  // --- Catégories ----------------------------------------------------------

  function dessinerCategories(famille) {
    const ul = $('liste-cat-' + famille);
    const rubriques = etat['rubriques_' + famille];
    const contenus = famille === 'actualites' ? etat.actualites : etat.documents;
    ul.textContent = '';
    if (!rubriques.length) {
      ul.appendChild(el('li', 'vide', 'Aucune catégorie pour le moment.'));
      return;
    }
    rubriques.forEach((r) => {
      const li = el('li');
      const infos = el('div', 'infos');
      const combien = contenus.filter((c) => c.rubrique === r.cle).length;
      infos.appendChild(el('div', 'titre', r.libelle));
      infos.appendChild(el('div', 'detail',
        `/${r.cle}/ · ${combien} élément${combien > 1 ? 's' : ''}`));
      if (r.description) infos.appendChild(el('div', 'detail', r.description));
      li.appendChild(infos);

      li.appendChild(boutonIcone('icone--modifier', 'Modifier cette catégorie', () => {
        categorieEnEdition = { famille, cle: r.cle };
        $('c-libelle').value = r.libelle;
        $('c-desc').value = r.description || '';
        $('erreur-cat-modif').hidden = true;
        ouvrirPanneau('form-categorie');
      }));
      li.appendChild(boutonSupprimer('cette catégorie',
        () => api(`rubriques/${famille}/${r.cle}`, { method: 'DELETE' })));
      ul.appendChild(li);
    });
  }

  $('form-cat-modif').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('erreur-cat-modif').hidden = true;
    const { famille, cle } = categorieEnEdition;
    try {
      await api(`rubriques/${famille}/${cle}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
      });
      fermerPanneau();
      await rafraichir();
      ouvrirPanneau('cat-' + famille);
    } catch (err) {
      erreur('erreur-cat-modif', err.message);
    }
  });

  document.querySelectorAll('.form-categorie').forEach((f) => {
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const famille = f.dataset.famille;
      $('erreur-cat-' + famille).hidden = true;
      try {
        await api('rubriques/' + famille, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(f))),
        });
        f.reset();
        await rafraichir();
        succes('erreur-cat-' + famille, 'Catégorie créée. Sa page existe déjà sur le site.');
      } catch (err) {
        erreur('erreur-cat-' + famille, err.message);
      }
    });
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

  // Niveau de texte, type de liste et couleur sont des CHOIX EXCLUSIFS : un
  // paragraphe est normal OU un titre, une liste est à puces OU numérotée, un
  // texte porte une couleur OU aucune. Une liste déroulante dit cela d'elle-même
  // et tient en une ligne, là où neuf boutons alignés obligeaient à deviner
  // lesquels s'annulent entre eux — et remplissaient la barre.

  $('ed-bloc').addEventListener('change', (e) => {
    conserverSelection(() => document.execCommand('formatBlock', false, e.target.value));
  });

  $('ed-liste').addEventListener('change', (e) => {
    const voulue = e.target.value;
    conserverSelection(() => {
      // execCommand bascule : rappeler la commande d'une liste déjà active la
      // retire. On désactive donc l'existante avant d'appliquer la nouvelle,
      // sinon passer de « à puces » à « numérotée » donnait deux listes
      // imbriquées.
      if (document.queryCommandState('insertUnorderedList')) {
        document.execCommand('insertUnorderedList');
      } else if (document.queryCommandState('insertOrderedList')) {
        document.execCommand('insertOrderedList');
      }
      if (voulue) document.execCommand(voulue);
    });
  });

  // Alignement et couleur passent par des CLASSES du site, jamais par
  // execCommand('justifyCenter') ni ('foreColor') qui posent des styles en
  // ligne — l'assainisseur les retirerait, et la mise en forme serait perdue
  // sans que personne comprenne pourquoi.
  function appliquerClasse(groupe, classe) {
    conserverSelection(() => {
      const bloc = elementDeBloc();
      if (!bloc) return;
      bloc.classList.remove(...groupe);
      if (classe) bloc.classList.add(classe);
    });
  }

  const ALIGNEMENTS = ['ta-left', 'ta-center', 'ta-right'];
  const COULEURS = ['co-marine', 'co-discret', 'co-alerte'];

  document.querySelectorAll('.editeur__barre [data-classe]').forEach((b) => {
    b.addEventListener('click', () => appliquerClasse(ALIGNEMENTS, b.dataset.classe));
  });

  // --- Choix de couleur ----------------------------------------------------
  const declencheur = $('ed-couleur-bouton');
  const menuCouleur = $('ed-couleur-menu');
  const carreActuel = $('ed-couleur-actuelle');

  function fermerCouleurs() {
    menuCouleur.hidden = true;
    declencheur.setAttribute('aria-expanded', 'false');
  }

  declencheur.addEventListener('click', (e) => {
    e.stopPropagation();
    const ouvert = menuCouleur.hidden;
    menuCouleur.hidden = !ouvert;
    declencheur.setAttribute('aria-expanded', String(ouvert));
  });

  menuCouleur.querySelectorAll('[data-couleur]').forEach((b) => {
    b.addEventListener('click', () => {
      appliquerClasse(COULEURS, b.dataset.couleur);
      carreActuel.dataset.couleur = b.dataset.couleur;
      fermerCouleurs();
    });
  });

  // Un menu ouvert doit se refermer au clic ailleurs et à Échap, sinon il
  // reste pendu au-dessus du texte pendant qu'on écrit.
  document.addEventListener('click', fermerCouleurs);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermerCouleurs(); });

  // Les listes déroulantes reflètent ce qu'on vient de sélectionner. Sans ça,
  // elles afficheraient « Normal » au milieu d'un titre — un menu qui ment sur
  // l'état courant est pire que pas de menu du tout.
  document.addEventListener('selectionchange', () => {
    if (!zone.contains(document.getSelection().anchorNode)) return;
    const bloc = elementDeBloc();
    $('ed-bloc').value = bloc && /^H3|H4$/.test(bloc.nodeName) ? bloc.nodeName.toLowerCase() : 'p';
    $('ed-liste').value = document.queryCommandState('insertUnorderedList') ? 'insertUnorderedList'
                        : document.queryCommandState('insertOrderedList') ? 'insertOrderedList' : '';
    carreActuel.dataset.couleur = bloc ? (COULEURS.find((c) => bloc.classList.contains(c)) || '') : '';
  });

  // Le lien passe par un champ du panneau, pas par prompt(). Voir confirmer().
  $('btn-lien').addEventListener('click', () => {
    const champ = $('a-lien-url');
    const url = champ.value.trim();
    if (!/^https?:\/\//i.test(url)) {
      erreur('erreur-actualite',
             'Écrivez d\'abord l\'adresse dans le champ « Lien » en bas du formulaire, '
             + 'puis sélectionnez le texte et cliquez sur Lien.');
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

  // --- Envois --------------------------------------------------------------

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

  $('deconnexion').addEventListener('click', async () => {
    try { await api('deconnexion', { method: 'POST' }); } catch (_) { /* sans importance */ }
    montrerEcran('connexion');
  });

  $('form-actu').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('erreur-actualite').hidden = true;
    const bouton = $('a-envoyer');
    bouton.disabled = true;
    try {
      const données = Object.fromEntries(new FormData(e.target));
      données.contenu = zone.innerHTML;
      const enEdition = actualiteEnEdition;
      await api(enEdition ? 'actualites/' + enEdition.id : 'actualites', {
        method: enEdition ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(données),
      });
      fermerPanneau();
      await rafraichir();
    } catch (err) {
      erreur('erreur-actualite', err.message);
    } finally {
      bouton.disabled = false;
    }
  });

  $('form-doc').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('erreur-document').hidden = true;
    const bouton = $('d-envoyer');
    bouton.disabled = true;
    try {
      if (documentEnEdition) {
        const données = Object.fromEntries(new FormData(e.target));
        delete données.fichier;
        await api('documents/' + documentEnEdition.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(données),
        });
      } else {
        // FormData brut, sans en-tête Content-Type posé à la main : le
        // navigateur doit fabriquer lui-même la frontière multipart. La poser
        // casse l'envoi.
        await api('documents', { method: 'POST', body: new FormData(e.target) });
      }
      fermerPanneau();
      await rafraichir();
    } catch (err) {
      erreur('erreur-document', err.message);
    } finally {
      bouton.disabled = false;
    }
  });

  // --- Chargement ----------------------------------------------------------

  function dessiner() {
    dessinerActualites();
    dessinerDocuments();
    dessinerCategories('actualites');
    dessinerCategories('documents');
    montrerEcran('travail');
  }

  async function rafraichir() {
    etat = await api('etat');
    if (!etat.connecte) { montrerEcran('connexion'); return; }
    dessiner();
  }

  rafraichir().catch(() => {
    // Serveur injoignable au lancement : on le dit franchement. Un back-office
    // ne peut pas travailler hors ligne sans inventer de la résolution de
    // conflits — mieux vaut une phrase claire qu'une illusion de fonctionnement.
    $('hors-ligne').hidden = false;
    montrerEcran('connexion');
  });

  if ('serviceWorker' in navigator) {
    // Échec silencieux volontaire : sans service worker l'application reste
    // parfaitement utilisable, elle n'est simplement plus installable.
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

})();
