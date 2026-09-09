# Back-office

Petite application d'administration pour le site : publier des actualités,
déposer des PDF, supprimer les uns et les autres. Base SQLite, aucune
dépendance lourde, aucune brique à administrer.

Elle sert **aussi le site** : c'est une seule application FastAPI qui rend trois
pages, expose l'API du back-office, et sert les fichiers statiques du reste du
site. Même origine partout — c'est ce qui évite le CORS, garde la politique de
sécurité du site inchangée, et permet au cookie de session de fonctionner sans
configuration.

## Ce qui est piloté depuis l'administration

| Zone publique | Source |
|---|---|
| `/actualites/` | base — les **5** plus proches dans le temps, en grand |
| `/actualites/autres/` | base — toutes les suivantes, automatiquement |
| `/mairie/arretes-et-publications/` | base — arrêtés municipaux, préfectoraux, bulletins |

Le reste du site (21 pages) est inchangé : ce sont toujours des fichiers HTML,
servis tels quels. Seules les zones qui bougent entre deux visites du
secrétariat ont été converties.

**La bascule vers « Autres actualités » est automatique.** Personne ne déplace
rien : au-delà de `ACTUALITES_EN_UNE`, les actualités les plus lointaines
sortent seules de la page principale. C'est une requête, pas un rangement.

## Démarrer

```sh
python3 -m venv .venv && . .venv/bin/activate
pip install fastapi uvicorn jinja2 python-multipart

# Mot de passe : le condensat va dans l'environnement, JAMAIS dans le dépôt.
python3 -m backoffice.auth          # affiche la ligne export à copier
export BO_MOT_DE_PASSE_HACHE='pbkdf2-sha256$...'

python3 -m uvicorn backoffice.app:app --port 8000
```

Le site est sur `http://localhost:8000/mairie-luglon/`, l'administration sur
`.../admin/`. En local, en HTTP, ajoutez `BO_COOKIE_SECURE=0` — sinon le cookie
de session exige HTTPS et la connexion échoue sans message clair.

Sans `BO_MOT_DE_PASSE_HACHE`, l'application **refuse de démarrer**. C'est
volontaire : un back-office qui publie sur le site d'une mairie ne tourne pas
avec un mot de passe par défaut, même « le temps des tests ».

## Depuis un téléphone

```sh
cloudflared tunnel --url http://localhost:8000
```

Le tunnel donne une URL publique en HTTPS. L'application ne sait pas d'où elle
est servie et n'a pas à le savoir : toutes ses URL sont relatives. Attention, le
TLS se termine chez Cloudflare, qui voit donc passer le mot de passe — avec un
mot de passe de test, pas celui du client.

## Installer l'application chez le client

Ouvrir `.../admin/` dans Chrome ou Edge, puis « Installer ». Elle obtient une
icône sur le bureau, une entrée dans la barre des tâches et sa propre fenêtre,
sans barre d'adresse. Sur macOS, Safari propose « Ajouter au Dock ».

L'installation exige HTTPS : elle fonctionne derrière le tunnel et sur OVH,
jamais sur `http://localhost` en réseau local.

## Reproduire chez un autre client

Tout ce qui est propre à Luglon tient dans **`config.py`** : nom du site, URL
canonique, préfixe d'URL, nombre d'actualités en une, rubriques de documents.
Aucun autre module Python ne contient de nom de commune — si vous en trouvez
un, c'est une fuite à corriger.

Les **gabarits de `templates/`** sont, eux, forcément spécifiques : ce sont les
pages du client. Pour un autre client on les remplace. Chercher à les rendre
génériques reviendrait à écrire un moteur de gabarits maison, c'est-à-dire le
CMS qu'on cherche précisément à ne pas écrire.

`_layout.html` a été **extrait d'une page réelle du site** plutôt que retapé.
C'est la bonne méthode pour un nouveau client : partir d'une de ses pages,
remplacer le contenu par `{% block contenu %}`, le titre et le canonical par des
blocs, et les URL en dur par `{{ p }}`.

## Passage sur OVH

```sh
export BO_PREFIXE_URL=""        # le site est à la racine du domaine
export BO_DONNEES=/var/lib/mairie-luglon
export BO_MOT_DE_PASSE_HACHE='...'
```

nginx devant (TLS Let's Encrypt, fichiers statiques et PDF servis directement),
uvicorn derrière sous systemd pour qu'il redémarre au boot et après un plantage.

Ne pas oublier de retirer le préfixe `/mairie-luglon/` du HTML statique **et de
`styles.css`** — voir `CLAUDE.md`, cette étape a déjà été oubliée une fois.

## Sauvegardes

C'est le point qu'on oublie, et le seul qui compte vraiment.

Le code est dans git, il est reproductible. `donnees/backoffice.sqlite3` et
`donnees/documents/` ne le sont pas : ce sont les actualités et les arrêtés de
la commune. Une copie nocturne **ailleurs que sur le serveur**, sinon un disque
perdu efface des documents officiels.

## Ce que l'application ne fait pas, volontairement

- **Pas de mode hors ligne.** Un outil qui écrit sur un serveur ne peut pas
  fonctionner sans réseau sans inventer de la résolution de conflits. Sans
  connexion, l'application le dit et n'essaie pas de faire semblant.
- **Pas de gestion d'utilisateurs.** Un seul mot de passe, pour un secrétariat
  d'une personne. Ajouter des comptes serait du code à maintenir pour un besoin
  qui n'existe pas.
- **Pas de modification, seulement publier et supprimer.** Corriger une coquille
  se fait en supprimant puis republiant. Un formulaire d'édition doublerait la
  surface de l'application pour un geste rare.
- **Pas de PDF autre que PDF.** Le type est vérifié sur les **octets** du
  fichier, pas sur son extension : le dépôt de fichiers est la surface la plus
  exposée d'une application de ce genre.
