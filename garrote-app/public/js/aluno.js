/* Telas do aluno (celular). O dono e o treinador também abrem estas telas em modo visualização. */
import { api } from './api.js';
import { perfilHTML, bindPerfil } from './perfil.js';
import { perLabel, situ, ptDate } from './plano.js';
import { $, $$, esc, avatar, toast, countUp, raf2, ic, playIc, logo, DIAS, LET, SEMANA, MESES, iso, dkey, fmt, kgTxt, initials, SESSION, sid, ro, go, friendly } from './ui.js';

const META_MES = 20;
const cap = s => s[0].toUpperCase() + s.slice(1);
const dayBefore = d => { const x = new Date(d); x.setDate(x.getDate() - 1); return x; };
const prevTrainingDay = d => { let x = dayBefore(d); if (x.getDay() === 0) x = dayBefore(x); return x; };   // domingo não quebra a sequência

/* sequência atual e recorde, a partir das datas de check-in */
export function streakInfo(dates, today) {
  let cur = 0, d = new Date(today);
  if (!dates.has(dkey(d))) d = prevTrainingDay(d);
  if (d.getDay() === 0) d = dayBefore(d);
  while (dates.has(dkey(d))) { cur++; d = prevTrainingDay(d); }
  const runs = {}; let rec = 0;
  [...dates].sort().forEach(k => { const [y, m, dd] = k.split('-').map(Number); const p = dkey(prevTrainingDay(new Date(y, m - 1, dd))); runs[k] = (runs[p] || 0) + 1; rec = Math.max(rec, runs[k]); });
  return { cur, rec: Math.max(rec, cur) };
}

const topIcon = () => `<a class="iconbtn avbtn" href="#/perfil" aria-label="Meu perfil">${avatar(SESSION.me, 44)}</a>`;
const viewing = async () => ro() ? `<p class="viewing">Visualizando como ${esc((await api.get('users', sid()) || {}).nome || 'aluno')}. Somente leitura.</p>` : '';
const nav = a => `<nav class="nav" aria-label="Principal">${[['home', 'Início', '/home'], ['db', 'Treino', '/treinos'], ['grid', 'Modalidades', '/modalidades'], ['user', 'Perfil', '/perfil']]
  .map(([i, n, h]) => `<a href="#${h}" aria-label="${n}" class="${a === i ? 'on' : ''}">${ic(i)}<span class="lbl">${n}</span></a>`).join('')}</nav>`;
const ring = (id) => `<svg width="112" height="112" viewBox="0 0 120 120" role="img" aria-label="Sequência de treinos"><circle cx="60" cy="60" r="52" fill="none" stroke="#2A2A2D" stroke-width="8"/><circle ${id} class="arc" cx="60" cy="60" r="52" fill="none" stroke="#D91E26" stroke-width="8" stroke-linecap="round" style="stroke-dasharray:0 327" transform="rotate(-90 60 60)"/></svg>`;
const setArc = (arc, pct) => { arc.style.strokeDasharray = `${Math.max(0, Math.min(1, pct)) * 326.7} 327`; };
const blocked = () => toast('Modo visualização: só o aluno pode gravar.');

function videoEl(url, label, tag) {
  const yt = url && url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  if (yt) return `<div class="video"><iframe src="https://www.youtube.com/embed/${yt[1]}" title="${esc(label)}" loading="lazy" allowfullscreen></iframe><span class="vtag">${tag}</span></div>`;
  if (url) return `<div class="video"><video src="${esc(url)}" controls playsinline preload="metadata"></video><span class="vtag">${tag}</span></div>`;
  return `<div class="video"><span class="vtag">${tag}</span><span class="vlabel">${esc(label)}</span><button class="play" data-soon="O professor ainda não anexou o vídeo." aria-label="Reproduzir vídeo">${playIc}</button><div class="vbar"></div></div>`;
}

const myTreinos = uid => api.list('treinos', [['alunoIds', 'array-contains', uid]]);
const toMap = a => Object.fromEntries(a.map(x => [x.id, x]));
const nSets = it => Math.max(1, it.series | 0);
const itemDone = (it, feitos) => { const f = feitos[it.exId] || []; return f.length >= nSets(it) && f.slice(0, nSets(it)).every(Boolean); };

/* ---------------- Início ---------------- */
export async function home() {
  const uid = sid(), t = new Date(), k = dkey(t);
  const [cks, treinos, prof] = await Promise.all([api.list('checkins', [['uid', '==', uid]]), myTreinos(uid), ro() ? api.get('users', uid) : SESSION.me]);
  const dates = new Set(cks.map(c => c.data)), checked = dates.has(k);
  const { cur, rec } = streakInfo(dates, t);
  const mon = new Date(t); mon.setDate(t.getDate() - (iso(t) - 1));
  let week = '', weekN = 0;
  for (let n = 1; n <= 7; n++) {
    const d = new Date(mon); d.setDate(mon.getDate() + n - 1);
    const has = dates.has(dkey(d)); if (has) weekN++;
    let c = has ? 'done' : n === iso(t) ? 'today' : n > iso(t) ? (n === 7 ? 'rest' : '') : (n === 7 ? 'rest' : 'miss');
    week += `<div class="day"><span>${LET[n]}</span><b class="${c}" data-day="${n}">${has ? ic('check', 18, '#fff', 2.4) : d.getDate()}</b></div>`;
  }
  const mes = [...dates].filter(x => x.startsWith(k.slice(0, 7))).length;
  const hoje = treinos.find(x => (x.dias || []).includes(iso(t))) || null;
  const hint = (c, r) => !r ? 'Faça seu primeiro check-in e comece a sequência.' : c >= r ? 'Você está no seu recorde. Continue assim.' : `Faltam ${r - c} dias para bater seu recorde de ${r}.`;
  return { depth: 1, html: `
  <header class="hero"><div class="topbar">${logo(30)}${topIcon()}</div>${await viewing()}
    <div class="topbar"><div><div class="date">${cap(SEMANA[t.getDay()])}, ${t.getDate()} de ${MESES[t.getMonth()]}</div>
      <h1 class="hello">Olá, ${esc((prof.nome || '').split(' ')[0])}</h1><p class="hint" id="hint">${hint(cur, rec)}</p></div>
      <div class="ringbox">${ring('id="arc"')}<div class="mid"><b id="streak">${cur}</b><small>DIAS</small></div></div></div>
    <button class="btn red ${checked ? 'done' : ''}" id="ci" ${checked ? 'disabled' : ''}>${ic('check', 20, '#fff', 2.2)}${checked ? 'Check-in feito hoje' : 'Fazer check-in de hoje'}</button>
  </header>
  <div class="body dgrid">
    <section class="card span2"><div class="row" style="justify-content:space-between;margin-bottom:12px"><h2 class="h2">Esta semana</h2><span class="muted" id="wk" style="font-size:13px">${weekN} de 6 dias</span></div><div class="week">${week}</div></section>
    <div class="stats">
      <div class="card"><small>Treinos no mês</small><b id="mes">${mes}<span> / ${META_MES}</span></b><div class="mbar"><i data-w="${Math.min(100, mes / META_MES * 100)}"></i></div></div>
      <div class="card"><small>Recorde</small><b>${rec}<span> dias</span></b><small style="margin-top:8px">seguidos</small></div>
    </div>
    ${hoje ? `<a class="card tcard" href="#/treino/${hoje.id}"><div style="flex:1"><div class="k">Treino de hoje</div><div class="t">${esc(hoje.nome)}</div>
      <div class="m">${(hoje.itens || []).length} exercícios</div></div><span class="go">${ic('arrow')}</span></a>`
    : `<a class="card tcard" href="#/treinos"><div style="flex:1"><div class="k">Treino de hoje</div><div class="t">Sem treino para hoje</div><div class="m">${treinos.length ? 'Veja todos os seus treinos' : 'Fale com seu professor para receber um treino'}</div></div><span class="go">${ic('arrow')}</span></a>`}
  </div><div style="height:16px;flex:none"></div>${nav('home')}`,
  after(el) {
    const arc = $('#arc', el);
    raf2(() => { setArc(arc, rec ? cur / rec : 0); $$('.mbar i', el).forEach(i => i.style.width = i.dataset.w + '%'); });
    countUp($('#streak', el), 0, cur, 900);
    $('#ci', el).onclick = async e => {
      if (ro()) return blocked();
      if (dates.has(k)) return;
      const b = e.currentTarget; b.disabled = true;
      try { await api.set('checkins', `${uid}_${k}`, { uid, data: k, ts: Date.now() }); }
      catch (err) { b.disabled = false; return toast(friendly(err)); }
      dates.add(k); const s = streakInfo(dates, t);
      b.classList.add('done', 'pop'); b.innerHTML = ic('check', 20, '#fff', 2.4, 'draw') + 'Check-in feito hoje';
      setArc(arc, s.rec ? s.cur / s.rec : 0); countUp($('#streak', el), cur, s.cur, 600); $('#hint', el).textContent = hint(s.cur, s.rec);
      const c = $(`[data-day="${iso(t)}"]`, el); c.className = 'done pop'; c.innerHTML = ic('check', 18, '#fff', 2.4, 'draw');
      $('#wk', el).textContent = `${weekN + 1} de 6 dias`;
      toast(`Check-in feito. Sequência de ${s.cur} ${s.cur === 1 ? 'dia' : 'dias'}.`);
    };
  } };
}

/* ---------------- Meus treinos ---------------- */
export async function treinos() {
  const uid = sid(), list = await myTreinos(uid), mods = toMap(await api.list('modalidades'));
  const cards = list.map(t => `<a class="card mcard" href="#/treino/${t.id}"><div class="top"><div class="mic">${ic('db', 26)}</div><div><h3>${esc(t.nome)}</h3><small>${esc((mods[t.modalidadeId] || {}).nome || 'Treino')} · ${(t.itens || []).length} exercícios</small></div></div>
    <div class="foot"><div class="dias">${[1, 2, 3, 4, 5, 6, 7].map(n => `<span class="${(t.dias || []).includes(n) ? 'on' : ''}">${LET[n]}</span>`).join('')}</div>${ic('chev', 20, '#B5B5BA')}</div></a>`).join('');
  return { depth: 2, html: `<header class="hero compact"><div class="topbar">${logo(30)}${topIcon()}</div>${await viewing()}</header>
    <div class="body"><div><h1 class="h1">Meus treinos</h1><p class="muted" style="margin-top:4px;font-size:14px">Montados pelo seu professor</p></div>
    <div class="cards">${cards || '<p class="empty">Você ainda não tem treino. Fale com seu professor.</p>'}</div></div><div style="height:16px;flex:none"></div>${nav('db')}` };
}

/* ---------------- Lista do treino ---------------- */
async function loadTreino(tid) {
  const uid = sid(), k = dkey(new Date());
  const [t, exs, cats, ex0] = await Promise.all([api.get('treinos', tid), api.list('exercicios'), api.list('categorias'), api.get('execucoes', `${uid}_${tid}_${k}`)]);
  if (!t) return null;
  const catMap = toMap(cats), exMap = Object.fromEntries(exs.map(e => [e.id, { ...e, grupo: (catMap[e.categoriaId] || {}).nome || '' }]));
  return { t, exMap, feitos: (ex0 && ex0.feitos) || {}, valores: (ex0 && ex0.valores) || {}, eid: `${uid}_${tid}_${k}`, k };
}
export async function treino(tid) {
  const D = await loadTreino(tid); if (!D) return { depth: 3, html: `<div class="wk"><a class="iconbtn" href="#/treinos">${ic('back', 20)}</a><p class="empty">Treino não encontrado.</p></div>`, dark: true };
  const its = D.t.itens || [], done = its.filter(i => itemDone(i, D.feitos)).length, nx = its.find(i => !itemDone(i, D.feitos));
  const rows = its.map((i, n) => { const e = D.exMap[i.exId] || { nome: '(exercício removido)' }, st = itemDone(i, D.feitos) ? 'done' : (nx === i ? 'now' : '');
    return `<a class="lrow ${st}" href="#/exercicio/${tid}/${n}"><span class="lb">${st === 'done' ? ic('check', 20, '#fff', 2.2) : n + 1}</span>
      <div class="tx"><b>${esc(e.nome)}${st === 'now' ? '<span class="tag">EM ANDAMENTO</span>' : ''}</b><small>${nSets(i)} × ${i.reps} · ${kgTxt(i.kg)} · ${i.descanso}s</small></div>${ic('chev', 20, '#6A6A70')}</a>`; }).join('');
  const nxIdx = its.indexOf(nx);
  return { depth: 3, dark: true, html: `<div class="wk">
    <div class="wk-head"><a class="iconbtn" href="#/treinos" aria-label="Voltar">${ic('back', 20)}</a><small style="font:600 11px var(--b);letter-spacing:2px;color:var(--dim)">TREINO</small><span style="width:44px"></span></div>
    <div><h1 class="h1">${esc(D.t.nome)}</h1><p class="muted" style="margin-top:6px;font-size:14px">${its.length} exercícios</p></div>
    <div class="prog"><div><b>${done}<span> / ${its.length}</span></b><small>concluídos</small></div><div class="bar"><i data-w="${its.length ? done / its.length * 100 : 0}"></i></div><span style="font:600 12px var(--b)">~${(its.length - done) * 8} min</span></div>
    <div style="display:flex;flex-direction:column;gap:8px">${rows || '<p class="empty">Este treino ainda não tem exercícios.</p>'}</div><div class="grow"></div>
    ${nx ? `<a class="btn red" href="#/exercicio/${tid}/${nxIdx}">Continuar: ${esc((D.exMap[nx.exId] || {}).nome || 'próximo')}</a>` : its.length ? `<button class="btn done" disabled>${ic('check', 20, '#fff', 2.4)}Treino concluído</button>` : ''}</div>`,
  after(el) { raf2(() => $$('.prog .bar i', el).forEach(i => i.style.width = i.dataset.w + '%')); } };
}

/* ---------------- Modo treino ---------------- */
export async function exercicio(tid, n) {
  const D = await loadTreino(tid), its = D ? (D.t.itens || []) : [], idx = Math.max(0, Math.min(its.length - 1, +n || 0)), it = its[idx];
  if (!it) return { depth: 4, dark: true, html: `<div class="wk"><a class="iconbtn" href="#/treinos">${ic('back', 20)}</a><p class="empty">Exercício não encontrado.</p></div>` };
  const ex = D.exMap[it.exId] || { nome: '(exercício removido)', grupo: '', equip: '', video: '' }, total = nSets(it);
  const sets = Array.from({ length: total }, (_, i) => !!(D.feitos[it.exId] || [])[i]);
  /* peso e repetições de cada série: começam com o que o professor definiu e o aluno pode alterar (vale só para o dia) */
  const salvo = D.valores[it.exId] || [];
  const vals = Array.from({ length: total }, (_, i) => ({ kg: salvo[i] && salvo[i].kg != null ? salvo[i].kg : it.kg, reps: salvo[i] && salvo[i].reps != null ? salvo[i].reps : it.reps }));
  const ro_ = ro() ? 'readonly' : '';
  const setsHTML = () => { const c = sets.findIndex(x => !x);
    return `<div class="set-head"><span class="sn"></span><b class="kg">Peso</b><b>Repetições</b><span class="cks"></span></div>` + sets.map((d, i) => `<div class="set ${d ? 'done' : i === c ? 'now' : ''}"><span class="sn">${i === c ? '<i></i>' : i + 1}</span>
      <label class="pill kg"><input class="vin" data-i="${i}" data-f="kg" type="text" inputmode="decimal" placeholder="Corpo" value="${vals[i].kg ? esc(String(vals[i].kg).replace('.', ',')) : ''}" aria-label="Peso da série ${i + 1}" ${ro_}><em>kg</em></label>
      <label class="pill"><input class="vin" data-i="${i}" data-f="reps" type="text" inputmode="numeric" value="${vals[i].reps}" aria-label="Repetições da série ${i + 1}" ${ro_}><em>x</em></label>
      <button class="ck" data-i="${i}" aria-label="Série ${i + 1}" aria-pressed="${d}">${ic('check', 22, 'currentColor', 2.2)}</button></div>`).join(''); };
  return { depth: 4, dark: true, html: `<div class="wk">
    <div class="wk-head"><a class="iconbtn" href="#/treino/${tid}" aria-label="Voltar">${ic('back', 20)}</a><div class="c"><small>Modo treino</small><b>${esc(D.t.nome)}</b></div><button class="iconbtn" id="pz" aria-label="Pausar descanso">${ic('pause', 20, '#D91E26', 2.6)}</button></div>
    <div class="exhead"><div class="mini"><svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="#2A2A2D" stroke-width="4"/><circle class="arc" id="mp" cx="32" cy="32" r="28" fill="none" stroke="#D91E26" stroke-width="4" stroke-linecap="round" transform="rotate(-90 32 32)" style="stroke-dasharray:0 176"/></svg><b>${idx + 1}/${its.length}</b></div>
      <div style="flex:1;min-width:0"><h1>${esc(ex.nome)}</h1><p>${[ex.grupo, ex.equip, total + ' séries'].filter(Boolean).map(esc).join(' · ')}</p></div>
      <a class="iconbtn" href="#/treino/${tid}" aria-label="Ver treino completo">${ic('list', 20)}</a></div>
    <div class="sets" id="sets">${setsHTML()}</div>
    <div class="rest" id="rest"><div><small id="rl">Descanso</small><b id="rt">${fmt(it.descanso)}</b></div><div class="bar"><i id="rb" style="width:100%"></i></div><button class="more" id="plus">+30s</button></div>
    ${videoEl(ex.video, ex.nome, 'Como fazer')}
    <div class="grow"></div><button class="btn red" id="cta"></button></div>`,
  after(el) {
    let rem = it.descanso, tot = it.descanso, tick = null, paused = false;
    const draw = () => { $('#rt', el).textContent = fmt(rem); $('#rb', el).style.width = (tot ? rem / tot * 100 : 0) + '%'; };
    const stop = () => { clearInterval(tick); tick = null; };
    const run = () => { stop(); tick = setInterval(() => { if (paused) return; rem--; if (rem <= 0) { rem = 0; stop(); $('#rest', el).classList.add('ready'); $('#rl', el).textContent = 'Próxima série'; navigator.vibrate && navigator.vibrate(200); } draw(); }, 1000); };
    const startRest = () => { rem = tot = it.descanso; paused = false; $('#rest', el).classList.remove('ready'); $('#rl', el).textContent = 'Descanso'; draw(); run(); };
    const cta = () => { const p = sets.findIndex(x => !x); $('#cta', el).textContent = p >= 0 ? `Concluir série ${p + 1}` : idx < its.length - 1 ? `Próximo: ${(D.exMap[its[idx + 1].exId] || {}).nome || 'exercício'}` : 'Finalizar treino'; };
    const persist = async () => { D.feitos[it.exId] = sets.slice(); D.valores[it.exId] = vals.map(v => ({ ...v })); try { await api.set('execucoes', D.eid, { uid: sid(), tid, data: D.k, feitos: D.feitos, valores: D.valores }); } catch (e) { toast(friendly(e)); } };
    const mark = async i => {
      if (ro()) return blocked();
      sets[i] = !sets[i]; $('#sets', el).innerHTML = setsHTML(); cta();
      if (sets[i]) { $(`.ck[data-i="${i}"]`, el).classList.add('pop'); if (sets.every(Boolean)) { stop(); toast('Exercício concluído.'); } else startRest(); }
      await persist();
    };
    $('#sets', el).onclick = e => { const b = e.target.closest('.ck'); if (b) mark(+b.dataset.i); };
    const lerVal = inp => { const t = inp.value.trim().replace(',', '.'); if (inp.dataset.f === 'kg') { const n = t === '' ? 0 : Number(t); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; }
      const n = parseInt(t, 10); return isFinite(n) && n >= 0 ? n : null; };
    $('#sets', el).addEventListener('input', e => { const inp = e.target.closest('.vin'); if (!inp || ro()) return; const v = lerVal(inp); if (v !== null) vals[+inp.dataset.i][inp.dataset.f] = v; });
    $('#sets', el).addEventListener('change', e => { const inp = e.target.closest('.vin'); if (!inp) return; if (ro()) return blocked();
      const v = lerVal(inp); if (v === null) { toast('Digite um número válido.'); inp.value = inp.dataset.f === 'kg' ? (vals[+inp.dataset.i].kg ? String(vals[+inp.dataset.i].kg).replace('.', ',') : '') : vals[+inp.dataset.i].reps; return; }
      vals[+inp.dataset.i][inp.dataset.f] = v; persist(); });
    $('#cta', el).onclick = () => { const p = sets.findIndex(x => !x); if (p >= 0) return mark(p);
      if (idx < its.length - 1) return go(`/exercicio/${tid}/${idx + 1}`); toast('Treino concluído. Bom trabalho.'); go('/treino/' + tid); };
    $('#plus', el).onclick = () => { rem += 30; tot = Math.max(tot, rem); $('#rest', el).classList.remove('ready'); $('#rl', el).textContent = 'Descanso'; draw(); if (!tick && sets.some(Boolean) && !sets.every(Boolean)) run(); };
    $('#pz', el).onclick = e => { paused = !paused; e.currentTarget.innerHTML = paused ? ic('arrow', 20, '#D91E26', 2.4) : ic('pause', 20, '#D91E26', 2.6); toast(paused ? 'Descanso pausado.' : 'Descanso retomado.'); };
    cta(); raf2(() => { $('#mp', el).style.strokeDasharray = `${(idx + 1) / its.length * 175.9} 176`; });
    return stop;
  } };
}

/* ---------------- Modalidades ---------------- */
let filtro = 'todas';
const mCard = (m, mine) => `<a class="card mcard" href="#/modalidade/${m.id}"><div class="top"><div class="mic">${ic(m.icone || 'db', 26)}</div><div><h3>${esc(m.nome)}</h3><small>${esc(m.prof || '')}${m.local ? ' · ' + esc(m.local) : ''}</small></div>
  <span class="st ${mine ? '' : 'try'}">${mine ? 'Matriculado' : 'Experimentar'}</span></div><div class="foot"><div class="dias">${[1, 2, 3, 4, 5, 6, 7].map(n => `<span class="${(m.dias || []).includes(n) ? 'on' : ''}">${LET[n]}</span>`).join('')}</div><b>${esc(m.ini || '')}${m.fim ? ' – ' + esc(m.fim) : ''}</b></div></a>`;
export async function modalidades() {
  const [mods, prof] = await Promise.all([api.list('modalidades'), ro() ? api.get('users', sid()) : SESSION.me]), mine = new Set(prof.modalidades || []);
  return { depth: 1, html: `<header class="hero compact"><div class="topbar">${logo(30)}${topIcon()}</div>${await viewing()}</header>
    <div class="body"><div><h1 class="h1">Modalidades</h1><p class="muted" style="margin-top:4px;font-size:14px">Escolha onde treinar</p></div>
      <div style="display:flex;gap:8px" id="chips">${[['todas', 'Todas'], ['minhas', 'Minhas'], ['hoje', 'Hoje']].map(([k, n]) => `<button class="chip ${filtro === k ? 'on' : ''}" data-f="${k}">${n}</button>`).join('')}</div>
      <div class="cards" id="mlist"></div></div><div style="height:16px;flex:none"></div>${nav('grid')}`,
  after(el) {
    const draw = () => { const l = mods.filter(m => filtro === 'minhas' ? mine.has(m.id) : filtro === 'hoje' ? (m.dias || []).includes(iso(new Date())) : true);
      $('#mlist', el).innerHTML = l.length ? l.map(m => mCard(m, mine.has(m.id))).join('') : '<p class="empty">Nada por aqui. Veja a aba Todas.</p>'; };
    draw();
    $('#chips', el).onclick = e => { const b = e.target.closest('.chip'); if (!b) return; filtro = b.dataset.f; $$('.chip', el).forEach(c => c.classList.toggle('on', c === b)); draw(); };
  } };
}

export async function modalidade(id) {
  const uid = sid(), [m, prof, ag] = await Promise.all([api.get('modalidades', id), ro() ? api.get('users', uid) : SESSION.me, api.get('agendamentos', `${uid}_${id}`)]);
  if (!m) return { depth: 2, html: `<div class="body"><a class="iconbtn light" href="#/modalidades">${ic('back', 20, '#0C0C0C')}</a><p class="empty">Modalidade não encontrada.</p></div>` };
  const matr = (prof.modalidades || []).includes(id), now = new Date(), slots = [];
  (m.dias || []).forEach(d => { const dt = new Date(now); dt.setHours(0, 0, 0, 0); dt.setDate(now.getDate() + ((d - iso(now) + 7) % 7)); slots.push({ dt, key: dkey(dt) }); });
  slots.sort((a, b) => a.dt - b.dt); slots.length = Math.min(slots.length, 3);
  let sel = slots.find(s => ag && s.key === ag.slotKey) || slots[0], agended = !!ag;
  const slotHTML = () => slots.map(x => `<button class="slot ${sel === x ? 'on' : ''}" data-k="${x.key}"><div class="dt"><small>${DIAS[iso(x.dt)]}</small><b>${x.dt.getDate()}</b></div>
    <div class="tm"><b>${esc(m.ini)}${m.fim ? ' – ' + esc(m.fim) : ''}</b><small>${esc(m.vagas || '')}</small></div><span class="sel">${sel === x ? ic('check', 20, '#fff', 2.4) : 'Escolher'}</span></button>`).join('');
  const ctaHTML = () => matr ? '<button class="btn dark" disabled>Você já treina aqui</button>' : !slots.length ? '' : agended ? `<button class="btn done" id="cta">${ic('check', 20, '#fff', 2.4)}Aula agendada. Toque para cancelar</button>` : '<button class="btn red" id="cta">Agendar aula experimental</button>';
  return { depth: 2, html: `
  <div class="dhero ${m.foto ? 'hasimg' : ''}" ${m.foto ? `style="background-image:url('${esc(m.foto)}')"` : ''}>${m.foto ? '' : '<div class="ph">FOTO DA MODALIDADE</div>'}
    <a class="iconbtn glass back" href="#/modalidades" aria-label="Voltar">${ic('back', 20)}</a>
    <div class="tx"><span>${esc(m.nivel || 'Todos os níveis')}</span><h1>${esc(m.nome)}</h1><p>${[m.prof, m.local, m.duracao].filter(Boolean).map(esc).join(' · ')}</p></div></div>
  <div class="body" style="flex:1">
    <div><h2 class="h2" style="margin-bottom:2px">Sobre a aula</h2><p class="muted" style="font-size:14px;line-height:1.45">${esc(m.descricao || '')}</p></div>
    ${videoEl(m.video, '', 'Conheça a aula')}
    <div style="display:flex;flex-direction:column;gap:8px"><h2 class="h2">Dias e horários</h2><div id="slots" style="display:flex;flex-direction:column;gap:8px">${slotHTML() || '<p class="empty">Horários em breve.</p>'}</div></div>
    <div class="grow"></div><div id="cta-wrap" style="padding-bottom:22px">${ctaHTML()}</div></div>`,
  after(el) {
    const wrap = $('#cta-wrap', el);
    $('#slots', el).onclick = async e => { const b = e.target.closest('.slot'); if (!b) return; sel = slots.find(x => x.key === b.dataset.k);
      if (agended && !ro()) { try { await api.set('agendamentos', `${uid}_${id}`, { uid, modId: id, slotKey: sel.key, hora: m.ini, ts: Date.now() }); } catch (err) { toast(friendly(err)); } }
      $('#slots', el).innerHTML = slotHTML(); const on = $('.slot.on .sel', el); on && on.classList.add('pop'); };
    wrap.onclick = async e => { const b = e.target.closest('#cta'); if (!b) return; if (ro()) return blocked();
      try {
        if (agended) { await api.del('agendamentos', `${uid}_${id}`); agended = false; toast('Aula cancelada.'); }
        else { await api.set('agendamentos', `${uid}_${id}`, { uid, modId: id, slotKey: sel.key, hora: m.ini, ts: Date.now() }); agended = true; toast(`Aula agendada: ${DIAS[iso(sel.dt)]} ${sel.dt.getDate()}, ${m.ini}.`); }
      } catch (err) { return toast(friendly(err)); }
      wrap.innerHTML = ctaHTML(); const c = $('#cta', wrap); c && c.classList.add('pop'); };
  } };
}

/* ---------------- Perfil ---------------- */
export async function perfil() {
  const uid = sid(), [cks, mine] = await Promise.all([api.list('checkins', [['uid', '==', uid]]), api.get('users', uid)]);
  const plano = mine && mine.planoId ? await api.get('planos', mine.planoId).catch(() => null) : null, [stc, stl] = situ(mine || {}, plano);
  const planoCard = `<section class="card span2"><h2 class="h2" style="margin-bottom:10px">Meu plano</h2>${plano ? `<div class="row" style="justify-content:space-between;gap:12px;flex-wrap:wrap"><div><b style="font:700 22px var(--d)">${esc(plano.nome)}</b><div class="muted" style="font-size:13px">${plano.categoria === 'totalpass' ? 'Via Total Pass' : perLabel(plano.periodo)} · ${plano.familia === 'sim' ? 'Família' : 'Individual'}</div></div><div style="text-align:right"><span class="st-chip ${stc}">${stl}</span>${plano.categoria === 'totalpass' || !mine.vencimento ? '' : `<div class="muted" style="font-size:13px;margin-top:4px">Vencimento ${ptDate(mine.vencimento)}</div>`}</div></div>` : '<p class="muted" style="margin:0;font-size:14px">Nenhum plano definido. Fale com a recepção.</p>'}</section>`;
  const { cur, rec } = streakInfo(new Set(cks.map(c => c.data)), new Date());
  return { depth: 1, html: `<header class="hero compact"><div class="topbar">${logo(30)}<span style="width:44px"></span></div></header>
  <div class="body dgrid"><div class="span2"><h1 class="h1">Meu perfil</h1><p class="muted" style="margin-top:4px;font-size:14px">Foto, nome e senha</p></div>
    <div class="stats span2"><div class="card"><b>${cur}</b><small>dias seguidos</small></div><div class="card"><b>${rec}</b><small>recorde</small></div><div class="card"><b>${cks.length}</b><small>check-ins</small></div></div>
    ${planoCard}${perfilHTML()}<button class="btn dark span2" id="out">Sair da conta</button></div><div style="height:16px;flex:none"></div>${nav('user')}`,
  after(el) { $('#out', el).onclick = () => api.logout(); bindPerfil(el, () => dispatchEvent(new Event('hashchange'))); } };
}
