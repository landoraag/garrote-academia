/* POST /api/webhook — o Mercado Pago avisa aqui quando uma order muda.
   1) confere a assinatura; 2) busca a order no Mercado Pago (não confia no corpo recebido);
   3) aplica no banco. Responde 200 rápido para o Mercado Pago não reenviar. */
import { buscarOrder, assinaturaValida } from '../lib/mp.js';
import { aplicarOrder } from '../lib/aplicar.js';
import { metodo, erro } from '../lib/http.js';
import { limiteMemoria, ipDe } from '../lib/limite.js';

export default async function handler(req, res) {
  if (!metodo(req, res, 'POST')) return;
  const tipo = req.query.type || req.body?.type;
  const dataId = req.query['data.id'] || req.query.data_id || req.body?.data?.id;

  try { limiteMemoria(res, 'webhook-ip', ipDe(req), 120, 60); } catch (e) { return erro(res, e); }   // não toca no banco
  if (dataId && !/^[A-Za-z0-9]{6,64}$/.test(String(dataId))) return res.status(400).json({ erro: 'id inválido' });
  const assinatura = assinaturaValida({ xSignature: req.headers['x-signature'], xRequestId: req.headers['x-request-id'], dataId });
  if (!assinatura) {
    // Mesmo sem assinatura válida, é seguro seguir: a order é buscada direto no Mercado Pago
    // com o nosso token, então ninguém consegue "inventar" um pagamento por aqui.
    // Só os modos estritos recusam (MP_WEBHOOK_ESTRITO=1).
    if (process.env.MP_WEBHOOK_ESTRITO === '1') return res.status(401).json({ erro: 'assinatura inválida' });
    console.warn('[webhook] assinatura não conferiu; seguindo pela consulta direta ao Mercado Pago', dataId);
    // sem assinatura, poucos avisos por IP (um bot não consegue nos fazer consultar o Mercado Pago sem parar)
    try { limiteMemoria(res, 'webhook-sem-assinatura', ipDe(req), 20, 60); } catch (e) { return erro(res, e); }
  }
  if (tipo !== 'order' || !dataId) return res.status(200).json({ ignorado: true });

  try {
    const resultado = await aplicarOrder(await buscarOrder(dataId));
    console.log('[webhook]', dataId, JSON.stringify(resultado));
    res.status(200).json(resultado);
  } catch (e) {
    // pedido que não existe na nossa conta (aviso falso ou de outra loja): ignora sem pedir reenvio
    if (e.status === 404 || e.status === 400) { console.warn('[webhook] pedido não encontrado', dataId); return res.status(200).json({ ignorado: true }); }
    console.error('[webhook] erro', dataId, e.message);
    res.status(500).json({ erro: 'falha ao processar' }); // o Mercado Pago tenta de novo depois
  }
}
