/* Vitrine de produtos: o aluno faz o pedido pelo app e a recepção (conta do dono) recebe um aviso na hora,
   separa o produto e entrega. O pagamento é feito na retirada. O estoque baixa quando o pedido é separado. */
import { api } from './api.js';
import { nav, topIcon, viewing } from './aluno.js';
import { ptDate } from './plano.js';
import { $, $$, esc, brl, toast, ic, logo, go, SESSION, sid, ro, friendly, fail, openModal, confirmBox, dkey } from './ui.js';

export const CATEGORIAS = ['Marmitas', 'Bebidas e energéticos', 'Suplementos', 'Roupas e acessórios', 'Outros'];
const r2 = n => Math.round(n * 100) / 100;
const hora = ts => new Date(ts || Date.now()).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const ST = { novo: ['Novo', 'pendente'], separado: ['Separado', 'totalpass'], entregue: ['Entregue', 'emdia'], cancelado: ['Cancelado', 'inativo'] };
const ST_ALUNO = { novo: ['Aguardando a recepção', 'pendente'], separado: ['Separado: pode retirar', 'totalpass'], entregue: ['Retirado', 'emdia'], cancelado: ['Cancelado', 'inativo'] };
const resumoItens = p => (p.itens || []).map(i => `${i.qtd}× ${i.nome}`).join(', ') || '—';

/* ---------- cadastro de produtos (aba Produtos do dono) ---------- */
export const produtosSchema = (D) => ({ col: 'produtos', title: 'Produtos', one: 'produto', rows: D.produtos || [],
  fields: [{ k: 'nome', l: 'Nome do produto', req: 1, full: 1, ph: 'Ex.: Marmita fit de frango' },
    { k: 'categoria', l: 'Categoria', type: 'select', opts: () => CATEGORIAS.map(c => [c, c]), def: () => CATEGORIAS[0] },
    { k: 'preco', l: 'Preço (R$)', type: 'money', req: 1, ph: '24,90' },
    { k: 'estoque', l: 'Estoque (unidades)', type: 'number', num: 1, req: 1, ph: '10' },
    { k: 'estoqueMin', l: 'Avisar quando restar (unidades)', type: 'number', num: 1, ph: '3', def: () => 3 },
    { k: 'ativo', l: 'Mostrar na vitrine do aluno', type: 'select', opts: () => [['sim', 'Sim'], ['nao', 'Não']], def: () => 'sim' },
    { k: 'foto', l: 'Foto do produto', type: 'img' },
    { k: 'descricao', l: 'Descrição', type: 'textarea', full: 1 }],
  before: d => ({ ...d, estoque: Math.max(0, Math.round(d.estoque)), estoqueMin: Math.max(0, Math.round(d.estoqueMin)) }),
  cols: [['Nome', r => r.nome], ['Categoria', r => r.categoria || '—'], ['Preço', r => brl(+r.preco || 0)],
    ['Estoque', r => `${+r.estoque || 0}${(+r.estoque || 0) <= (+r.estoqueMin || 0) ? ' (baixo)' : ''}`], ['Vitrine', r => r.ativo === 'nao' ? 'Oculto' : 'Visível']] });

/* ---------- pedidos: estoque e mudança de status ---------- */
async function mexerEstoque(p, sinal) {   // sinal -1 tira do estoque, +1 devolve
  const faltou = [];
  for (const it of p.itens || []) {
    const pr = await api.get('produtos', it.id).catch(() => null); if (!pr) continue;
    const atual = +pr.estoque || 0;
    if (sinal < 0 && atual < it.qtd) faltou.push(it.nome);
    await api.update('produtos', it.id, { estoque: Math.max(0, atual + sinal * it.qtd) });
  }
  if (faltou.length) toast(`Atenção: o estoque de ${faltou.join(', ')} não cobre o pedido.`);
}
export async function mudarPedido(p, para) {
  if (para === 'separado') await mexerEstoque(p, -1);
  if (para === 'cancelado' && p.status === 'separado') await mexerEstoque(p, +1);   // já tinha saído do estoque: devolve
  await api.update('pedidos', p.id, { status: para, [para + 'Em']: Date.now() });
}

/* ---------- aba Pedidos do dono ---------- */
const conferido = (p, prods) => { let t = 0; for (const it of p.itens || []) { const pr = prods[it.id]; if (!pr) return null; t += (+pr.preco || 0) * it.qtd; } return r2(t); };
const pedRow = (p, prods) => {
  const [l, c] = ST[p.status] || ST.novo, conf = conferido(p, prods), div = conf != null && Math.abs(conf - (+p.total || 0)) > .01;
  return `<tr data-id="${esc(p.id)}"><td>${esc(p.nome || 'Aluno')}${p.obs ? `<small class="sub">“${esc(p.obs)}”</small>` : ''}</td><td>${esc(resumoItens(p))}</td>
    <td>${brl(p.total)}${div ? `<small class="sub">Conferir: preço atual dá ${brl(conf)}</small>` : ''}</td><td>${hora(p.ts)}</td><td class="keep"><span class="st-chip ${c}">${l}</span></td>
    <td class="act">${p.status === 'novo' ? '<button data-st="separado">Separar</button>' : ''}${p.status === 'separado' ? '<button data-st="entregue">Entregue e pago</button>' : ''}${p.status === 'novo' || p.status === 'separado' ? '<button data-st="cancelado">Cancelar</button>' : ''}</td></tr>`;
};
export function pedidosHTML(D) {
  const prods = Object.fromEntries((D.produtos || []).map(p => [p.id, p])), mes = dkey(new Date()).slice(0, 7), ps = D.pedidos || [];
  const doMes = ps.filter(p => p.status === 'entregue' && dkey(new Date(p.entregueEm || p.ts)).startsWith(mes));
  const fat = r2(doMes.reduce((t, p) => t + (+p.total || 0), 0)), emEstoque = r2((D.produtos || []).reduce((t, p) => t + (+p.preco || 0) * (+p.estoque || 0), 0));
  const baixo = (D.produtos || []).filter(p => p.ativo !== 'nao' && (+p.estoque || 0) <= (+p.estoqueMin || 0)).length;
  const kpi = (l, v, s) => `<div class="card"><small>${l}</small><b>${v}</b><em>${s}</em></div>`;
  return `<div class="head"><div><h1 class="h1">Pedidos da vitrine</h1><p class="muted" style="margin-top:4px;font-size:14px">Pedidos feitos pelos alunos pelo app. O pagamento é na retirada.</p></div>
    <div class="tools"><a class="btn dark" href="#/painel/produtos" style="width:auto;height:46px;padding:0 20px;border-radius:14px;font-size:14px">Gerenciar produtos</a></div></div>
  <div class="kpis money">${kpi('Pedidos novos', ps.filter(p => p.status === 'novo').length, 'aguardando separar')}${kpi('Faturamento do mês', brl(fat), `${doMes.length} ${doMes.length === 1 ? 'pedido entregue' : 'pedidos entregues'}`)}${kpi('Valor em estoque', brl(emEstoque), 'preço × unidades')}${kpi('Estoque baixo', baixo, 'produtos para repor')}</div>
  <div class="chips" id="pchips">${[['abertos', 'Em aberto'], ['entregue', 'Entregues'], ['cancelado', 'Cancelados'], ['todos', 'Todos']].map(([k, l], i) => `<button class="chip ${i ? '' : 'on'}" data-pf="${k}">${l}</button>`).join('')}</div>
  <section class="card tblcard"><table class="tbl"><thead><tr><th>Cliente</th><th>Itens</th><th>Total</th><th>Quando</th><th>Situação</th><th></th></tr></thead><tbody id="ptb"></tbody></table></section>`;
}
export function bindPedidos(el, D, repaint) {
  const prods = Object.fromEntries((D.produtos || []).map(p => [p.id, p])), tb = $('#ptb', el); let f = 'abertos';
  const draw = () => { const l = (D.pedidos || []).filter(p => f === 'todos' || (f === 'abertos' ? p.status === 'novo' || p.status === 'separado' : p.status === f));
    tb.innerHTML = l.slice(0, 60).map(p => pedRow(p, prods)).join('') || '<tr><td colspan="6" class="empty">Nenhum pedido aqui.</td></tr>'; };
  $('#pchips', el).onclick = e => { const b = e.target.closest('[data-pf]'); if (!b) return; f = b.dataset.pf; $$('#pchips .chip', el).forEach(c => c.classList.toggle('on', c === b)); draw(); };
  tb.onclick = async e => {
    const b = e.target.closest('[data-st]'), tr = e.target.closest('tr'), p = tr && (D.pedidos || []).find(x => x.id === tr.dataset.id); if (!b || !p) return;
    if (b.dataset.st === 'cancelado' && !(await confirmBox(`Cancelar o pedido de ${p.nome || 'aluno'}?${p.status === 'separado' ? ' Os produtos voltam para o estoque.' : ''}`, 'Cancelar pedido'))) return;
    try { await mudarPedido(p, b.dataset.st); toast(b.dataset.st === 'separado' ? 'Pedido separado. Estoque atualizado.' : b.dataset.st === 'entregue' ? 'Entrega registrada no faturamento.' : 'Pedido cancelado.'); await repaint(); }
    catch (err) { toast(friendly(err)); }
  };
  draw();
}

/* ---------- aviso de pedido novo na recepção ---------- */
let timer = null, aberto = false, onNovo = null; const visto = new Set(), titulo0 = document.title;
function beep() {
  try { const C = window.AudioContext || window.webkitAudioContext; if (C) { const a = new C(), t = a.currentTime;
    [880, 1175, 880].forEach((fr, i) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = fr; o.connect(g); g.connect(a.destination);
      g.gain.setValueAtTime(.0001, t + i * .18); g.gain.exponentialRampToValueAtTime(.25, t + i * .18 + .02); g.gain.exponentialRampToValueAtTime(.0001, t + i * .18 + .16); o.start(t + i * .18); o.stop(t + i * .18 + .17); });
    setTimeout(() => a.close && a.close(), 900); } } catch {}
  navigator.vibrate && navigator.vibrate([200, 100, 200]);
}
const cardPed = p => `<div class="pedc"><div class="pedh"><b>${esc(p.nome || 'Aluno')}</b><small>${hora(p.ts)}</small></div><ul>${(p.itens || []).map(i => `<li><b>${i.qtd}×</b> ${esc(i.nome)}</li>`).join('')}</ul>
  <p class="pedt">Total ${brl(p.total)} <span class="muted">· pagar na retirada</span></p>${p.obs ? `<p class="muted" style="margin:4px 0 0;font-size:13px">“${esc(p.obs)}”</p>` : ''}</div>`;
function popup(lista) {
  aberto = true; lista.forEach(p => visto.add(p.id)); beep(); document.title = `(${lista.length}) Novo pedido · Garrote`;
  const m = openModal({ title: lista.length > 1 ? `${lista.length} pedidos novos` : 'Novo pedido!', cancel: 'Depois', html: `<p class="muted" style="margin:-6px 0 8px;font-size:14px">Separe o produto para o aluno retirar na recepção.</p><div class="pedpop">${lista.map(cardPed).join('')}</div>`,
    foot: `<button type="button" class="btn ghost" data-ver>Ver pedidos</button><button type="button" class="btn red" data-sep>${lista.length > 1 ? 'Separar todos' : 'Separar produto'}</button>`,
    onClose: () => { aberto = false; document.title = titulo0; } });
  $('[data-ver]', m.form).onclick = () => { m.close(); go('/painel/pedidos'); };
  $('[data-sep]', m.form).onclick = async e => { const b = e.currentTarget; b.disabled = true;
    try { for (const p of lista) await mudarPedido(p, 'separado'); toast(lista.length > 1 ? 'Pedidos separados.' : 'Pedido separado. Estoque atualizado.'); m.close(); onNovo && onNovo(); }
    catch (err) { b.disabled = false; toast(friendly(err)); } };
}
/* o Firestore "lite" não tem escuta em tempo real: a tela do dono consulta os pedidos novos a cada 20 s (gasta poucas leituras, só vem o que está em aberto) */
export function iniciarAvisoPedidos(cb) {
  onNovo = cb; if (timer) return;
  const tick = async () => {
    if (!SESSION.me || SESSION.me.role !== 'dono') { clearInterval(timer); timer = null; return; }
    let novos; try { novos = await api.list('pedidos', [['status', '==', 'novo']], { fresh: true }); } catch { return; }
    const nao = novos.filter(p => !visto.has(p.id)).sort((a, b) => (a.ts || 0) - (b.ts || 0));
    if (!nao.length || aberto) return;
    popup(nao); onNovo && onNovo();
  };
  timer = setInterval(tick, 20000); tick();
}

/* ---------- vitrine do aluno ---------- */
let CARRINHO = {};   // id do produto -> quantidade (fica na memória enquanto o app está aberto)
const byNome = (a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
export async function loja() {
  const uid = sid(), [prods, meus] = await Promise.all([api.list('produtos'), api.list('pedidos', [['uid', '==', uid]]).catch(e => { console.error('pedidos', e); return []; })]);
  const lista = prods.filter(p => p.ativo !== 'nao').sort(byNome), cats = [...new Set(lista.map(p => p.categoria || 'Outros'))];
  meus.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  let cat = 'todas';
  const card = p => { const est = Math.max(0, +p.estoque || 0), q = Math.min(CARRINHO[p.id] || 0, est);
    return `<div class="vit-card ${est ? '' : 'out'}" data-id="${esc(p.id)}"><div class="vit-img" ${p.foto ? `style="background-image:url('${esc(p.foto)}')"` : ''}>${p.foto ? '' : ic('cart', 30)}</div>
      <div class="vit-info"><b>${esc(p.nome)}</b><small>${esc(p.descricao || p.categoria || '')}</small>
        <div class="vit-row"><span class="vit-pr">${brl(p.preco)}</span>${est ? `<div class="stp"><button type="button" data-m aria-label="Tirar um">−</button><b data-q>${q}</b><button type="button" data-p aria-label="Adicionar um">+</button></div>` : '<span class="vit-out">Esgotado</span>'}</div>
        ${est && est <= 3 ? `<small class="vit-low">Restam ${est}</small>` : ''}</div></div>`; };
  const pedido = p => { const [l, c] = ST_ALUNO[p.status] || ST_ALUNO.novo;
    return `<div class="vit-ped" data-id="${esc(p.id)}"><div><b>${esc(resumoItens(p))}</b><small>${hora(p.ts)} · ${brl(p.total)}</small></div><span class="st-chip ${c}">${l}</span>${p.status === 'novo' && !ro() ? '<button type="button" class="btn link" data-cancel style="height:34px">Cancelar</button>' : ''}</div>`; };
  return { depth: 2, html: `<header class="hero compact"><div class="topbar">${logo(30)}${topIcon()}</div>${await viewing()}</header>
    <div class="body"><div><h1 class="h1">Vitrine</h1><p class="muted" style="margin-top:4px;font-size:14px">Peça pelo app e retire na recepção. O pagamento é feito na retirada.</p></div>
      ${cats.length > 1 ? `<div class="vit-chips" id="vcats">${[['todas', 'Todos'], ...cats.map(c => [c, c])].map(([k, n]) => `<button class="chip ${k === 'todas' ? 'on' : ''}" data-c="${esc(k)}">${esc(n)}</button>`).join('')}</div>` : ''}
      <div class="vit-grid" id="vgrid"></div>
      ${meus.length ? `<section><h2 class="h2" style="margin-bottom:8px">Meus pedidos</h2><div class="vit-peds" id="vpeds">${meus.slice(0, 8).map(pedido).join('')}</div></section>` : ''}</div>
    <button type="button" class="cartbar" id="cb" hidden></button><div style="height:16px;flex:none"></div>${nav('home')}`,
  after(el) {
    const prod = id => lista.find(p => p.id === id), est = p => Math.max(0, +p.estoque || 0);
    const total = () => r2(Object.entries(CARRINHO).reduce((t, [id, q]) => t + (prod(id) ? (+prod(id).preco || 0) * q : 0), 0)), qtd = () => Object.values(CARRINHO).reduce((t, q) => t + q, 0);
    const bar = () => { const b = $('#cb', el), n = qtd(); b.hidden = !n; b.innerHTML = `<span>${ic('cart', 20, '#fff', 2)} Ver pedido · ${n} ${n === 1 ? 'item' : 'itens'}</span><b>${brl(total())}</b>`; };
    const draw = () => { $('#vgrid', el).innerHTML = lista.filter(p => cat === 'todas' || (p.categoria || 'Outros') === cat).map(card).join('') || '<p class="empty">Nenhum produto na vitrine ainda.</p>'; };
    for (const id of Object.keys(CARRINHO)) if (!prod(id)) delete CARRINHO[id];
    draw(); bar();
    const vc = $('#vcats', el); if (vc) vc.onclick = e => { const b = e.target.closest('.chip'); if (!b) return; cat = b.dataset.c; $$('.chip', vc).forEach(c => c.classList.toggle('on', c === b)); draw(); };
    $('#vgrid', el).onclick = e => { const b = e.target.closest('[data-m],[data-p]'); if (!b) return; if (ro()) return toast('Modo visualização: só o aluno pode pedir.');
      const c = b.closest('.vit-card'), p = prod(c.dataset.id), q = CARRINHO[p.id] || 0, nq = b.hasAttribute('data-p') ? Math.min(est(p), q + 1) : Math.max(0, q - 1);
      if (b.hasAttribute('data-p') && q >= est(p)) toast(`Só tem ${est(p)} em estoque.`);
      if (nq) CARRINHO[p.id] = nq; else delete CARRINHO[p.id];
      $('[data-q]', c).textContent = nq; bar(); };
    $('#cb', el).onclick = () => {
      const ids = Object.keys(CARRINHO).filter(id => prod(id));
      openModal({ title: 'Seu pedido', submit: 'Enviar pedido', html: `<div class="vit-sum">${ids.map(id => `<div class="vs"><span>${CARRINHO[id]}× ${esc(prod(id).nome)}</span><b>${brl((+prod(id).preco || 0) * CARRINHO[id])}</b></div>`).join('')}<div class="vs tot"><span>Total</span><b>${brl(total())}</b></div></div>
        <label class="field" style="margin-top:10px">Observação (opcional)<textarea name="obs" rows="2" maxlength="200" placeholder="Ex.: retiro às 18h"></textarea></label><p class="muted" style="font-size:13px;margin:8px 0 0">A recepção separa o pedido e você paga na retirada.</p>`,
        onSubmit: async f => {
          if (ro()) fail('Modo visualização: só o aluno pode pedir.'); if (!ids.length) fail('Seu pedido está vazio.');
          const itens = [];
          for (const id of ids) { const pr = await api.get('produtos', id); if (!pr || pr.ativo === 'nao') fail('Um produto saiu da vitrine. Atualize a página.');
            if ((+pr.estoque || 0) < CARRINHO[id]) fail(`Só restam ${+pr.estoque || 0} de ${pr.nome}.`); itens.push({ id, nome: pr.nome, preco: +pr.preco || 0, qtd: CARRINHO[id] }); }
          await api.add('pedidos', { uid: sid(), nome: SESSION.me.nome, itens, total: r2(itens.reduce((t, i) => t + i.preco * i.qtd, 0)), obs: f.obs.value.trim().slice(0, 200), status: 'novo', ts: Date.now() });
          CARRINHO = {}; toast('Pedido enviado. A recepção já foi avisada.'); setTimeout(() => dispatchEvent(new Event('hashchange')), 250);
        } });
    };
    const vp = $('#vpeds', el); if (vp) vp.onclick = async e => { const b = e.target.closest('[data-cancel]'); if (!b) return; if (ro()) return;
      if (!(await confirmBox('Cancelar este pedido?', 'Cancelar pedido'))) return;
      try { await api.update('pedidos', b.closest('.vit-ped').dataset.id, { status: 'cancelado' }); toast('Pedido cancelado.'); dispatchEvent(new Event('hashchange')); } catch (err) { toast(friendly(err)); } };
  } };
}
