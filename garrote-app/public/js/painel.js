/* Painel do dono e do treinador (tela larga). Cadastros genéricos guiados por "schema". */
import { api, mode } from './api.js';
import { $, $$, esc, toast, countUp, ic, logo, LET, DIAS, dkey, initials, SESSION, go, openModal, confirmBox, fail, avatar, brl, firstName } from './ui.js';
import { perfilHTML, bindPerfil } from './perfil.js';
import { PERIODOS, perLabel, mensalDe, ptDate, addMonths, situ } from './plano.js';

const ATIVO = [['sim', 'Ativo'], ['nao', 'Inativo']];
const ICONES = [['db', 'Halter'], ['bolt', 'Raio (lutas)'], ['note', 'Música (dança)'], ['grid', 'Grade'], ['user', 'Pessoa']];
const byName = (a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
const genPass = () => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
/* Dono: pessoas, modalidades e financeiro. Treinador: alunos, treinos, exercícios e categorias. */
const MENU = {
  dono: [['visao', 'Visão geral'], ['treinadores', 'Treinadores'], ['alunos', 'Alunos'], ['modalidades', 'Modalidades'], ['planos', 'Planos'], ['financeiro', 'Financeiro'], ['perfil', 'Meu perfil']],
  treinador: [['visao', 'Visão geral'], ['alunos', 'Meus alunos'], ['treinos', 'Treinos'], ['exercicios', 'Exercícios'], ['categorias', 'Categorias'], ['perfil', 'Meu perfil']]
};
const eff = () => SESSION.me.role === 'treinador' ? { mode: 'treinador', tid: SESSION.user.uid } : { mode: 'dono', tid: null };

async function load(tab) {
  const names = ['users', 'modalidades', 'categorias', 'exercicios', 'treinos'];
  const [users, modalidades, categorias, exercicios, treinos] = await Promise.all(names.map(c => api.list(c)));
  const D = { users: users.sort(byName), modalidades: modalidades.sort(byName), categorias: categorias.sort(byName), exercicios: exercicios.sort(byName), treinos: treinos.sort(byName) };
  D.planos = SESSION.me.role === 'dono' ? (await api.list('planos')).sort(byName) : [];
  if (tab === 'financeiro') [D.pagamentos, D.fotos] = await Promise.all([api.list('pagamentos'), api.list('fotos')]);
  if (tab === 'visao') [D.checkins, D.agend] = await Promise.all([api.list('checkins', [['data', '==', dkey(new Date())]]), api.list('agendamentos')]);
  return D;
}

/* ---------- definição de cada cadastro ---------- */
function schema(tab, D, E) {
  const trs = D.users.filter(u => u.role === 'treinador'), als = D.users.filter(u => u.role === 'aluno' && (!E.tid || u.treinadorId === E.tid));
  const mods = D.modalidades.map(m => [m.id, m.nome]), cats = D.categorias.map(c => [c.id, c.nome]);
  const planoOpts = (D.planos || []).map(p => [p.id, `${p.nome} · ${brl(p.valor)}`]), planoDe = id => (D.planos || []).find(p => p.id === id);
  const nm = (arr, id) => (arr.find(x => x.id === id) || {}).nome || '—';
  const dias = r => (r.dias || []).map(n => DIAS[n]).join(' ') || '—';
  const pessoa = { k: 'nome', l: 'Nome completo', req: 1, full: 1, ph: 'Ex.: Lucas Martins' };
  const acesso = [{ k: 'email', l: 'E-mail de acesso', type: 'email', req: 1, create: 1, ph: 'nome@email.com' }, { k: 'senha', l: 'Senha provisória', type: 'pass', req: 1, create: 1, def: genPass }];
  const S = {
    treinadores: { col: 'users', title: 'Treinadores', one: 'treinador', user: 'treinador', rows: trs,
      fields: [pessoa, ...acesso, { k: 'telefone', l: 'Telefone', type: 'tel', ph: '(19) 90000-0000' }, { k: 'ativo', l: 'Situação', type: 'select', opts: () => ATIVO, def: () => 'sim' }],
      cols: [['Nome', r => r.nome], ['E-mail', r => r.email], ['Telefone', r => r.telefone || '—'], ['Alunos', r => D.users.filter(u => u.treinadorId === r.id).length], ['Situação', r => r.ativo === 'nao' ? 'Inativo' : 'Ativo']] },
    alunos: { col: 'users', title: E.tid ? 'Meus alunos' : 'Alunos', one: 'aluno', user: 'aluno', rows: als,
      fields: [pessoa, ...acesso, { k: 'telefone', l: 'Telefone', type: 'tel', ph: '(19) 90000-0000' },
        { k: 'treinadorId', l: 'Treinador responsável', type: 'select', req: 1, opts: () => trs.map(t => [t.id, t.nome]), hide: !!E.tid },
        { k: 'modalidades', l: 'Modalidades', type: 'multi', opts: () => mods },
        { k: 'planoId', l: 'Plano', type: 'select', blank: 1, opts: () => planoOpts, hide: !!E.tid },
        { k: 'familiaId', l: 'Grupo familiar (só plano família)', ph: 'Ex.: Família Lima', hide: !!E.tid },
        { k: 'vencimento', l: 'Próximo vencimento', type: 'date', hide: !!E.tid },
        { k: 'ativo', l: 'Situação', type: 'select', opts: () => ATIVO, def: () => 'sim' }],
      cols: [['Nome', r => r.nome], ['E-mail', r => r.email], ['Treinador', r => nm(trs, r.treinadorId)], ['Modalidades', r => (r.modalidades || []).map(id => nm(D.modalidades, id)).join(', ') || '—'],
        ...(E.tid ? [['Situação', r => r.ativo === 'nao' ? 'Inativo' : 'Ativo']] : [['Plano', r => (planoDe(r.planoId) || {}).nome || '—'], ['Pagamento', r => situ(r, planoDe(r.planoId))[1]]])] },
    modalidades: { col: 'modalidades', title: 'Modalidades', one: 'modalidade', rows: D.modalidades,
      fields: [{ k: 'nome', l: 'Nome', req: 1, ph: 'Ex.: Muay Thai' }, { k: 'icone', l: 'Ícone', type: 'select', opts: () => ICONES, def: () => 'db' },
        { k: 'prof', l: 'Professor', ph: 'Prof. Diego' }, { k: 'local', l: 'Local', ph: 'Tatame' },
        { k: 'dias', l: 'Dias da semana', type: 'days', req: 1 }, { k: 'ini', l: 'Início', req: 1, ph: '19h' }, { k: 'fim', l: 'Fim', ph: '20h' }, { k: 'duracao', l: 'Duração', ph: '60 min' },
        { k: 'vagas', l: 'Vagas (texto)', ph: '6 vagas' }, { k: 'nivel', l: 'Nível', def: () => 'Todos os níveis' },
        { k: 'descricao', l: 'Descrição', type: 'textarea', full: 1 }, { k: 'foto', l: 'Foto (link da imagem)', type: 'url', full: 1, ph: 'https://...' }, { k: 'video', l: 'Vídeo (link do YouTube ou .mp4)', type: 'url', full: 1, ph: 'https://...' }],
      cols: [['Nome', r => r.nome], ['Professor', r => r.prof || '—'], ['Dias', dias], ['Horário', r => `${r.ini || ''}${r.fim ? ' – ' + r.fim : ''}`]] },
    planos: { col: 'planos', title: 'Planos', one: 'plano', rows: D.planos || [],
      fields: [{ k: 'nome', l: 'Nome do plano', req: 1, full: 1, ph: 'Ex.: Trimestral' },
        { k: 'categoria', l: 'Tipo', type: 'select', opts: () => [['academia', 'Academia (o aluno paga)'], ['totalpass', 'Total Pass (repasse mensal)']], def: () => 'academia' },
        { k: 'periodo', l: 'Cobrança', type: 'select', num: 1, opts: () => PERIODOS, def: () => 1 },
        { k: 'valor', l: 'Valor por cobrança (R$)', type: 'money', req: 1, ph: 'Ex.: 270,00' },
        { k: 'familia', l: 'Quem usa', type: 'select', opts: () => [['nao', 'Individual (1 pessoa)'], ['sim', 'Plano família']], def: () => 'nao' },
        { k: 'membros', l: 'Pessoas no plano família', type: 'number', num: 1, ph: '3' },
        { k: 'descricao', l: 'Descrição', type: 'textarea', full: 1 }],
      before: d => ({ ...d, membros: d.familia === 'sim' ? Math.max(2, d.membros || 2) : 1 }),
      cols: [['Nome', r => r.nome], ['Cobrança', r => r.categoria === 'totalpass' ? 'Total Pass' : perLabel(r.periodo)], ['Valor', r => brl(r.valor)], ['Por mês', r => brl(mensalDe(r))],
        ['Tipo', r => r.familia === 'sim' ? `Família (${r.membros || 2})` : 'Individual'], ['Alunos', r => D.users.filter(u => u.planoId === r.id).length]] },
    categorias: { col: 'categorias', title: 'Categorias', one: 'categoria', rows: D.categorias,
      fields: [{ k: 'nome', l: 'Nome da categoria', req: 1, full: 1, ph: 'Ex.: Peito' }],
      cols: [['Nome', r => r.nome], ['Exercícios', r => D.exercicios.filter(e => e.categoriaId === r.id).length]] },
    exercicios: { col: 'exercicios', title: 'Exercícios', one: 'exercício', rows: D.exercicios,
      fields: [{ k: 'nome', l: 'Nome do exercício', req: 1, full: 1, ph: 'Ex.: Supino reto com barra' }, { k: 'categoriaId', l: 'Categoria', type: 'select', req: 1, opts: () => cats },
        { k: 'equip', l: 'Equipamento', ph: 'Barra' }, { k: 'video', l: 'Vídeo de como fazer (link do YouTube ou .mp4)', type: 'url', full: 1, ph: 'https://...' }, { k: 'descricao', l: 'Observações', type: 'textarea', full: 1 }],
      cols: [['Nome', r => r.nome], ['Categoria', r => nm(D.categorias, r.categoriaId)], ['Equipamento', r => r.equip || '—'], ['Vídeo', r => r.video ? 'Sim' : 'Não']] },
    treinos: { col: 'treinos', title: 'Treinos', one: 'treino', rows: D.treinos.filter(t => !E.tid || t.criadoPor === E.tid), wide: 1,
      fields: [{ k: 'nome', l: 'Nome do treino', req: 1, full: 1, ph: 'Ex.: Peito e Tríceps' }, { k: 'modalidadeId', l: 'Modalidade', type: 'select', blank: 1, full: 1, opts: () => mods },
        { k: 'dias', l: 'Dias da semana', type: 'days', full: 1 }, { k: 'alunoIds', l: 'Alunos que fazem este treino', type: 'multi', opts: () => als.map(a => [a.id, a.nome]) },
        { k: 'itens', l: 'Exercícios do treino', type: 'items', req: 1 }],
      cols: [['Nome', r => r.nome], ['Alunos', r => (r.alunoIds || []).map(id => nm(D.users, id).split(' ')[0]).join(', ') || '—'], ['Exercícios', r => (r.itens || []).length], ['Dias', dias]] }
  };
  return S[tab];
}

/* ---------- formulário ---------- */
const exLabel = (D, e) => `${(D.categorias.find(c => c.id === e.categoriaId) || {}).nome || 'Sem categoria'} · ${e.nome}`;
const irow = (D, it = {}) => `<div class="irow"><select name="ex" aria-label="Exercício">${D.exercicios.map(e => `<option value="${esc(e.id)}" ${e.id === it.exId ? 'selected' : ''}>${esc(exLabel(D, e))}</option>`).join('')}</select>
  <input name="series" type="number" min="1" max="12" value="${it.series ?? 3}" aria-label="Séries"><input name="reps" type="number" min="1" max="100" value="${it.reps ?? 10}" aria-label="Repetições">
  <input name="kg" type="number" min="0" step="0.5" value="${it.kg ?? 0}" aria-label="Carga em kg"><input name="desc" type="number" min="0" step="5" value="${it.descanso ?? 60}" aria-label="Descanso em segundos">
  <span class="ibtns"><button type="button" data-up aria-label="Subir">↑</button><button type="button" data-dn aria-label="Descer">↓</button><button type="button" data-rm aria-label="Remover">×</button></span></div>`;
function fieldHTML(f, v, D) {
  const cls = `field ${f.full ? 'full' : ''}`;
  if (f.type === 'select') return `<label class="${cls}">${f.l}<select name="${f.k}">${f.blank ? '<option value="">Nenhuma</option>' : ''}${f.opts().map(([o, l]) => `<option value="${esc(o)}" ${String(o) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  if (f.type === 'multi') { const o = f.opts(); return `<fieldset class="${cls} multi"><legend>${f.l}</legend>${o.length ? `<div class="checks">${o.map(([id, l]) => `<label class="chk"><input type="checkbox" name="${f.k}" value="${esc(id)}" ${(v || []).includes(id) ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>` : '<p class="muted" style="font-size:13px;margin:0">Nada cadastrado ainda.</p>'}</fieldset>`; }
  if (f.type === 'days') return `<fieldset class="${cls} multi"><legend>${f.l}</legend><div class="checks">${[1, 2, 3, 4, 5, 6, 7].map(n => `<label class="chk day"><input type="checkbox" name="${f.k}" value="${n}" ${(v || []).includes(n) ? 'checked' : ''}><span>${DIAS[n]}</span></label>`).join('')}</div></fieldset>`;
  if (f.type === 'items') return `<div class="field full"><span>${f.l}</span>${D.exercicios.length ? `<div class="ihead"><span>Exercício</span><span>Séries</span><span>Reps</span><span>Kg</span><span>Desc. (s)</span><span></span></div><div class="items">${(v || []).map(i => irow(D, i)).join('')}</div><button type="button" class="btn ghost" data-add style="height:44px">+ Adicionar exercício</button>` : '<p class="note">Cadastre exercícios antes de montar um treino.</p>'}</div>`;
  if (f.type === 'textarea') return `<label class="${cls}">${f.l}<textarea name="${f.k}" rows="3">${esc(v)}</textarea></label>`;
  return `<label class="${cls}">${f.l}<input name="${f.k}" type="${f.type === 'pass' || f.type === 'money' ? 'text' : f.type || 'text'}" value="${esc(f.type === 'money' && v ? String(v).replace('.', ',') : v)}" placeholder="${esc(f.ph || '')}" ${f.type === 'pass' ? 'autocomplete="off"' : ''} ${f.type === 'money' ? 'inputmode="decimal"' : ''}></label>`;
}
function collect(form, sc, isNew, D) {
  const out = {};
  for (const f of sc.fields) {
    if ((f.create && !isNew) || f.hide) continue;
    if (f.type === 'multi') out[f.k] = $$(`[name="${f.k}"]:checked`, form).map(i => i.value);
    else if (f.type === 'days') out[f.k] = $$(`[name="${f.k}"]:checked`, form).map(i => +i.value);
    else if (f.type === 'items') out[f.k] = $$('.irow', form).map(r => ({ exId: $('[name=ex]', r).value, series: Math.max(1, +$('[name=series]', r).value || 1), reps: Math.max(1, +$('[name=reps]', r).value || 1), kg: Math.max(0, +$('[name=kg]', r).value || 0), descanso: Math.max(0, +$('[name=desc]', r).value || 0) }));
    else out[f.k] = (form.elements[f.k].value || '').trim();
    const v = out[f.k], empty = Array.isArray(v) ? !v.length : !v;
    if (f.req && empty) fail(f.type === 'items' ? 'Adicione pelo menos um exercício.' : f.type === 'days' ? 'Escolha pelo menos um dia.' : `Preencha: ${f.l.toLowerCase()}.`);
    if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail('Digite um e-mail válido.');
    if (f.type === 'pass' && v.length < 6) fail('A senha provisória precisa ter pelo menos 6 caracteres.');
    if (f.type === 'money') { const n = parseMoney(v); if (!(n >= 0) || !isFinite(n)) fail('Digite um valor válido, como 89,90.'); out[f.k] = Math.round(n * 100) / 100; }
    else if (f.num) out[f.k] = Number(v) || 0;
  }
  return out;
}
function bindItems(form, D) {
  const box = $('.items', form); if (!box) return;
  if (!$('.irow', box)) box.insertAdjacentHTML('beforeend', irow(D));
  $('[data-add]', form).onclick = () => { box.insertAdjacentHTML('beforeend', irow(D)); const r = box.lastElementChild; r.classList.add('new'); $('select', r).focus(); };
  box.onclick = e => { const r = e.target.closest('.irow'); if (!r) return;
    if (e.target.closest('[data-rm]')) r.remove(); else if (e.target.closest('[data-up]') && r.previousElementSibling) box.insertBefore(r, r.previousElementSibling); else if (e.target.closest('[data-dn]') && r.nextElementSibling) box.insertBefore(r.nextElementSibling, r); };
}

function showCreds(email, pass, nome) {
  const m = openModal({ title: 'Acesso criado', html: `<p style="font:400 15px/1.5 var(--b);margin:0 0 12px">Passe estes dados para <b>${esc(nome)}</b>. A pessoa entra em <b>${esc(location.origin)}</b>.</p>
    <div class="creds"><div><small>E-mail</small><b>${esc(email)}</b></div><div><small>Senha provisória</small><b>${esc(pass)}</b></div></div>`,
    foot: '<button type="button" class="btn dark" data-copy>Copiar dados</button><button type="button" class="btn ghost" data-mail>E-mail para definir senha</button>' });
  $('[data-copy]', m.form).onclick = () => { navigator.clipboard && navigator.clipboard.writeText(`Garrote Academia\nEndereço: ${location.origin}\nE-mail: ${email}\nSenha provisória: ${pass}`); toast('Dados copiados.'); };
  $('[data-mail]', m.form).onclick = async () => { try { await api.reset(email); toast(mode === 'demo' ? 'No modo demonstração nenhum e-mail é enviado.' : `E-mail enviado para ${email}.`); } catch (e) { toast('Não foi possível enviar o e-mail.'); } };
}
async function saveRow(sc, data, row, E) {
  if (sc.user) {
    if (row) { const p = { nome: data.nome, telefone: data.telefone || '', ativo: data.ativo || 'sim' }; if (sc.user === 'aluno') { p.modalidades = data.modalidades || []; if (!E.tid) { p.treinadorId = data.treinadorId; p.planoId = data.planoId || ''; p.familiaId = data.familiaId || ''; p.vencimento = data.vencimento || ''; } } return api.update('users', row.id, p); }
    const email = data.email.toLowerCase(), uid = await api.createAccount(email, data.senha);
    const p = { nome: data.nome, email, telefone: data.telefone || '', role: sc.user, ativo: data.ativo || 'sim', criadoPor: SESSION.user.uid, criadoEm: Date.now() };
    if (sc.user === 'aluno') { p.treinadorId = E.tid || data.treinadorId; p.modalidades = data.modalidades || []; if (!E.tid) { p.planoId = data.planoId || ''; p.familiaId = data.familiaId || ''; p.vencimento = data.vencimento || ''; } }
    await api.set('users', uid, p); setTimeout(() => showCreds(email, data.senha, data.nome), 280); return;
  }
  if (sc.before) data = sc.before(data);
  if (row) return api.update(sc.col, row.id, data);
  await api.add(sc.col, { ...data, criadoPor: E.tid || SESSION.user.uid, criadoEm: Date.now() });
}
function openForm(sc, D, E, row, done) {
  const isNew = !row, fs = sc.fields.filter(f => !(f.create && !isNew) && !f.hide);
  const html = `<div class="form">${fs.map(f => fieldHTML(f, row ? row[f.k] : f.def ? f.def() : f.type === 'items' || f.type === 'multi' || f.type === 'days' ? [] : '', D)).join('')}</div>`;
  const m = openModal({ title: `${isNew ? 'Novo' : 'Editar'} ${sc.one}`, html, wide: !!sc.wide, submit: isNew ? 'Criar' : 'Salvar',
    onSubmit: async form => { const data = collect(form, sc, isNew, D); await saveRow(sc, data, row, E); await done(); toast(isNew ? 'Cadastro criado.' : 'Alterações salvas.'); } });
  bindItems(m.form, D);
}
const cap = s => s[0].toUpperCase() + s.slice(1);

/* ---------- telas ---------- */
const personRow = (name, sub, tag, cls = '') => `<div class="person ${cls}"><span class="av">${esc(initials(name))}</span><div class="nm"><b>${esc(name)}</b><small>${esc(sub)}</small></div>${tag ? `<span class="rl">${esc(tag)}</span>` : ''}</div>`;
function visaoHTML(D, E) {
  const als = D.users.filter(u => u.role === 'aluno' && (!E.tid || u.treinadorId === E.tid)), ids = new Set(als.map(a => a.id));
  const ck = D.checkins.filter(c => !E.tid || ids.has(c.uid)).sort((a, b) => b.ts - a.ts), user = id => D.users.find(u => u.id === id) || { nome: 'Aluno' };
  const ag = D.agend.filter(a => !E.tid || ids.has(a.uid));
  const kpi = (l, n, s) => `<div class="card"><small>${l}</small><b data-n="${n}">0</b><em>${s}</em></div>`;
  const treinos = D.treinos.filter(t => !E.tid || t.criadoPor === E.tid).length;
  return `<div class="head"><div><h1 class="h1">Visão geral</h1><p class="muted" style="margin-top:4px;font-size:14px">${E.tid ? 'Seus alunos e treinos' : 'A academia hoje'}</p></div></div>
  <div class="kpis">${kpi('Alunos', als.length, 'cadastrados')}${E.tid ? kpi('Exercícios', D.exercicios.length, 'na biblioteca') : kpi('Treinadores', D.users.filter(u => u.role === 'treinador').length, 'com acesso')}${kpi('Treinos', treinos, 'montados')}${kpi('Check-ins hoje', ck.length, 'alunos presentes')}</div>
  <div class="two"><section class="card"><h2 class="h2" style="margin-bottom:8px">Check-ins de hoje</h2>${ck.length ? ck.map(c => personRow(user(c.uid).nome, 'às ' + new Date(c.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), '', '')).join('') : '<p class="empty">Ninguém fez check-in ainda hoje.</p>'}</section>
  <section class="card"><h2 class="h2" style="margin-bottom:8px">Aulas experimentais agendadas</h2>${ag.length ? ag.map(a => personRow(user(a.uid).nome, `${(D.modalidades.find(m => m.id === a.modId) || {}).nome || 'Modalidade'} · ${(a.slotKey || '').split('-').reverse().slice(0, 2).join('/')} às ${a.hora || ''}`, 'Experimental')).join('') : '<p class="empty">Nenhum agendamento por enquanto.</p>'}</section></div>`;
}
function tableHTML(sc, D, E) {
  const rows = sc.rows;
  const head = `<div class="head"><div><h1 class="h1">${sc.title}</h1><p class="muted" style="margin-top:4px;font-size:14px">${rows.length} ${rows.length === 1 ? 'cadastro' : 'cadastros'}</p></div>
    <div class="tools"><input id="q" type="search" placeholder="Buscar" aria-label="Buscar"><button class="btn red" id="new" style="width:auto;height:46px;padding:0 22px;border-radius:14px;font-size:14px">+ Novo ${sc.one}</button></div></div>`;
  if (!rows.length) return head + `<section class="card"><p class="empty">Nenhum ${sc.one} cadastrado. Clique em “Novo ${sc.one}” para começar.</p></section>`;
  return head + `<section class="card" style="padding:8px 16px;overflow-x:auto"><table class="tbl"><thead><tr>${sc.cols.map(c => `<th>${c[0]}</th>`).join('')}<th></th></tr></thead><tbody>
    ${rows.map(r => `<tr data-id="${esc(r.id)}">${sc.cols.map(c => `<td>${esc(c[1](r))}</td>`).join('')}<td class="act"><button data-edit>Editar</button><button data-del>Excluir</button></td></tr>`).join('')}</tbody></table></section>`;
}
const parseMoney = s => { s = String(s).replace(/[^\d,.-]/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); return parseFloat(s); };
function finCalc(D) {
  const als = D.users.filter(u => u.role === 'aluno'), pl = id => (D.planos || []).find(p => p.id === id);
  const gkey = a => { const p = pl(a.planoId); return p && p.familia === 'sim' && a.familiaId ? p.id + '|' + a.familiaId.trim().toLowerCase() : null; };
  const size = {}; als.filter(a => a.ativo !== 'nao').forEach(a => { const k = gkey(a); if (k) size[k] = (size[k] || 0) + 1; });
  const rows = als.map(a => { const p = pl(a.planoId), k = gkey(a), n = k ? size[k] || 1 : 1, [st, stl] = situ(a, p);
    return { a, p, st, stl, n, fam: !!(p && p.familia === 'sim'), share: a.ativo === 'nao' || !p ? 0 : mensalDe(p) / n }; });
  return { rows, receita: rows.reduce((t, r) => t + r.share, 0) };
}
function finHTML(D) {
  const C = finCalc(D), fotos = Object.fromEntries((D.fotos || []).map(f => [f.id, f.data])), mes = dkey(new Date()).slice(0, 7);
  const recebido = (D.pagamentos || []).filter(p => (p.data || '').startsWith(mes)).reduce((t, p) => t + (p.valor || 0), 0), cnt = k => C.rows.filter(r => r.st === k).length;
  const kpi = (l, v, s) => `<div class="card"><small>${l}</small><b>${v}</b><em>${s}</em></div>`;
  const rows = C.rows.map(r => `<tr data-id="${esc(r.a.id)}" data-s="${r.st}"><td><div class="pcell">${avatar({ nome: r.a.nome, foto: fotos[r.a.id] }, 38)}<div><b>${esc(r.a.nome)}</b><small>${esc(r.a.email || '')}</small></div></div></td>
    <td>${r.p ? esc(r.p.nome) : '—'}${r.p ? `<small class="sub">${r.p.categoria === 'totalpass' ? 'Via Total Pass' : perLabel(r.p.periodo)} · ${r.fam ? 'Família' + (r.a.familiaId ? ` · ${esc(r.a.familiaId)} (${r.n})` : '') : 'Individual'}</small>` : ''}</td>
    <td>${brl(r.share)}</td><td><span class="st-chip ${r.st}">${r.stl}</span></td><td>${r.p && r.p.categoria === 'totalpass' ? '—' : ptDate(r.a.vencimento)}</td>
    <td class="act"><button data-pay>Pagamento</button><button data-plan>Plano</button><button data-hist>Histórico</button></td></tr>`).join('');
  return `<div class="head"><div><h1 class="h1">Financeiro</h1><p class="muted" style="margin-top:4px;font-size:14px">Planos, pagamentos e situação de cada aluno</p></div>
    <div class="tools"><input id="q" type="search" placeholder="Buscar aluno" aria-label="Buscar"><a class="btn dark" href="#/painel/planos" style="width:auto;height:46px;padding:0 20px;border-radius:14px;font-size:14px">Gerenciar planos</a></div></div>
  <div class="kpis money">${kpi('Receita mensal prevista', brl(C.receita), 'planos ativos por mês')}${kpi('Recebido no mês', brl(recebido), 'pagamentos registrados')}${kpi('Em atraso', cnt('atrasado'), 'alunos com vencimento vencido')}${kpi('Sem plano', cnt('semplano'), 'defina um plano para cobrar')}</div>
  <div class="chips" id="fchips">${[['todos', 'Todos'], ['emdia', 'Em dia'], ['atrasado', 'Em atraso'], ['pendente', 'Pendente'], ['semplano', 'Sem plano'], ['totalpass', 'Total Pass']].map(([k, l], i) => `<button class="chip ${i ? '' : 'on'}" data-fs="${k}">${l}</button>`).join('')}</div>
  <section class="card" style="padding:8px 16px;overflow-x:auto">${C.rows.length ? `<table class="tbl"><thead><tr><th>Aluno</th><th>Plano</th><th>Valor/mês</th><th>Situação</th><th>Vencimento</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="empty">Nenhum aluno cadastrado ainda.</p>'}</section>`;
}
function openPlano(a, D, done) {
  const opts = ['<option value="">Sem plano</option>', ...D.planos.map(p => `<option value="${esc(p.id)}" ${p.id === a.planoId ? 'selected' : ''}>${esc(p.nome)} · ${brl(p.valor)} (${p.categoria === 'totalpass' ? 'Total Pass' : perLabel(p.periodo)})</option>`)].join('');
  openModal({ title: `Plano de ${firstName(a.nome)}`, submit: 'Salvar', html: `<div class="form">${D.planos.length ? '' : '<p class="note full">Você ainda não criou planos. Crie em Planos.</p>'}
    <label class="field full">Plano<select name="planoId">${opts}</select></label>
    <label class="field full">Grupo familiar<input name="familiaId" value="${esc(a.familiaId || '')}" placeholder="Ex.: Família Lima"><small class="muted">Só para plano família: use o mesmo nome para todos da família.</small></label>
    <label class="field full">Próximo vencimento<input name="vencimento" type="date" value="${esc(a.vencimento || '')}"></label></div>`,
    onSubmit: async f => { await api.update('users', a.id, { planoId: f.planoId.value, familiaId: f.familiaId.value.trim(), vencimento: f.vencimento.value }); await done(); toast('Plano atualizado.'); } });
}
function openPay(a, D, done) {
  const p = D.planos.find(x => x.id === a.planoId);
  if (!p) return toast('Defina um plano para este aluno primeiro.');
  if (p.categoria === 'totalpass') return toast('Total Pass: o pagamento vem do aplicativo parceiro.');
  const key = a.familiaId && p.familia === 'sim' ? a.familiaId.trim().toLowerCase() : null;
  const group = key ? D.users.filter(u => u.role === 'aluno' && u.ativo !== 'nao' && u.planoId === p.id && (u.familiaId || '').trim().toLowerCase() === key) : [a];
  openModal({ title: `Registrar pagamento`, submit: 'Registrar', html: `<p style="font:400 14px/1.5 var(--b);margin:0 0 12px"><b>${esc(a.nome)}</b> · ${esc(p.nome)} (${perLabel(p.periodo)})${group.length > 1 ? `<br>Vale para a família toda: ${group.map(g => esc(firstName(g.nome))).join(', ')}.` : ''}</p>
    <div class="form"><label class="field">Valor pago (R$)<input name="valor" value="${String(p.valor).replace('.', ',')}" inputmode="decimal"></label><label class="field">Data<input name="data" type="date" value="${dkey(new Date())}"></label>
    <label class="field full">Forma de pagamento<select name="forma"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Boleto</option><option>Outro</option></select></label></div>`,
    onSubmit: async f => {
      const valor = parseMoney(f.valor.value), data = f.data.value;
      if (!(valor > 0) || !isFinite(valor)) fail('Digite um valor válido.'); if (!data) fail('Informe a data do pagamento.');
      const base = a.vencimento && a.vencimento >= data ? a.vencimento : data, venc = addMonths(base, p.periodo);
      await api.add('pagamentos', { alunoIds: group.map(g => g.id), planoId: p.id, valor: Math.round(valor * 100) / 100, data, meses: p.periodo, forma: f.forma.value, familiaId: key ? a.familiaId : '', registradoPor: SESSION.user.uid });
      await Promise.all(group.map(g => api.update('users', g.id, { vencimento: venc, ultimoPagamento: data })));
      await done(); toast(`Pagamento registrado. Próximo vencimento: ${ptDate(venc)}.`);
    } });
}
async function openHist(a, D) {
  const list = (await api.list('pagamentos', [['alunoIds', 'array-contains', a.id]])).sort((x, y) => (y.data || '').localeCompare(x.data || ''));
  openModal({ title: `Histórico de ${firstName(a.nome)}`, html: list.length ? `<div class="hist">${list.map(p => `<div class="person"><div class="nm"><b>${brl(p.valor)}</b><small>${ptDate(p.data)} · ${esc(p.forma || '')} · ${esc((D.planos.find(x => x.id === p.planoId) || {}).nome || 'Plano')}</small></div><span class="rl">${perLabel(p.meses)}</span></div>`).join('')}</div>` : '<p class="empty">Nenhum pagamento registrado ainda.</p>' });
}
function bindFin(el, D, repaint) {
  let fs = 'todos';
  const apply = () => { const q = ($('#q', el).value || '').toLowerCase(); $$('tbody tr', el).forEach(r => r.hidden = !(fs === 'todos' || r.dataset.s === fs) || !r.textContent.toLowerCase().includes(q)); };
  $('#q', el).oninput = apply;
  $('#fchips', el).onclick = e => { const b = e.target.closest('[data-fs]'); if (!b) return; fs = b.dataset.fs; $$('#fchips .chip', el).forEach(c => c.classList.toggle('on', c === b)); apply(); };
  const tb = $('tbody', el); if (!tb) return;
  tb.onclick = e => { const tr = e.target.closest('tr'), a = tr && D.users.find(u => u.id === tr.dataset.id); if (!a) return;
    if (e.target.closest('[data-pay]')) openPay(a, D, repaint); else if (e.target.closest('[data-plan]')) openPlano(a, D, repaint); else if (e.target.closest('[data-hist]')) openHist(a, D); };
}
function build(tab, D, E) {
  const me = SESSION.me;
  const side = `<aside class="side">${logo(34)}${MENU[E.mode].map(([k, l]) => `<a class="${tab === k ? 'on' : ''}" href="#/painel/${k}">${l}</a>`).join('')}
    <div class="who">${avatar(me, 36)}<div style="flex:1;min-width:0"><b style="display:block;font-size:13px">${esc(firstName(me.nome))}</b><small style="color:var(--dim);font-size:11px">${me.role === 'dono' ? 'Dono' : 'Treinador'}${mode === 'demo' ? ' · demonstração' : ''}</small></div>
      <button id="out" class="iconbtn" style="width:36px;height:36px;background:var(--s2)" aria-label="Sair">${ic('logout', 18)}</button></div></aside>`;
  const body = tab === 'visao' ? visaoHTML(D, E) : tab === 'financeiro' ? finHTML(D)
    : tab === 'perfil' ? `<div class="head"><div><h1 class="h1">Meu perfil</h1><p class="muted" style="margin-top:4px;font-size:14px">Foto, nome e senha</p></div></div><div class="pgrid">${perfilHTML()}</div>`
    : tableHTML(schema(tab, D, E), D, E);
  return `<div class="admin">${side}<main class="main">${body}</main></div>`;
}
function bind(el, tab, D, E) {
  const repaint = async () => { const E2 = eff(), D2 = await load(tab); el.innerHTML = build(tab, D2, E2); bind(el, tab, D2, E2); };
  $$('[data-n]', el).forEach(n => countUp(n, 0, +n.dataset.n, 800));
  $('#out', el).onclick = () => api.logout();
  if (tab === 'visao') return;
  if (tab === 'perfil') return bindPerfil(el, repaint);
  if (tab === 'financeiro') return bindFin(el, D, repaint);
  const sc = schema(tab, D, E); if (!sc) return;
  const create = () => openForm(sc, D, E, null, repaint);
  const nb = $('#new', el); if (nb) nb.onclick = create;
  const q = $('#q', el); if (q) q.oninput = () => $$('tbody tr', el).forEach(r => r.hidden = !r.textContent.toLowerCase().includes(q.value.toLowerCase()));
  const tb = $('tbody', el);
  if (tb) tb.onclick = async e => {
    const tr = e.target.closest('tr'); if (!tr) return; const row = sc.rows.find(r => r.id === tr.dataset.id); if (!row) return;
    if (e.target.closest('[data-edit]')) openForm(sc, D, E, row, repaint);
    if (e.target.closest('[data-del]')) {
      const msg = sc.user ? `Remover o acesso de ${row.nome}? A pessoa deixa de entrar no app.` : `Excluir “${row.nome}”? Esta ação não pode ser desfeita.`;
      if (!(await confirmBox(msg))) return;
      try { await api.del(sc.col, row.id); toast('Removido.'); await repaint(); } catch (err) { toast('Não foi possível remover.'); console.error(err); }
    }
  };
}
export async function painel(tab = 'visao') {
  const E = eff(); if (!MENU[E.mode].some(m => m[0] === tab)) tab = 'visao';
  const D = await load(tab);
  return { depth: 0, wide: true, html: build(tab, D, E), after: el => bind(el, tab, D, E) };
}
