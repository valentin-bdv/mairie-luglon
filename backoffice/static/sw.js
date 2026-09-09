// ============================================================
// sw.js — Service worker du back-office.
//
// SON RÔLE EST VOLONTAIREMENT MINUSCULE : rendre l'application installable et
// la faire s'ouvrir instantanément. Il met en cache la coquille (le HTML de
// l'écran, sa feuille de style, son script) et RIEN D'AUTRE.
//
// LE PIÈGE À NE JAMAIS INTRODUIRE : mettre en cache les réponses de l'API.
// Le secrétariat publierait une actualité, reviendrait le lendemain et verrait
// encore l'ancienne liste — un bug incompréhensible pour lui, pénible à
// diagnostiquer pour vous. Toute requête vers /admin/api/ passe donc au réseau,
// sans exception et sans repli sur le cache.
//
// PAS DE MODE HORS LIGNE : un back-office qui écrit sur un serveur ne peut pas
// fonctionner sans réseau sans inventer de la résolution de conflits. Sans
// connexion, l'application le dit clairement plutôt que de faire semblant.
// ============================================================

const CACHE = 'bo-coquille-v1';

self.addEventListener('install', (e) => {
  // On ne pré-charge rien : la coquille entre au cache à la première visite
  // réussie. Une liste de fichiers à pré-charger, c'est une liste à tenir à
  // jour, et une installation qui échoue entièrement si un seul chemin change.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Données : toujours le réseau. Voir l'avertissement en tête de fichier.
  // Le test porte sur « /api/ » et non « /admin/api/ » : le chemin de
  // l'administration est réglable (config.ADMIN_CHEMIN), écrire « /admin » ici
  // remettrait en cache les réponses de l'API dès qu'on le change — exactement
  // le bug que ce fichier existe pour éviter.
  if (url.pathname.includes('/api/')) return;
  if (e.request.method !== 'GET') return;

  // Coquille : réseau d'abord, cache en secours. Dans ce sens et pas l'inverse
  // — une modification de l'interface doit être visible au rechargement
  // suivant, pas au bout d'un vidage de cache manuel.
  e.respondWith(
    fetch(e.request)
      .then((reponse) => {
        const copie = reponse.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copie));
        return reponse;
      })
      .catch(() => caches.match(e.request))
  );
});
