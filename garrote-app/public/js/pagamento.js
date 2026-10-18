/* Pagamento da mensalidade pelo app (Mercado Pago: Pix e cartão).
   O valor, o plano e a família são definidos no servidor a partir do cadastro;
   os dados do cartão ficam em campos do próprio Mercado Pago e nunca passam pela academia. */
import { api } from './api.js';
import { PAGAMENTOS_URL } from './pagamento-config.js';
import { perLabel, ptDate, precoFinal, nParc } from './plano.js';
import { $, $$, esc, brl, toast, openModal } from './ui.js';

export const pagamentoAtivo = () => !!PAGAMENTOS_URL && api.mode === 'firebase';

async function chamar(caminho, corpo) {
  const token = await api.idToken();
  const r = await fetch(PAGAMENTOS_URL + '/api/' + caminho, {
    method: corpo ? 'POST' : 'GET',
    headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erro || 'Não foi possível falar com o servidor de pagamentos.');
  return d;
}

let sdk;
const carregarSdk = () => sdk || (sdk = new Promise((ok, falha) => {
  if (window.MercadoPago) return ok();
  const s = document.createElement('script');
  s.src = 'https://sdk.mercadopago.com/js/v2';
  s.onload = ok; s.onerror = () => { sdk = null; falha(new Error('Não foi possível carregar o Mercado Pago. Confira a internet.')); };
  document.head.appendChild(s);
}));

const SELO = `<div class="pg-selo"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M12 1 3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4Zm0 6a3 3 0 0 1 3 3v1h1v6H8v-6h1v-1a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v1h2v-1a1 1 0 0 0-1-1Z"/></svg>
  <div><b>Pagamento seguro processado pelo Mercado Pago</b><small>Os dados do cartão são criptografados pelo Mercado Pago e não passam pelos servidores da academia.</small></div></div>`;

/* Abre a tela de pagamento. plano/aluno: os mesmos objetos que o card "Meu plano" já tem. */
export function abrirPagamento({ plano, aluno, onPago }) {
  const familia = plano.familia === 'sim' && !!(aluno.familiaId || '').trim();
  const valor = precoFinal(plano), maxParc = nParc(plano);
  let poll, campos = [], mp, cfg, bin = null, metodoCartao = null, fechado = false;

  const html = `<div class="pg">
    <div class="pg-resumo"><div><b>${esc(plano.nome)}</b><small class="muted">${perLabel(plano.periodo)}${familia ? ` · vale para a família toda (${esc(aluno.familiaId)})` : ''}</small></div><b class="pg-valor">${brl(valor)}</b></div>
    ${aluno.vencimento ? `<p class="muted pg-nota">Vencimento atual: ${ptDate(aluno.vencimento)}. ${aluno.vencimento >= hojeK() ? 'O novo período começa depois dele.' : 'O novo período começa hoje.'}</p>` : ''}
    <div class="pg-abas" role="tablist"><button type="button" class="on" data-m="pix" role="tab">Pix</button><button type="button" data-m="cartao" role="tab">Cartão</button></div>
    <div data-area="pix">
      <button type="button" class="btn red" data-pix>Gerar Pix</button>
      <div class="pg-pix" hidden>
        <img alt="QR Code do Pix" data-qr>
        <div class="pg-copia"><input readonly data-cod aria-label="Pix copia e cola"><button type="button" class="btn red" data-copiar>Copiar</button></div>
        <p class="pg-aguarda"><span></span>Aguardando o pagamento. Pode fechar esta tela: a baixa é automática.</p>
      </div>
    </div>
    <div data-area="cartao" hidden>
      <label class="field">Número do cartão <span class="pg-band" data-band></span><div class="pg-campo" id="pgNumero"></div></label>
      <div class="pg-duas"><label class="field">Validade<div class="pg-campo" id="pgValidade"></div></label><label class="field">Código de segurança<div class="pg-campo" id="pgCvv"></div></label></div>
      <label class="field">Nome do titular (como no cartão)<input data-nome autocomplete="cc-name"></label>
      <label class="field">CPF do titular<input data-doc inputmode="numeric" placeholder="000.000.000-00"></label>
      <label class="field">Parcelas<select data-parc disabled><option>Digite o número do cartão</option></select></label>
      <button type="button" class="btn red" data-cartao>Pagar ${brl(valor)}</button>
    </div>
    <p class="pg-res" data-res hidden></p>
    ${SELO}
  </div>`;

  const { close, form } = openModal({ title: 'Pagar mensalidade', html, cancel: 'Fechar', onClose: () => { fechado = true; clearInterval(poll); campos.forEach(c => { try { c.unmount(); } catch {} }); } });
  const el = form;
  const res = (ok, txt) => { const r = $('[data-res]', el); r.hidden = !txt; r.className = 'pg-res ' + (ok ? 'ok' : 'ruim'); r.textContent = txt || ''; };
  const concluido = d => {
    if (d.status === 'paga') {
      res(true, `Pagamento aprovado! Mensalidade em dia até ${ptDate(d.vencimento)}.`);
      $('.pg-aguarda', el)?.setAttribute('hidden', '');
      $$('[data-pix],[data-cartao]', el).forEach(b => (b.disabled = true));
      clearInterval(poll); onPago && onPago(d); return true;
    }
    if (d.status === 'falhou' || d.status === 'divergente') { res(false, 'Pagamento não aprovado. Tente de novo ou use outra forma.'); clearInterval(poll); return true; }
    return false;
  };

  /* abas */
  $('.pg-abas', el).onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('.pg-abas button', el).forEach(x => x.classList.toggle('on', x === b));
    $$('[data-area]', el).forEach(a => (a.hidden = a.dataset.area !== b.dataset.m));
    if (b.dataset.m === 'cartao') montarCartao().catch(err => res(false, err.message));
  };

  /* Pix */
  $('[data-pix]', el).onclick = async e => {
    const b = e.currentTarget; b.disabled = true; res(true, '');
    try {
      const d = await chamar('pagar', { metodo: 'pix' });
      b.hidden = true;
      $('[data-qr]', el).src = 'data:image/png;base64,' + d.pix.qrCodeBase64;
      $('[data-cod]', el).value = d.pix.qrCode || '';
      $('.pg-pix', el).hidden = false;
      if (concluido(d)) return;
      poll = setInterval(async () => { if (fechado) return clearInterval(poll); try { concluido(await chamar('status?id=' + encodeURIComponent(d.cobrancaId))); } catch {} }, 4000);
    } catch (err) { res(false, err.message); b.disabled = false; }
  };
  $('[data-copiar]', el).onclick = e => navigator.clipboard.writeText($('[data-cod]', el).value).then(() => { e.target.textContent = 'Copiado'; toast('Código Pix copiado.'); });

  /* Cartão */
  const preencher = lista => {
    const s = $('[data-parc]', el);
    if (!lista.length) { s.innerHTML = '<option>Digite o número do cartão</option>'; s.disabled = true; return; }
    s.innerHTML = lista.map(c => `<option value="${c.installments}">${esc(c.recommended_message || c.installments + 'x')}</option>`).join('');
    s.disabled = lista.length === 1;
  };
  const doPlano = () => Array.from({ length: maxParc }, (_, k) => ({ installments: k + 1, recommended_message: `${k + 1}x de ${brl(valor / (k + 1))}${cfg.modoTeste ? ' (teste)' : ''}` }));
  async function parcelas() {
    if (!bin || !metodoCartao) return preencher([]);
    if (metodoCartao.payment_type_id !== 'credit_card') return preencher([{ installments: 1, recommended_message: `À vista no débito · ${brl(valor)}` }]);
    try {
      const r = await mp.getInstallments({ amount: String(valor), bin, paymentTypeId: 'credit_card' });
      const op = (r?.[0]?.payer_costs || []).filter(c => c.installments <= maxParc);
      if (cfg.modoTeste && op.length <= 1 && maxParc > 1) return preencher(doPlano());   // conta de teste costuma liberar só à vista
      preencher(op.length ? op : [{ installments: 1, recommended_message: `1x de ${brl(valor)}` }]);
    } catch { preencher([{ installments: 1, recommended_message: `1x de ${brl(valor)}` }]); }
  }
  async function montarCartao() {
    if (campos.length) return;
    [cfg] = await Promise.all([chamar('config'), carregarSdk()]);
    if (!cfg.publicKey) throw new Error('Pagamento com cartão indisponível no momento.');
    mp = new window.MercadoPago(cfg.publicKey, { locale: 'pt-BR' });
    const dark = document.documentElement.dataset.theme === 'dark';
    const estilo = { color: dark ? '#F2F2F3' : '#0C0C0C', fontSize: '16px', placeholderColor: '#9A9AA0' };
    const num = mp.fields.create('cardNumber', { placeholder: '0000 0000 0000 0000', style: estilo }).mount('pgNumero');
    campos = [num,
      mp.fields.create('expirationDate', { placeholder: 'MM/AA', style: estilo }).mount('pgValidade'),
      mp.fields.create('securityCode', { placeholder: 'CVV', style: estilo }).mount('pgCvv')];
    num.on('binChange', async ({ bin: b }) => {
      bin = b || null;
      if (!bin) { metodoCartao = null; $('[data-band]', el).textContent = ''; return preencher([]); }
      try {
        metodoCartao = (await mp.getPaymentMethods({ bin })).results?.[0] || null;
        $('[data-band]', el).textContent = metodoCartao ? (metodoCartao.name || metodoCartao.id) + (metodoCartao.payment_type_id === 'debit_card' ? ' · débito' : '') : '';
        if (!metodoCartao) res(false, 'Cartão não reconhecido. Confira o número.'); else res(true, '');
        await parcelas();
      } catch { res(false, 'Não foi possível identificar o cartão.'); }
    });
  }
  $('[data-cartao]', el).onclick = async e => {
    const b = e.currentTarget;
    const nome = $('[data-nome]', el).value.trim(), doc = $('[data-doc]', el).value.replace(/\D/g, '');
    if (!metodoCartao) return res(false, 'Digite o número do cartão.');
    if (!nome) return res(false, 'Informe o nome do titular como está no cartão.');
    if (doc.length !== 11) return res(false, 'Informe o CPF do titular (11 números).');
    b.disabled = true; res(true, 'Processando…');
    try {
      const tk = await mp.fields.createCardToken({ cardholderName: nome, identificationType: 'CPF', identificationNumber: doc });
      const d = await chamar('pagar', { metodo: 'cartao', cartao: {
        token: tk.id, payment_method_id: metodoCartao.id, payment_type_id: metodoCartao.payment_type_id,
        installments: Number($('[data-parc]', el).value) || 1, payer: { identification: { type: 'CPF', number: doc } } } });
      if (!concluido(d)) res(true, 'Pagamento em análise. A baixa é automática assim que o Mercado Pago aprovar.');
      if (d.status !== 'paga') b.disabled = false;
    } catch (err) { res(false, Array.isArray(err) ? 'Confira os dados do cartão.' : err.message); b.disabled = false; }
  };
  return { close };
}

function hojeK() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
