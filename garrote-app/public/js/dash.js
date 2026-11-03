/* Painel inicial do dono: indicadores e gráficos interativos (HTML/CSS puro, sem biblioteca). */
import { $, $$, esc, brl, dkey, DIAS } from './ui.js';

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fk = k => `${k.slice(8)}/${k.slice(5, 7)}`;
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const diaIdx = k => (new Date(k + 'T12:00').getDay() + 6) % 7 + 1;   // 1 = segunda ... 7 = domingo
const pct = (a, b) => b ? Math.round((a - b) / b * 100) : null;
const delta = (a, b) => { const p = pct(a, b); return p === null ? '' : `<span class="${p >= 0 ? 'up' : 'dn'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}% vs. mês anterior</span>`; };

function dados(D, C) {
  const hoje = new Date(), mes = dkey(hoje).slice(0, 7), mesAnt = dkey(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)).slice(0, 7);
  const pag = D.pagamentos || [], soma = (f) => pag.filter(f).reduce((t, p) => t + (+p.valor || 0), 0);
  const ped = (D.pedidos || []).filter(p => p.status !== 'cancelado'), dPed = p => dkey(new Date(p.entregueEm || p.separadoEm || p.ts || 0));
  const alunos = C.rows.filter(r => r.a.ativo !== 'nao'), ck = D.ck90 || [];
  const meses = Array.from({ length: 6 }, (_, i) => { const d = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1), k = dkey(d).slice(0, 7);
    return { k, l: MES[d.getMonth()], alu: soma(p => (p.data || '').startsWith(k) && p.tipo !== 'treinador'), ext: soma(p => (p.data || '').startsWith(k) && p.tipo === 'treinador'),
      loja: ped.filter(p => p.status === 'entregue' && dPed(p).startsWith(k)).reduce((t, p) => t + (+p.total || 0), 0) }; });
  const recMes = meses[5].alu + meses[5].ext, recAnt = meses[4].alu + meses[4].ext;
  const ult14 = new Set(ck.filter(c => c.data >= dkey(addD(hoje, -13))).map(c => c.uid));
  return { hoje, mes, mesAnt, alunos, ck, meses, recMes, recAnt, ped,
    sumidos: alunos.filter(r => !ult14.has(r.a.id)).slice(0, 6),
    venc: C.rows.filter(r => r.a.ativo !== 'nao' && r.p && r.p.categoria !== 'totalpass' && r.a.vencimento && r.a.vencimento >= dkey(hoje) && r.a.vencimento <= dkey(addD(hoje, 7))).sort((a, b) => a.a.vencimento.localeCompare(b.a.vencimento)),
    sit: [['emdia', 'Em dia', '#2FB36B'], ['pendente', 'Pendente', '#E8A317'], ['atrasado', 'Em atraso', '#D91E26'], ['semplano', 'Sem plano', '#7C7C84']].map(([k, l, c]) => [k, l, c, C.rows.filter(r => r.st === k).length]),
    lojaMes: ped.filter(p => p.status === 'entregue' && dPed(p).startsWith(mes)).reduce((t, p) => t + (+p.total || 0), 0),
    novos: (D.pedidos || []).filter(p => p.status === 'novo').length, baixo: (D.produtos || []).filter(p => p.ativo !== 'nao' && (+p.estoque || 0) <= (+p.estoqueMin || 0)).sort((a, b) => (+a.estoque || 0) - (+b.estoque || 0)) };
}

export function dashHTML(D, C) {
  const X = dados(D, C), ckHoje = X.ck.filter(c => c.data === dkey(X.hoje)).length, ativos = X.alunos.length;
  const kpi = (l, v, s, href) => `<a class="dk" href="${href}"><small>${l}</small><b>${v}</b><em>${s}</em></a>`;
  const tot = X.sit.reduce((t, s) => t + s[3], 0) || 1;
  return `<div class="dash">
  <div class="dks">${kpi('Alunos ativos', ativos, `${C.rows.length - ativos} inativos`, '#/painel/alunos')}${kpi('Recebido no mês', brl(X.recMes), delta(X.recMes, X.recAnt) || 'pagamentos registrados', '#/painel/financeiro')}
    ${kpi('Receita prevista', brl(C.receita), 'planos ativos por mês', '#/painel/financeiro')}${kpi('Em atraso', X.sit[2][3], 'alunos com vencimento vencido', '#/painel/financeiro')}
    ${kpi('Check-ins hoje', ckHoje, ativos ? `${Math.round(ckHoje / ativos * 100)}% dos alunos` : '—', '#/painel/visao')}${kpi('Loja no mês', brl(X.lojaMes), X.novos ? `${X.novos} pedido(s) novo(s)` : 'pedidos entregues', '#/painel/pedidos')}</div>
  <div class="dgrid">
    <section class="card dcard dwide"><div class="dh"><h2 class="h2">Frequência</h2><div class="dseg" role="group" aria-label="Período">${[7, 30, 90].map((n, i) => `<button type="button" class="${i === 1 ? 'on' : ''}" data-dp="${n}">${n} dias</button>`).join('')}</div></div>
      <div id="dfreq"></div></section>
    <section class="card dcard"><div class="dh"><h2 class="h2">Receita por mês</h2><div class="dseg" role="group" aria-label="Tipo"><button type="button" class="on" data-dr="rec">Mensalidades</button><button type="button" data-dr="loja">Loja</button></div></div><div id="drec"></div></section>
    <section class="card dcard"><div class="dh"><h2 class="h2">Situação dos alunos</h2></div><div class="ddon"><div class="dring" id="dring" style="background:conic-gradient(${(() => { let a = 0; return X.sit.map(s => { const b = a + s[3] / tot * 100, r = `${s[2]} ${a}% ${b}%`; a = b; return r; }).join(','); })()})"><b>${C.rows.length}</b><small>alunos</small></div>
      <div class="dleg">${X.sit.map(s => `<a href="#/painel/financeiro" data-s="${s[0]}"><i style="background:${s[2]}"></i><span>${s[1]}</span><b>${s[3]}</b></a>`).join('')}</div></div></section>
    <section class="card dcard"><div class="dh"><h2 class="h2">Vencem nos próximos 7 dias</h2></div>${X.venc.length ? X.venc.slice(0, 6).map(r => `<a class="dli" href="#/painel/financeiro"><b>${esc(r.a.nome)}</b><small>${esc(r.p.nome)}</small><em>${fk(r.a.vencimento)}</em></a>`).join('') : '<p class="empty">Nenhum vencimento nesta semana.</p>'}</section>
    <section class="card dcard"><div class="dh"><h2 class="h2">Sem treinar há 14 dias</h2></div>${X.sumidos.length ? X.sumidos.map(r => `<a class="dli" href="#/painel/alunos"><b>${esc(r.a.nome)}</b><small>${r.a.telefone ? esc(r.a.telefone) : esc(r.a.email || '')}</small></a>`).join('') : '<p class="empty">Todos treinaram nas últimas duas semanas.</p>'}</section>
    <section class="card dcard"><div class="dh"><h2 class="h2">Loja: estoque baixo</h2></div>${X.baixo.length ? X.baixo.slice(0, 6).map(p => `<a class="dli" href="#/painel/produtos"><b>${esc(p.nome)}</b><small>mínimo ${+p.estoqueMin || 0}</small><em class="${(+p.estoque || 0) <= 0 ? 'dn' : ''}">${+p.estoque || 0} un.</em></a>`).join('') : '<p class="empty">Estoque em dia.</p>'}</section>
  </div></div>`;
}

export function bindDash(el, D, C) {
  const X = dados(D, C); let per = 30, rec = 'rec';
  const freq = () => {
    const dias = Array.from({ length: per }, (_, i) => dkey(addD(X.hoje, i - per + 1))), cnt = Object.fromEntries(dias.map(k => [k, 0]));
    X.ck.forEach(c => { if (c.data in cnt) cnt[c.data]++; });
    const v = dias.map(k => cnt[k]), max = Math.max(1, ...v), total = v.reduce((a, b) => a + b, 0);
    const sem = [0, 0, 0, 0, 0, 0, 0, 0]; dias.forEach(k => { sem[diaIdx(k)] += cnt[k]; });
    const hr = Array(24).fill(0); X.ck.forEach(c => { if (c.data in cnt && c.ts) hr[new Date(c.ts).getHours()]++; });
    const pico = hr.indexOf(Math.max(...hr)), melhor = sem.indexOf(Math.max(...sem.slice(1)));
    const smax = Math.max(1, ...sem.slice(1));
    $('#dfreq', el).innerHTML = `<div class="dsum"><div><b>${total}</b><small>check-ins</small></div><div><b>${(total / per).toFixed(1).replace('.', ',')}</b><small>por dia</small></div><div><b>${total ? DIAS[melhor] : '—'}</b><small>dia mais cheio</small></div><div><b>${total && hr[pico] ? String(pico).padStart(2, '0') + 'h' : '—'}</b><small>horário de pico</small></div></div>
      <div class="dbars" role="group" aria-label="Check-ins por dia">${dias.map((k, i) => `<button type="button" class="dbar" data-i="${i}" style="--h:${v[i] / max * 100}%" aria-label="${fk(k)}: ${v[i]} check-ins"><i></i></button>`).join('')}</div>
      <div class="dax"><span>${fk(dias[0])}</span><span id="dinfo" aria-live="polite">Toque numa barra para ver o dia</span><span>${fk(dias[per - 1])}</span></div>
      <div class="dwk"><small>Por dia da semana</small>${[1, 2, 3, 4, 5, 6, 7].map(n => `<div class="dwr"><span>${DIAS[n]}</span><i style="--w:${sem[n] / smax * 100}%"></i><b>${sem[n]}</b></div>`).join('')}</div>`;
    const info = $('#dinfo', el), mostra = b => { $$('.dbar', el).forEach(x => x.classList.toggle('on', x === b)); const i = +b.dataset.i; info.textContent = `${DIAS[diaIdx(dias[i])]}, ${fk(dias[i])}: ${v[i]} ${v[i] === 1 ? 'check-in' : 'check-ins'}`; };
    $$('.dbar', el).forEach(b => { b.onclick = () => mostra(b); b.onmouseenter = () => mostra(b); b.onfocus = () => mostra(b); });
  };
  const receita = () => {
    const val = m => rec === 'loja' ? m.loja : m.alu + m.ext, max = Math.max(1, ...X.meses.map(val));
    $('#drec', el).innerHTML = `<div class="dcols">${X.meses.map((m, i) => `<button type="button" class="dcol ${i === 5 ? 'now' : ''}" data-i="${i}" aria-label="${m.l}: ${brl(val(m))}"><small>${val(m) ? brl(val(m)).replace('R$', '').trim() : ''}</small><span style="--h:${val(m) / max * 100}%"><i></i></span><em>${m.l}</em></button>`).join('')}</div>
      <p class="dnote" id="dnote">${rec === 'loja' ? 'Pedidos entregues na loja' : 'Mensalidades dos alunos e dos treinadores externos'} · toque numa coluna para detalhar</p>`;
    $$('.dcol', el).forEach(b => b.onclick = () => { const m = X.meses[+b.dataset.i]; $$('.dcol', el).forEach(x => x.classList.toggle('sel', x === b));
      $('#dnote', el).textContent = rec === 'loja' ? `${m.l}: ${brl(m.loja)} em vendas` : `${m.l}: alunos ${brl(m.alu)}${m.ext ? ` · treinadores externos ${brl(m.ext)}` : ''}`; });
  };
  $$('[data-dp]', el).forEach(b => b.onclick = () => { per = +b.dataset.dp; $$('[data-dp]', el).forEach(x => x.classList.toggle('on', x === b)); freq(); });
  $$('[data-dr]', el).forEach(b => b.onclick = () => { rec = b.dataset.dr; $$('[data-dr]', el).forEach(x => x.classList.toggle('on', x === b)); receita(); });
  freq(); receita();
}
