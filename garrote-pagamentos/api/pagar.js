/* POST /api/pagar — o aluno logado paga o plano que o dono definiu para ele.
   Corpo: { metodo: 'pix' | 'cartao', cartao?: { token, payment_method_id, payment_type_id, installments, payer } }
   Aluno, plano, valor e família vêm do Firestore; o app não manda nada disso. */
import { db } from '../lib/firebase.js';
import { cors, usuarioLogado } from '../lib/acesso.js';
import { precoFinal, nParc, periodo, valorStr, grupoDoAluno, bloqueio } from '../lib/planos.js';
import { criarOrder } from '../lib/mp.js';
import { aplicarOrder } from '../lib/aplicar.js';
import { ok, erro, metodo } from '../lib/http.js';

export default async function handler(req, res) {
  if (cors(req, res) || !metodo(req, res, 'POST')) return;
  let refCob;
  try {
    const uid = await usuarioLogado(req);
    const { metodo: forma, cartao } = req.body || {};
    if (!['pix', 'cartao'].includes(forma)) return erro(res, new Error('Forma de pagamento inválida.'), 400);

    const banco = db();
    const snapAluno = await banco.collection('users').doc(uid).get();
    const aluno = snapAluno.exists ? { id: uid, ...snapAluno.data() } : null;
    const snapPlano = aluno?.planoId ? await banco.collection('planos').doc(aluno.planoId).get() : null;
    const plano = snapPlano?.exists ? { id: snapPlano.id, ...snapPlano.data() } : null;
    const motivo = bloqueio(aluno, plano);
    if (motivo) return erro(res, new Error(motivo), 400);

    const grupo = await grupoDoAluno(banco, aluno, plano);
    const valor = precoFinal(plano), v = valorStr(valor);
    refCob = banco.collection('cobrancas').doc();
    await refCob.set({
      pagadorId: uid, alunoIds: grupo.ids, planoId: plano.id, familiaId: grupo.chave ? aluno.familiaId : '',
      valor, meses: periodo(plano), metodo: forma, status: 'criando', criadaEm: Date.now()
    });

    const corpo = {
      type: 'online', processing_mode: 'automatic', external_reference: refCob.id, total_amount: v,
      description: `Garrote Academia — plano ${plano.nome || ''}`.trim()
    };
    if (forma === 'pix') {
      corpo.payer = {
        email: aluno.email,
        // em teste, "APRO" faz o Mercado Pago aprovar o Pix sozinho
        first_name: process.env.MP_MODO_TESTE === '1' ? 'APRO' : String(aluno.nome || '').split(' ')[0] || undefined
      };
      corpo.transactions = { payments: [{ amount: v, payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT1H' }] };
    } else {
      if (!cartao?.token || !cartao?.payment_method_id) return erro(res, new Error('Dados do cartão incompletos.'), 400);
      const parcelas = Math.min(Math.max(1, cartao.installments | 0), nParc(plano));
      corpo.payer = { email: aluno.email, ...(cartao.payer?.identification ? { identification: cartao.payer.identification } : {}) };
      corpo.transactions = { payments: [{ amount: v, payment_method: {
        id: cartao.payment_method_id, type: cartao.payment_type_id || 'credit_card', token: cartao.token, installments: parcelas
      } }] };
    }

    let order;
    try { order = await criarOrder(corpo); }
    catch (e) {
      await refCob.update({ status: 'falhou', erro: e.message, atualizadoEm: Date.now() });
      return erro(res, Object.assign(new Error(traduzir(e.message)), { http: 400 }));
    }
    await refCob.update({ orderId: order.id, status: 'pendente', mpStatus: order.status, mpDetalhe: order.status_detail || null });
    const r = await aplicarOrder(order);

    const pg = order.transactions?.payments?.[0]?.payment_method || {};
    ok(res, {
      cobrancaId: refCob.id, status: r.status || 'pendente', detalhe: order.status_detail || null,
      vencimento: r.vencimento || null, familia: grupo.ids.length > 1 ? grupo.ids.length : 0,
      pix: forma === 'pix' ? { qrCode: pg.qr_code, qrCodeBase64: pg.qr_code_base64, ticketUrl: pg.ticket_url } : null
    }, 201);
  } catch (e) {
    if (refCob) await refCob.update({ status: 'falhou', erro: e.message }).catch(() => {});
    erro(res, e);
  }
}

/* mensagens do Mercado Pago mais comuns, em português para o aluno */
function traduzir(m = '') {
  if (/insufficient|fund/i.test(m)) return 'Cartão sem limite suficiente.';
  if (/security_code|cvv/i.test(m)) return 'Código de segurança inválido.';
  if (/expir/i.test(m)) return 'Cartão vencido ou data inválida.';
  if (/rejected|declined|outside the valid range/i.test(m)) return 'Pagamento recusado. Tente outro cartão ou use o Pix.';
  return 'Não foi possível processar o pagamento. Confira os dados ou use o Pix.';
}
