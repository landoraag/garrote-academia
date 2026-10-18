/* Baixa automática: recebe uma order (sempre buscada direto no Mercado Pago) e, se paga,
   registra o pagamento e avança o vencimento — igual ao "Registrar pagamento" do painel,
   inclusive renovando a família toda. Idempotente: avisos repetidos não somam meses a mais. */
import { db } from './firebase.js';
import { resumo } from './mp.js';
import { hoje, addMonths } from './datas.js';

export async function aplicarOrder(order) {
  const cobrancaId = order.external_reference;
  if (!cobrancaId) return { ignorado: 'order sem external_reference' };

  const banco = db();
  const refCob = banco.collection('cobrancas').doc(cobrancaId);
  const situacao = resumo(order);

  return banco.runTransaction(async tx => {
    const cob = await tx.get(refCob);
    if (!cob.exists) return { ignorado: 'cobrança não encontrada' };
    const c = cob.data();

    if (c.status === 'paga') return { status: 'paga', vencimento: c.vencimentoNovo, repetido: true };
    if (c.orderId && c.orderId !== order.id) return { ignorado: 'order diferente da cobrança' };

    const base = { mpStatus: order.status, mpDetalhe: order.status_detail || null, atualizadoEm: Date.now() };
    if (situacao === 'pendente') { tx.update(refCob, { ...base, status: 'pendente' }); return { status: 'pendente' }; }
    if (situacao === 'falhou') { tx.update(refCob, { ...base, status: 'falhou' }); return { status: 'falhou', detalhe: order.status_detail }; }

    // pago: confere o valor da cobrança (juros de parcelamento ficam fora do total_amount)
    if (Math.abs(Number(order.total_amount) - c.valor) > 0.009) {
      tx.update(refCob, { ...base, status: 'divergente', valorOrder: Number(order.total_amount) });
      return { status: 'divergente' };
    }

    const refs = c.alunoIds.map(id => banco.collection('users').doc(id));
    const docs = await Promise.all(refs.map(r => tx.get(r)));
    const pagador = docs.find(d => d.id === c.pagadorId);
    const d = hoje();
    const vencAtual = pagador?.exists ? pagador.data().vencimento : null;
    // mesma regra do painel: se ainda está em dia, soma a partir do vencimento; senão, a partir de hoje
    const inicio = vencAtual && vencAtual >= d ? vencAtual : d;
    const novoVenc = addMonths(inicio, c.meses);

    docs.forEach(doc => { if (doc.exists) tx.update(doc.ref, { vencimento: novoVenc, ultimoPagamento: d }); });
    tx.set(banco.collection('pagamentos').doc(`mp_${order.id}`), {
      alunoIds: c.alunoIds, planoId: c.planoId, valor: c.valor, data: d, meses: c.meses,
      forma: c.metodo === 'pix' ? 'Pix' : 'Cartão', familiaId: c.familiaId || '',
      registradoPor: c.pagadorId, origem: 'mercadopago', orderId: order.id, criadoEm: Date.now()
    });
    tx.update(refCob, { ...base, status: 'paga', pagaEm: Date.now(), vencimentoNovo: novoVenc });
    return { status: 'paga', vencimento: novoVenc };
  });
}
