/* GET /api/status?id=<cobrancaId> — a tela consulta enquanto espera o Pix.
   Se ainda estiver pendente, confere direto no Mercado Pago (reforço do webhook). */
import { db } from '../lib/firebase.js';
import { cors, usuarioLogado } from '../lib/acesso.js';
import { buscarOrder } from '../lib/mp.js';
import { aplicarOrder } from '../lib/aplicar.js';
import { ok, erro, metodo } from '../lib/http.js';
import { limitar, limiteMemoria, ipDe } from '../lib/limite.js';

export default async function handler(req, res) {
  if (cors(req, res) || !metodo(req, res, 'GET')) return;
  try {
    limiteMemoria(res, 'status-ip', ipDe(req), 120, 300);   // barreira barata antes do login (não toca no banco)
    const uid = await usuarioLogado(req);
    await limitar(res, 'status-uid', uid, 60, 300);   // a tela consulta a cada 5 s por até 3 min
    const id = String(req.query.id || '');
    if (!/^[A-Za-z0-9]{10,40}$/.test(id)) return erro(res, new Error('Informe a cobrança.'), 400);
    const ref = db().collection('cobrancas').doc(id);
    let c = (await ref.get()).data();
    if (!c || (c.pagadorId !== uid && !(c.alunoIds || []).includes(uid))) return erro(res, new Error('Cobrança não encontrada.'), 404);
    if (c.status === 'pendente' && c.orderId) { await aplicarOrder(await buscarOrder(c.orderId)); c = (await ref.get()).data(); }
    ok(res, { status: c.status, detalhe: c.mpDetalhe || null, vencimento: c.vencimentoNovo || null });
  } catch (e) { erro(res, e); }
}
