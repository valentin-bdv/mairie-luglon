// ============================================================
// calendar-export.js — Boutons "Ajouter au calendrier" (page Programme)
// Génère un fichier .ics par jour (compatible Apple Calendar, Google
// Calendar, Outlook...) en un clic, sans dépendance externe.
// À inclure : <script src="/calendar-export.js"></script>
// ============================================================

(function () {

  // *************************************************************************
  // CONFIGURATION DES ÉVÉNEMENTS PAR JOUR
  // Modifie ici les dates, horaires, lieux et descriptions si le programme change.
  // Format de date JS : new Date(année, mois(0-11), jour, heure, minute)
  // *************************************************************************
  const EVENTS = {
    jeudi: {
      title: 'Fêtes de Luglon — Jeudi : Loto Bingo',
      start: new Date(2026, 6, 30, 20, 30), // 30 juillet 2026, 20h30
      end:   new Date(2026, 6, 30, 23, 30),
      location: 'Salle des fêtes, Luglon',
      description:
        '20h30 : LOTO BINGO (nombreux lots) — ' +
        'Buvette + Sandwichs / Frites sur place.'
    },
    vendredi: {
      title: 'Fêtes de Luglon — Vendredi : Ouverture des fêtes',
      start: new Date(2026, 6, 31, 19, 30), // 31 juillet 2026, 19h30
      end:   new Date(2026, 6, 31, 23, 59),
      location: 'Luglon (centre bourg)',
      description:
        '19h30 : Ouverture des fêtes — Remise des clés par le Maire — ' +
        '20h : Banda La Juventud — ' +
        '20h : Repas d\'ouverture — Adulte 14€ | Enfant (-12 ans) 7€ — ' +
        'Macédoine et terrine de saumon, Araignées de porc marinées aux épices ou txistorra + frites, Flan gourmand, Café.'
    },
    samedi: {
      title: 'Fêtes de Luglon — Samedi : Course landaise & Repas du comité',
      start: new Date(2026, 7, 1, 8, 30), // 1er août 2026, 8h30
      end:   new Date(2026, 7, 1, 23, 59),
      location: 'Stade de Luglon',
      description:
        '8h30-12h : Ball-trap, planche au mérite — Menon — ' +
        '16h30 : Course landaise (Ganaderia Maynus) au stade. Adulte 10€ | -18ans 5€ | Gratuit -12ans — ' +
        '20h30-23h30 : Animation musicale avec le groupe Les Tulipes — ' +
        '20h : Repas du comité — Adulte 16€ | Enfant (-12 ans) 8€ — ' +
        'Assiette luglonaise, Entrecôte au brasero et sa sauce maison + frites, Pastis et Crème anglaise, Café.'
    },
    dimanche: {
      title: 'Fêtes de Luglon — Dimanche : Messe, pétanque & feu d\'artifice',
      start: new Date(2026, 7, 2, 11, 0), // 2 août 2026, 11h00
      end:   new Date(2026, 7, 2, 23, 59),
      location: 'Luglon (église, stade et centre bourg)',
      description:
        '11h : Messe en musique avec Sonneur de trompe et Accordéon — ' +
        '12h : Vin d\'honneur offert par la Mairie — ' +
        '14h30 : Concours de pétanque — au stade (inscription sur place) — ' +
        '20h-23h : Animation musicale avec le groupe Soul\'r Rock 82 — ' +
        '20h : Soirée Tapas — 7€ — ' +
        '23h : Feu d\'artifice (selon météo).'
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
    const uid = 'luglon-' + event.start.getTime() + '@cdf-luglon.fr';

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Comite des Fetes de Luglon//Programme 2026//FR',
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
