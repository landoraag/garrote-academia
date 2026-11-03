/* Dieta: alimentos (com macros), dietas por horário e montagem das refeições. Só o treinador monta; o aluno vê a dieta dele. */
import { $, $$, esc, ic, fail, fmtHora } from './ui.js';

export const GRUPOS = ["Pães e cereais", "Arroz, massas e raízes", "Leguminosas", "Carnes e ovos", "Laticínios e suplementos", "Frutas e vegetais", "Oleaginosas e gorduras", "Doces e bebidas"];
const GRUPO_DE = {"Pão francês": "Pães e cereais", "Pão de forma": "Pães e cereais", "Pão integral": "Pães e cereais", "Pão de queijo": "Pães e cereais", "Tapioca (goma)": "Pães e cereais", "Cuscuz de milho": "Pães e cereais", "Aveia em flocos": "Pães e cereais", "Granola": "Pães e cereais", "Arroz branco cozido": "Arroz, massas e raízes", "Arroz integral cozido": "Arroz, massas e raízes", "Macarrão cozido": "Arroz, massas e raízes", "Batata doce cozida": "Arroz, massas e raízes", "Batata inglesa cozida": "Arroz, massas e raízes", "Mandioca cozida": "Arroz, massas e raízes", "Feijão carioca cozido": "Leguminosas", "Ovo cozido": "Carnes e ovos", "Peito de frango grelhado": "Carnes e ovos", "Patinho bovino grelhado": "Carnes e ovos", "Tilápia grelhada": "Carnes e ovos", "Atum em lata (natural)": "Carnes e ovos", "Whey protein": "Laticínios e suplementos", "Leite integral": "Laticínios e suplementos", "Iogurte natural integral": "Laticínios e suplementos", "Queijo muçarela": "Laticínios e suplementos", "Banana prata": "Frutas e vegetais", "Maçã": "Frutas e vegetais", "Laranja": "Frutas e vegetais", "Mamão papaia": "Frutas e vegetais", "Abacate": "Frutas e vegetais", "Brócolis cozido": "Frutas e vegetais", "Tomate": "Frutas e vegetais", "Amendoim": "Oleaginosas e gorduras", "Pasta de amendoim": "Oleaginosas e gorduras", "Castanha-do-pará": "Oleaginosas e gorduras", "Azeite de oliva": "Oleaginosas e gorduras", "Mel": "Doces e bebidas", "Açúcar": "Doces e bebidas", "Chocolate ao leite": "Doces e bebidas", "Suco de laranja": "Doces e bebidas", "Refrigerante": "Doces e bebidas"};
// [nome, porção, peso da porção em g, kcal, carboidrato g, proteína g, gordura g]
const BASE = [
  ['Pão francês', '1 unidade (50 g)', 50, 150, 29, 4, 1.5], ['Pão de forma', '1 fatia (25 g)', 25, 63, 12, 2, 1], ['Pão integral', '1 fatia (25 g)', 25, 60, 11, 2.5, 0.8],
  ['Pão de queijo', '1 unidade (20 g)', 20, 73, 6.8, 1, 4.9], ['Tapioca (goma)', '2 colheres de sopa (30 g)', 30, 100, 25, 0, 0], ['Cuscuz de milho', '1 fatia (100 g)', 100, 113, 25, 2.2, 0.7],
  ['Arroz branco cozido', '4 colheres de sopa (100 g)', 100, 128, 28, 2.5, 0.2], ['Arroz integral cozido', '4 colheres de sopa (100 g)', 100, 124, 25.8, 2.6, 1], ['Feijão carioca cozido', '1 concha (100 g)', 100, 76, 13.6, 4.8, 0.5],
  ['Macarrão cozido', '1 pegador (100 g)', 100, 102, 19.9, 3.4, 0.5], ['Batata doce cozida', '100 g', 100, 77, 18.4, 0.6, 0.1], ['Batata inglesa cozida', '100 g', 100, 52, 11.9, 1.2, 0],
  ['Mandioca cozida', '100 g', 100, 125, 30, 0.6, 0.3], ['Aveia em flocos', '2 colheres de sopa (30 g)', 30, 118, 20, 4.2, 2.6], ['Granola', '3 colheres de sopa (30 g)', 30, 120, 21, 3, 3],
  ['Ovo cozido', '1 unidade (50 g)', 50, 73, 0.5, 6.7, 4.8], ['Peito de frango grelhado', '100 g', 100, 159, 0, 32, 2.5], ['Patinho bovino grelhado', '100 g', 100, 219, 0, 35.9, 7.3],
  ['Tilápia grelhada', '100 g', 100, 128, 0, 26, 2.6], ['Atum em lata (natural)', '100 g', 100, 116, 0, 25.5, 0.8], ['Whey protein', '1 scoop (30 g)', 30, 120, 3, 24, 1.5],
  ['Leite integral', '1 copo (200 ml)', 206, 126, 9.3, 6.6, 6.8], ['Iogurte natural integral', '1 pote (170 g)', 170, 87, 3.2, 7, 5], ['Queijo muçarela', '1 fatia (20 g)', 20, 66, 0.6, 4.5, 5],
  ['Banana prata', '1 unidade (80 g)', 80, 78, 21, 1, 0.2], ['Maçã', '1 unidade (130 g)', 130, 73, 19, 0.3, 0.2], ['Laranja', '1 unidade (150 g)', 150, 70, 17.5, 1.3, 0.2],
  ['Mamão papaia', '1 fatia (170 g)', 170, 66, 17, 0.7, 0.2], ['Abacate', '2 colheres de sopa (60 g)', 60, 96, 5, 1.2, 8.8], ['Brócolis cozido', '100 g', 100, 25, 4.4, 2.1, 0.5],
  ['Tomate', '1 unidade (100 g)', 100, 15, 3.1, 0.9, 0.2], ['Amendoim', '1 punhado (30 g)', 30, 170, 4.7, 7.7, 14], ['Pasta de amendoim', '1 colher de sopa (15 g)', 15, 90, 3, 3.5, 7.5],
  ['Castanha-do-pará', '1 unidade (4 g)', 4, 26, 0.5, 0.6, 2.6], ['Azeite de oliva', '1 colher de sopa (13 ml)', 12, 108, 0, 0, 12], ['Mel', '1 colher de sopa (20 g)', 20, 61, 16.5, 0, 0],
  ['Açúcar', '1 colher de chá (5 g)', 5, 20, 5, 0, 0], ['Chocolate ao leite', '1 quadrado (25 g)', 25, 135, 14.5, 1.9, 7.8], ['Suco de laranja', '1 copo (200 ml)', 200, 90, 21, 1.4, 0.4],
  ['Refrigerante', '1 lata (350 ml)', 350, 140, 35, 0, 0]
];


export const PADRAO = BASE.map(([nome, porcao, g, kcal, carb, prot, gord]) => ({ nome, grupo: GRUPO_DE[nome] || 'Outros', porcao, g, kcal, carb, prot, gord }));
export const REFEICOES = ['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Pré-treino', 'Pós-treino', 'Jantar', 'Ceia'];

export const n1 = v => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
export const sa = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/* quantidade em porções (un 'p') ou gramas (un 'g') → fator sobre os valores da porção */
export const fator = (a, q, un) => un === 'g' ? q / Math.max(1, +a.g || 1) : q;
export const mac = (a, f) => ({ kcal: (+a.kcal || 0) * f, carb: (+a.carb || 0) * f, prot: (+a.prot || 0) * f, gord: (+a.gord || 0) * f });
export const soma = l => l.reduce((t, m) => ({ kcal: t.kcal + m.kcal, carb: t.carb + m.carb, prot: t.prot + m.prot, gord: t.gord + m.gord }), { kcal: 0, carb: 0, prot: 0, gord: 0 });
export const macTxt = m => `${n1(m.kcal)} kcal · Carbo ${n1(m.carb)} · Proteína ${n1(m.prot)} · Gordura ${n1(m.gord)}`;
export const tilesHTML = m => `<div class="nut-tiles"><div class="nt-k"><small>Calorias</small><b>${n1(m.kcal)}<span> kcal</span></b></div><div><small>Carboidratos</small><b>${n1(m.carb)}<span> g</span></b></div><div><small>Proteínas</small><b>${n1(m.prot)}<span> g</span></b></div><div><small>Gorduras</small><b>${n1(m.gord)}<span> g</span></b></div></div>`;
export const qtdTxt = (a, q, un) => un === 'g' ? `${n1(q)} g` : `${n1(q)} × ${a ? a.porcao : 'porção'}`;
/* macros de uma refeição / de uma dieta inteira (alimentos = lista cadastrada) */
export const macRef = (r, al) => soma((r.itens || []).map(i => { const a = al.find(x => x.id === i.alId); return a ? mac(a, fator(a, +i.qtd || 0, i.un)) : mac({}, 0); }));
export const macDieta = (d, al) => soma((d.refeicoes || []).map(r => macRef(r, al)));

/* ---------- calculadora: macros do dia, gasto diário (TMB × atividade) e saldo ---------- */
export const ATIV = [[1.2, 'Sedentário (pouco ou nenhum exercício)'], [1.375, 'Leve (1 a 3 treinos por semana)'], [1.55, 'Moderado (3 a 5 treinos por semana)'], [1.725, 'Intenso (6 a 7 treinos por semana)'], [1.9, 'Muito intenso (treino 2x ao dia ou trabalho pesado)']];
/* TMB pela equação de Mifflin-St Jeor; gasto total = TMB × fator de atividade */
export const gasto = p => { if (!p || !(+p.peso > 0) || !(+p.altura > 0) || !(+p.idade > 0)) return null;
  const tmb = 10 * +p.peso + 6.25 * +p.altura - 5 * +p.idade + (p.sexo === 'f' ? -161 : 5); return { tmb, total: tmb * (+p.ativ || 1.2) }; };
export const dcalcField = (f, v) => { const p = v || {};
  return `<div class="field full dcalc"><span>${f.l}</span><p class="muted" style="margin:0 0 8px;font-size:13px">Preencha os dados da pessoa para ver quanto ela gasta por dia e o saldo da dieta (ganho ou perda).</p>
  <div class="pfg"><label class="ii"><span>Sexo</span><select name="pf_sexo"><option value="m">Masculino</option><option value="f" ${p.sexo === 'f' ? 'selected' : ''}>Feminino</option></select></label>
  <label class="ii"><span>Idade (anos)</span><input name="pf_idade" type="number" min="10" max="100" step="1" value="${p.idade ?? ''}" placeholder="30"></label>
  <label class="ii"><span>Peso (kg)</span><input name="pf_peso" type="number" min="20" max="300" step="0.1" value="${p.peso ?? ''}" placeholder="75"></label>
  <label class="ii"><span>Altura (cm)</span><input name="pf_altura" type="number" min="100" max="230" step="1" value="${p.altura ?? ''}" placeholder="175"></label>
  <label class="ii pfa"><span>Nível de atividade</span><select name="pf_ativ">${ATIV.map(([k, l]) => `<option value="${k}" ${+p.ativ === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
  <div class="dres" id="dres" aria-live="polite"></div></div>`; };
export function collectPerfil(form) { const g = n => $(`[name=pf_${n}]`, form); if (!g('peso')) return null;
  const o = { sexo: g('sexo').value === 'f' ? 'f' : 'm', idade: +g('idade').value || 0, peso: +g('peso').value || 0, altura: +g('altura').value || 0, ativ: +g('ativ').value || 1.2 };
  return o.peso || o.idade || o.altura ? o : null; }
const num = v => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
export function resultadoCalc(box, dia, perfil) {
  const kcal = dia.kcal, kc = dia.carb * 4, kp = dia.prot * 4, kg = dia.gord * 9, tot = Math.max(1, kc + kp + kg), pc = x => Math.round(x / tot * 100);
  let h = `<div class="dtiles"><div class="dt-k"><small>Calorias do dia</small><b>${num(kcal)}<span> kcal</span></b></div><div><small>Carboidratos</small><b>${n1(dia.carb)}<span> g · ${pc(kc)}%</span></b></div><div><small>Proteínas</small><b>${n1(dia.prot)}<span> g · ${pc(kp)}%</span></b></div><div><small>Gorduras</small><b>${n1(dia.gord)}<span> g · ${pc(kg)}%</span></b></div></div>
    <div class="msplit" aria-hidden="true"><i class="c" style="width:${pc(kc)}%"></i><i class="p" style="width:${pc(kp)}%"></i><i class="g" style="width:${pc(kg)}%"></i></div>`;
  const G = gasto(perfil);
  if (!G) h += '<p class="dnote">Informe sexo, idade, peso e altura para calcular o gasto diário (TMB) e o saldo da dieta.</p>';
  else { const saldo = kcal - G.total, sem = saldo * 7 / 7700, tipo = Math.abs(saldo) < 100 ? 'manutenção' : saldo < 0 ? 'déficit (emagrece)' : 'superávit (ganha peso)';
    h += `<div class="dtiles"><div><small>Taxa metabólica basal</small><b>${num(G.tmb)}<span> kcal</span></b></div><div><small>Gasto total por dia</small><b>${num(G.total)}<span> kcal</span></b></div>
      <div class="${Math.abs(saldo) < 100 ? '' : saldo < 0 ? 'dt-ok' : 'dt-up'}"><small>Saldo por dia · ${tipo}</small><b>${saldo > 0 ? '+' : ''}${num(saldo)}<span> kcal</span></b></div>
      <div><small>Estimativa por semana</small><b>${sem > 0 ? '+' : ''}${n1(sem)}<span> kg</span></b></div></div>
      <p class="dnote">≈ ${n1(Math.abs(sem) * 4.3)} kg ${saldo < 0 ? 'a menos' : 'a mais'} em 30 dias (1 kg ≈ 7.700 kcal). Proteína: ${n1(dia.prot / +perfil.peso)} g por kg. Para emagrecer ≈ 0,5 kg por semana, mire em ${num(G.total - 550)} kcal; para ganhar ≈ 0,25 kg por semana, ${num(G.total + 275)} kcal.</p>`; }
  box.innerHTML = h; }

/* alimentos padrão: ids fixos, então importar duas vezes não duplica */
export async function importarPadrao(api, existentes, uid) {
  const tem = new Set(existentes.map(a => sa(a.nome))), novos = PADRAO.filter(p => !tem.has(sa(p.nome)));
  for (let i = 0; i < novos.length; i += 10) await Promise.all(novos.slice(i, i + 10).map(p => api.set('alimentos', 'pad-' + sa(p.nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), { ...p, criadoPor: uid, criadoEm: Date.now() })));
  return novos.length; }

/* ---------- formulário: refeições por horário (como os exercícios do treino, mas com horas no lugar dos dias) ---------- */
const grupoOpts = (al, sel) => `<option value="">Todos os grupos</option>` + [...new Set(al.map(a => a.grupo || 'Outros'))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(g => `<option ${g === sel ? 'selected' : ''}>${esc(g)}</option>`).join('');
const foodOpts = (al, g, sel) => `<option value="">Escolha o alimento</option>` + al.filter(a => !g || (a.grupo || 'Outros') === g).map(a => `<option value="${esc(a.id)}" ${a.id === sel ? 'selected' : ''}>${esc(a.nome)}</option>`).join('');
const frow = (D, it = {}) => { const a = D.alimentos.find(x => x.id === it.alId), g = a ? a.grupo || 'Outros' : '';
  return `<div class="frow"><label class="ii"><span>Grupo</span><select name="fg" aria-label="Grupo">${grupoOpts(D.alimentos, g)}</select></label>
  <label class="ii fa"><span>Alimento</span><select name="fa" aria-label="Alimento">${foodOpts(D.alimentos, g, it.alId)}</select></label>
  <label class="ii fq"><span>Quantidade</span><input name="fq" type="number" min="0.25" step="0.25" value="${it.qtd ?? 1}" aria-label="Quantidade"></label>
  <label class="ii fu"><span>Medida</span><select name="fu" aria-label="Medida"><option value="p">Porção</option><option value="g" ${it.un === 'g' ? 'selected' : ''}>Gramas</option></select></label>
  <button type="button" class="pdel" data-rmfood aria-label="Remover alimento">${ic('close', 18, 'currentColor', 2.4)}</button><p class="fk"></p></div>`; };
const mrow = (D, m = {}) => `<div class="meal"><div class="mrtop"><label class="ii mh"><span>Horário</span><input name="mh" type="time" step="300" value="${esc(fmtHora(m.hora))}" aria-label="Horário"></label>
  <label class="ii mn"><span>Refeição</span><input name="mn" list="dlref" maxlength="40" value="${esc(m.nome || '')}" placeholder="Ex.: Café da manhã" autocomplete="off" aria-label="Nome da refeição"></label>
  <span class="ibtns"><button type="button" data-mup aria-label="Subir">${ic('up', 18, 'currentColor', 2.4)}</button><button type="button" data-mdn aria-label="Descer">${ic('down', 18, 'currentColor', 2.4)}</button><button type="button" data-mrm aria-label="Remover refeição">${ic('close', 18, 'currentColor', 2.4)}</button></span></div>
  <div class="foods">${(m.itens && m.itens.length ? m.itens : [{}]).map(i => frow(D, i)).join('')}</div>
  <div class="mfoot"><button type="button" class="btn ghost" data-addfood style="height:42px">+ Alimento</button><b class="mtot"></b></div></div>`;
export const mealsField = (f, v, D) => D.alimentos.length
  ? `<div class="field full"><span>${f.l}</span><datalist id="dlref">${REFEICOES.map(r => `<option value="${esc(r)}">`).join('')}</datalist><div class="meals">${(v || []).map(m => mrow(D, m)).join('')}</div>
     <button type="button" class="btn ghost" data-addmeal style="height:44px">+ Adicionar refeição</button><p class="dtot" id="dtot"></p></div>`
  : `<div class="field full"><span>${f.l}</span><p class="note">Cadastre ou importe alimentos (aba Alimentos) antes de montar uma dieta.</p></div>`;

export function bindMeals(form, D) {
  const box = $('.meals', form); if (!box) return;
  if (!$('.meal', box)) box.insertAdjacentHTML('beforeend', mrow(D, {}));
  const fk = r => { const a = D.alimentos.find(x => x.id === $('[name=fa]', r).value), q = +$('[name=fq]', r).value || 0; return a ? mac(a, fator(a, q, $('[name=fu]', r).value)) : null; };
  const paint = () => { let dia = []; $$('.meal', box).forEach(mr => { const ms = $$('.frow', mr).map(r => { const m = fk(r); $('.fk', r).textContent = m ? macTxt(m) : ''; return m; }).filter(Boolean), t = soma(ms); dia.push(t);
      $('.mtot', mr).textContent = ms.length ? macTxt(t) : ''; });
    const tot = soma(dia); $('#dtot', form).innerHTML = dia.length ? `<b>Total do dia:</b> ${macTxt(tot)}` : ''; const rb = $('#dres', form); if (rb) resultadoCalc(rb, tot, collectPerfil(form)); };
  box.onchange = e => { const r = e.target.closest('.frow'); if (r && e.target.name === 'fg') { $('[name=fa]', r).innerHTML = foodOpts(D.alimentos, e.target.value, ''); $('[name=fa]', r).focus(); } paint(); };
  box.oninput = paint; form.addEventListener('input', e => { if (/^pf_/.test(e.target.name || '')) paint(); }); form.addEventListener('change', e => { if (/^pf_/.test(e.target.name || '')) paint(); });
  box.onclick = e => { const mr = e.target.closest('.meal'); if (!mr) return;
    if (e.target.closest('[data-addfood]')) { $('.foods', mr).insertAdjacentHTML('beforeend', frow(D, {})); const r = $('.foods', mr).lastElementChild; r.classList.add('new'); $('[name=fg]', r).focus(); return paint(); }
    if (e.target.closest('[data-rmfood]')) { const r = e.target.closest('.frow'); if ($$('.frow', mr).length > 1) r.remove(); else { $('[name=fa]', r).value = ''; } return paint(); }
    if (e.target.closest('[data-mrm]')) { mr.remove(); return paint(); }
    if (e.target.closest('[data-mup]')) { if (mr.previousElementSibling) box.insertBefore(mr, mr.previousElementSibling); return; }
    if (e.target.closest('[data-mdn]')) { if (mr.nextElementSibling) box.insertBefore(mr.nextElementSibling, mr); } };
  $('[data-addmeal]', form).onclick = () => { box.insertAdjacentHTML('beforeend', mrow(D, {})); const r = box.lastElementChild; r.classList.add('new'); $('[name=mh]', r).focus(); paint(); };
  paint();
}
export function collectMeals(form) {
  const out = $$('.meal', form).map(mr => { const hora = $('[name=mh]', mr).value, nome = $('[name=mn]', mr).value.trim().slice(0, 40);
    const itens = $$('.frow', mr).map(r => ({ alId: $('[name=fa]', r).value, qtd: Math.max(0.25, +$('[name=fq]', r).value || 1), un: $('[name=fu]', r).value === 'g' ? 'g' : 'p' })).filter(i => i.alId);
    if (!itens.length && !hora && !nome) return null;
    if (!hora) fail('Informe o horário de cada refeição.'); if (!itens.length) fail(`Escolha pelo menos um alimento${nome ? ' em “' + nome + '”' : ' em cada refeição'}.`);
    return { hora, nome: nome || 'Refeição', itens }; }).filter(Boolean);
  if (!out.length) fail('Adicione pelo menos uma refeição.');
  return out.sort((a, b) => a.hora.localeCompare(b.hora));
}
