/* Painel do dono e do treinador (tela larga). Cadastros genéricos guiados por "schema". */
import { api, mode } from './api.js';
import { $, $$, reduce, esc, toast, countUp, ic, logo, LET, DIAS, dkey, initials, SESSION, go, openModal, confirmBox, fail, avatar, brl, firstName, catTree, isTempo, itemTxt, segAlvo, temaBtn, fmtHora, TECNICAS, segTxt } from './ui.js';
import { dashHTML, bindDash } from './dash.js';
import { mealsField, bindMeals, collectMeals, dcalcField, collectPerfil, gasto, importarPadrao, baseDesatualizada, GRUPOS, macDieta, macRef, macTxt, qtdTxt, n1, sa } from './dieta.js';
import { produtosSchema, pedidosHTML, bindPedidos, iniciarAvisoPedidos } from './loja.js';
import { perfilHTML, bindPerfil } from './perfil.js';
import { PERIODOS, perLabel, mensalDe, ptDate, addMonths, situ, precoFinal, descTxt, parcTxt, precoTxt, nParc, pctPix, precoPix } from './plano.js';

const ATIVO = [['sim', 'Ativo'], ['nao', 'Inativo']];
const ICONES = [['db', 'Halter'], ['bolt', 'Raio (lutas)'], ['note', 'Música (dança)'], ['grid', 'Grade'], ['user', 'Pessoa']];
const semAc = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const byName = (a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
const genPass = () => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
/* Dono: pessoas, modalidades e financeiro. Treinador: alunos, treinos, exercícios e categorias. */
const MENU = {
  dono: [['visao', 'Visão geral'], ['treinadores', 'Treinadores'], ['externos', 'Treinadores externos'], ['alunos', 'Alunos'], ['modalidades', 'Modalidades'], ['planos', 'Planos'], ['financeiro', 'Financeiro'], ['produtos', 'Produtos'], ['pedidos', 'Pedidos']],
  treinador: [['visao', 'Visão geral'], ['alunos', 'Meus alunos'], ['treinos', 'Treinos'], ['exercicios', 'Exercícios'], ['categorias', 'Categorias'], ['dieta', 'Dieta']]
};
/* atalhos fixos na parte de baixo do celular (5 ícones, o do meio é sempre a visão geral) */
const subDieta = tab => `<div class="chips dietatabs" role="tablist" aria-label="Dieta">${[['dieta', 'Dietas'], ['alimentos', 'Alimentos']].map(([k, l]) => `<a class="chip ${tab === k ? 'on' : ''}" href="#/painel/${k}" role="tab" aria-selected="${tab === k}">${l}</a>`).join('')}</div>`;
const SUBDIETA = ['alimentos'];   // abas internas de Dieta: Dietas (dieta) e Alimentos; a calculadora fica dentro da criação da dieta
const BNAV = {
  dono: [['treinadores', 'i-treinador', 'Treinadores'], ['alunos', 'i-alunos', 'Alunos'], ['visao', 'i-visao', 'Visão geral'], ['planos', 'i-planos', 'Planos'], ['financeiro', 'i-cifrao', 'Financeiro']],
  treinador: [['alunos', 'i-alunos', 'Meus alunos'], ['treinos', 'db', 'Treinos'], ['visao', 'i-visao', 'Visão geral'], ['exercicios', 'bolt', 'Exercícios'], ['categorias', 'tag', 'Categorias']]
};
const CARDIOS = ['Esteira', 'Bicicleta', 'Elíptico', 'Corda', 'Escada', 'Remo', 'Caminhada', 'Outro'];
/* treinador externo: paga uma mensalidade à academia; [classe, texto] */
const situExt = t => t.ativo === 'nao' ? ['inativo', 'Inativo'] : !(+t.mensalidade > 0) ? ['semplano', 'Sem mensalidade'] : !t.vencimento ? ['pendente', 'Pendente'] : t.vencimento < dkey(new Date()) ? ['atrasado', 'Em atraso'] : ['emdia', 'Em dia'];
const eff = () => SESSION.me.role === 'treinador' ? { mode: 'treinador', tid: SESSION.user.uid } : { mode: 'dono', tid: null };

async function load(tab) {
  const names = ['users', 'modalidades', 'categorias', 'exercicios', 'treinos'];
  const [users, modalidades, categorias, exercicios, treinos] = await Promise.all(names.map(c => api.list(c)));
  const D = { users: users.sort(byName), modalidades: modalidades.sort(byName), categorias: categorias.sort(byName), exercicios: exercicios.sort(byName), treinos: treinos.sort(byName) };
  D.planos = SESSION.me.role === 'dono' ? (await api.list('planos')).sort(byName) : [];
  if (tab === 'financeiro') D.pagamentos = await api.list('pagamentos', [], { ttl: 600000 });
  if (tab === 'dieta' || tab === 'alimentos') {
    D.alimentos = await api.list('alimentos');
    if (SESSION.me.role === 'treinador' && !SESSION.baseOk && baseDesatualizada(D.alimentos)) { SESSION.baseOk = 1; try { await importarPadrao(api, D.alimentos, SESSION.user.uid); D.alimentos = await api.list('alimentos', [], { fresh: true }); } catch (e) { console.error('alimentos padrão', e); } }   // primeira vez: já cadastra a lista padrão
    D.alimentos.sort(byName); }
  if (tab === 'dieta') D.dietas = (await api.list('dietas')).sort(byName);
  if (tab === 'produtos' || tab === 'pedidos') D.produtos = (await api.list('produtos')).sort(byName);
  if (tab === 'pedidos') D.pedidos = (await api.list('pedidos', [['ts', '>=', Date.now() - 60 * 86400000]], { fresh: true })).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (tab === 'visao') {
    const dono = SESSION.me.role === 'dono', hoje = dkey(new Date());
    if (dono) {   // indicadores e gráficos do dono: check-ins só dos 30 últimos dias (dias passados ficam salvos no aparelho), pagamentos de 6 meses e pedidos de 60 dias
      const m6 = new Date(); m6.setDate(1); m6.setMonth(m6.getMonth() - 5); const d30 = new Date(); d30.setDate(d30.getDate() - 29);
      [D.ck90, D.agend, D.pagamentos, D.pedidos, D.produtos] = await Promise.all([api.checkinsPeriodo(dkey(d30)).catch(() => []), api.list('agendamentos', [], { ttl: 600000 }),
        api.list('pagamentos', [['data', '>=', dkey(m6)]], { ttl: 600000 }).catch(() => []), api.list('pedidos', [['ts', '>=', Date.now() - 60 * 86400000]], { ttl: 600000 }).catch(() => []), api.list('produtos').catch(() => [])]);
      D.ckDesde = dkey(d30); D.checkins = D.ck90.filter(c => c.data === hoje);
    } else [D.checkins, D.agend] = await Promise.all([api.list('checkins', [['data', '==', hoje]]), api.list('agendamentos', [], { ttl: 600000 })]);
  }
  return D;
}

/* ---------- definição de cada cadastro ---------- */
function schema(tab, D, E) {
  const trsAll = D.users.filter(u => u.role === 'treinador'), trs = trsAll.filter(u => !u.externo), exts = trsAll.filter(u => u.externo), als = D.users.filter(u => u.role === 'aluno' && (!E.tid || u.treinadorId === E.tid));
  const mods = D.modalidades.map(m => [m.id, m.nome]), T = catTree(D.categorias);
  const exDe = c => D.exercicios.filter(e => T.isSub(c) ? e.categoriaId === c.id : T.top(e.categoriaId) === c.id).length;
  const planoOpts = (D.planos || []).map(p => [p.id, `${p.nome} · ${brl(precoFinal(p))}${nParc(p) > 1 ? ` (${parcTxt(p)})` : ''}`]), planoDe = id => (D.planos || []).find(p => p.id === id);
  const nm = (arr, id) => (arr.find(x => x.id === id) || {}).nome || '—';
  const dias = r => [...(r.dias || [])].sort((a, b) => a - b).map(n => DIAS[n]).join(', ') || '—';
  const profsDe = r => (r.profIds || []).length ? r.profIds.map(id => nm(trs, id)).filter(n => n !== '—').join(', ') || r.prof || '—' : r.prof || '—';
  const pessoa = { k: 'nome', l: 'Nome completo', req: 1, full: 1, ph: 'Ex.: Lucas Martins' };
  const acesso = [{ k: 'email', l: 'E-mail de acesso', type: 'email', req: 1, create: 1, ph: 'nome@email.com' }, { k: 'senha', l: 'Senha provisória', type: 'pass', req: 1, create: 1, def: genPass }];
  const S = {
    treinadores: { col: 'users', title: 'Treinadores', one: 'treinador', user: 'treinador', rows: trs,
      fields: [pessoa, ...acesso, { k: 'telefone', l: 'Telefone', type: 'tel', ph: '(19) 90000-0000' }, { k: 'ativo', l: 'Situação', type: 'select', opts: () => ATIVO, def: () => 'sim' }],
      cols: [['Nome', r => r.nome], ['E-mail', r => r.email], ['Telefone', r => r.telefone || '—'], ['Alunos', r => D.users.filter(u => u.treinadorId === r.id).length], ['Situação', r => r.ativo === 'nao' ? 'Inativo' : 'Ativo']] },
    externos: { col: 'users', title: 'Treinadores externos', one: 'treinador externo', user: 'treinador', externo: 1, rows: exts, pay: 1,
      fields: [pessoa, ...acesso, { k: 'telefone', l: 'Telefone', type: 'tel', ph: '(19) 90000-0000' },
        { k: 'mensalidade', l: 'Mensalidade paga à academia (R$)', type: 'money', req: 1, ph: 'Ex.: 150,00' }, { k: 'vencimento', l: 'Próximo vencimento', type: 'date' },
        { k: 'ativo', l: 'Situação', type: 'select', opts: () => ATIVO, def: () => 'sim' }],
      cols: [['Nome', r => r.nome], ['E-mail', r => r.email], ['Alunos', r => D.users.filter(u => u.treinadorId === r.id).length], ['Mensalidade', r => brl(+r.mensalidade || 0)], ['Vencimento', r => ptDate(r.vencimento)], ['Situação', r => situExt(r)[1]]] },
    alunos: { col: 'users', title: E.tid ? 'Meus alunos' : 'Alunos', one: 'aluno', user: 'aluno', rows: als,
      fields: [pessoa, ...acesso, { k: 'telefone', l: 'Telefone', type: 'tel', ph: '(19) 90000-0000' },
        { k: 'treinadorId', l: 'Treinador responsável', type: 'select', req: 1, opts: () => trsAll.map(t => [t.id, t.nome + (t.externo ? ' (externo)' : '')]), hide: !!E.tid },
        { k: 'modalidades', l: 'Modalidades', type: 'multi', opts: () => mods },
        { k: 'planoId', l: 'Plano', type: 'select', blank: 1, opts: () => planoOpts, hide: !!E.tid },
        { k: 'familiaId', l: 'Grupo familiar (só plano família)', ph: 'Ex.: Família Lima', hide: !!E.tid },
        { k: 'vencimento', l: 'Próximo vencimento', type: 'date', hide: !!E.tid },
        { k: 'ativo', l: 'Situação', type: 'select', opts: () => ATIVO, def: () => 'sim' }],
      cols: [['Nome', r => r.nome], ['E-mail', r => r.email], ['Treinador', r => nm(trsAll, r.treinadorId)], ['Modalidades', r => (r.modalidades || []).map(id => nm(D.modalidades, id)).join(', ') || '—'],
        ...(E.tid ? [['Situação', r => r.ativo === 'nao' ? 'Inativo' : 'Ativo']] : [['Plano', r => (planoDe(r.planoId) || {}).nome || '—'], ['Pagamento', r => situ(r, planoDe(r.planoId))[1]]])] },
    modalidades: { col: 'modalidades', title: 'Modalidades', one: 'modalidade', rows: D.modalidades,
      fields: [{ k: 'nome', l: 'Nome', req: 1, ph: 'Ex.: Muay Thai' }, { k: 'icone', l: 'Ícone', type: 'select', opts: () => ICONES, def: () => 'db' },
        { k: 'local', l: 'Local', ph: 'Tatame' }, { k: 'profIds', l: 'Treinadores da modalidade', type: 'multi', full: 1, opts: () => trs.map(t => [t.id, t.nome]),
          get: r => r.profIds || trs.filter(t => r.prof && semAc(r.prof).includes(semAc(firstName(t.nome)))).map(t => t.id) },   // cadastro antigo (texto): marca quem tem o nome lá
        { k: 'dias', l: 'Dias da semana', type: 'days', req: 1, full: 1 }, { k: 'ini', l: 'Início', type: 'time', req: 1 }, { k: 'fim', l: 'Fim', type: 'time' }, { k: 'duracao', l: 'Duração', ph: '60 min' },
        { k: 'vagas', l: 'Vagas (texto)', ph: '6 vagas' }, { k: 'nivel', l: 'Nível', def: () => 'Todos os níveis' },
        { k: 'descricao', l: 'Descrição', type: 'textarea', full: 1 }, { k: 'professores', l: 'Professores e horários (aparecem para o aluno)', type: 'profs', full: 1, names: () => trs.map(t => t.nome) },
        { k: 'foto', l: 'Foto (link da imagem)', type: 'url', full: 1, ph: 'https://...' }, { k: 'video', l: 'Vídeo (link do YouTube ou .mp4)', type: 'url', full: 1, ph: 'https://...' }],
      /* vários treinadores por modalidade: o nome deles também fica gravado em "prof" (o aluno lê só a modalidade) */
      before: d => ({ ...d, prof: d.profIds.map(id => nm(trs, id)).filter(n => n !== '—').join(', ') }),
      cols: [['Nome', r => r.nome], ['Treinadores', profsDe], ['Dias', dias], ['Horário', r => `${fmtHora(r.ini)}${r.fim ? ' – ' + fmtHora(r.fim) : ''}`]] },
    planos: { col: 'planos', title: 'Planos', one: 'plano', rows: D.planos || [],
      fields: [{ k: 'nome', l: 'Nome do plano', req: 1, full: 1, ph: 'Ex.: Trimestral' },
        { k: 'categoria', l: 'Tipo', type: 'select', opts: () => [['academia', 'Academia (o aluno paga)'], ['totalpass', 'Total Pass (repasse mensal)']], def: () => 'academia' },
        { k: 'periodo', l: 'Cobrança', type: 'select', num: 1, opts: () => PERIODOS, def: () => 1 },
        { k: 'valor', l: 'Valor cheio do período (R$)', type: 'money', req: 1, ph: 'Ex.: 1.800,00' },
        { k: 'descontoTipo', l: 'Desconto em', type: 'select', opts: () => [['pct', 'Porcentagem (%)'], ['valor', 'Valor (R$)']], def: () => 'pct' },
        { k: 'desconto', l: 'Desconto', type: 'money', ph: 'Ex.: 10' },
        { k: 'parcelas', l: 'Parcelas', type: 'number', num: 1, ph: '1', def: () => 1 },
        { k: 'descontoPix', l: 'Desconto extra no Pix (%) · só planos parcelados', type: 'money', ph: '10', def: () => 10 },
        { k: '_calc', type: 'calc', full: 1 },
        { k: 'familia', l: 'Quem usa', type: 'select', opts: () => [['nao', 'Individual (1 pessoa)'], ['sim', 'Plano família']], def: () => 'nao' },
        { k: 'membros', l: 'Pessoas no plano família', type: 'number', num: 1, ph: '3' },
        { k: 'descricao', l: 'Descrição', type: 'textarea', full: 1 }],
      before: d => {
        if (d.descontoTipo === 'pct' && d.desconto > 100) fail('O desconto em porcentagem vai até 100%.');
        if (d.descontoTipo === 'valor' && d.desconto > d.valor) fail('O desconto não pode ser maior que o valor cheio.');
        if (d.descontoPix > 100) fail('O desconto no Pix vai até 100%.');
        return { ...d, parcelas: Math.max(1, Math.min(48, Math.round(d.parcelas) || 1)), membros: d.familia === 'sim' ? Math.max(2, d.membros || 2) : 1 };
      },
      calc: f => { const p = { valor: parseMoney(f.valor.value) || 0, descontoTipo: f.descontoTipo.value, desconto: parseMoney(f.desconto.value) || 0, parcelas: Math.max(1, +f.parcelas.value || 1), periodo: +f.periodo.value || 1 };
        p.descontoPix = f.descontoPix ? parseMoney(f.descontoPix.value) : 10;
        return p.valor > 0 ? 'Valor final: ' + precoTxt(p) + (pctPix(p) ? ` · no Pix: ${brl(precoPix(p))} (${pctPix(p)}% a menos)` : '') : 'Digite o valor cheio para ver o valor final e as parcelas.'; },
      cols: [['Nome', r => r.nome], ['Cobrança', r => r.categoria === 'totalpass' ? 'Total Pass' : perLabel(r.periodo)], ['Valor cheio', r => brl(+r.valor || 0)], ['Desconto', r => descTxt(r) ? descTxt(r).replace(' de desconto', '') : '—'], ['Valor total', r => brl(precoFinal(r))], ['No Pix', r => pctPix(r) ? `${brl(precoPix(r))} (-${pctPix(r)}%)` : r.categoria === 'totalpass' ? '—' : brl(precoFinal(r))], ['Parcelas', r => parcTxt(r)], ['Por mês', r => brl(mensalDe(r))],
        ['Tipo', r => r.familia === 'sim' ? `Família (${r.membros || 2})` : 'Individual'], ['Alunos', r => D.users.filter(u => u.planoId === r.id).length]] },
    /* lista mostra só as categorias principais; tocar numa delas abre as subcategorias logo abaixo */
    categorias: { col: 'categorias', title: 'Categorias', one: 'categoria', rows: T.tops, all: D.categorias, tree: T, newSub: 1,
      fields: [{ k: 'nome', l: 'Nome da categoria', req: 1, full: 1, ph: 'Ex.: Peito' }],
      sub: { col: 'categorias', one: 'subcategoria', fields: [{ k: 'nome', l: 'Nome da subcategoria', req: 1, full: 1, ph: 'Ex.: Peito superior' },
        { k: 'paiId', l: 'Dentro da categoria', type: 'select', req: 1, full: 1, blank: 1, blankL: 'Escolha a categoria', opts: () => T.tops.map(c => [c.id, c.nome]) }],
        check: (d, row) => { if (row && d.paiId === row.id) fail('Uma subcategoria não pode ficar dentro dela mesma.'); } },
      delMsg: r => T.subs(r.id).length ? `Excluir “${r.nome}”? As subcategorias dela passam a ser categorias principais.` : '',
      cols: [['Nome', r => r.nome], ['Tipo', r => T.isSub(r) ? 'Subcategoria de ' + T.nome(r.paiId) : 'Principal'],
        ['Subcategorias', r => T.isSub(r) ? '—' : T.subs(r.id).length || '—'], ['Exercícios', r => exDe(r)]] },
    exercicios: { col: 'exercicios', title: 'Exercícios', one: 'exercício', rows: D.exercicios,
      fields: [{ k: 'nome', l: 'Nome do exercício', req: 1, full: 1, ph: 'Ex.: Supino reto com barra' }, { k: 'categoriaId', l: 'Categoria / subcategoria', type: 'catsel', req: 1 },
        { k: 'equip', l: 'Equipamento', ph: 'Barra' }, { k: 'video', l: 'Vídeo de como fazer (link do YouTube ou .mp4)', type: 'url', full: 1, ph: 'https://...' }, { k: 'descricao', l: 'Observações', type: 'textarea', full: 1 }],
      catFilter: 1,
      cols: [['Nome', r => r.nome], ['Categoria', r => T.nome(T.top(r.categoriaId)) || '—'], ['Subcategoria', r => T.nome(T.sub(r.categoriaId)) || '—'], ['Equipamento', r => r.equip || '—'], ['Vídeo', r => r.video ? 'Sim' : 'Não']] },
    alimentos: { col: 'alimentos', title: 'Alimentos', one: 'alimento', rows: D.alimentos || [], imp: 1, groupFilter: 1,
      fields: [{ k: 'nome', l: 'Nome do alimento', req: 1, full: 1, ph: 'Ex.: Pão francês' }, { k: 'grupo', l: 'Grupo', type: 'select', opts: () => GRUPOS.map(g => [g, g]), def: () => GRUPOS[0] }, { k: 'porcao', l: 'Porção (como o aluno vai ver)', req: 1, ph: 'Ex.: 1 unidade (50 g)' },
        { k: 'g', l: 'Peso da porção (g)', type: 'money', req: 1, ph: '50' }, { k: 'kcal', l: 'Calorias (kcal)', type: 'money', req: 1, ph: '150' },
        { k: 'carb', l: 'Carboidratos (g)', type: 'money', ph: '29' }, { k: 'prot', l: 'Proteínas (g)', type: 'money', ph: '4' }, { k: 'gord', l: 'Gorduras (g)', type: 'money', ph: '1,5' },
        { k: '_dica', type: 'hint', txt: 'Os valores são da porção inteira. A lista padrão vem da Tabela TACO (valores por 100 g); acrescente os seus ou ajuste o que precisar.' }],
      cols: [['Nome', r => r.nome], ['Grupo', r => r.grupo || 'Outros'], ['Porção', r => r.porcao], ['Calorias', r => n1(r.kcal) + ' kcal'], ['Carboidratos', r => n1(r.carb) + ' g'], ['Proteínas', r => n1(r.prot) + ' g'], ['Gorduras', r => n1(r.gord) + ' g']] },
    dieta: { col: 'dietas', title: 'Dietas', one: 'dieta', rows: (D.dietas || []).filter(t => !E.tid || t.criadoPor === E.tid), wide: 1,
      fields: [{ k: 'nome', l: 'Nome da dieta', req: 1, full: 1, ph: 'Ex.: Cutting, 2.000 kcal' }, { k: 'alunoIds', l: 'Alunos que seguem esta dieta', type: 'multi', opts: () => als.map(a => [a.id, a.nome]) },
        { k: 'obs', l: 'Orientações gerais (opcional)', type: 'textarea', full: 1 }, { k: 'refeicoes', l: 'Refeições e horários', type: 'meals', req: 1, full: 1 }, { k: 'perfil', l: 'Calculadora: gasto diário e saldo da dieta', type: 'dcalc', full: 1 }],
      cols: [['Nome', r => r.nome], ['Alunos', r => (r.alunoIds || []).map(id => nm(D.users, id).split(' ')[0]).join(', ') || '—'], ['Refeições', r => (r.refeicoes || []).length], ['Calorias/dia', r => n1(macDieta(r, D.alimentos).kcal) + ' kcal']],
      extra: r => [['Orientações', r.obs || '—'], ['Total do dia', macTxt(macDieta(r, D.alimentos))], ...(gasto(r.perfil) ? (g => [['Gasto diário (TMB × atividade)', `${n1(g.total)} kcal (TMB ${n1(g.tmb)})`], ['Saldo por dia', `${n1(macDieta(r, D.alimentos).kcal - g.total)} kcal`]])(gasto(r.perfil)) : []), ...(r.refeicoes || []).map(m => [`${fmtHora(m.hora)} · ${m.nome}`, (m.itens || []).map(i => { const a = D.alimentos.find(x => x.id === i.alId); return `${a ? a.nome : 'Alimento removido'} · ${qtdTxt(a, i.qtd, i.un)}`; }).join('\n') + `\n${macTxt(macRef(m, D.alimentos))}`])] },
    produtos: produtosSchema(D, { ATIVO }),
    treinos: { col: 'treinos', title: 'Treinos', one: 'treino', rows: D.treinos.filter(t => !E.tid || t.criadoPor === E.tid), wide: 1,
      fields: [{ k: 'nome', l: 'Nome do treino', req: 1, full: 1, ph: 'Ex.: Peito e Tríceps' }, { k: 'modalidadeId', l: 'Modalidade', type: 'select', blank: 1, full: 1, opts: () => mods },
        { k: 'dias', l: 'Dias da semana', type: 'days', full: 1 }, { k: 'alunoIds', l: 'Alunos que fazem este treino', type: 'multi', opts: () => als.map(a => [a.id, a.nome]) },
        { k: 'cardio', l: 'Cardio do treino (opcional)', type: 'cardio', full: 1 }, { k: 'itens', l: 'Exercícios do treino', type: 'items', req: 1 }],
      cols: [['Nome', r => r.nome], ['Alunos', r => (r.alunoIds || []).map(id => nm(D.users, id).split(' ')[0]).join(', ') || '—'], ['Exercícios', r => (r.itens || []).length], ['Dias', dias]],
      extra: r => [...(r.cardio && r.cardio.min ? [['Cardio', `${r.cardio.nome || 'Cardio'} · meta ${r.cardio.min} min (opcional para o aluno)`]] : []), ['Lista de exercícios', (r.itens || []).map((i, n) => `${n + 1}. ${nm(D.exercicios, i.exId)} · ${itemTxt(i)} · ${i.descanso}s de descanso`).join('\n') || '—']] }
  };
  return S[tab];
}

/* ---------- formulário ---------- */
/* séries personalizadas: repetições (ou segundos, nos exercícios de tempo) por série, editadas num modal rápido.
   Ficam guardadas na própria linha (data-sets); a carga é só uma referência (placeholder), o aluno coloca a dele na hora */
const refKg = kg => kg ? Number(kg).toLocaleString('pt-BR') + ' kg' : 'Corpo';
const nSer = r => Math.max(1, Math.min(12, +$('[name=series]', r).value || 1));
const mainVal = r => Math.max(1, +$(r.classList.contains('tm') ? '[name=val]' : '[name=reps]', r).value || 1);
const getSets = r => { try { return JSON.parse(r.dataset.sets || '[]'); } catch { return []; } };
/* mantém a lista do tamanho do número de séries (as novas séries recebem o valor principal) */
const fitSets = (r, fresh) => { const n = nSer(r), m = mainVal(r), old = fresh ? [] : getSets(r); r.dataset.sets = JSON.stringify(Array.from({ length: n }, (_, k) => +old[k] || m)); };
const psLbl = r => r.classList.contains('ps') ? `Séries: ${getSets(r).join('/')}${r.classList.contains('tm') ? ' s' : ''}` : 'Personalizar séries';
const psPaint = r => { const b = $('[data-ps]', r), on = r.classList.contains('ps'); b.textContent = psLbl(r); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); };
const itemOut = (r, o) => { if (r.classList.contains('ps')) { fitSets(r); const sr = getSets(r).map(v => Math.max(1, Math.round(v) || 1));
  o.sets = sr.map(v => o.un === 's' ? { seg: v } : { reps: v }); o.series = sr.length; if (o.un === 's') o.seg = sr[0]; else o.reps = sr[0]; } return o; };
/* escolha do exercício: categoria → subcategoria → exercício */
const SEM = '_';                                                          // exercícios sem categoria válida
const bucket = (T, e) => T.top(e.categoriaId) || SEM;
const exOpts = (D, T, cat, sub, sel) => { if (!cat) return '<option value="">Escolha a categoria primeiro</option>';
  const l = D.exercicios.filter(e => bucket(T, e) === cat && (!sub || e.categoriaId === sub));
  return `<option value="">${l.length ? 'Escolha o exercício' : 'Nenhum exercício aqui'}</option>` + l.map(e => `<option value="${esc(e.id)}" ${e.id === sel ? 'selected' : ''}>${esc(e.nome)}${!sub && T.sub(e.categoriaId) ? ' · ' + esc(T.nome(e.categoriaId)) : ''}</option>`).join(''); };
const subOpts = (T, cat, sub) => !cat ? '<option value="">Escolha a categoria primeiro</option>' : !T.subs(cat).length ? '<option value="">Sem subcategorias</option>'
  : '<option value="">Todas as subcategorias</option>' + T.subs(cat).map(s => `<option value="${esc(s.id)}" ${s.id === sub ? 'selected' : ''}>${esc(s.nome)}</option>`).join('');
const exsel = (D, it) => { const T = catTree(D.categorias), e = D.exercicios.find(x => x.id === it.exId), cat = e ? bucket(T, e) : '', sub = e ? T.sub(e.categoriaId) : '', semCat = D.exercicios.some(x => bucket(T, x) === SEM);
  return `<div class="exsel"><label class="ii"><span>Categoria</span><select name="cat" aria-label="Categoria"><option value="">Escolha a categoria</option>${T.tops.map(c => `<option value="${esc(c.id)}" ${c.id === cat ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}${semCat ? `<option value="${SEM}" ${cat === SEM ? 'selected' : ''}>Sem categoria</option>` : ''}</select></label>
    <label class="ii sb"><span>Subcategoria</span><select name="sub" aria-label="Subcategoria" ${cat && T.subs(cat).length ? '' : 'disabled'}>${subOpts(T, cat, sub)}</select></label>
    <label class="ii exn"><span>Exercício</span><select name="ex" aria-label="Exercício" ${cat ? '' : 'disabled'}>${exOpts(D, T, cat, sub, it.exId)}</select></label></div>`; };
/* cada exercício fica fechado (categoria, exercício e botões); o botão de detalhes abre séries, carga e descanso, e só um fica aberto por vez */
const isum = r => { const tm = $('[name=un]', r).value === 's', s = +$('[name=series]', r).value || 1, v = +$('[name=val]', r).value || 0, d = +$('[name=desc]', r).value || 0;
  const reps = r.classList.contains('ps') ? getSets(r).join('/') + (tm ? ' s' : '') : tm ? v + 's' : (+$('[name=reps]', r).value || 1);
  const tc = $('[name=tec]', r), tn = tc && tc.value && TECNICAS[tc.value] ? ' · ' + TECNICAS[tc.value][0] : '';
  return `${s} × ${reps}${tm ? '' : ' · ' + (v ? v.toLocaleString('pt-BR') + ' kg' : 'Corpo')} · ${d}s descanso${tn}`; };
const irow = (D, it = {}, open = false) => { const tm = isTempo(it), ps = it.sets && it.sets.length, n = Math.max(1, Math.min(12, it.series ?? 3));
  const sets = ps ? Array.from({ length: n }, (_, k) => tm ? segAlvo(it, k) : (it.sets[k] && it.sets[k].reps) || it.reps || 10) : [];
  return `<div class="irow${ps ? ' ps' : ''}${tm ? ' tm' : ''}${open ? ' open' : ''}" data-sets='${JSON.stringify(sets)}'><div class="itop">${exsel(D, it)}
  <span class="ibtns"><button type="button" class="det" data-idet aria-label="Detalhes do exercício" aria-expanded="${open}" title="Detalhes">${ic('ajustes', 18, 'currentColor', 2.2)}</button><button type="button" data-up aria-label="Subir">${ic('up', 18, 'currentColor', 2.4)}</button><button type="button" data-dn aria-label="Descer">${ic('down', 18, 'currentColor', 2.4)}</button><button type="button" data-rm aria-label="Remover">${ic('close', 18, 'currentColor', 2.4)}</button></span><small class="isum"></small></div>
  <div class="ibody"><label class="ii"><span>Medida</span><select name="un" aria-label="Medida"><option value="kg">Carga (kg)</option><option value="s" ${tm ? 'selected' : ''}>Tempo (segundos)</option></select></label>
  <label class="ii"><span>Séries</span><input name="series" type="number" min="1" max="12" value="${n}" aria-label="Séries"></label><label class="ii rp"><span>Repetições</span><input name="reps" type="number" min="1" max="100" value="${it.reps ?? 10}" aria-label="Repetições"></label>
  <label class="ii"><span class="vl">${tm ? 'Tempo (s)' : 'Carga (kg)'}</span><input name="val" type="number" min="0" step="${tm ? 5 : 0.5}" value="${tm ? it.seg ?? 30 : it.kg ?? 0}" aria-label="Carga ou tempo"></label><label class="ii"><span>Descanso (s)</span><input name="desc" type="number" min="0" step="5" value="${it.descanso ?? 60}" aria-label="Descanso em segundos"></label>
  <div class="ii psw"><span>Cada série</span><button type="button" class="psbtn${ps ? ' on' : ''}" data-ps aria-pressed="${!!ps}">Personalizar séries</button></div>
  <div class="itec${it.tec ? '' : ' off'}${it.tec === 'biset' || it.tec === 'triset' ? ' grp' : ''}"><label class="ii"><span>Técnica avançada</span><select name="tec" aria-label="Técnica avançada"><option value="">Normal</option>${Object.entries(TECNICAS).map(([k, [n]]) => `<option value="${k}" ${it.tec === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
  <label class="ii tecs"><span>Em quais séries</span><select name="tecs" aria-label="Em quais séries"><option value="todas">Todas as séries</option><option value="ultima" ${it.tecSeries === 'ultima' ? 'selected' : ''}>Só na última série</option></select></label>
  <label class="ii tecn"><span>Orientação para o aluno (opcional)</span><input name="tecn" type="text" maxlength="140" value="${esc(it.tecNota || '')}" placeholder="Ex.: 2 reduções de 20% da carga"></label>
  <p class="gnote">Biset junta este exercício com o próximo da lista; triset, com os dois próximos. O aluno descansa só depois do grupo.</p></div></div></div>`; };
const prow = (p = {}) => `<div class="prow"><div class="prh"><label class="ii"><span>Nome do professor</span><input name="pn" list="dlprofs" value="${esc(p.nome || '')}" placeholder="Ex.: Camila" autocomplete="off"></label>
  <button type="button" class="pdel" data-rmprof aria-label="Remover professor">${ic('close', 18, 'currentColor', 2.4)}</button></div>
  <fieldset class="multi"><legend>Dias em que dá aula</legend><div class="checks">${[1, 2, 3, 4, 5, 6, 7].map(n => `<label class="chk day"><input type="checkbox" name="pd" value="${n}" ${(p.dias || []).includes(n) ? 'checked' : ''}><span>${DIAS[n]}</span></label>`).join('')}</div></fieldset>
  <div class="prt"><label class="ii"><span>Início</span><input name="pi" type="time" step="300" value="${esc(fmtHora(p.ini))}"></label><label class="ii"><span>Fim</span><input name="pf" type="time" step="300" value="${esc(fmtHora(p.fim))}"></label></div>
  <label class="ii"><span>Sobre o professor</span><textarea name="ps" rows="3" maxlength="400" placeholder="Formação, experiência, estilo de aula...">${esc(p.sobre || '')}</textarea></label>
  <label class="ii"><span>Foto (link da imagem, opcional)</span><input name="pfoto" type="url" value="${esc(p.foto || '')}" placeholder="https://..."></label></div>`;
function imgResize(file, max = 640) {
  return new Promise((res, rej) => { const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .8)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(Object.assign(new Error('Escolha um arquivo de imagem.'), { user: true })); }; img.src = url; });
}
function bindImgs(form) {
  $$('.imgf', form).forEach(box => { const hid = $('input[type=hidden]', box), pv = $('[data-ip]', box), link = $('[data-ilink]', box), rm = $('[data-irm]', box), fi = $('[data-ifile]', box);
    const paint = () => { pv.style.backgroundImage = hid.value ? `url('${hid.value.replace(/'/g, '%27')}')` : ''; pv.classList.toggle('has', !!hid.value); rm.hidden = !hid.value; };
    $('[data-iup]', box).onclick = () => fi.click();
    fi.onchange = async () => { const f = fi.files[0]; if (!f) return; try { hid.value = await imgResize(f); link.value = ''; paint(); } catch (err) { toast(err.message || 'Não foi possível usar essa imagem.'); } fi.value = ''; };
    link.oninput = () => { hid.value = link.value.trim(); paint(); };
    rm.onclick = () => { hid.value = ''; link.value = ''; paint(); }; paint(); });
}
function bindProfs(form) {
  const box = $('.profs', form); if (!box) return;
  $('[data-addprof]', form).onclick = () => { box.insertAdjacentHTML('beforeend', prow()); const r = box.lastElementChild; r.classList.add('new'); $('[name=pn]', r).focus(); };
  box.onclick = e => { const b = e.target.closest('[data-rmprof]'); if (b) b.closest('.prow').remove(); };
}
function fieldHTML(f, v, D) {
  const cls = `field ${f.full ? 'full' : ''}`;
  if (f.type === 'select') return `<label class="${cls}">${f.l}<select name="${f.k}">${f.blank ? `<option value="">${esc(f.blankL || 'Nenhuma')}</option>` : ''}${f.opts().map(([o, l]) => `<option value="${esc(o)}" ${String(o) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  if (f.type === 'catsel') { const T = catTree(D.categorias), op = (id, l) => `<option value="${esc(id)}" ${id === v ? 'selected' : ''}>${esc(l)}</option>`;
    return `<label class="${cls}">${f.l}<select name="${f.k}"><option value="">Escolha</option>${T.tops.map(t => `<optgroup label="${esc(t.nome)}">${op(t.id, t.nome + ' (geral)')}${T.subs(t.id).map(s => op(s.id, s.nome)).join('')}</optgroup>`).join('')}</select>${T.tops.length ? '' : '<small class="muted">Cadastre as categorias antes, em Categorias.</small>'}</label>`; }
  if (f.type === 'cardio') { const c = v || {}, on = !!c.min;
    return `<div class="field full cardio-f"><span>${f.l}</span><label class="chk"><input type="checkbox" name="cardioOn" ${on ? 'checked' : ''}><span>Este treino tem cardio (o aluno escolhe se faz, não é obrigatório)</span></label>
      <div class="cardio-body" ${on ? '' : 'hidden'}><label class="ii"><span>Tipo</span><select name="cardioTipo">${CARDIOS.map(t => `<option ${t === c.nome ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="ii"><span>Meta (minutos)</span><input name="cardioMin" type="number" min="1" max="240" value="${c.min || 20}"></label></div></div>`; }
  if (f.type === 'profs') return `<div class="field full"><span>${f.l}</span><div class="profs">${(v || []).map(prow).join('')}</div><button type="button" class="btn ghost" data-addprof style="height:44px">+ Adicionar professor</button>
    <datalist id="dlprofs">${(f.names ? f.names() : []).map(n => `<option value="${esc(n)}">`).join('')}</datalist></div>`;
  if (f.type === 'img') { const dado = String(v || '').startsWith('data:'); return `<div class="field full imgf"><span>${f.l}</span><div class="imgf-r"><div class="imgf-p" data-ip ${v ? `style="background-image:url('${esc(v)}')"` : ''}>${v ? '' : ic('cart', 26)}</div>
    <div class="imgf-c"><input type="hidden" name="${f.k}" value="${esc(v)}"><input type="file" accept="image/*" data-ifile hidden>
      <div class="imgf-b"><button type="button" class="btn ghost" data-iup style="height:42px">Enviar imagem</button><button type="button" class="btn link" data-irm style="height:42px" ${v ? '' : 'hidden'}>Remover</button></div>
      <input type="text" data-ilink inputmode="url" placeholder="ou cole o link da imagem (https://...)" value="${dado ? '' : esc(v)}" aria-label="Link da imagem"></div></div></div>`; }
  if (f.type === 'meals') return mealsField(f, v, D);
  if (f.type === 'dcalc') return dcalcField(f, v);
  if (f.type === 'calc') return `<p class="note full calc" data-calc aria-live="polite"></p>`;
  if (f.type === 'hint') return `<p class="muted full" style="font-size:13px;margin:-4px 0 0">${esc(f.txt)}</p>`;
  if (f.type === 'multi') { const o = f.opts(); return `<fieldset class="${cls} multi"><legend>${f.l}</legend>${o.length ? `<div class="checks">${o.map(([id, l]) => `<label class="chk"><input type="checkbox" name="${f.k}" value="${esc(id)}" ${(v || []).includes(id) ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>` : '<p class="muted" style="font-size:13px;margin:0">Nada cadastrado ainda.</p>'}</fieldset>`; }
  if (f.type === 'days') return `<fieldset class="${cls} multi"><legend>${f.l}</legend><div class="checks">${[1, 2, 3, 4, 5, 6, 7].map(n => `<label class="chk day"><input type="checkbox" name="${f.k}" value="${n}" ${(v || []).includes(n) ? 'checked' : ''}><span>${DIAS[n]}</span></label>`).join('')}</div></fieldset>`;
  if (f.type === 'items') return `<div class="field full"><span>${f.l}</span>${D.exercicios.length ? `<div class="items">${(v || []).map(i => irow(D, i)).join('')}</div><button type="button" class="btn ghost" data-add style="height:44px">+ Adicionar exercício</button>` : '<p class="note">Cadastre exercícios antes de montar um treino.</p>'}</div>`;
  if (f.type === 'textarea') return `<label class="${cls}">${f.l}<textarea name="${f.k}" rows="3">${esc(v)}</textarea></label>`;
  if (f.type === 'time') return `<label class="${cls}">${f.l}<input name="${f.k}" type="time" step="300" value="${esc(fmtHora(v))}"></label>`;
  return `<label class="${cls}">${f.l}<input name="${f.k}" type="${f.type === 'pass' || f.type === 'money' ? 'text' : f.type || 'text'}" value="${esc(f.type === 'money' && v ? String(v).replace('.', ',') : v)}" placeholder="${esc(f.ph || '')}" ${f.type === 'pass' ? 'autocomplete="off"' : ''} ${f.type === 'money' ? 'inputmode="decimal"' : ''}></label>`;
}
function collect(form, sc, isNew, D) {
  const out = {};
  for (const f of sc.fields) {
    if ((f.create && !isNew) || f.hide || f.type === 'calc' || f.type === 'hint') continue;
    if (f.type === 'multi') out[f.k] = $$(`[name="${f.k}"]:checked`, form).map(i => i.value);
    else if (f.type === 'days') out[f.k] = $$(`[name="${f.k}"]:checked`, form).map(i => +i.value);
    else if (f.type === 'items') out[f.k] = $$('.irow', form).map((r, n) => {
      const exId = $('[name=ex]', r).value; if (!exId) fail(`Escolha o exercício da linha ${n + 1}.`);
      const tm = $('[name=un]', r).value === 's', val = Math.max(0, +$('[name=val]', r).value || 0);
      const tec = $('[name=tec]', r).value, nota = ($('[name=tecn]', r).value || '').trim().slice(0, 140), grp = tec === 'biset' || tec === 'triset';
      return itemOut(r, { exId, series: Math.max(1, +$('[name=series]', r).value || 1), reps: tm ? 1 : Math.max(1, +$('[name=reps]', r).value || 1), kg: tm ? 0 : val,
        descanso: Math.max(0, +$('[name=desc]', r).value || 0), ...(tm ? { un: 's', seg: Math.max(1, Math.round(val) || 30) } : {}),
        ...(tec && TECNICAS[tec] ? { tec, tecSeries: grp ? 'todas' : $('[name=tecs]', r).value, ...(nota ? { tecNota: nota } : {}) } : {}) });
    });
    else if (f.type === 'meals') out[f.k] = D.alimentos.length ? collectMeals(form) : [];
    else if (f.type === 'dcalc') out[f.k] = collectPerfil(form);
    else if (f.type === 'cardio') out[f.k] = form.elements.cardioOn && form.elements.cardioOn.checked ? { nome: form.elements.cardioTipo.value, min: Math.max(1, Math.min(240, Math.round(+form.elements.cardioMin.value) || 20)) } : null;
    else if (f.type === 'profs') out[f.k] = $$('.prow', form).map(r => { const nome = $('[name=pn]', r).value.trim(), sobre = $('[name=ps]', r).value.trim().slice(0, 400), dias = $$('[name=pd]:checked', r).map(i => +i.value);
      if (!nome && (sobre || dias.length)) fail('Informe o nome do professor que você começou a preencher.');
      return { nome, sobre, dias, ini: $('[name=pi]', r).value, fim: $('[name=pf]', r).value, foto: $('[name=pfoto]', r).value.trim() }; }).filter(x => x.nome);
    else out[f.k] = (form.elements[f.k].value || '').trim();
    const v = out[f.k], empty = Array.isArray(v) ? !v.length : !v;
    if (f.req && empty) fail(f.type === 'items' ? 'Adicione pelo menos um exercício.' : f.type === 'days' ? 'Escolha pelo menos um dia.' : `Preencha: ${f.l.toLowerCase()}.`);
    if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail('Digite um e-mail válido.');
    if (f.type === 'pass' && v.length < 6) fail('A senha provisória precisa ter pelo menos 6 caracteres.');
    if (f.type === 'money') { const n = v === '' ? 0 : parseMoney(v); if (!(n >= 0) || !isFinite(n)) fail('Digite um valor válido, como 89,90.'); out[f.k] = Math.round(n * 100) / 100; }
    else if (f.num) out[f.k] = Number(v) || 0;
  }
  return out;
}
const picker = sel => { sel.focus(); try { sel.showPicker && sel.showPicker(); } catch {} };   // já abre a próxima lista
/* modal rápido para personalizar cada série */
function openSeries(r) {
  const tm = r.classList.contains('tm'), nome = ($('[name=ex]', r).selectedOptions[0] || {}).textContent || 'exercício', kg = +$('[name=val]', r).value || 0;
  if (!r.classList.contains('ps')) fitSets(r, true); else fitSets(r);
  const vs = getSets(r);
  const m = openModal({ title: 'Personalizar séries', submit: 'Aplicar',
    foot: r.classList.contains('ps') ? '<button type="button" class="btn ghost" data-same>Mesmo valor em todas</button>' : '',
    html: `<p class="muted" style="margin:-6px 0 2px;font-size:14px">${esc($('[name=ex]', r).value ? nome : 'Exercício ainda não escolhido')} · ${vs.length} ${vs.length === 1 ? 'série' : 'séries'}${tm ? '' : ` · carga de referência ${refKg(kg)}`}</p>
      <div class="psm"><div class="psh"><span>Série</span><span>${tm ? 'Tempo (segundos)' : 'Repetições'}</span></div>${vs.map((v, k) => `<label class="psr"><b>${k + 1}ª</b><input type="number" inputmode="numeric" min="1" max="${tm ? 3600 : 100}" value="${v}" aria-label="${tm ? 'Segundos' : 'Repetições'} da ${k + 1}ª série"></label>`).join('')}</div>
      <p class="muted" style="margin:0;font-size:12px">Para mudar a quantidade de séries, altere o campo Séries do exercício.</p>`,
    onSubmit: async f => { const nv = $$('.psr input', f).map(i => Math.round(+i.value)); if (nv.some(v => !(v >= 1))) fail('Preencha todas as séries com um número maior que zero.');
      r.dataset.sets = JSON.stringify(nv); r.classList.add('ps'); psPaint(r); $('.isum', r).textContent = isum(r); } });
  const b = $('[data-same]', m.form);
  if (b) b.onclick = () => { r.classList.remove('ps'); r.dataset.sets = '[]'; psPaint(r); $('.isum', r).textContent = isum(r); m.close(); toast('Todas as séries com o mesmo valor.'); };
}
function bindItems(form, D) {
  const box = $('.items', form); if (!box) return;
  const T = catTree(D.categorias);
  if (!$('.irow', box)) box.insertAdjacentHTML('beforeend', irow(D, {}, true));
  const sum = r => { $('.isum', r).textContent = isum(r); };
  const tog = (r, on) => { on = r.classList.toggle('open', on); $('[data-idet]', r).setAttribute('aria-expanded', on);
    if (on) $$('.irow.open', box).forEach(x => { if (x !== r) { x.classList.remove('open'); $('[data-idet]', x).setAttribute('aria-expanded', false); sum(x); } }); if (!on) sum(r); };
  $$('.irow', box).forEach(r => { sum(r); psPaint(r); });
  $('[data-add]', form).onclick = () => { box.insertAdjacentHTML('beforeend', irow(D, {})); const r = box.lastElementChild; r.classList.add('new'); sum(r); psPaint(r); tog(r, true); $('[name=cat]', r).focus(); };
  box.onchange = e => { const r = e.target.closest('.irow'); if (!r) return; const cat = $('[name=cat]', r).value, ex = $('[name=ex]', r), sb = $('[name=sub]', r);
    if (e.target.name === 'cat') { const hasSub = !!cat && T.subs(cat).length > 0;
      sb.innerHTML = subOpts(T, cat, ''); sb.disabled = !hasSub; ex.disabled = !cat; ex.innerHTML = exOpts(D, T, cat, '', '');
      if (cat) picker(hasSub ? sb : ex); }
    else if (e.target.name === 'sub') { ex.innerHTML = exOpts(D, T, cat, e.target.value, ''); picker(ex); }
    else if (e.target.name === 'tec') { const t = e.target.value, bx = $('.itec', r); bx.classList.toggle('off', !t); bx.classList.toggle('grp', t === 'biset' || t === 'triset'); }
    else if (e.target.name === 'un') { const tm = e.target.value === 's', v = $('[name=val]', r);
      r.classList.toggle('tm', tm); $('.vl', r).textContent = tm ? 'Tempo (s)' : 'Carga (kg)'; v.value = tm ? 30 : 0; v.step = tm ? 5 : 0.5; if (r.classList.contains('ps')) { fitSets(r, true); psPaint(r); } } };
  box.addEventListener('change', e => { const r = e.target.closest('.irow'); if (r) sum(r); });
  box.oninput = e => { const r = e.target.closest('.irow'); if (!r) return; if (r.classList.contains('ps') && e.target.name === 'series') { fitSets(r); psPaint(r); } sum(r); };
  box.onclick = e => { const r = e.target.closest('.irow'); if (!r) return;
    if (e.target.closest('[data-ps]')) return openSeries(r);
    if (e.target.closest('[data-rm]')) { r.remove(); return; }
    if (e.target.closest('[data-up]')) { if (r.previousElementSibling) box.insertBefore(r, r.previousElementSibling); return; }
    if (e.target.closest('[data-dn]')) { if (r.nextElementSibling) box.insertBefore(r.nextElementSibling, r); return; }
    if (e.target.closest('[data-idet]')) tog(r); };
}

function showCreds(email, pass, nome) {
  const m = openModal({ title: 'Acesso criado', html: `<p style="font:400 15px/1.5 var(--b);margin:0 0 12px">Passe estes dados para <b>${esc(nome)}</b>. A pessoa entra em <b>${esc(location.origin)}</b> e toca em Área do aluno.</p>
    <div class="creds"><div><small>E-mail</small><b>${esc(email)}</b></div><div><small>Senha provisória</small><b>${esc(pass)}</b></div></div>`,
    foot: '<button type="button" class="btn dark" data-copy>Copiar dados</button><button type="button" class="btn ghost" data-mail>E-mail para definir senha</button>' });
  $('[data-copy]', m.form).onclick = () => { navigator.clipboard && navigator.clipboard.writeText(`Garrote Academia\nEndereço: ${location.origin}/login\nE-mail: ${email}\nSenha provisória: ${pass}`); toast('Dados copiados.'); };
  $('[data-mail]', m.form).onclick = async () => { try { await api.reset(email); toast(mode === 'demo' ? 'No modo demonstração nenhum e-mail é enviado.' : `E-mail enviado para ${email}.`); } catch (e) { toast('Não foi possível enviar o e-mail.'); } };
}
async function saveRow(sc, data, row, E) {
  if (sc.user) {
    if (row) { const p = { nome: data.nome, telefone: data.telefone || '', ativo: data.ativo || 'sim' }; if (sc.externo) { p.mensalidade = data.mensalidade || 0; p.vencimento = data.vencimento || ''; } if (sc.user === 'aluno') { p.modalidades = data.modalidades || []; if (!E.tid) { p.treinadorId = data.treinadorId; p.planoId = data.planoId || ''; p.familiaId = data.familiaId || ''; p.vencimento = data.vencimento || ''; } } return api.update('users', row.id, p); }
    const email = data.email.toLowerCase(), uid = await api.createAccount(email, data.senha);
    const p = { nome: data.nome, email, telefone: data.telefone || '', role: sc.user, ativo: data.ativo || 'sim', criadoPor: SESSION.user.uid, criadoEm: Date.now() };
    if (sc.externo) { p.externo = true; p.mensalidade = data.mensalidade || 0; p.vencimento = data.vencimento || ''; }
    if (sc.user === 'aluno') { p.treinadorId = E.tid || data.treinadorId; p.modalidades = data.modalidades || []; if (!E.tid) { p.planoId = data.planoId || ''; p.familiaId = data.familiaId || ''; p.vencimento = data.vencimento || ''; } }
    await api.set('users', uid, p); setTimeout(() => showCreds(email, data.senha, data.nome), 280); return;
  }
  if (sc.check) sc.check(data, row);
  if (sc.before) data = sc.before(data);
  if (row) return api.update(sc.col, row.id, data);
  await api.add(sc.col, { ...data, criadoPor: E.tid || SESSION.user.uid, criadoEm: Date.now() });
}
function openForm(sc, D, E, row, done) {
  const isNew = !row, fs = sc.fields.filter(f => !(f.create && !isNew) && !f.hide);
  const html = `<div class="form">${fs.map(f => fieldHTML(f, row ? (f.get ? f.get(row) : row[f.k]) : f.def ? f.def() : f.type === 'items' || f.type === 'meals' || f.type === 'multi' || f.type === 'days' ? [] : '', D)).join('')}</div>`;
  const m = openModal({ title: `${isNew ? (/a$/.test(sc.one) ? 'Nova' : 'Novo') : 'Editar'} ${sc.one}`, html, wide: !!sc.wide, submit: isNew ? 'Criar' : 'Salvar',
    onSubmit: async form => { const data = collect(form, sc, isNew, D); await saveRow(sc, data, row, E); await Promise.race([done(), new Promise(r => setTimeout(r, 8000))]); toast(isNew ? 'Cadastro criado.' : 'Alterações salvas.'); } });
  bindItems(m.form, D); bindProfs(m.form); bindImgs(m.form); bindMeals(m.form, D);
  { const co = $('[name=cardioOn]', m.form); if (co) co.onchange = () => { $('.cardio-body', m.form).hidden = !co.checked; }; }
  if (sc.calc) { const out = $('[data-calc]', m.form), upd = () => { out.textContent = sc.calc(m.form); }; m.form.addEventListener('input', upd); m.form.addEventListener('change', upd); upd(); }
}
const cap = s => s[0].toUpperCase() + s.slice(1);

/* ---------- telas ---------- */
const personRow = (name, sub, tag, tcls = '') => `<div class="person"><span class="av">${esc(initials(name))}</span><div class="nm"><b>${esc(name)}</b><small>${esc(sub)}</small></div>${tag ? `<span class="rl ${tcls}">${esc(tag)}</span>` : ''}</div>`;
function visaoHTML(D, E) {
  const als = D.users.filter(u => u.role === 'aluno' && (!E.tid || u.treinadorId === E.tid)), ids = new Set(als.map(a => a.id));
  const ck = D.checkins.filter(c => !E.tid || ids.has(c.uid)).sort((a, b) => b.ts - a.ts), user = id => D.users.find(u => u.id === id) || { nome: 'Aluno' };
  const hoje = dkey(new Date()), ag = D.agend.filter(a => (!E.tid || ids.has(a.uid)) && (a.slotKey || '') >= hoje).sort((a, b) => (a.slotKey || '').localeCompare(b.slotKey || ''));
  const passadas = D.agend.filter(a => (!E.tid || ids.has(a.uid)) && (a.slotKey || '') < hoje).length;
  const kpi = (l, n, s) => `<div class="card"><small>${l}</small><b data-n="${n}">0</b><em>${s}</em></div>`;
  const treinos = D.treinos.filter(t => !E.tid || t.criadoPor === E.tid).length;
  return `<div class="head"><div><h1 class="h1">Visão geral</h1><p class="muted" style="margin-top:4px;font-size:14px">${E.tid ? 'Seus alunos e treinos' : 'A academia hoje'}</p></div></div>
  ${E.tid ? '' : dashHTML(D, finCalc(D))}
  <div class="kpis"${E.tid ? '' : ' hidden'}>${kpi('Alunos', als.length, 'cadastrados')}${E.tid ? kpi('Exercícios', D.exercicios.length, 'na biblioteca') : kpi('Treinadores', D.users.filter(u => u.role === 'treinador').length, 'com acesso')}${kpi('Treinos', treinos, 'montados')}${kpi('Check-ins hoje', ck.length, 'alunos presentes')}</div>
  <div class="two"><section class="card"><h2 class="h2" style="margin-bottom:8px">Check-ins de hoje</h2>${ck.length ? ck.map(c => personRow(user(c.uid).nome, 'às ' + new Date(c.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), '', '')).join('') : '<p class="empty">Ninguém fez check-in ainda hoje.</p>'}</section>
  <section class="card"><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px;gap:10px"><h2 class="h2">Aulas experimentais agendadas</h2><button type="button" class="lnk" id="hexp">Histórico${passadas ? ` (${passadas})` : ''}</button></div>${ag.length ? ag.map(a => personRow(user(a.uid).nome, expSub(D, a), a.slotKey === hoje ? 'Hoje' : 'Experimental', a.slotKey === hoje ? 'hj' : '')).join('') : '<p class="empty">Nenhuma aula experimental agendada.</p>'}</section></div>`;
}
const expSub = (D, a) => `${(D.modalidades.find(m => m.id === a.modId) || {}).nome || 'Modalidade'} · ${ptDate(a.slotKey).slice(0, 5)} às ${fmtHora(a.hora)}`;
/* histórico: todas as aulas experimentais que já passaram (as futuras ficam na visão geral) */
function openExpHist(D, E) {
  const ids = new Set(D.users.filter(u => u.role === 'aluno' && (!E.tid || u.treinadorId === E.tid)).map(a => a.id)), hoje = dkey(new Date());
  const l = D.agend.filter(a => (!E.tid || ids.has(a.uid)) && (a.slotKey || '') < hoje).sort((a, b) => (b.slotKey || '').localeCompare(a.slotKey || ''));
  const nome = id => (D.users.find(u => u.id === id) || { nome: 'Aluno removido' }).nome;
  openModal({ title: 'Histórico de aulas experimentais', html: l.length ? `<p class="muted" style="margin:0 0 4px;font-size:13px">${l.length === 1 ? '1 aula que já aconteceu' : l.length + ' aulas que já aconteceram'}</p><div class="hist">${l.map(a => personRow(nome(a.uid), `${(D.modalidades.find(m => m.id === a.modId) || {}).nome || 'Modalidade'} · ${ptDate(a.slotKey)} às ${fmtHora(a.hora)}`, 'Feita', 't')).join('')}</div>` : '<p class="empty">Nenhuma aula experimental no histórico ainda.</p>' });
}
/* ---------- paginação: 5 itens por página no celular, 10 no computador ---------- */
const pageSize = () => matchMedia('(max-width:700px)').matches ? 5 : 10;
const pagerHTML = (page, pages) => pages <= 1 ? '' : `<div class="pager"><button type="button" class="btn ghost pg-prev" data-pg="prev" ${page === 1 ? 'hidden' : ''}>‹ Anterior</button><button type="button" class="btn dark pg-next" data-pg="next">${page < pages ? 'Próxima página' : 'Voltar à primeira página'} - ${page}/${pages}</button></div>`;
function pager(el, getTotal, paint) {
  let page = 1, pages = 1;
  const box = $('#pager', el);
  const render = (keep = true) => {
    if (!keep) page = 1;
    pages = Math.max(1, Math.ceil(getTotal() / pageSize())); page = Math.min(page, pages);
    paint(page);
    box.innerHTML = pagerHTML(page, pages);
  };
  box.onclick = e => {
    const b = e.target.closest('[data-pg]'); if (!b) return;
    page = b.dataset.pg === 'prev' ? Math.max(1, page - 1) : page < pages ? page + 1 : 1;
    render();
    const h = $('.main .head', el); h && h.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  };
  return render;
}
const scDe = (sc, row) => sc.sub && row && sc.tree.isSub(row) ? { ...sc, ...sc.sub } : sc;   // subcategoria tem formulário próprio
const nomeCell = (sc, r, sub, aberto) => !sc.tree ? esc(sc.cols[0][1](r)) : sub ? `<span class="cnm sub">↳ ${esc(r.nome)}</span>`
  : `<button type="button" class="cnm" data-xp aria-expanded="${!!aberto}" ${sc.tree.subs(r.id).length ? '' : 'disabled'}>${sc.tree.subs(r.id).length ? ic('chev', 16, 'currentColor', 2.4, 'cxp') : '<i class="cxp0"></i>'}${esc(r.nome)}${sc.tree.subs(r.id).length ? `<small>${sc.tree.subs(r.id).length}</small>` : ''}</button>`;
const rowHTML = (sc, r, sub = false, aberto = false) => `<tr data-id="${esc(r.id)}" class="${sub ? 'subr' : aberto ? 'aberta' : ''}">${sc.cols.map((c, i) => `<td>${i ? esc(c[1](r)) : nomeCell(sc, r, sub, aberto)}</td>`).join('')}<td class="act"><button class="det" data-det>Detalhes</button>${sc.pay ? '<button data-xpay>Mensalidade</button>' : ''}<button data-edit>Editar</button><button data-del>Excluir</button></td></tr>`;
/* busca avançada dos alimentos: grupo, tipo (massas, frango…), preparo (grelhado, frito…) e faixas de calorias/carboidratos/proteínas/gorduras */
const TIPOS = [['Massas', /macarr|lasanha|nhoque|massa|pizza|pastel/], ['Pães e bolos', /\bpao\b|\bbolo\b|biscoito|torrada/], ['Arroz', /arroz/], ['Feijões', /feij/], ['Frango', /frango|galinha, (coxa|peito|sobrecoxa)/], ['Carne bovina', /bovin|\bbife\b|carne, (boi|bovina)/], ['Porco', /porco|suino|bacon|lingui/], ['Peixes', /peixe|atum|sardinha|tilapia|salmao|merluza|pescada|bacalhau/], ['Leite e queijos', /leite|queijo|iogurte|requeij|ricota/], ['Ovos', /\bovo/], ['Doces', /doce|chocolate|sorvete|acucar|mel\b|goiabada|geleia/]];
const PREPAROS = [['Cru', /\bcr[ua]s?\b/], ['Cozido', /cozid|fervid/], ['Grelhado', /grelhad/], ['Frito', /\bfrit/], ['Assado', /assad/], ['Refogado', /refogad/], ['Ensopado', /ensopad|guisad/]];
const MACROS = [['kcal', 'Calorias', 'kcal'], ['carb', 'Carboidratos', 'g'], ['prot', 'Proteínas', 'g'], ['gord', 'Gorduras', 'g']];
const ORDENS = [['', 'Nome (A–Z)'], ['prot-', 'Mais proteína'], ['carb-', 'Mais carboidrato'], ['gord-', 'Mais gordura'], ['kcal-', 'Mais calorias'], ['carb+', 'Menos carboidrato'], ['gord+', 'Menos gordura'], ['kcal+', 'Menos calorias']];
const nA = r => sa(r.nome);
function alimPanel(rows) {
  const chips = (attr, lista, test) => lista.map(([n, re]) => { const c = rows.filter(r => re.test(nA(r))).length; return c ? `<button type="button" class="catb" data-${attr}="${esc(n)}">${esc(n)}<span>${c}</span></button>` : ''; }).join('');
  const grupos = [...new Set(rows.map(r => r.grupo || 'Outros'))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(g => `<button type="button" class="catb" data-g="${esc(g)}">${esc(g)}<span>${rows.filter(r => (r.grupo || 'Outros') === g).length}</span></button>`).join('');
  return `<section class="card advp" id="advp" hidden>
    <small class="advt">Grupo</small><div class="catgrid" role="group" aria-label="Filtrar por grupo">${grupos}</div>
    <small class="advt">Tipo de alimento</small><div class="catgrid" role="group" aria-label="Filtrar por tipo">${chips('t', TIPOS)}</div>
    <small class="advt">Preparo</small><div class="catgrid" role="group" aria-label="Filtrar por preparo">${chips('p', PREPAROS)}</div>
    <small class="advt">Nutrientes (valores por porção cadastrada, mín. e máx.)</small>
    <div class="mfil">${MACROS.map(([k, l, u]) => `<div class="mf"><span>${l} (${u})</span><div><input type="number" min="0" step="any" inputmode="decimal" placeholder="mín" data-m="${k}" data-b="min" aria-label="${l} mínimo"><input type="number" min="0" step="any" inputmode="decimal" placeholder="máx" data-m="${k}" data-b="max" aria-label="${l} máximo"></div></div>`).join('')}</div>
    <div class="mfil2"><label class="field">Ordenar por<select id="ord">${ORDENS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label><button type="button" class="btn dark" id="advclr" style="width:auto;height:46px;padding:0 20px;border-radius:14px;font-size:14px">Limpar filtros</button></div></section>`;
}
function tableHTML(sc, D, E) {
  const rows = sc.rows;
  const head = `<div class="head"><div><h1 class="h1">${sc.title}</h1><p class="muted" style="margin-top:4px;font-size:14px">${rows.length} ${rows.length === 1 ? 'cadastro' : 'cadastros'}</p></div>
    <div class="tools"><input id="q" type="search" placeholder="Buscar" aria-label="Buscar">${(sc.catFilter && catTree(D.categorias).tops.length) || (sc.groupFilter && rows.length) ? `<button type="button" class="advb" id="advb" aria-expanded="false" aria-controls="advp">${ic('sliders', 18)}<span>Busca avançada</span><em></em></button>` : ''}<button class="btn red" id="new" style="width:auto;height:46px;padding:0 22px;border-radius:14px;font-size:14px">+ ${/a$/.test(sc.one) ? 'Nova' : 'Novo'} ${sc.one}</button>${sc.newSub ? '<button class="btn dark" id="newsub" style="width:auto;height:46px;padding:0 22px;border-radius:14px;font-size:14px">+ Nova subcategoria</button>' : ''}${sc.imp ? '<button class="btn dark" id="imp" style="width:auto;height:46px;padding:0 22px;border-radius:14px;font-size:14px">Importar lista padrão</button>' : ''}</div></div>`;
  if (!rows.length) return head + `<section class="card"><p class="empty">Nenhum cadastro ainda. Clique em “+ ${/a$/.test(sc.one) ? 'Nova' : 'Novo'} ${sc.one}” para começar.</p></section>`;
  const T = catTree(D.categorias), cnt = id => rows.filter(r => T.top(r.categoriaId) === id).length;
  const filt = sc.groupFilter ? alimPanel(rows) : sc.catFilter && T.tops.length ? `<section class="card advp" id="advp" hidden><small class="advt">Categoria</small><div class="catgrid" role="group" aria-label="Filtrar por categoria">${T.tops.map(c => `<button type="button" class="catb" data-c="${esc(c.id)}">${esc(c.nome)}<span>${cnt(c.id)}</span></button>`).join('')}</div>
    <label class="field subsel" hidden>Subcategoria<select id="ssel"></select></label></section>` : '';
  return head + filt + `<section class="card tblcard"><table class="tbl"><thead><tr>${sc.cols.map(c => `<th>${c[0]}</th>`).join('')}<th></th></tr></thead><tbody>
    ${rows.slice(0, pageSize()).map(r => rowHTML(sc, r)).join('')}</tbody></table></section><div id="pager">${pagerHTML(1, Math.ceil(rows.length / pageSize()))}</div>`;
}
/* celular: a lista mostra só o nome e um botão "Detalhes" que abre um modal com tudo */
const detHTML = items => `<div class="det-list">${items.map(([l, v]) => `<div class="det-i"><small>${esc(l)}</small><b>${esc(v)}</b></div>`).join('')}</div>`;
function openDet(sc, D, E, row, repaint) {
  const items = [...sc.cols.map(c => [c[0], c[1](row)]), ...(sc.extra ? sc.extra(row) : [])];
  const m = openModal({ title: row.nome || 'Detalhes', html: detHTML(items), foot: `${sc.pay ? '<button type="button" class="btn dark" data-xpay>Mensalidade</button>' : ''}<button type="button" class="btn ${sc.pay ? 'ghost' : 'dark'}" data-edit>Editar</button><button type="button" class="btn ghost del" data-del>Excluir</button>` });
  const xp = $('[data-xpay]', m.form); if (xp) xp.onclick = () => { m.close(); openExt(row, D, repaint); };
  $('[data-edit]', m.form).onclick = () => { m.close(); openForm(scDe(sc, row), D, E, row, repaint); };
  $('[data-del]', m.form).onclick = () => { m.close(); delRow(sc, row, repaint); };
}
async function delRow(sc, row, repaint) {
  const msg = (sc.delMsg && sc.delMsg(row)) || (sc.user ? `Remover o acesso de ${row.nome}? A pessoa deixa de entrar no app.` : `Excluir “${row.nome}”? Esta ação não pode ser desfeita.`);
  if (!(await confirmBox(msg))) return;
  try { await api.del(sc.col, row.id); toast('Removido.'); await repaint(); } catch (err) { toast('Não foi possível remover.'); console.error(err); }
}
const parseMoney = s => { s = String(s).replace(/[^\d,.-]/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); return parseFloat(s); };
function finCalc(D) {
  const als = D.users.filter(u => u.role === 'aluno'), pl = id => (D.planos || []).find(p => p.id === id);
  const gkey = a => { const p = pl(a.planoId); return p && p.familia === 'sim' && a.familiaId ? p.id + '|' + a.familiaId.trim().toLowerCase() : null; };
  const size = {}; als.filter(a => a.ativo !== 'nao').forEach(a => { const k = gkey(a); if (k) size[k] = (size[k] || 0) + 1; });
  const rows = als.map(a => { const p = pl(a.planoId), k = gkey(a), n = k ? size[k] || 1 : 1, [st, stl] = situ(a, p);
    return { a, p, st, stl, n, fam: !!(p && p.familia === 'sim'), share: a.ativo === 'nao' || !p ? 0 : mensalDe(p) / n }; });
  return { rows, receita: rows.reduce((t, r) => t + r.share, 0) };
}
const finRow = (r, fotos) => `<tr data-id="${esc(r.a.id)}" data-s="${r.st}"><td><div class="pcell">${avatar({ nome: r.a.nome, foto: fotos[r.a.id] }, 38)}<div><b>${esc(r.a.nome)}</b><small>${esc(r.a.email || '')}</small></div></div></td>
    <td>${r.p ? esc(r.p.nome) : '—'}${r.p ? `<small class="sub">${r.p.categoria === 'totalpass' ? 'Via Total Pass' : perLabel(r.p.periodo)} · ${r.fam ? 'Família' + (r.a.familiaId ? ` · ${esc(r.a.familiaId)} (${r.n})` : '') : 'Individual'}</small>` : ''}</td>
    <td>${brl(r.share)}</td><td class="keep"><span class="st-chip ${r.st}">${r.stl}</span></td><td>${r.p && r.p.categoria === 'totalpass' ? '—' : ptDate(r.a.vencimento)}</td>
    <td class="act"><button class="det" data-det>Detalhes</button><button data-pay>Pagamento</button><button data-plan>Plano</button><button data-hist>Histórico</button></td></tr>`;
function finHTML(D) {
  const C = finCalc(D), fotos = Object.fromEntries((D.fotos || []).map(f => [f.id, f.data])), mes = dkey(new Date()).slice(0, 7);
  const recebido = (D.pagamentos || []).filter(p => (p.data || '').startsWith(mes)).reduce((t, p) => t + (p.valor || 0), 0), cnt = k => C.rows.filter(r => r.st === k).length;
  const kpi = (l, v, s) => `<div class="card"><small>${l}</small><b>${v}</b><em>${s}</em></div>`;
  const rows = C.rows.slice(0, pageSize()).map(r => finRow(r, fotos)).join('');
  return `<div class="head"><div><h1 class="h1">Financeiro</h1><p class="muted" style="margin-top:4px;font-size:14px">Planos, pagamentos e situação de cada aluno</p></div>
    <div class="tools"><input id="q" type="search" placeholder="Buscar aluno" aria-label="Buscar"><a class="btn dark" href="#/painel/planos" style="width:auto;height:46px;padding:0 20px;border-radius:14px;font-size:14px">Gerenciar planos</a></div></div>
  <div class="kpis money">${kpi('Receita mensal prevista', brl(C.receita), 'planos ativos por mês')}${kpi('Recebido no mês', brl(recebido), 'pagamentos registrados')}${kpi('Em atraso', cnt('atrasado'), 'alunos com vencimento vencido')}${kpi('Sem plano', cnt('semplano'), 'defina um plano para cobrar')}</div>
  <div class="chips" id="fchips">${[['todos', 'Todos'], ['emdia', 'Em dia'], ['atrasado', 'Em atraso'], ['pendente', 'Pendente'], ['semplano', 'Sem plano'], ['totalpass', 'Total Pass']].map(([k, l], i) => `<button class="chip ${i ? '' : 'on'}" data-fs="${k}">${l}</button>`).join('')}</div>
  <section class="card tblcard">${C.rows.length ? `<table class="tbl"><thead><tr><th>Aluno</th><th>Plano</th><th>Valor/mês</th><th>Situação</th><th>Vencimento</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="empty">Nenhum aluno cadastrado ainda.</p>'}</section><div id="pager">${pagerHTML(1, Math.ceil(C.rows.length / pageSize()))}</div>`;
}
function openFinDet(a, D, repaint) {
  const r = finCalc(D).rows.find(x => x.a.id === a.id); if (!r) return;
  const items = [['Aluno', a.nome], ['E-mail', a.email || '—'], ['Telefone', a.telefone || '—'], ['Plano', r.p ? r.p.nome : '—'],
    ['Cobrança', r.p ? (r.p.categoria === 'totalpass' ? 'Via Total Pass' : perLabel(r.p.periodo)) : '—'], ['Tipo', r.p ? (r.fam ? 'Família' + (a.familiaId ? ` · ${a.familiaId} (${r.n} pessoas)` : '') : 'Individual') : '—'],
    ['Valor por mês', brl(r.share)], ['Situação', r.stl], ['Vencimento', r.p && r.p.categoria === 'totalpass' ? '—' : ptDate(a.vencimento)]];
  const m = openModal({ title: a.nome, html: detHTML(items), foot: '<button type="button" class="btn dark" data-pay>Pagamento</button><button type="button" class="btn ghost" data-plan>Plano</button><button type="button" class="btn ghost" data-hist>Histórico</button>' });
  $('[data-pay]', m.form).onclick = () => { m.close(); openPay(a, D, repaint); };
  $('[data-plan]', m.form).onclick = () => { m.close(); openPlano(a, D, repaint); };
  $('[data-hist]', m.form).onclick = () => { m.close(); openHist(a, D); };
}
function openPlano(a, D, done) {
  const opts = ['<option value="">Sem plano</option>', ...D.planos.map(p => `<option value="${esc(p.id)}" ${p.id === a.planoId ? 'selected' : ''}>${esc(p.nome)} · ${brl(precoFinal(p))} (${p.categoria === 'totalpass' ? 'Total Pass' : perLabel(p.periodo) + (nParc(p) > 1 ? ', ' + parcTxt(p) : '')})</option>`)].join('');
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
  openModal({ title: `Registrar pagamento`, submit: 'Registrar', html: `<p style="font:400 14px/1.5 var(--b);margin:0 0 12px"><b>${esc(a.nome)}</b> · ${esc(p.nome)} (${perLabel(p.periodo)})<br><span class="muted">${esc(precoTxt(p))}</span>${group.length > 1 ? `<br>Vale para a família toda: ${group.map(g => esc(firstName(g.nome))).join(', ')}.` : ''}</p>
    <div class="form"><label class="field">Valor pago (R$)<input name="valor" value="${String(precoFinal(p)).replace('.', ',')}" inputmode="decimal"></label><label class="field">Data<input name="data" type="date" value="${dkey(new Date())}"></label>
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
/* treinador externo: situação da mensalidade, histórico e registro de pagamento */
function openExt(t, D, repaint) {
  const [stc, stl] = situExt(t);
  const m = openModal({ title: `Mensalidade de ${firstName(t.nome)}`, html: `<p style="font:400 14px/1.5 var(--b);margin:0 0 10px"><b>${esc(t.nome)}</b> usa o app como os treinadores da casa e paga <b>${brl(+t.mensalidade || 0)}</b> por mês à academia.<br>
      <span class="st-chip ${stc}">${stl}</span> <span class="muted">Vencimento: ${ptDate(t.vencimento)}</span></p><div class="hist" id="xh"><p class="muted" style="font-size:13px">Carregando pagamentos...</p></div>`,
    foot: '<button type="button" class="btn dark" data-xnew>Registrar pagamento</button>' });
  api.list('pagamentos', [['treinadorId', '==', t.id]], { fresh: true }).then(l => { const box = $('#xh', m.form); if (!box) return;
    l = l.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    box.innerHTML = l.length ? l.map(p => `<div class="person"><div class="nm"><b>${brl(p.valor)}</b><small>${ptDate(p.data)} · ${esc(p.forma || '')}</small></div><span class="rl">Mensal</span></div>`).join('') : '<p class="empty">Nenhum pagamento registrado ainda.</p>'; })
    .catch(() => { const box = $('#xh', m.form); if (box) box.innerHTML = '<p class="empty">Não foi possível carregar os pagamentos.</p>'; });
  $('[data-xnew]', m.form).onclick = () => { m.close(); openPayExt(t, repaint); };
}
function openPayExt(t, done) {
  openModal({ title: 'Registrar mensalidade', submit: 'Registrar', html: `<p style="font:400 14px/1.5 var(--b);margin:0 0 12px"><b>${esc(t.nome)}</b> · treinador externo</p>
    <div class="form"><label class="field">Valor pago (R$)<input name="valor" value="${String(+t.mensalidade || '').replace('.', ',')}" inputmode="decimal"></label><label class="field">Data<input name="data" type="date" value="${dkey(new Date())}"></label>
    <label class="field full">Forma de pagamento<select name="forma"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Boleto</option><option>Outro</option></select></label></div>`,
    onSubmit: async f => {
      const valor = parseMoney(f.valor.value), data = f.data.value;
      if (!(valor > 0) || !isFinite(valor)) fail('Digite um valor válido.'); if (!data) fail('Informe a data do pagamento.');
      const base = t.vencimento && t.vencimento >= data ? t.vencimento : data, venc = addMonths(base, 1);
      await api.add('pagamentos', { alunoIds: [], treinadorId: t.id, tipo: 'treinador', planoId: '', valor: Math.round(valor * 100) / 100, data, meses: 1, forma: f.forma.value, registradoPor: SESSION.user.uid });
      await api.update('users', t.id, { vencimento: venc, ultimoPagamento: data });
      await done(); toast(`Mensalidade registrada. Próximo vencimento: ${ptDate(venc)}.`);
    } });
}
function bindFin(el, D, repaint) {
  let fs = 'todos', term = '', fotos = {};
  const C = finCalc(D), tb = $('tbody', el);
  const hay = new Map(C.rows.map(r => [r.a.id, [r.a.nome, r.a.email, r.p && r.p.nome, r.stl, r.a.familiaId].join(' ').toLowerCase()]));
  let list = C.rows;
  const render = tb ? pager(el, () => list.length, page => {
    tb.innerHTML = list.slice((page - 1) * pageSize(), page * pageSize()).map(r => finRow(r, fotos)).join('') || '<tr><td colspan="6" class="empty">Nenhum aluno encontrado.</td></tr>';
  }) : () => {};
  const apply = () => { list = C.rows.filter(r => (fs === 'todos' || r.st === fs) && hay.get(r.a.id).includes(term)); render(false); };
  api.list('fotos').then(fl => { fotos = Object.fromEntries(fl.map(f => [f.id, f.data])); render(); }).catch(() => {});   // fotos chegam depois, sem atrasar a tela
  $('#q', el).oninput = e => { term = e.target.value.trim().toLowerCase(); apply(); };
  $('#fchips', el).onclick = e => { const b = e.target.closest('[data-fs]'); if (!b) return; fs = b.dataset.fs; $$('#fchips .chip', el).forEach(c => c.classList.toggle('on', c === b)); apply(); };
  if (!tb) return;
  tb.onclick = e => { const tr = e.target.closest('tr'), a = tr && D.users.find(u => u.id === tr.dataset.id); if (!a) return;
    if (e.target.closest('[data-det]')) openFinDet(a, D, repaint); else if (e.target.closest('[data-pay]')) openPay(a, D, repaint); else if (e.target.closest('[data-plan]')) openPlano(a, D, repaint); else if (e.target.closest('[data-hist]')) openHist(a, D); };
}
function build(tab, D, E) {
  const me = SESSION.me;
  const side = `<aside class="side" id="menu" aria-label="Menu">${logo(34)}<button type="button" class="iconbtn mclose" id="mx" aria-label="Fechar menu">${ic('close', 20)}</button><nav class="snav">${MENU[E.mode].map(([k, l]) => `<a class="${tab === k || (k === 'dieta' && SUBDIETA.includes(tab)) ? 'on' : ''}" href="#/painel/${k}">${l}</a>`).join('')}</nav>
    <div class="thmline"><span>Aparência</span>${temaBtn()}</div>
    <div class="who"><a class="whou" href="#/painel/perfil" aria-label="Abrir meu perfil"${tab === 'perfil' ? ' aria-current="page"' : ''}>${avatar(me, 36)}<div style="flex:1;min-width:0"><b style="display:block;font-size:13px">${esc(firstName(me.nome))}</b><small style="color:var(--dim);font-size:11px">${me.role === 'dono' ? 'Dono' : 'Treinador'}${mode === 'demo' ? ' · demonstração' : ''}</small></div></a>
      <button id="out" class="iconbtn" style="width:36px;height:36px;background:var(--s2)" aria-label="Sair">${ic('logout', 18)}</button></div></aside>`;
  const body = tab === 'visao' ? visaoHTML(D, E) : tab === 'financeiro' ? finHTML(D) : tab === 'pedidos' ? pedidosHTML(D)
    : tab === 'perfil' ? `<div class="head"><div><h1 class="h1">Meu perfil</h1><p class="muted" style="margin-top:4px;font-size:14px">Foto, nome e senha</p></div></div><div class="pgrid">${perfilHTML()}</div>`
    : tab === 'dieta' || tab === 'alimentos' ? subDieta(tab) + tableHTML(schema(tab, D, E), D, E)
    : tableHTML(schema(tab, D, E), D, E);
  const mbar = `<header class="mtop"><button type="button" class="iconbtn" id="mn" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu">${ic('menu', 22)}</button>${logo(30)}${temaBtn()}</header><div class="scrim" id="scrim"></div>`;
  const bnav = `<nav class="bnav" aria-label="Atalhos">${BNAV[E.mode].map(([k, i, l]) => `<a href="#/painel/${k}" class="${tab === k ? 'on' : ''}" aria-label="${l}" title="${l}" ${tab === k ? 'aria-current="page"' : ''}>${ic(i, 24)}</a>`).join('')}</nav>`;
  return `<div class="admin">${mbar}${side}<main class="main">${body}</main>${bnav}</div>`;
}
function bind(el, tab, D, E) {
  const repaint = async () => { const E2 = eff(), D2 = await load(tab); el.innerHTML = build(tab, D2, E2); bind(el, tab, D2, E2); };
  $$('[data-n]', el).forEach(n => countUp(n, 0, +n.dataset.n, 800));
  $('#out', el).onclick = () => api.logout();
  if (SESSION.me && SESSION.me.role === 'dono') iniciarAvisoPedidos(() => { if (/^\/painel\/pedidos/.test(location.pathname)) repaint(); });   // aviso de pedido novo em qualquer tela do painel
  const ad = $('.admin', el), mn = $('#mn', el), setMenu = on => { ad.classList.toggle('menu-open', on); mn.setAttribute('aria-expanded', on); };
  mn.onclick = () => setMenu(true); $('#mx', el).onclick = () => setMenu(false); $('#scrim', el).onclick = () => setMenu(false);
  $$('.side a', el).forEach(a => a.addEventListener('click', () => setMenu(false)));
  if (tab === 'visao') { const h = $('#hexp', el); if (h) h.onclick = () => openExpHist(D, E); if (!E.tid) bindDash(el, D, finCalc(D)); return; }
  if (tab === 'perfil') return bindPerfil(el, repaint);
  if (tab === 'financeiro') return bindFin(el, D, repaint);
  if (tab === 'pedidos') return bindPedidos(el, D, repaint);
  const sc = schema(tab, D, E); if (!sc) return;
  const create = () => openForm(sc, D, E, null, repaint);
  const nb = $('#new', el); if (nb) nb.onclick = create;
  const ns = $('#newsub', el); if (ns) ns.onclick = () => sc.rows.length ? openForm({ ...sc, ...sc.sub }, D, E, null, repaint) : toast('Crie uma categoria antes da subcategoria.');
  const bi = $('#imp', el); if (bi) bi.onclick = async () => { bi.disabled = true; bi.textContent = 'Importando...';
    try { const n = await importarPadrao(api, D.alimentos || [], SESSION.user.uid); toast(n ? `${n} alimentos importados.` : 'A lista padrão já está cadastrada.'); if (n) await repaint(); else { bi.disabled = false; bi.textContent = 'Importar lista padrão'; } }
    catch (err) { bi.disabled = false; bi.textContent = 'Importar lista padrão'; toast(err.message || 'Não foi possível importar agora.'); } };
  const q = $('#q', el), tb = $('tbody', el), T = catTree(D.categorias), all = sc.all || sc.rows;
  if (tb) {
    const hay = new Map(sc.rows.map(r => [r.id, [sc.cols.map(c => String(c[1](r))).join(' '), ...(sc.tree ? T.subs(r.id).map(x => x.nome) : [])].join(' ').toLowerCase()]));
    let list = sc.rows, term = '', fc = '', fsub = '', fg = '', ft = '', fp = '', ord = '', fm = {};
    const aberto = new Set();   // categorias abertas (mostrando as subcategorias)
    const subsVis = r => !sc.tree ? [] : aberto.has(r.id) ? T.subs(r.id) : term ? T.subs(r.id).filter(x => x.nome.toLowerCase().includes(term)) : [];
    const render = pager(el, () => list.length, page => {
      tb.innerHTML = list.slice((page - 1) * pageSize(), page * pageSize()).map(r => { const sv = subsVis(r); return rowHTML(sc, r, false, sv.length > 0) + sv.map(x => rowHTML(sc, x, true)).join(''); }).join('')
        || `<tr><td colspan="${sc.cols.length + 1}" class="empty">Nenhum resultado${fc ? ' nesta categoria' : ' para a busca'}.</td></tr>`;
    });
    const apply = (keep = false) => { list = sc.rows.filter(r => (!term || hay.get(r.id).includes(term)) && (!fc || T.top(r.categoriaId) === fc) && (!fsub || r.categoriaId === fsub) && (!fg || (r.grupo || 'Outros') === fg) && (!ft || TIPOS.find(x => x[0] === ft)[1].test(nA(r))) && (!fp || PREPAROS.find(x => x[0] === fp)[1].test(nA(r))) && Object.entries(fm).every(([k, v]) => (v.min == null || (+r[k] || 0) >= v.min) && (v.max == null || (+r[k] || 0) <= v.max)));
      if (ord) { const k = ord.slice(0, -1), d = ord.endsWith('-') ? -1 : 1; list = [...list].sort((x, y) => d * ((+x[k] || 0) - (+y[k] || 0)) || x.nome.localeCompare(y.nome, 'pt-BR')); }
      render(keep); };
    if (q) q.oninput = () => { term = q.value.trim().toLowerCase(); apply(); };
    /* busca avançada dos exercícios: categorias em grade (4 por linha); a escolhida fica vermelha e abre a lista de subcategorias */
    const ab = $('#advb', el), ap = $('#advp', el);
    if (ab && ap && sc.groupFilter) {
      const marca = () => { $$('[data-g]', ap).forEach(c => c.classList.toggle('on', c.dataset.g === fg)); $$('[data-t]', ap).forEach(c => c.classList.toggle('on', c.dataset.t === ft)); $$('[data-p]', ap).forEach(c => c.classList.toggle('on', c.dataset.p === fp));
        const n = [fg, ft, fp, ord].filter(Boolean).length + Object.keys(fm).length; ab.querySelector('em').textContent = n ? n + (n === 1 ? ' filtro' : ' filtros') : ''; };
      ab.onclick = () => { const on = ap.hidden; ap.hidden = !on; ab.classList.toggle('on', on); ab.setAttribute('aria-expanded', on); };
      ap.onclick = e => { const b = e.target.closest('[data-g],[data-t],[data-p]'); if (b) { if (b.dataset.g) fg = b.dataset.g === fg ? '' : b.dataset.g; if (b.dataset.t) ft = b.dataset.t === ft ? '' : b.dataset.t; if (b.dataset.p) fp = b.dataset.p === fp ? '' : b.dataset.p; marca(); apply(); return; }
        if (e.target.closest('#advclr')) { fg = ft = fp = ord = ''; fm = {}; $$('[data-m]', ap).forEach(i => i.value = ''); $('#ord', ap).value = ''; marca(); apply(); } };
      ap.oninput = e => { const i = e.target.closest('[data-m]'); if (!i) return; const k = i.dataset.m, v = i.value === '' ? null : Math.max(0, +i.value); fm[k] = { ...(fm[k] || {}), [i.dataset.b]: v }; if (fm[k].min == null && fm[k].max == null) delete fm[k]; marca(); apply(); };
      $('#ord', ap).onchange = e => { ord = e.target.value; marca(); apply(); };
    } else if (ab && ap) {
      const ssel = $('#ssel', ap), sl = $('.subsel', ap);
      ab.onclick = () => { const on = ap.hidden; ap.hidden = !on; ab.classList.toggle('on', on); ab.setAttribute('aria-expanded', on); };
      $('.catgrid', ap).onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return;
        fc = b.dataset.c === fc ? '' : b.dataset.c; fsub = '';
        $$('[data-c]', ap).forEach(c => c.classList.toggle('on', c.dataset.c === fc));
        const subs = fc ? T.subs(fc) : [], n = id => sc.rows.filter(r => r.categoriaId === id).length;
        sl.hidden = !subs.length;
        ssel.innerHTML = `<option value="">Todas as subcategorias de ${esc(T.nome(fc))}</option>` + subs.map(x => `<option value="${esc(x.id)}">${esc(x.nome)} (${n(x.id)})</option>`).join('');
        ab.querySelector('em').textContent = fc ? T.nome(fc) : '';
        apply(); if (subs.length) picker(ssel); };
      ssel.onchange = () => { fsub = ssel.value; ab.querySelector('em').textContent = fsub ? T.nome(fsub) : T.nome(fc); apply(); };
    }
    tb.onclick = e => {
      const tr = e.target.closest('tr'); if (!tr) return; const row = all.find(r => r.id === tr.dataset.id); if (!row) return;
      if (sc.tree && !tr.classList.contains('subr') && (e.target.closest('[data-xp]') || !e.target.closest('button'))) {   // tocar na categoria abre/fecha as subcategorias
        if (!T.subs(row.id).length) return;
        aberto.has(row.id) ? aberto.delete(row.id) : aberto.add(row.id); return apply(true); }
      if (e.target.closest('[data-xpay]')) openExt(row, D, repaint);
      else if (e.target.closest('[data-det]')) openDet(scDe(sc, row), D, E, row, repaint);
      else if (e.target.closest('[data-edit]')) openForm(scDe(sc, row), D, E, row, repaint);
      else if (e.target.closest('[data-del]')) delRow(scDe(sc, row), row, repaint);
    };
  }
}
export async function painel(tab = 'visao') {
  const E = eff(); if (tab !== 'perfil' && !MENU[E.mode].some(m => m[0] === tab || (m[0] === 'dieta' && SUBDIETA.includes(tab)))) tab = 'visao';   // 'perfil' não está no menu: abre pela foto/nome
  const D = await load(tab);
  return { depth: 0, wide: true, html: build(tab, D, E), after: el => bind(el, tab, D, E) };
}
