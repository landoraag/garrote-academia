/* Limite de requisições (anti-bot).
   A Vercel não guarda nada entre uma chamada e outra, então a contagem fica no Firestore,
   na coleção "limites". A chave é um hash (o IP do visitante não é gravado em texto).
   Janela fixa: no máximo `max` chamadas a cada `janelaSeg` segundos por chave.
   Dica: no console do Firebase, ative a política de TTL no campo "expiraEm" da coleção
   "limites" para os registros antigos se apagarem sozinhos. */
import crypto from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from './firebase.js';

export function ipDe(req) {
  const h = req.headers;
  return String(h['x-vercel-forwarded-for'] || h['x-real-ip'] || h['x-forwarded-for'] || req.socket?.remoteAddress || 'desconhecido')
    .split(',')[0].trim();
}

export async function limitar(res, nome, id, max, janelaSeg) {
  const chave = crypto.createHash('sha256').update(`${nome}|${id}`).digest('hex').slice(0, 40);
  const ref = db().collection('limites').doc(chave);
  const agora = Date.now(), janela = janelaSeg * 1000;
  const r = await db().runTransaction(async tx => {
    const d = (await tx.get(ref)).data();
    if (!d || agora - d.inicio >= janela) {
      tx.set(ref, { nome, inicio: agora, n: 1, expiraEm: Timestamp.fromMillis(agora + janela + 3600e3) });
      return { ok: true };
    }
    if (d.n >= max) return { ok: false, espera: Math.ceil((d.inicio + janela - agora) / 1000) };
    tx.update(ref, { n: d.n + 1 });
    return { ok: true };
  });
  if (!r.ok) {
    console.warn(`[limite] bloqueado: ${nome} (${max}/${janelaSeg}s)`);
    res.setHeader('Retry-After', String(r.espera));
    throw Object.assign(new Error('Muitas tentativas seguidas. Aguarde um pouco e tente de novo.'), { http: 429 });
  }
}
