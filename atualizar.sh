#!/bin/bash
# Atualiza o app publicado com a versão mais nova da main (rodar no Codespace).
# Uso:  bash atualizar.sh
set -e
cd "$(dirname "$0")"
echo "→ Baixando a versão mais nova do GitHub..."
git checkout main
git pull --ff-only origin main
echo "→ Publicando o app e as regras de segurança no Firebase..."
cd garrote-app && firebase deploy --only hosting,firestore:rules
echo "✓ Pronto. Abra https://garrote-academia.web.app e aperte Ctrl+F5."
