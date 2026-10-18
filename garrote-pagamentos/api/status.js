/* GET /api/status?id=<cobrancaId> — a tela consulta enquanto espera o Pix.
   Se ainda estiver pendente, confere direto no Mercado Pago (reforço do webhook). */
import { db } from '../lib/firebase.js';
import { cors, usuarioLogado } from '../lib/acesso.js';
import { buscarOrder } from '../lib/mp.js';
import { aplicarOrder } from '../lib/aplicar.js';
import { ok, erro, metodo } from '../lib/http.js';

export default async function handler(req, res) {
  if (cors(req, res) || !metodo(req, res, 'GET')) return;
  try {
    const uid = await usuarioLogado(req);
    const id = String(req.query.id || '');
    if (!id) return erro(res, new Error('Informe a cobrança.'), 400);
    const ref = db().collection('cobrancas').doc(id);
    let c = (await ref.get()).data();
    if (!c || (c.pagadorId !== uid && !(c.alunoIds || []).includes(uid))) return erro(res, new Error('Cobrança não encontrada.'), 404);
    if (c.status === 'pendente' && c.orderId) { await aplicarOrder(await buscarOrder(c.orderId)); c = (await ref.get()).data(); }
    ok(res, { status: c.status, detalhe: c.mpDetalhe || null, vencimento: c.vencimentoNovo || null });
  } catch (e) { erro(res, e); }
}
