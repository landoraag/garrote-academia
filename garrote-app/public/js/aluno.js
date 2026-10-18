/* Telas do aluno (celular). O dono e o treinador também abrem estas telas em modo visualização. */
import { api } from './api.js';
import { perfilHTML, bindPerfil } from './perfil.js';
import { perLabel, situ, ptDate, precoTxt } from './plano.js';
import { pagamentoAtivo, abrirPagamento } from './pagamento.js';
import { pedirNotif, agendar, cancelar, mostrar, limpar, hora } from './notif.js';
import { $, $$, esc, avatar, toast, countUp, raf2, ic, playIc, logo, DIAS, LET, SEMANA, MESES, iso, dkey, fmt, kgTxt, initials, SESSION, sid, ro, go, friendly, confirmBox, openModal, fail, catTree, isTempo, itemTxt, segAlvo, segTxt, temaBtn } from './ui.js';

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

const topIcon = () => `<div class="tright">${temaBtn()}<a class="iconbtn avbtn" href="#/perfil" aria-label="Meu perfil">${avatar(SESSION.me, 44)}</a></div>`;
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
/* distância (em dias) de hoje até cada dia do treino: hoje = 0, amanhã = 1... */
const ate = n => (n - iso(new Date()) + 7) % 7;
const proxDia = t => (t.dias || []).length ? Math.min(...t.dias.map(ate)) : 99;
const NOME = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'], CURTO = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
/* dias do treino em texto, começando pelo dia de hoje */
const diasTxt = t => { const d = [...(t.dias || [])].sort((a, b) => ate(a) - ate(b)), nm = d.length > 3 ? CURTO : NOME;
  return d.length ? d.map(n => `<span class="${ate(n) === 0 ? 'hj' : ''}">${ate(n) === 0 ? 'Hoje' : nm[n]}</span>`).join(', ') : 'Sem dia definido'; };
/* check-in automático: ao iniciar o treino, o dia conta como check-in (se ainda não tiver) */
async function autoCheckin(k, tid) {
  const uid = sid();
  try { const cks = await api.list('checkins', [['uid', '==', uid]]); if (cks.some(c => c.data === k)) return;
    await api.set('checkins', `${uid}_${k}`, { uid, data: k, ts: Date.now(), auto: true, tid }); toast('Treino iniciado. Check-in de hoje feito.'); }
  catch (e) { console.error('check-in automático', e); }
}
const toMap = a => Object.fromEntries(a.map(x => [x.id, x]));
/* cronômetro do treino: calculado a partir do horário de início gravado no Firestore (não perde o tempo ao trocar de tela ou fechar o app) */
const fmtT = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), p = n => String(n).padStart(2, '0'); return (h ? h + ':' : '') + p(m) + ':' + p(s % 60); };
const decorrido = D => D.inicio ? ((D.fim || Date.now()) - D.inicio) / 1000 : 0;
const salvarExec = D => api.set('execucoes', D.eid, { uid: sid(), tid: D.tid, data: D.k, feitos: D.feitos, valores: D.valores,
  ...(D.inicio ? { inicio: D.inicio } : {}), ...(D.fim ? { fim: D.fim, duracao: Math.round((D.fim - D.inicio) / 1000) } : {}),
  ...(D.dif != null ? { dificuldade: D.dif, obs: D.obs || '' } : {}) });
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
  list.sort((a, b) => proxDia(a) - proxDia(b) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));   // na ordem da semana, a partir de hoje
  const cards = list.map(t => `<a class="card mcard tr" href="#/treino/${t.id}"><div class="top"><div class="mic">${ic('db', 26)}</div><div class="ttx"><h3>${esc(t.nome)}</h3><small>${esc((mods[t.modalidadeId] || {}).nome || 'Treino')} · ${(t.itens || []).length} exercícios</small>
    <p class="tdias">${diasTxt(t)}</p></div>${ic('chev', 20, '#B5B5BA')}</div></a>`).join('');
  return { depth: 2, html: `<header class="hero compact"><div class="topbar">${logo(30)}${topIcon()}</div>${await viewing()}</header>
    <div class="body"><div><h1 class="h1">Meus treinos</h1><p class="muted" style="margin-top:4px;font-size:14px">Montados pelo seu professor</p></div>
    <div class="cards">${cards || '<p class="empty">Você ainda não tem treino. Fale com seu professor.</p>'}</div></div><div style="height:16px;flex:none"></div>${nav('db')}` };
}

/* ---------------- Lista do treino ---------------- */
async function loadTreino(tid) {
  const uid = sid(), k = dkey(new Date());
  const [t, exs, cats, ex0] = await Promise.all([api.get('treinos', tid), api.list('exercicios'), api.list('categorias'), api.get('execucoes', `${uid}_${tid}_${k}`)]);
  if (!t) return null;
  const T = catTree(cats), exMap = Object.fromEntries(exs.map(e => [e.id, { ...e, grupo: T.path(e.categoriaId) }]));
  return { t, exMap, feitos: (ex0 && ex0.feitos) || {}, valores: (ex0 && ex0.valores) || {}, eid: `${uid}_${tid}_${k}`, k, tid, inicio: (ex0 && ex0.inicio) || 0, fim: (ex0 && ex0.fim) || 0,
    dif: ex0 && ex0.dificuldade != null ? ex0.dificuldade : null, obs: (ex0 && ex0.obs) || '' };
}
/* estado dos cronômetros guardado no aparelho: o tempo continua certo mesmo saindo do app ou trocando de tela */
const RK = 'garrote:descanso', CK = 'garrote:crono';
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const restLeft = r => !r ? 0 : r.paused ? r.rem : Math.max(0, Math.ceil((r.end - Date.now()) / 1000));
/* ao sair do app com o treino rodando, deixa um aviso no celular com o que está acontecendo */
function avisoAoSair(ativo, texto, hash) {
  const f = () => { if (document.hidden) { if (ativo()) mostrar('status', 'Treino em andamento', texto(), hash()); } else limpar(); };
  document.addEventListener('visibilitychange', f);
  return () => document.removeEventListener('visibilitychange', f);
}
/* fim do treino: nota de 0 a 10 e observação; depois abre o resumo */
function avaliar(D) {
  const m = openModal({ title: 'Como foi o treino?', submit: 'Avançar', cancel: 'Pular',
    html: `<p class="muted" style="margin:0 0 10px;font-size:14px">De 0 a 10, qual foi a dificuldade do treino de hoje?</p>
      <div class="notas" role="group" aria-label="Dificuldade de 0 a 10">${Array.from({ length: 11 }, (_, n) => `<button type="button" class="nt" data-n="${n}" aria-pressed="false">${n}</button>`).join('')}</div>
      <div class="nleg"><span>Muito fácil</span><span>Muito difícil</span></div><input type="hidden" name="dif" value="">
      <label class="field" style="margin-top:12px">Observação (opcional)<textarea name="obs" rows="3" maxlength="500" placeholder="Ex.: senti o ombro no supino">${esc(D.obs || '')}</textarea></label>`,
    onSubmit: async f => { if (f.dif.value === '') fail('Escolha uma nota de 0 a 10.'); D.dif = +f.dif.value; D.obs = f.obs.value.trim().slice(0, 500); await salvarExec(D); },
    onClose: () => go('/resumo/' + D.tid) });
  const box = $('.notas', m.form), sel = n => { m.form.dif.value = n; $$('.nt', box).forEach(b => { const on = +b.dataset.n === n; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); };
  if (D.dif != null) sel(D.dif);
  box.onclick = e => { const b = e.target.closest('.nt'); if (b) sel(+b.dataset.n); };
  setTimeout(() => { const b = $('.nt.on', box) || $('.nt', box); b && b.focus(); }, 90);   // não abre o teclado logo de cara
}
const encerrarTimers = () => { lsSet(RK, null); lsSet(CK, null); cancelar('descanso'); cancelar('crono'); limpar(); };
/* reiniciar: apaga o andamento de hoje deste treino (cronômetro, séries, pesos, nota).
   O check-in só sai se foi o próprio início deste treino que fez, e nenhum outro treino foi começado hoje. */
async function reiniciar(D) {
  await api.set('execucoes', D.eid, { uid: sid(), tid: D.tid, data: D.k, feitos: {}, valores: {} });
  Object.assign(D, { feitos: {}, valores: {}, inicio: 0, fim: 0, dif: null, obs: '' });
  encerrarTimers();
  try { const uid = sid(), ck = await api.get('checkins', `${uid}_${D.k}`);
    if (ck && ck.auto && ck.tid === D.tid) {
      const outros = (await api.list('execucoes', [['uid', '==', uid], ['data', '==', D.k]])).some(x => x.tid !== D.tid && x.inicio);
      if (!outros) await api.del('checkins', `${uid}_${D.k}`); } }
  catch (e) { console.error('desfazer check-in', e); }
}

export async function treino(tid) {
  const D = await loadTreino(tid); if (!D) return { depth: 3, html: `<div class="wk"><a class="iconbtn" href="#/treinos">${ic('back', 20)}</a><p class="empty">Treino não encontrado.</p></div>`, dark: true };
  const its = D.t.itens || [], done = its.filter(i => itemDone(i, D.feitos)).length, nx = its.find(i => !itemDone(i, D.feitos));
  const rows = its.map((i, n) => { const e = D.exMap[i.exId] || { nome: '(exercício removido)' }, st = itemDone(i, D.feitos) ? 'done' : (nx === i ? 'now' : '');
    return `<a class="lrow ${st}" href="#/exercicio/${tid}/${n}"><span class="lb">${st === 'done' ? ic('check', 20, '#fff', 2.2) : n + 1}</span>
      <div class="tx"><b>${esc(e.nome)}${st === 'now' ? '<span class="tag">EM ANDAMENTO</span>' : ''}${isTempo(i) ? '<span class="tag tmp">TEMPO</span>' : ''}</b><small>${itemTxt(i)} · ${i.descanso}s</small></div>${ic('chev', 20, '#6A6A70')}</a>`; }).join('');
  const nxIdx = its.indexOf(nx), proximo = nx ? esc((D.exMap[nx.exId] || {}).nome || 'próximo') : '';
  const resumoBtn = `<a class="btn ghost-d" href="#/resumo/${tid}">Ver resumo do treino</a>`;
  const concluido = `<button class="btn done" disabled>${ic('check', 20, '#fff', 2.4)}Treino concluído</button>${D.fim || !nx ? resumoBtn : ''}`;
  const botao = !its.length ? '' : ro() ? (nx ? `<a class="btn red" href="#/exercicio/${tid}/${nxIdx}">Continuar: ${proximo}</a>${D.fim ? resumoBtn : ''}` : concluido)
    : !nx ? (D.inicio && !D.fim ? `<button class="btn red" id="fin">Finalizar treino</button>` : concluido)
    : !D.inicio ? `<button class="btn red" id="ini">Iniciar treino</button>`
    : D.fim ? `<a class="btn red" href="#/exercicio/${tid}/${nxIdx}">Continuar: ${proximo}</a>${resumoBtn}`
    : `<a class="btn red" href="#/exercicio/${tid}/${nxIdx}">Continuar: ${proximo}</a><button class="btn link" id="enc">Encerrar treino</button>`;
  const comecou = !!D.inicio || Object.values(D.feitos).some(a => (a || []).some(Boolean));
  const resetBtn = !ro() && comecou ? `<button class="btn link rst" id="rst">${ic('reset', 18)}Reiniciar treino</button>` : '';
  return { depth: 3, dark: true, html: `<div class="wk">
    <div class="wk-head"><a class="iconbtn" href="#/treinos" aria-label="Voltar">${ic('back', 20)}</a><small style="font:600 11px var(--b);letter-spacing:2px;color:var(--dim)">TREINO</small><span style="width:44px"></span></div>
    <div><h1 class="h1">${esc(D.t.nome)}</h1><p class="muted" style="margin-top:6px;font-size:14px">${its.length} exercícios</p></div>
    <div class="cron ${D.inicio ? (D.fim ? 'end' : 'on') : ''}"><div><small id="cl">${D.fim ? 'TEMPO TOTAL' : D.inicio ? 'TEMPO DE TREINO' : 'CRONÔMETRO'}</small><b id="ct">${fmtT(decorrido(D))}</b></div><i class="dot"></i></div>
    <div class="prog"><div><b>${done}<span> / ${its.length}</span></b><small>concluídos</small></div><div class="bar"><i data-w="${its.length ? done / its.length * 100 : 0}"></i></div><span style="font:600 12px var(--b)">${D.fim ? '' : '~' + (its.length - done) * 8 + ' min'}</span></div>
    <div style="display:flex;flex-direction:column;gap:8px">${rows || '<p class="empty">Este treino ainda não tem exercícios.</p>'}</div><div class="grow"></div>
    ${botao}${resetBtn}</div>`,
  after(el) {
    raf2(() => $$('.prog .bar i', el).forEach(i => i.style.width = i.dataset.w + '%'));
    const draw = () => { $('#ct', el).textContent = fmtT(decorrido(D)); };
    const tk = D.inicio && !D.fim ? setInterval(draw, 1000) : null;
    const encerrar = async () => { D.fim = Date.now(); try { await salvarExec(D); } catch (e) { D.fim = 0; return toast(friendly(e)); } encerrarTimers(); avaliar(D); };
    if ($('#ini', el)) $('#ini', el).onclick = async () => { pedirNotif(); D.inicio = Date.now(); D.fim = 0; try { await salvarExec(D); } catch (e) { return toast(friendly(e)); } autoCheckin(D.k, D.tid); go(`/exercicio/${tid}/${Math.max(0, nxIdx)}`); };
    if ($('#fin', el)) $('#fin', el).onclick = encerrar;
    if ($('#rst', el)) $('#rst', el).onclick = async () => {
      if (!(await confirmBox('Reiniciar este treino? O cronômetro e as séries marcadas hoje voltam do zero. Use se você começou sem querer.', 'Reiniciar'))) return;
      try { await reiniciar(D); } catch (e) { return toast(friendly(e)); }
      toast('Treino reiniciado.'); dispatchEvent(new Event('hashchange')); };
    if ($('#enc', el)) $('#enc', el).onclick = async () => { if (await confirmBox('Encerrar o treino agora? O cronômetro vai parar com os exercícios que você já fez.', 'Encerrar')) encerrar(); };
    const off = avisoAoSair(() => D.inicio && !D.fim && !ro(), () => { const r = lsGet(RK), d = r && r.eid === D.eid && !r.paused && r.end > Date.now();
      return `${D.t.nome} · começou às ${hora(D.inicio).slice(0, 5)}${d ? ` · descanso até ${hora(r.end)}` : ''}${nx ? ` · próximo: ${(D.exMap[nx.exId] || {}).nome || 'exercício'}` : ''}`; }, () => `#/treino/${tid}`);
    return () => { clearInterval(tk); off(); };
  } };
}

/* ---------------- Modo treino ---------------- */
export async function exercicio(tid, n) {
  const D = await loadTreino(tid), its = D ? (D.t.itens || []) : [], idx = Math.max(0, Math.min(its.length - 1, +n || 0)), it = its[idx];
  if (!it) return { depth: 4, dark: true, html: `<div class="wk"><a class="iconbtn" href="#/treinos">${ic('back', 20)}</a><p class="empty">Exercício não encontrado.</p></div>` };
  const ex = D.exMap[it.exId] || { nome: '(exercício removido)', grupo: '', equip: '', video: '' }, total = nSets(it), tm = isTempo(it);
  const sets = Array.from({ length: total }, (_, i) => !!(D.feitos[it.exId] || [])[i]);
  /* peso e repetições (ou segundos) de cada série: começam com o que o professor definiu e o aluno pode alterar (vale só para o dia) */
  const salvo = D.valores[it.exId] || [];
  const repsProf = i => (it.sets && it.sets[i] && it.sets[i].reps) || it.reps, refKg = it.kg ? String(it.kg).replace('.', ',') : 'Corpo';   // carga do professor: só referência (placeholder)
  const vals = Array.from({ length: total }, (_, i) => tm ? { seg: salvo[i] && salvo[i].seg != null ? salvo[i].seg : 0 }
    : { kg: salvo[i] && salvo[i].kg != null ? salvo[i].kg : 0, reps: salvo[i] && salvo[i].reps != null ? salvo[i].reps : repsProf(i) });
  const ro_ = ro() ? 'readonly' : '', hash = `#/exercicio/${tid}/${idx}`, nomeEx = j => (D.exMap[its[j].exId] || {}).nome || 'exercício';
  const setsHTML = () => { const c = sets.findIndex(x => !x);
    return `<div class="set-head"><span class="sn"></span><b class="kg">${tm ? 'Tempo feito' : 'Peso'}</b><b>${tm ? 'Meta' : 'Repetições'}</b><span class="cks"></span></div>` + sets.map((d, i) => `<div class="set ${d ? 'done' : i === c ? 'now' : ''}"><span class="sn">${i === c ? '<i></i>' : i + 1}</span>
      ${tm ? `<label class="pill kg"><input class="vin" data-i="${i}" data-f="seg" type="text" inputmode="numeric" placeholder="${segAlvo(it, i)}" value="${vals[i].seg || ''}" aria-label="Segundos feitos na série ${i + 1}" ${ro_}><em>s</em></label>
      <span class="pill meta">${segTxt(segAlvo(it, i))}</span>`
      : `<label class="pill kg"><input class="vin" data-i="${i}" data-f="kg" type="text" inputmode="decimal" placeholder="${esc(refKg)}" value="${vals[i].kg ? esc(String(vals[i].kg).replace('.', ',')) : ''}" aria-label="Peso da série ${i + 1}" ${ro_}><em>kg</em></label>
      <label class="pill"><input class="vin" data-i="${i}" data-f="reps" type="text" inputmode="numeric" value="${vals[i].reps}" aria-label="Repetições da série ${i + 1}" ${ro_}><em>x</em></label>`}
      <button class="ck" data-i="${i}" aria-label="Série ${i + 1}" aria-pressed="${d}">${ic('check', 22, 'currentColor', 2.2)}</button></div>`).join(''); };
  const cronoHTML = tm ? `<div class="crono" id="crono"><div class="crtop"><small id="crl">CRONÔMETRO</small><small id="crm"></small></div><b id="crt">00:00</b><div class="bar"><i id="crb"></i></div>
    <div class="crbtns"><button class="crb" id="crz" type="button">Zerar</button><button class="crb go" id="crgo" type="button">Iniciar</button><button class="crb ok" id="crok" type="button">Concluir série</button></div></div>` : '';
  return { depth: 4, dark: true, html: `<div class="wk">
    <div class="wk-head"><a class="iconbtn" href="#/treino/${tid}" aria-label="Voltar">${ic('back', 20)}</a><div class="c"><small>Modo treino<span id="et">${D.inicio ? ' · ' + fmtT(decorrido(D)) : ''}</span></small><b>${esc(D.t.nome)}</b></div><button class="iconbtn" id="pz" aria-label="Pausar descanso">${ic('pause', 20, '#D91E26', 2.6)}</button></div>
    <div class="exhead"><div class="mini"><svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="#2A2A2D" stroke-width="4"/><circle class="arc" id="mp" cx="32" cy="32" r="28" fill="none" stroke="#D91E26" stroke-width="4" stroke-linecap="round" transform="rotate(-90 32 32)" style="stroke-dasharray:0 176"/></svg><b>${idx + 1}/${its.length}</b></div>
      <div style="flex:1;min-width:0"><h1>${esc(ex.nome)}</h1><p>${[ex.grupo, ex.equip, total + ' séries'].filter(Boolean).map(esc).join(' · ')}</p></div>
      <a class="iconbtn" href="#/treino/${tid}" aria-label="Ver treino completo">${ic('list', 20)}</a></div>
    ${cronoHTML}
    <div class="sets" id="sets">${setsHTML()}</div>
    <div class="rest" id="rest"><div><small id="rl">Descanso</small><b id="rt">${fmt(it.descanso)}</b></div><div class="bar"><i id="rb" style="width:100%"></i></div><button class="more" id="plus">+30s</button></div>
    ${videoEl(ex.video, ex.nome, 'Como fazer')}
    <div class="grow"></div><button class="btn red" id="cta"></button></div>`,
  after(el) {
    const atual = () => sets.findIndex(x => !x);
    const proxTxt = () => { const p = atual(); return p >= 0 ? `Série ${p + 1} de ${total} · ${ex.nome}` : idx < its.length - 1 ? `Próximo exercício: ${nomeEx(idx + 1)}` : 'Finalizar o treino'; };
    const showT = () => { const e = $('#et', el); if (e) e.textContent = D.inicio ? ' · ' + fmtT(decorrido(D)) : ''; };
    const comecar = () => { if (!D.inicio) { D.inicio = Date.now(); showT(); autoCheckin(D.k, D.tid); } pedirNotif(); };   // se o aluno não tocou em "Iniciar treino", o cronômetro começa na 1ª série

    /* ---- descanso: guardado como horário de término, então continua contando fora do app ---- */
    let rest = lsGet(RK), tot = it.descanso, ready = false;
    if (!(rest && rest.eid === D.eid && rest.exId === it.exId)) rest = null;
    else if (!rest.paused && rest.end <= Date.now()) { rest = null; lsSet(RK, null); ready = sets.some(Boolean) && !sets.every(Boolean); }
    else tot = rest.tot;
    const remS = () => rest ? restLeft(rest) : ready ? 0 : it.descanso;
    const drawRest = () => { const r = remS(); $('#rt', el).textContent = fmt(r); $('#rb', el).style.width = (tot ? Math.min(100, r / tot * 100) : 0) + '%'; };
    const setReady = on => { ready = on; $('#rest', el).classList.toggle('ready', on); $('#rl', el).textContent = on ? 'Próxima série' : 'Descanso'; };
    const avisarDescanso = () => { if (rest && !rest.paused) agendar('descanso', rest.end, 'Descanso acabou', proxTxt(), hash); };
    const startRest = secs => { tot = secs; rest = { eid: D.eid, exId: it.exId, end: Date.now() + secs * 1000, tot: secs, paused: false }; lsSet(RK, rest); setReady(false); drawRest(); avisarDescanso(); };
    const stopRest = () => { rest = null; lsSet(RK, null); cancelar('descanso'); };
    const fimDescanso = () => { rest = null; lsSet(RK, null); setReady(true); navigator.vibrate && navigator.vibrate([200, 100, 200]); drawRest(); };
    if (rest) { avisarDescanso(); if (rest.paused) $('#pz', el).innerHTML = ic('arrow', 20, '#D91E26', 2.4); } else if (ready) setReady(true);

    /* ---- cronômetro dos exercícios por tempo (prancha etc.) ---- */
    let cr = tm ? lsGet(CK) : null;
    const meta = () => segAlvo(it, Math.max(0, atual()));
    if (cr && !(cr.eid === D.eid && cr.exId === it.exId && cr.set === atual())) cr = null;
    const novoCr = () => ({ eid: D.eid, exId: it.exId, set: atual(), acc: 0, start: 0, on: false });
    if (tm && !cr) cr = novoCr();
    const crMs = () => cr ? cr.acc + (cr.on ? Date.now() - cr.start : 0) : 0;
    let bateu = crMs() >= meta() * 1000;
    const drawCr = () => { if (!tm) return; const s = Math.floor(crMs() / 1000), m = meta(), p = atual(), box = $('#crono', el);
      $('#crt', el).textContent = fmt(s); $('#crb', el).style.width = Math.min(100, m ? s / m * 100 : 0) + '%';
      $('#crl', el).textContent = p >= 0 ? `CRONÔMETRO · SÉRIE ${p + 1}` : 'CRONÔMETRO'; $('#crm', el).textContent = p >= 0 ? `Meta ${segTxt(m)}` : 'Séries concluídas';
      $('#crgo', el).textContent = cr.on ? 'Pausar' : crMs() ? 'Continuar' : 'Iniciar'; box.classList.toggle('on', cr.on); box.classList.toggle('hit', s >= m && s > 0); box.classList.toggle('off', p < 0);
      if (!bateu && s >= m && cr.on) { bateu = true; navigator.vibrate && navigator.vibrate([300, 120, 300]); toast(`Meta de ${segTxt(m)} batida.`); } };
    const salvarCr = () => lsSet(CK, cr && (cr.on || cr.acc) ? cr : null);
    const avisarCr = () => { if (cr && cr.on && crMs() < meta() * 1000) agendar('crono', cr.start + meta() * 1000 - cr.acc, `Meta batida: ${ex.nome}`, `Série ${atual() + 1}: ${segTxt(meta())} completos. Toque para voltar e concluir.`, hash); };
    if (tm && cr.on) avisarCr();

    const tickAll = () => { if (D.inicio && !D.fim) showT(); if (rest && !rest.paused && Date.now() >= rest.end) fimDescanso(); else drawRest(); drawCr(); };
    const tt = setInterval(tickAll, 500);
    const cta = () => { const p = atual(); $('#cta', el).textContent = p >= 0 ? `Concluir série ${p + 1}` : idx < its.length - 1 ? `Próximo: ${nomeEx(idx + 1)}` : 'Finalizar treino'; };
    const persist = async () => { D.feitos[it.exId] = sets.slice(); D.valores[it.exId] = vals.map(v => ({ ...v })); try { await salvarExec(D); } catch (e) { toast(friendly(e)); } };
    const mark = async i => {
      if (ro()) return blocked();
      sets[i] = !sets[i]; $('#sets', el).innerHTML = setsHTML(); cta();
      if (sets[i]) comecar();
      if (sets[i]) { $(`.ck[data-i="${i}"]`, el).classList.add('pop'); if (sets.every(Boolean)) { stopRest(); setReady(false); drawRest(); toast('Exercício concluído.'); } else startRest(it.descanso); }
      if (tm) { cancelar('crono'); cr = novoCr(); bateu = false; salvarCr(); drawCr(); }
      await persist();
    };
    $('#sets', el).onclick = e => { const b = e.target.closest('.ck'); if (b) mark(+b.dataset.i); };
    const lerVal = inp => { const t = inp.value.trim().replace(',', '.'); if (inp.dataset.f === 'kg') { const n = t === '' ? 0 : Number(t); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; }
      if (inp.dataset.f === 'seg' && t === '') return 0;
      const n = parseInt(t, 10); return isFinite(n) && n >= 0 ? n : null; };
    const shown = (i, f) => f === 'kg' ? (vals[i].kg ? String(vals[i].kg).replace('.', ',') : '') : f === 'seg' ? (vals[i].seg || '') : vals[i].reps;
    $('#sets', el).addEventListener('input', e => { const inp = e.target.closest('.vin'); if (!inp || ro()) return; const v = lerVal(inp); if (v !== null) vals[+inp.dataset.i][inp.dataset.f] = v; });
    $('#sets', el).addEventListener('change', e => { const inp = e.target.closest('.vin'); if (!inp) return; if (ro()) return blocked();
      const v = lerVal(inp); if (v === null) { toast('Digite um número válido.'); inp.value = shown(+inp.dataset.i, inp.dataset.f); return; }
      vals[+inp.dataset.i][inp.dataset.f] = v; persist(); });
    if (tm) {
      $('#crgo', el).onclick = () => { if (ro()) return blocked(); if (atual() < 0) return toast('Todas as séries já foram feitas.');
        if (cr.on) { cr.acc += Date.now() - cr.start; cr.on = false; cancelar('crono'); } else { comecar(); if (rest) { stopRest(); setReady(false); drawRest(); } cr.start = Date.now(); cr.on = true; avisarCr(); }
        salvarCr(); drawCr(); };
      $('#crz', el).onclick = () => { if (ro()) return blocked(); cancelar('crono'); cr = novoCr(); bateu = false; salvarCr(); drawCr(); };
      $('#crok', el).onclick = () => { if (ro()) return blocked(); const p = atual(); if (p < 0) return toast('Todas as séries já foram feitas.');
        const s = Math.floor(crMs() / 1000); if (s > 0) vals[p].seg = s; mark(p); };
    }
    $('#cta', el).onclick = async () => { const p = atual();
      if (p >= 0) { if (tm && crMs() > 0 && !ro()) { const s = Math.floor(crMs() / 1000); if (s > 0) vals[p].seg = s; } return mark(p); }
      if (idx < its.length - 1) return go(`/exercicio/${tid}/${idx + 1}`);
      if (its.every(i => itemDone(i, D.feitos))) {
        if (!ro() && D.inicio && !D.fim) { D.fim = Date.now(); try { await salvarExec(D); } catch (e) { D.fim = 0; return toast(friendly(e)); } encerrarTimers(); return avaliar(D); }
        if (D.fim) return go('/resumo/' + tid);
        toast('Treino concluído. Bom trabalho.');
      } else toast('Ainda faltam exercícios neste treino.');
      go('/treino/' + tid); };
    $('#plus', el).onclick = () => { if (rest) { if (rest.paused) rest.rem += 30; else rest.end += 30000; tot = Math.max(tot, restLeft(rest)); lsSet(RK, rest); avisarDescanso(); drawRest(); }
      else if (sets.some(Boolean) && !sets.every(Boolean)) startRest(30 + remS()); };
    $('#pz', el).onclick = e => { if (!rest) return toast('Nenhum descanso rodando agora.');
      if (rest.paused) { rest.end = Date.now() + rest.rem * 1000; rest.paused = false; avisarDescanso(); } else { rest.rem = restLeft(rest); rest.paused = true; cancelar('descanso'); }
      lsSet(RK, rest); e.currentTarget.innerHTML = rest.paused ? ic('arrow', 20, '#D91E26', 2.4) : ic('pause', 20, '#D91E26', 2.6); toast(rest.paused ? 'Descanso pausado.' : 'Descanso retomado.'); };
    const off = avisoAoSair(() => D.inicio && !D.fim && !ro(), () => rest && !rest.paused ? `Descanso até ${hora(rest.end)} · depois: ${proxTxt()}`
      : tm && cr && cr.on ? `Cronômetro rodando: ${ex.nome}, meta ${segTxt(meta())}` : `Agora: ${proxTxt()}`, () => hash);
    cta(); drawRest(); drawCr(); raf2(() => { $('#mp', el).style.strokeDasharray = `${(idx + 1) / its.length * 175.9} 176`; });
    return () => { clearInterval(tt); off(); };
  } };
}

/* ---------------- Resumo do treino ---------------- */
const kgFmt = n => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' kg';
function statEx(x, it) {
  const f = ((x && x.feitos) || {})[it.exId] || [], v = ((x && x.valores) || {})[it.exId] || [], tm = isTempo(it);
  const o = { n: 0, vol: 0, reps: 0, max: 0, seg: 0, linhas: [] };
  for (let i = 0; i < nSets(it); i++) {
    const s = v[i] || {};
    if (!f[i]) { o.linhas.push(null); continue; }
    o.n++;
    if (tm) { const sg = +s.seg || segAlvo(it, i); o.seg += sg; o.linhas.push(segTxt(sg)); }
    else { const r = s.reps != null ? +s.reps : ((it.sets && it.sets[i] && it.sets[i].reps) || it.reps), kg = +s.kg || 0;
      o.reps += r; o.vol += kg * r; o.max = Math.max(o.max, kg); o.linhas.push(`${kg ? kgFmt(kg) : it.kg ? 'carga não anotada' : 'peso do corpo'} × ${r}`); }
  }
  return o;
}
const dif = (a, b, f) => { const d = a - b; return d === 0 ? '<span class="eq">igual</span>' : `<span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲ +' : '▼ −'}${f(Math.abs(d))}</span>`; };
export async function resumo(tid) {
  const D = await loadTreino(tid); if (!D) return { depth: 4, dark: true, html: `<div class="wk"><a class="iconbtn" href="#/treinos">${ic('back', 20)}</a><p class="empty">Treino não encontrado.</p></div>` };
  let prev = null;
  try { const l = await api.list('execucoes', [['uid', '==', sid()], ['tid', '==', tid]]);
    prev = l.filter(x => x.data < D.k && Object.values(x.feitos || {}).some(a => (a || []).some(Boolean))).sort((a, b) => b.data.localeCompare(a.data))[0] || null; }
  catch (e) { console.error('execuções anteriores', e); }
  const its = D.t.itens || [], S = its.map(it => [statEx(D, it), prev ? statEx(prev, it) : null]);
  const series = S.reduce((t, [a]) => t + a.n, 0), totalS = its.reduce((t, it) => t + nSets(it), 0), vol = S.reduce((t, [a]) => t + a.vol, 0);
  const pVol = prev ? S.reduce((t, [, b]) => t + (b ? b.vol : 0), 0) : 0, dur = decorrido(D), pDur = prev && prev.duracao ? prev.duracao : 0;
  const card = (l, v, sub = '') => `<div class="rcard"><small>${l}</small><b>${v}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
  const blocos = its.map((it, i) => { const [a, b] = S[i], e = D.exMap[it.exId] || { nome: '(exercício removido)' }, tm = isTempo(it);
    let cmp = '';
    if (b && b.n) cmp = tm ? `Tempo total ${segTxt(a.seg)} · último ${segTxt(b.seg)} ${dif(a.seg, b.seg, segTxt)}`
      : a.vol || b.vol ? `Volume ${kgFmt(a.vol)} · último ${kgFmt(b.vol)} ${dif(a.vol, b.vol, kgFmt)}${a.max || b.max ? `<br>Maior carga ${kgFmt(a.max)} · último ${kgFmt(b.max)} ${dif(a.max, b.max, kgFmt)}` : ''}`
      : `Repetições ${a.reps} · último ${b.reps} ${dif(a.reps, b.reps, n => n)}`;
    else if (prev) cmp = '<span class="muted">Não foi feito no último treino.</span>';
    return `<section class="rx"><div class="rxh"><b>${esc(e.nome)}</b><small>${a.n}/${nSets(it)} séries</small></div>
      <ol class="rsets">${a.linhas.map(t => `<li class="${t ? '' : 'off'}">${t ? esc(t) : 'não feita'}</li>`).join('')}</ol>${cmp ? `<p class="cmp">${cmp}</p>` : ''}</section>`; }).join('');
  return { depth: 4, dark: true, html: `<div class="wk">
    <div class="wk-head"><a class="iconbtn" href="#/treino/${tid}" aria-label="Voltar">${ic('back', 20)}</a><small style="font:600 11px var(--b);letter-spacing:2px;color:var(--dim)">RESUMO</small><span style="width:44px"></span></div>
    <div><h1 class="h1">${esc(D.t.nome)}</h1><p class="muted" style="margin-top:6px;font-size:14px">Treino de hoje, ${ptDate(D.k)}${prev ? ` · comparado com ${ptDate(prev.data)}` : ''}</p></div>
    <div class="rcards">${card('Duração', D.inicio ? fmtT(dur) : '—', pDur && D.inicio ? `último ${fmtT(pDur)}` : '')}${card('Séries', `${series}<span>/${totalS}</span>`)}
      ${card('Volume', kgFmt(vol), prev && (vol || pVol) ? dif(vol, pVol, kgFmt) : 'carga × repetições')}${card('Dificuldade', D.dif != null ? `${D.dif}<span>/10</span>` : '—', prev && prev.dificuldade != null ? `último ${prev.dificuldade}/10` : '')}</div>
    ${D.obs ? `<div class="robs"><small>Sua observação</small><p>${esc(D.obs)}</p></div>` : ''}
    ${prev && prev.obs ? `<div class="robs old"><small>No último treino você anotou</small><p>${esc(prev.obs)}</p></div>` : ''}
    ${prev ? '' : '<p class="muted" style="font-size:13px;margin:0">Este é o primeiro registro deste treino. Na próxima vez aparece a comparação com hoje.</p>'}
    ${blocos || '<p class="empty">Este treino não tem exercícios.</p>'}
    <div class="grow"></div>${!ro() && D.fim && D.dif == null ? '<button class="btn ghost-d" id="nota">Dar nota ao treino</button>' : ''}<a class="btn red" href="#/home">Voltar ao início</a></div>`,
  after(el) { const b = $('#nota', el); if (b) b.onclick = () => avaliar(D); } };
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
  const uid = sid(), [m, prof] = await Promise.all([api.get('modalidades', id), ro() ? api.get('users', uid) : SESSION.me]);
  if (!m) return { depth: 2, html: `<div class="body"><a class="iconbtn light" href="#/modalidades">${ic('back', 20)}</a><p class="empty">Modalidade não encontrada.</p></div>` };
  const matr = (prof.modalidades || []).includes(id), now = new Date(), slots = [];
  (m.dias || []).forEach(d => { const dt = new Date(now); dt.setHours(0, 0, 0, 0); dt.setDate(now.getDate() + ((d - iso(now) + 7) % 7)); slots.push({ dt, key: dkey(dt) }); });
  slots.sort((a, b) => a.dt - b.dt); slots.length = Math.min(slots.length, 3);
  /* cada agendamento é um documento por data (uid_modalidade_data): os que já passaram ficam guardados no histórico da academia.
     O formato antigo (uid_modalidade) ainda é lido enquanto a data dele não passou. */
  const docId = k => `${uid}_${id}_${k}`, hoje = dkey(now);
  const achados = await Promise.all([`${uid}_${id}`, ...slots.map(x => docId(x.key))].map(d => api.get('agendamentos', d).then(r => r && { ...r, docId: d }).catch(() => null)));
  let ag = achados.find(a => a && (a.slotKey || '') >= hoje) || null;
  let sel = slots.find(s => ag && s.key === ag.slotKey) || slots[0], agended = !!ag;
  const gravar = async () => { const novo = docId(sel.key); await api.set('agendamentos', novo, { uid, modId: id, slotKey: sel.key, hora: m.ini, ts: Date.now() });
    if (ag && ag.docId !== novo) await api.del('agendamentos', ag.docId).catch(() => {}); ag = { docId: novo, slotKey: sel.key }; };
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
      if (agended && !ro()) { try { await gravar(); } catch (err) { toast(friendly(err)); } }
      $('#slots', el).innerHTML = slotHTML(); const on = $('.slot.on .sel', el); on && on.classList.add('pop'); };
    wrap.onclick = async e => { const b = e.target.closest('#cta'); if (!b) return; if (ro()) return blocked();
      try {
        if (agended) { await api.del('agendamentos', ag.docId); ag = null; agended = false; toast('Aula cancelada.'); }
        else { await gravar(); agended = true; toast(`Aula agendada: ${DIAS[iso(sel.dt)]} ${sel.dt.getDate()}, ${m.ini}.`); }
      } catch (err) { return toast(friendly(err)); }
      wrap.innerHTML = ctaHTML(); const c = $('#cta', wrap); c && c.classList.add('pop'); };
  } };
}

/* ---------------- Perfil ---------------- */
export async function perfil() {
  const uid = sid(), [cks, mine] = await Promise.all([api.list('checkins', [['uid', '==', uid]]), api.get('users', uid)]);
  const plano = mine && mine.planoId ? await api.get('planos', mine.planoId).catch(() => null) : null, [stc, stl] = situ(mine || {}, plano);
  const podePagar = !!plano && plano.categoria !== 'totalpass' && !ro() && pagamentoAtivo();
  const planoCard = `<section class="card span2"><h2 class="h2" style="margin-bottom:10px">Meu plano</h2>${plano ? `<div class="row" style="justify-content:space-between;gap:12px;flex-wrap:wrap"><div><b style="font:700 22px var(--d)">${esc(plano.nome)}</b><div class="muted" style="font-size:13px">${plano.categoria === 'totalpass' ? 'Via Total Pass' : perLabel(plano.periodo)} · ${plano.familia === 'sim' ? 'Família' : 'Individual'}</div>${plano.categoria === 'totalpass' ? '' : `<div class="muted" style="font-size:13px;margin-top:2px">${esc(precoTxt(plano))}</div>`}</div><div style="text-align:right"><span class="st-chip ${stc}">${stl}</span>${plano.categoria === 'totalpass' || !mine.vencimento ? '' : `<div class="muted" style="font-size:13px;margin-top:4px">Vencimento ${ptDate(mine.vencimento)}</div>`}</div></div>${podePagar ? `<button class="btn red" id="pagar" style="margin-top:14px">${stc === 'emdia' ? 'Pagar mensalidade adiantada' : 'Pagar mensalidade'}</button>` : ''}` : '<p class="muted" style="margin:0;font-size:14px">Nenhum plano definido. Fale com a recepção.</p>'}</section>`;
  const { cur, rec } = streakInfo(new Set(cks.map(c => c.data)), new Date());
  return { depth: 1, html: `<header class="hero compact"><div class="topbar">${logo(30)}${temaBtn()}</div></header>
  <div class="body dgrid"><div class="span2"><h1 class="h1">Meu perfil</h1><p class="muted" style="margin-top:4px;font-size:14px">Foto, nome e senha</p></div>
    <div class="stats span2"><div class="card"><b>${cur}</b><small>dias seguidos</small></div><div class="card"><b>${rec}</b><small>recorde</small></div><div class="card"><b>${cks.length}</b><small>check-ins</small></div></div>
    ${planoCard}${perfilHTML()}<button class="btn dark span2" id="out">Sair da conta</button></div><div style="height:16px;flex:none"></div>${nav('user')}`,
  after(el) { $('#out', el).onclick = () => api.logout(); bindPerfil(el, () => dispatchEvent(new Event('hashchange')));
    const pg = $('#pagar', el); if (pg) pg.onclick = () => abrirPagamento({ plano, aluno: mine, onPago: () => setTimeout(() => dispatchEvent(new Event('hashchange')), 2500) }); } };
}
