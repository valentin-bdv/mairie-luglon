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
      marque.textContent = 'dans « Autres actualités »';
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
      ? `${actualites.length} actualité${actualites.length > 1 ? 's' : ''} en ligne, `
        + `dont ${Math.min(enUne, actualites.length)} en grand sur la page Actualités.`
      : '';
    if (!actualites.length) {
      listeVide(ul, 'Aucune actualité publiée.');
      return;
    }
    actualites.forEach((a, i) => {
      ul.appendChild(ligne(
        a.titre,
        `${a.categorie} · ${a.date_evenement}${a.lieu ? ' · ' + a.lieu : ''}`,
        i >= enUne,
        () => api('actualites/' + a.id, { method: 'DELETE' })
      ));
    });
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

  $('form-actualite').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('erreur-actualite').hidden = true;
    const f = e.target;
    const bouton = f.querySelector('button[type=submit]');
    bouton.disabled = true;
    try {
      await api('actualites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(f))),
      });
      f.reset();
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
