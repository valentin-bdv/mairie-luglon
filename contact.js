// ============================================================
// contact.js — Formulaire de contact de /contact/.
//
// MÊME CONTRAT QUE LE FORMULAIRE DE RÉSERVATION : `LUGLON.API_BASE` décide.
// Vide (site servi en statique, GitHub Pages), le message n'est envoyé nulle
// part et on le dit franchement — on ne laisse jamais croire à quelqu'un que
// la mairie a reçu son message. Renseignée, il part vers le serveur.
//
// Fail-open sur la validation : les contrôles ci-dessous servent le confort
// (message immédiat, pas d'aller-retour). Le serveur revalide tout, parce que
// rien n'oblige un client à passer par cette page.
// ============================================================

(function () {

  const form = document.getElementById('form-contact');
  if (!form) return;

  const retour = document.getElementById('c-retour');
  const bouton = document.getElementById('c-envoyer');
  const debutSaisie = Date.now();

  // Le sujet peut arriver pré-choisi depuis les cartes de mairie/signalement/
  // (/contact/?sujet=voirie). On ne l'accepte que s'il correspond à une option
  // réelle : un paramètre d'URL est écrit par n'importe qui.
  const params = new URLSearchParams(location.search);
  const sujet = params.get('sujet');
  const champSujet = document.getElementById('c-sujet');
  if (sujet && [...champSujet.options].some((o) => o.value === sujet)) {
    champSujet.value = sujet;
    // On ne fait PAS défiler ici. Les liens de signalement portent l'ancre
    // « #ecrire » et le navigateur s'en charge nativement : il gère le
    // repositionnement après chargement des polices et des images, ce qu'un
    // scrollIntoView lancé en JavaScript ne fait pas — lancé trop tôt il vise
    // une position périmée, lancé en douceur il se fait annuler par l'ancrage
    // automatique du navigateur. Essayé, raté deux fois, remplacé par une ancre.
  }

  function erreurChamp(id, message) {
    const champ = document.getElementById(id);
    const zone = document.getElementById(id + '-erreur');
    if (zone) zone.textContent = message || '';
    champ.classList.toggle('input-error', !!message);
    champ.setAttribute('aria-invalid', message ? 'true' : 'false');
    return !message;
  }

  function valider() {
    const nom = form.nom.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();
    let bon = true;

    bon = erreurChamp('c-nom', nom ? '' : 'Merci d’indiquer votre nom.') && bon;
    // Volontairement permissif : la seule façon de savoir qu'une adresse existe
    // est de lui écrire. On écarte les fautes de frappe grossières, pas plus.
    bon = erreurChamp('c-email',
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? '' : 'Cette adresse e-mail semble incomplète.') && bon;
    bon = erreurChamp('c-message',
      message.length >= 10 ? '' : 'Merci d’écrire quelques mots de plus.') && bon;
    return bon;
  }

  function afficher(type, texte) {
    retour.textContent = texte;
    retour.className = 'form-message form-message--' + type;
    retour.hidden = false;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    retour.hidden = true;
    if (!valider()) {
      form.querySelector('.input-error').focus();
      return;
    }

    const donnees = {
      nom: form.nom.value.trim(),
      email: form.email.value.trim(),
      telephone: form.telephone.value.trim(),
      sujet: form.sujet.value,
      message: form.message.value.trim(),
      site: form.site.value,                        // piège à robots
      duree_saisie: Math.round((Date.now() - debutSaisie) / 1000),
    };

    const base = (window.LUGLON && window.LUGLON.API_BASE) || '';
    if (!base) {
      // Pas de serveur derrière : on le dit. Afficher « message envoyé » ici
      // serait le pire des mensonges — quelqu'un attendrait une réponse qui ne
      // viendrait jamais.
      afficher('info',
        "Ce site est actuellement une version de démonstration : le message n'a pas été "
        + "envoyé. Pour joindre la mairie, appelez le 05 58 07 50 12.");
      return;
    }

    bouton.disabled = true;
    bouton.textContent = 'Envoi en cours…';
    try {
      const r = await fetch(base + '/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donnees),
      });
      const corps = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(corps.detail || 'Erreur ' + r.status);
      form.reset();
      afficher('succes',
        'Message envoyé. Le secrétariat vous répond aux heures d’ouverture.');
    } catch (err) {
      afficher('erreur',
        'Le message n’a pas pu être envoyé : ' + err.message
        + '. Vous pouvez appeler le 05 58 07 50 12.');
    } finally {
      bouton.disabled = false;
      bouton.textContent = 'Envoyer le message';
    }
  });

})();
