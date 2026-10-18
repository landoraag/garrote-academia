/* Firebase Admin: Firestore e verificação do login do app.
   O servidor usa uma conta de serviço, que ignora as regras do Firestore. Por isso
   toda checagem de "quem pode o quê" é feita aqui no código, antes de gravar. */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { existsSync, readFileSync } from 'node:fs';

function init() {
  if (getApps().length) return;
  // na Vercel: variável FIREBASE_SERVICE_ACCOUNT; no computador: arquivo firebase-chave.json na pasta
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw && existsSync('firebase-chave.json')) raw = readFileSync('firebase-chave.json', 'utf8');
  if (!raw) throw new Error('Servidor sem a chave do Firebase (FIREBASE_SERVICE_ACCOUNT).');
  initializeApp({ credential: cert(JSON.parse(raw)) });
}

export const db = () => { init(); return getFirestore(); };
export const auth = () => { init(); return getAuth(); };
