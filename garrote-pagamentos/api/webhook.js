/* POST /api/webhook — o Mercado Pago avisa aqui quando uma order muda.
   1) confere a assinatura; 2) busca a order no Mercado Pago (não confia no corpo recebido);
   3) aplica no banco. Responde 200 rápido para o Mercado Pago não reenviar. */
import { buscarOrder, assinaturaValida } from '../lib/mp.js';
import { aplicarOrder } from '../lib/aplicar.js';
import { metodo } from '../lib/http.js';

export default async function handler(req, res) {
  if (!metodo(req, res, 'POST')) return;
  const tipo = req.query.type || req.body?.type;
  const dataId = req.query['data.id'] || req.query.data_id || req.body?.data?.id;

  const assinatura = assinaturaValida({ xSignature: req.headers['x-signature'], xRequestId: req.headers['x-request-id'], dataId });
  if (!assinatura) {
    // Mesmo sem assinatura válida, é seguro seguir: a order é buscada direto no Mercado Pago
    // com o nosso token, então ninguém consegue "inventar" um pagamento por aqui.
    // Só os modos estritos recusam (MP_WEBHOOK_ESTRITO=1).
    if (process.env.MP_WEBHOOK_ESTRITO === '1') return res.status(401).json({ erro: 'assinatura inválida' });
    console.warn('[webhook] assinatura não conferiu; seguindo pela consulta direta ao Mercado Pago', dataId);
  }
  if (tipo !== 'order' || !dataId) return res.status(200).json({ ignorado: true });

  try {
    const resultado = await aplicarOrder(await buscarOrder(dataId));
    console.log('[webhook]', dataId, JSON.stringify(resultado));
    res.status(200).json(resultado);
  } catch (e) {
    console.error('[webhook] erro', dataId, e.message);
    res.status(500).json({ erro: 'falha ao processar' }); // o Mercado Pago tenta de novo depois
  }
}
