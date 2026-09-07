// ============================================================
// calendar-export.js — Boutons "Ajouter au calendrier" (pages Actualités)
// Génère un fichier .ics par évènement (compatible Apple Calendar, Google
// Calendar, Outlook...) en un clic, sans dépendance externe.
// À inclure : <script src="/calendar-export.js"></script>
// ============================================================

(function () {

  // *************************************************************************
  // CONFIGURATION DES ÉVÉNEMENTS
  // Modifie ici les dates, horaires, lieux et descriptions au fil des
  // annonces municipales. Format de date JS : new Date(année, mois(0-11), jour, heure, minute)
  // *************************************************************************
  const EVENTS = {
    'conseil-municipal': {
      title: 'Conseil municipal de Luglon',
      start: new Date(2027, 2, 12, 19, 0), // 12 mars 2027, 19h00
      end:   new Date(2027, 2, 12, 21, 0),
      location: 'Salle du conseil, Mairie de Luglon',
      description:
        'Séance publique du conseil municipal — ordre du jour affiché en mairie ' +
        'et publié sur le site quelques jours avant la séance.'
    },
    'ceremonie-11-novembre': {
      title: 'Cérémonie du 11 novembre',
      start: new Date(2026, 10, 11, 11, 0), // 11 novembre 2026, 11h00
      end:   new Date(2026, 10, 11, 12, 0),
      location: 'Monument aux morts, Luglon',
      description:
        'Cérémonie commémorative suivie d\'un vin d\'honneur en mairie.'
    }
  };

  // Formate une date JS en UTC au format iCalendar : YYYYMMDDTHHMMSSZ
  function toICSDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return (
      date.getUTCFullYear() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) + 'T' +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      pad(date.getUTCSeconds()) + 'Z'
    );
  }

  function buildICS(event) {
    const now = toICSDate(new Date());
    const uid = 'luglon-' + event.start.getTime() + '@mairie-luglon.fr';

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mairie de Luglon//Agenda municipal//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + now,
      'DTSTART:' + toICSDate(event.start),
      'DTEND:' + toICSDate(event.end),
      'SUMMARY:' + escapeICS(event.title),
      'LOCATION:' + escapeICS(event.location),
      'DESCRIPTION:' + escapeICS(event.description),
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    return lines.join('\r\n');
  }

  // Échappe les caractères spéciaux requis par le format iCalendar
  function escapeICS(text) {
    return String(text)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
  }

  function downloadICS(dayKey) {
    const event = EVENTS[dayKey];
    if (!event) return;

    const icsContent = buildICS(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'luglon-' + dayKey + '.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Libère l'URL après un court délai pour laisser le téléchargement démarrer
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Attache les écouteurs sur tous les boutons ".btn-add-calendar"
  function attachListeners() {
    document.querySelectorAll('.btn-add-calendar').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dayKey = btn.getAttribute('data-day');
        downloadICS(dayKey);
      });
    });
  }

  // Le script est chargé en fin de <body>, donc le DOM est déjà prêt dans la
  // plupart des cas. On gère tout de même le cas où il serait chargé plus tôt.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachListeners);
  } else {
    attachListeners();
  }

})();
