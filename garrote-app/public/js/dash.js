/* Painel inicial do dono: indicadores e gráficos interativos (HTML/CSS puro, sem biblioteca). */
import { $, $$, esc, brl, dkey, DIAS, ic, avatar } from './ui.js';

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

/* curva suave (Catmull-Rom → Bézier) por uma lista de pontos [x, y] */
const curva = P => P.length < 3 ? P.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ') : P.map((p, i) => {
  if (!i) return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const p0 = P[i - 2] || P[i - 1], p1 = P[i - 1], p3 = P[i + 1] || p, c = (a, b, k) => [a[0] + (b[0] - k[0]) / 6, a[1] + (b[1] - k[1]) / 6];
  const c1 = c(p1, p, p0), c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6], cl = y => Math.max(0, y);
  return `C${c1[0].toFixed(1)} ${cl(c1[1]).toFixed(1)} ${c2[0].toFixed(1)} ${cl(c2[1]).toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`; }).join(' ');
const nice = m => { if (m <= 4) return 4; const e = Math.pow(10, Math.floor(Math.log10(m))), f = m / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; };
let uid = 0;
/* mini gráfico de linha para os cartões */
function spark(vals, cor = '#fff') {
  const id = 'sp' + (++uid), W = 120, H = 40, max = Math.max(1, ...vals), P = vals.map((v, i) => [i / Math.max(1, vals.length - 1) * W, H - 4 - v / max * (H - 10)]), l = curva(P);
  return `<svg class="dspark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cor}" stop-opacity=".35"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></linearGradient></defs>
    <path d="${l} L${W} ${H} L0 ${H}Z" fill="url(#${id})"/><path d="${l}" fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}

export function dashHTML(D, C) {
  const X = dados(D, C), hoje = dkey(X.hoje), ckHoje = X.ck.filter(c => c.data === hoje).length, ativos = X.alunos.length;
  const ult14 = Array.from({ length: 14 }, (_, i) => { const k = dkey(addD(X.hoje, i - 13)); return X.ck.filter(c => c.data === k).length; });
  const tot = X.sit.reduce((t, s) => t + s[3], 0), R = 54, L = 2 * Math.PI * R, gap = tot > 1 ? 4 : 0;
  let off = 0; const arcos = X.sit.map((s, i) => { const len = tot ? s[3] / tot * L : 0, d = Math.max(0, len - gap), o = off; off += len;
    return len ? `<circle class="dsg" data-i="${i}" cx="70" cy="70" r="${R}" fill="none" stroke="${s[2]}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${d.toFixed(1)} ${(L - d).toFixed(1)}" stroke-dashoffset="${(-o - gap / 2).toFixed(1)}"/>` : ''; }).join('');
  const tile = (cls, ico, l, v, s, href, extra = '') => `<a class="dk ${cls}" href="${href}"><span class="dki">${ic(ico, 20, 'currentColor', 1.9)}</span><small>${l}</small><b>${v}</b><em>${s}</em>${extra}</a>`;
  const pessoa = (r, sub, fim, cls = '') => `<a class="dli" href="#/painel/${r.go}"><span class="dav">${avatar({ nome: r.a.nome, foto: '' }, 34)}</span><b>${esc(r.a.nome)}</b><small>${esc(sub)}</small>${fim ? `<em class="${cls}">${fim}</em>` : ''}</a>`;
  return `<div class="dash">
  <div class="dks">
    ${tile('hero', 'dollar', 'Recebido no mês', brl(X.recMes), delta(X.recMes, X.recAnt) || 'pagamentos registrados', '#/painel/financeiro', spark(X.meses.map(m => m.alu + m.ext)))}
    ${tile('', 'coach', 'Alunos ativos', ativos, `${C.rows.length - ativos} inativos`, '#/painel/alunos')}
    ${tile('', 'check', 'Check-ins hoje', ckHoje, ativos ? `${Math.round(ckHoje / ativos * 100)}% dos alunos` : '—', '#/painel/visao', spark(ult14, '#D91E26'))}
    ${tile('', 'dash', 'Receita prevista', brl(C.receita), 'planos ativos por mês', '#/painel/financeiro')}
    ${tile(X.sit[2][3] ? 'warn' : '', 'bell', 'Em atraso', X.sit[2][3], X.sit[2][3] ? 'alunos com vencimento vencido' : 'ninguém em atraso', '#/painel/financeiro')}
    ${tile('', 'cart', 'Loja no mês', brl(X.lojaMes), X.novos ? `<span class="up">${X.novos} pedido(s) novo(s)</span>` : 'pedidos entregues', '#/painel/pedidos')}</div>
  <div class="dgrid">
    <section class="card dcard dwide"><div class="dh"><div><h2 class="h2">Frequência</h2><p class="dsub" id="dsub"></p></div><div class="dseg" role="group" aria-label="Período">${[7, 30, 90].map((n, i) => `<button type="button" class="${i === 1 ? 'on' : ''}" data-dp="${n}">${n} dias</button>`).join('')}</div></div>
      <div id="dfreq"></div></section>
    <section class="card dcard"><div class="dh"><div><h2 class="h2">Receita por mês</h2><p class="dsub" id="drs"></p></div><div class="dseg" role="group" aria-label="Tipo"><button type="button" class="on" data-dr="rec">Mensalidades</button><button type="button" data-dr="loja">Loja</button></div></div><div id="drec"></div></section>
    <section class="card dcard"><div class="dh"><h2 class="h2">Situação dos alunos</h2></div><div class="ddon"><div class="dring"><svg viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--bg)" stroke-width="16"/><g transform="rotate(-90 70 70)">${arcos}</g></svg><div class="dcen"><b id="dcn">${C.rows.length}</b><small id="dcl">alunos</small></div></div>
      <div class="dleg">${X.sit.map((s, i) => `<a href="#/painel/financeiro" data-i="${i}"><i style="background:${s[2]}"></i><span>${s[1]}</span><b>${s[3]}</b><em>${tot ? Math.round(s[3] / tot * 100) : 0}%</em></a>`).join('')}</div></div></section>
    <section class="card dcard"><div class="dh"><h2 class="h2">Vencem em 7 dias</h2>${X.venc.length ? `<span class="dbadge">${X.venc.length}</span>` : ''}</div>${X.venc.length ? X.venc.slice(0, 5).map(r => pessoa({ ...r, go: 'financeiro' }, r.p.nome, fk(r.a.vencimento))).join('') : '<p class="dok">Nenhum vencimento nesta semana.</p>'}</section>
    <section class="card dcard"><div class="dh"><h2 class="h2">Sem treinar há 14 dias</h2>${X.sumidos.length ? `<span class="dbadge warn">${X.sumidos.length}</span>` : ''}</div>${X.sumidos.length ? X.sumidos.map(r => pessoa({ ...r, go: 'alunos' }, r.a.telefone || r.a.email || '', '')).join('') : '<p class="dok">Todos treinaram nas últimas duas semanas.</p>'}</section>
    <section class="card dcard"><div class="dh"><h2 class="h2">Loja: estoque baixo</h2>${X.baixo.length ? `<span class="dbadge warn">${X.baixo.length}</span>` : ''}</div>${X.baixo.length ? X.baixo.slice(0, 5).map(p => `<a class="dli" href="#/painel/produtos"><span class="dav dprod">${ic('cart', 16)}</span><b>${esc(p.nome)}</b><small>mínimo ${+p.estoqueMin || 0} un.</small><em class="${(+p.estoque || 0) <= 0 ? 'dn' : ''}">${+p.estoque || 0} un.</em></a>`).join('') : '<p class="dok">Estoque em dia.</p>'}</section>
  </div></div>`;
}

export function bindDash(el, D, C) {
  const X = dados(D, C); let per = 30, rec = 'rec';
  const ptn = n => String(n).replace('.', ',');
  const freq = () => {
    const dias = Array.from({ length: per }, (_, i) => dkey(addD(X.hoje, i - per + 1))), cnt = Object.fromEntries(dias.map(k => [k, 0]));
    X.ck.forEach(c => { if (c.data in cnt) cnt[c.data]++; });
    const v = dias.map(k => cnt[k]), total = v.reduce((a, b) => a + b, 0), ymax = nice(Math.max(1, ...v)), n = per;
    const ant = per * 2 <= 90 ? X.ck.filter(c => c.data >= dkey(addD(X.hoje, -per * 2 + 1)) && c.data < dias[0]).length : null;
    $('#dsub', el).innerHTML = `${total} check-ins ${ant !== null ? (pct(total, ant) === null ? '' : `· <span class="${total >= ant ? 'up' : 'dn'}">${total >= ant ? '▲' : '▼'} ${Math.abs(pct(total, ant))}%</span> vs. ${per} dias antes`) : ''}`;
    const sem = [0, 0, 0, 0, 0, 0, 0, 0]; dias.forEach(k => { sem[diaIdx(k)] += cnt[k]; });
    const hr = Array(24).fill(0); X.ck.forEach(c => { if (c.data in cnt && c.ts) hr[new Date(c.ts).getHours()]++; });
    const hmax = Math.max(1, ...hr), pico = hr.indexOf(Math.max(...hr)), melhor = sem.indexOf(Math.max(...sem.slice(1))), smax = Math.max(1, ...sem.slice(1));
    const W = 600, H = 190, P = v.map((y, i) => [i / (n - 1) * W, H - 10 - y / ymax * (H - 30)]), l = curva(P);
    const grade = [0, 1, 2, 3, 4].map(i => { const y = H - 10 - i / 4 * (H - 30); return `<line x1="0" x2="${W}" y1="${y}" y2="${y}" class="dgl"/>`; }).join('');
    const ylab = [0, 1, 2, 3, 4].map(i => `<span style="bottom:calc(${(10 + i / 4 * (H - 30)) / H * 100}% - 7px)">${ptn(+(ymax * i / 4).toFixed(1))}</span>`).join('');
    const ticks = n <= 7 ? dias : [0, 1, 2, 3, 4].map(i => dias[Math.round(i / 4 * (n - 1))]);
    $('#dfreq', el).innerHTML = `<div class="dsum"><div><b>${total}</b><small>check-ins</small></div><div><b>${ptn((total / per).toFixed(1))}</b><small>por dia</small></div><div><b>${total ? DIAS[melhor] : '—'}</b><small>dia mais cheio</small></div><div><b>${total && hr[pico] ? String(pico).padStart(2, '0') + 'h' : '—'}</b><small>horário de pico</small></div></div>
      <div class="dchart" id="dch"><div class="dy" aria-hidden="true">${ylab}</div><div class="dplot" id="dplot"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Check-ins por dia"><defs><linearGradient id="dgf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D91E26" stop-opacity=".38"/><stop offset="1" stop-color="#D91E26" stop-opacity="0"/></linearGradient></defs>
        ${grade}<path d="${l} L${W} ${H} L0 ${H}Z" fill="url(#dgf)" class="darea"/><path d="${l}" class="dline" fill="none" vector-effect="non-scaling-stroke"/></svg><div class="dguide" id="dguide"></div><div class="ddot" id="ddot"></div><div class="dtip" id="dtip"></div></div></div>
      <div class="dax">${ticks.map(k => `<span>${fk(k)}</span>`).join('')}</div>
      <div class="dtwo"><div class="dwk"><small>Por dia da semana</small>${[1, 2, 3, 4, 5, 6, 7].map(i => `<div class="dwr ${sem[i] === smax && total ? 'top' : ''}"><span>${DIAS[i]}</span><i style="--w:${sem[i] / smax * 100}%"></i><b>${sem[i]}</b></div>`).join('')}</div>
        <div class="dhr"><small>Por horário <em id="dhi">${total && hr[pico] ? `pico às ${String(pico).padStart(2, '0')}h` : ''}</em></small><div class="dhs">${Array.from({ length: 18 }, (_, i) => i + 5).map(h => `<button type="button" data-h="${h}" style="--a:${hr[h] / hmax}" aria-label="${h}h: ${hr[h]} check-ins"></button>`).join('')}</div><div class="dhl"><span>5h</span><span>11h</span><span>17h</span><span>22h</span></div></div></div>`;
    const plot = $('#dplot', el), guide = $('#dguide', el), dot = $('#ddot', el), tip = $('#dtip', el);
    const mostra = i => { const x = i / (n - 1) * 100, y = P[i][1] / H * 100;
      guide.style.left = dot.style.left = x + '%'; dot.style.top = y + '%'; tip.style.left = Math.min(88, Math.max(12, x)) + '%'; tip.style.top = `calc(${y}% - 12px)`;
      tip.innerHTML = `<b>${v[i]} ${v[i] === 1 ? 'check-in' : 'check-ins'}</b><small>${DIAS[diaIdx(dias[i])]}, ${fk(dias[i])}</small>`; plot.classList.add('on'); };
    const padrao = () => mostra(v.indexOf(Math.max(...v)) < 0 ? n - 1 : v.lastIndexOf(Math.max(...v)));
    const mover = e => { const r = plot.getBoundingClientRect(); mostra(Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left) / r.width * (n - 1))))); };
    plot.onpointermove = mover; plot.onpointerdown = mover; plot.onpointerleave = padrao; padrao();
    $$('.dhs button', el).forEach(b => { const h = +b.dataset.h, f = () => { $('#dhi', el).textContent = `${String(h).padStart(2, '0')}h: ${hr[h]} ${hr[h] === 1 ? 'check-in' : 'check-ins'}`; $$('.dhs button', el).forEach(x => x.classList.toggle('on', x === b)); }; b.onmouseenter = b.onclick = b.onfocus = f; });
  };
  const receita = () => {
    const val = m => rec === 'loja' ? m.loja : m.alu + m.ext, max = Math.max(1, ...X.meses.map(val)), tot = X.meses.reduce((t, m) => t + val(m), 0);
    $('#drs', el).textContent = `${brl(tot)} em 6 meses`;
    $('#drec', el).innerHTML = `<div class="dcols">${X.meses.map((m, i) => `<button type="button" class="dcol ${i === 5 ? 'now sel' : ''}" data-i="${i}" aria-label="${m.l}: ${brl(val(m))}"><small>${val(m) ? brl(val(m)).replace('R$', '').trim().replace(/,00$/, '') : ''}</small><span><i class="dc1" style="--h:${rec === 'loja' ? m.loja / max * 100 : m.alu / max * 100}%"></i>${rec === 'loja' || !m.ext ? '' : `<i class="dc2" style="--h:${m.ext / max * 100}%"></i>`}</span><em>${m.l}</em></button>`).join('')}</div>
      <p class="dnote" id="dnote"></p>`;
    const nota = i => { const m = X.meses[i]; $$('.dcol', el).forEach((x, j) => x.classList.toggle('sel', j === i));
      $('#dnote', el).innerHTML = rec === 'loja' ? `<b>${m.l}</b> · ${brl(m.loja)} em vendas entregues` : `<b>${m.l}</b> · alunos ${brl(m.alu)}${m.ext ? ` · <span class="dext">externos ${brl(m.ext)}</span>` : ''}`; };
    $$('.dcol', el).forEach(b => b.onclick = () => nota(+b.dataset.i)); nota(5);
  };
  const cen = i => { const s = X.sit[i]; $('#dcn', el).textContent = s ? s[3] : C.rows.length; $('#dcl', el).textContent = s ? s[1] : 'alunos'; $$('.dsg', el).forEach(c => c.classList.toggle('hot', !!s && +c.dataset.i === i)); $$('.dleg a', el).forEach(a => a.classList.toggle('hot', !!s && +a.dataset.i === i)); };
  $$('.dsg, .dleg a', el).forEach(a => { a.onmouseenter = a.onfocus = () => cen(+a.dataset.i); a.onmouseleave = a.onblur = () => cen(-1); });
  $$('[data-dp]', el).forEach(b => b.onclick = () => { per = +b.dataset.dp; $$('[data-dp]', el).forEach(x => x.classList.toggle('on', x === b)); freq(); });
  $$('[data-dr]', el).forEach(b => b.onclick = () => { rec = b.dataset.dr; $$('[data-dr]', el).forEach(x => x.classList.toggle('on', x === b)); receita(); });
  freq(); receita();
}
