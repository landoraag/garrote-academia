#!/bin/bash
cd /workspaces/garrote-academia
ZIP=$(ls -t garrote-app*.zip 2>/dev/null | head -1)
[ -z "$ZIP" ] && { echo "Nenhum garrote-app*.zip nesta pasta."; exit 1; }
cp garrote-app/public/js/firebase-config.js /tmp/fb-config.js
cp garrote-app/.firebaserc /tmp/firebaserc
unzip -o "$ZIP"
cp /tmp/fb-config.js garrote-app/public/js/firebase-config.js
cp /tmp/firebaserc garrote-app/.firebaserc
rm "$ZIP"
cd garrote-app && firebase deploy --only hosting,firestore:rules
