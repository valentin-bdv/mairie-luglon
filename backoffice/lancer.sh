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
HASH="$DONNEES/mot-de-passe.hash"
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
# Seul le CONDENSAT est écrit sur le disque, jamais le mot de passe lui-même.
# Le dossier donnees/ est ignoré par git.
if [ -z "${BO_MOT_DE_PASSE_HACHE:-}" ] && [ ! -f "$HASH" ]; then
    echo
    echo "  Première utilisation : choisissez le mot de passe d'administration."
    echo "  12 caractères minimum. Il protège la publication sur le site."
    echo
    mkdir -p "$DONNEES"
    "$PY" - <<'PYTHON' > "$HASH.tmp"
import getpass, sys, pathlib
sys.path.insert(0, str(pathlib.Path.cwd()))
from backoffice.auth import fabriquer_condensat

mdp = getpass.getpass("  Mot de passe : ")
if len(mdp) < 12:
    sys.exit("\n  Trop court : 12 caractères minimum.")
if mdp != getpass.getpass("  Confirmation : "):
    sys.exit("\n  Les deux saisies diffèrent.")
print(fabriquer_condensat(mdp), end="")
PYTHON
    mv "$HASH.tmp" "$HASH"
    chmod 600 "$HASH"
    echo
    echo "  Mot de passe enregistré. Pour en changer : supprimez $HASH"
fi

# --- Démarrage -------------------------------------------------------------
echo
echo "  Site           http://localhost:$PORT/mairie-luglon/"
echo "  Administration http://localhost:$PORT/mairie-luglon/admin/"
echo
echo "  Depuis un téléphone, dans un autre terminal :"
echo "      cloudflared tunnel --url http://localhost:$PORT"
echo

exec "$PY" -m uvicorn backoffice.app:app --port "$PORT" --reload
