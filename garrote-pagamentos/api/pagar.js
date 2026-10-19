/* POST /api/pagar — o aluno logado paga o plano que o dono definiu para ele.
   Corpo: { metodo: 'pix' | 'cartao', cartao?: { token, payment_method_id, payment_type_id, installments, payer } }
   Aluno, plano, valor e família vêm do Firestore; o app não manda nada disso. */
import { db } from '../lib/firebase.js';
import { cors, usuarioLogado } from '../lib/acesso.js';
import { precoFinal, precoPix, nParc, periodo, valorStr, grupoDoAluno, bloqueio } from '../lib/planos.js';
import { criarOrder } from '../lib/mp.js';
import { aplicarOrder } from '../lib/aplicar.js';
import { ok, erro, metodo, corpoValido } from '../lib/http.js';
import { limitar, ipDe } from '../lib/limite.js';

export default async function handler(req, res) {
  if (cors(req, res) || !metodo(req, res, 'POST')) return;
  let refCob;
  try {
    await limitar(res, 'pagar-ip', ipDe(req), 15, 600);              // por aparelho/rede: 15 a cada 10 min
    const uid = await usuarioLogado(req);
    await limitar(res, 'pagar-uid', uid, 6, 600);                    // por aluno: 6 a cada 10 min
    if (!corpoValido(req)) return erro(res, new Error('Pedido inválido.'), 400);
    const { metodo: forma, cartao } = req.body;
    if (!['pix', 'cartao'].includes(forma)) return erro(res, new Error('Forma de pagamento inválida.'), 400);
    if (forma === 'cartao') {
      // contra "teste de cartões" (fraude com cartões roubados): poucas tentativas por hora e por dia
      await limitar(res, 'cartao-uid-hora', uid, 5, 3600);
      await limitar(res, 'cartao-uid-dia', uid, 10, 86400);
      await limitar(res, 'cartao-ip-hora', ipDe(req), 8, 3600);
      if (!cartaoValido(cartao)) return erro(res, new Error('Dados do cartão incompletos.'), 400);
    }

    const banco = db();
    const snapAluno = await banco.collection('users').doc(uid).get();
    const aluno = snapAluno.exists ? { id: uid, ...snapAluno.data() } : null;
    const snapPlano = aluno?.planoId ? await banco.collection('planos').doc(aluno.planoId).get() : null;
    const plano = snapPlano?.exists ? { id: snapPlano.id, ...snapPlano.data() } : null;
    const motivo = bloqueio(aluno, plano);
    if (motivo) return erro(res, new Error(motivo), 400);

    const grupo = await grupoDoAluno(banco, aluno, plano);
    // Pix: valor com o desconto extra (planos parcelados); cartão: valor total do plano
    const valor = forma === 'pix' ? precoPix(plano) : precoFinal(plano), v = valorStr(valor);

    // Pix já gerado há pouco e ainda em aberto: devolve o mesmo, em vez de criar outro
    // (evita encher o Mercado Pago de cobranças se alguém apertar o botão várias vezes)
    const refAberto = banco.collection('pixAbertos').doc(uid);
    if (forma === 'pix') {
      const ab = (await refAberto.get()).data();
      if (ab && Date.now() - ab.criadoEm < 50 * 60e3 && ab.valor === valor && ab.planoId === plano.id) {
        const c = (await banco.collection('cobrancas').doc(ab.cobrancaId).get()).data();
        if (c && c.status === 'pendente') return ok(res, { cobrancaId: ab.cobrancaId, status: 'pendente', pix: ab.pix, reaproveitado: true }, 200);
      }
    }
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
      const parcelas = Math.min(Math.max(1, cartao.installments | 0), nParc(plano));
      const doc = String(cartao.payer?.identification?.number || '').replace(/\D/g, '');
      corpo.payer = { email: aluno.email, ...(doc ? { identification: { type: 'CPF', number: doc } } : {}) };
      corpo.transactions = { payments: [{ amount: v, payment_method: {
        id: cartao.payment_method_id, type: cartao.payment_type_id === 'debit_card' ? 'debit_card' : 'credit_card',
        token: cartao.token, installments: cartao.payment_type_id === 'debit_card' ? 1 : parcelas
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
    if (forma === 'pix' && r.status === 'pendente')
      await refAberto.set({ cobrancaId: refCob.id, valor, planoId: plano.id, criadoEm: Date.now(),
        pix: { qrCode: pg.qr_code || null, qrCodeBase64: pg.qr_code_base64 || null, ticketUrl: pg.ticket_url || null } });
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

/* formato dos dados do cartão que o app manda (o número do cartão nunca vem: só o token do Mercado Pago) */
function cartaoValido(c) {
  if (!c || typeof c !== 'object') return false;
  if (typeof c.token !== 'string' || !/^[A-Za-z0-9-]{8,80}$/.test(c.token)) return false;
  if (typeof c.payment_method_id !== 'string' || !/^[a-z_]{2,30}$/.test(c.payment_method_id)) return false;
  if (c.payment_type_id && !['credit_card', 'debit_card'].includes(c.payment_type_id)) return false;
  if (c.installments != null && !(Number.isInteger(+c.installments) && +c.installments >= 1 && +c.installments <= 24)) return false;
  const doc = String(c.payer?.identification?.number || '').replace(/\D/g, '');
  return !doc || doc.length === 11;
}
