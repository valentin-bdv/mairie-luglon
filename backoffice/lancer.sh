#!/usr/bin/env bash
#
# lancer.sh — Démarre le site et le back-office en une commande.
#
#   ./backoffice/lancer.sh
#
# Crée l'environnement Python s'il manque, installe les dépendances s'il le
# faut, demande un mot de passe à la première exécution, puis démarre le
# serveur. Rien à exporter, rien à retenir.
#
# POURQUOI CE SCRIPT EXISTE : la marche à suivre manuelle tenait en cinq
# commandes dont un `export` d'une chaîne de 120 caractères contenant des `$`.
# Recopiée entre guillemets doubles au lieu de simples, le shell mangeait une
# partie de la chaîne et le mot de passe était refusé sans que rien n'indique
# pourquoi. Une commande qui échoue de façon incompréhensible est une commande
# qu'on abandonne.
#
# EN PRODUCTION, ce script ne sert pas : sur OVH, uvicorn tourne sous systemd
# et le condensat vient de l'environnement du service, pas d'un fichier.

set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE"

VENV="$RACINE/.venv"
PY="$VENV/bin/python"
DONNEES="${BO_DONNEES:-$RACINE/backoffice/donnees}"
PORT="${PORT:-8000}"

# --- Environnement Python --------------------------------------------------
if [ ! -x "$PY" ]; then
    echo "  Création de l'environnement Python (.venv)…"
    python3 -m venv "$VENV"
fi

# On teste l'import plutôt que de réinstaller à chaque lancement : pip est lent
# même quand tout est déjà là.
if ! "$PY" -c "import fastapi, uvicorn, jinja2, multipart" 2>/dev/null; then
    echo "  Installation des dépendances…"
    "$PY" -m pip install --quiet --upgrade pip
    "$PY" -m pip install --quiet fastapi uvicorn jinja2 python-multipart
fi

# --- Mot de passe ----------------------------------------------------------
# Le condensat est rangé EN BASE, pas dans un fichier. On ne demande donc rien
# si un mot de passe existe déjà : c'était le défaut de la version précédente,
# qui redemandait à chaque lancement.
#
# `-m backoffice.auth` et non un script passé par heredoc : quand le programme
# arrive par l'entrée standard, getpass n'a plus de terminal fiable où lire, la
# saisie repart vide et l'enregistrement échoue en silence. C'est très
# probablement ce qui faisait redemander le mot de passe à chaque fois.
if ! "$PY" -c "
import sys; sys.path.insert(0, '.')
from backoffice import auth
sys.exit(0 if auth.mot_de_passe_configure() else 1)
" 2>/dev/null; then
    echo
    echo "  Aucun mot de passe d'administration : choisissez-en un maintenant."
    echo "  12 caractères minimum. Il est retenu, on ne vous le redemandera pas."
    echo
    "$PY" -m backoffice.auth
fi

# --- Démarrage -------------------------------------------------------------
echo
echo "  Site           http://localhost:$PORT/mairie-luglon/"
echo "  Administration http://localhost:$PORT/mairie-luglon${BO_ADMIN_CHEMIN:-/gestion}/"
echo
echo "  Depuis un téléphone, dans un autre terminal :"
echo "      cloudflared tunnel --url http://localhost:$PORT"
echo

exec "$PY" -m uvicorn backoffice.app:app --port "$PORT" --reload
