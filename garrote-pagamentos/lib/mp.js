/* Chamadas à API de Orders do Mercado Pago (só no servidor). */
import crypto from 'node:crypto';

const BASE = 'https://api.mercadopago.com';
const token = () => {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error('Falta MP_ACCESS_TOKEN no .env');
  return t;
};

async function chamar(metodo, caminho, corpo) {
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(metodo === 'POST' ? { 'X-Idempotency-Key': crypto.randomUUID() } : {})
    },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(dados?.errors?.[0]?.message || dados?.message || `Mercado Pago respondeu ${r.status}`);
    e.status = r.status; e.detalhes = dados;
    throw e;
  }
  return dados;
}

export const criarOrder = corpo => chamar('POST', '/v1/orders', corpo);
export const buscarOrder = id => chamar('GET', `/v1/orders/${encodeURIComponent(id)}`);

/* Situação resumida de uma order: 'pago' | 'pendente' | 'falhou' */
export function resumo(order) {
  const st = order?.status, det = order?.status_detail;
  if (st === 'processed' && det === 'accredited') return 'pago';
  if (['created', 'processing', 'action_required'].includes(st)) return 'pendente';
  return 'falhou';
}

/* Valida a assinatura x-signature do webhook.
   Manifesto oficial: "id:<data.id em minúsculas>;request-id:<x-request-id>;ts:<ts>;" com HMAC-SHA256.
   Testa também variações (id como veio, sem request-id) porque o ambiente de teste
   do Mercado Pago nem sempre segue a documentação; registra qual variação bateu.
   Retorna o nome da variação que bateu, true se não há chave configurada, ou false. */
export function assinaturaValida({ xSignature, xRequestId, dataId }) {
  const segredo = (process.env.MP_WEBHOOK_SECRET || '').trim();
  if (!segredo) return true; // ainda não configurado (testes locais)
  if (!xSignature) { console.warn('[webhook] sem cabeçalho x-signature'); return false; }
  const partes = {};
  for (const p of String(xSignature).split(',')) {
    const eq = p.indexOf('=');
    if (eq > 0) partes[p.slice(0, eq).trim()] = p.slice(eq + 1).trim();
  }
  if (!partes.ts || !partes.v1) { console.warn('[webhook] x-signature incompleto'); return false; }

  const id = String(dataId || '');
  const montar = (idUsado, comReq) =>
    (idUsado ? `id:${idUsado};` : '') + (comReq && xRequestId ? `request-id:${xRequestId};` : '') + `ts:${partes.ts};`;
  const variacoes = {
    oficial: montar(id.toLowerCase(), true),
    'id-original': montar(id, true),
    'sem-request-id': montar(id.toLowerCase(), false),
    'id-original-sem-request-id': montar(id, false)
  };
  const alvo = Buffer.from(partes.v1);
  for (const [nome, manifesto] of Object.entries(variacoes)) {
    const calc = Buffer.from(crypto.createHmac('sha256', segredo).update(manifesto).digest('hex'));
    if (calc.length === alvo.length && crypto.timingSafeEqual(calc, alvo)) {
      if (nome !== 'oficial') console.log(`[webhook] assinatura conferiu na variação: ${nome}`);
      return nome;
    }
  }
  console.warn(`[webhook] nenhuma variação conferiu. id=${id} request-id=${xRequestId ? 'sim' : 'não'} ts=${partes.ts} chave=${segredo.length} caracteres`);
  return false;
}
