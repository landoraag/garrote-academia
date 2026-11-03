/* Dieta: alimentos (com macros), dietas por horário e montagem das refeições. Só o treinador monta; o aluno vê a dieta dele. */
import { $, $$, esc, ic, fail, fmtHora } from './ui.js';

import { TACO, TACO_GRUPOS } from './taco.js';
export const GRUPOS = TACO_GRUPOS;
export const VERSAO_BASE = 'taco4';
const padId = nome => 'pad-' + String(nome).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/* valores por 100 g (TACO 4ª ed.): a "porção" é 100 g; o aluno e o treinador podem pedir em gramas ou em múltiplos de 100 g */
export const PADRAO = TACO.map(([n, nome, g, kcal, carb, prot, gord]) => ({ nome, grupo: TACO_GRUPOS[g], porcao: '100 g', g: 100, kcal, carb, prot, gord, v: VERSAO_BASE, taco: n }));
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
  const porId = new Map(existentes.map(a => [a.id, a])), meus = new Set(existentes.filter(a => !String(a.id).startsWith('pad-')).map(a => sa(a.nome)));
  const novos = PADRAO.filter(p => { const e = porId.get(padId(p.nome)); return e ? e.v !== VERSAO_BASE : !meus.has(sa(p.nome)); });
  for (let i = 0; i < novos.length; i += 10) await Promise.all(novos.slice(i, i + 10).map(p => api.set('alimentos', padId(p.nome), { ...p, criadoPor: uid, criadoEm: Date.now() })));
  /* remove os alimentos padrão antigos (valores aproximados) que não estão na TACO, se nenhuma dieta os usa */
  const ids = new Set(PADRAO.map(p => padId(p.nome))), velhos = existentes.filter(a => String(a.id).startsWith('pad-') && !ids.has(a.id));
  if (velhos.length) { const usados = new Set((await api.list('dietas', [])).flatMap(d => (d.refeicoes || []).flatMap(m => (m.itens || []).map(i => i.alId)))); for (const a of velhos) if (!usados.has(a.id)) await api.del('alimentos', a.id); }
  return novos.length; }
export const baseDesatualizada = al => !al.length || al.some(a => String(a.id).startsWith('pad-') && a.v !== VERSAO_BASE);

/* ---------- formulário: refeições por horário (como os exercícios do treino, mas com horas no lugar dos dias) ---------- */
const grupoOpts = (al, sel) => `<option value="">Todos os grupos</option>` + [...new Set(al.map(a => a.grupo || 'Outros'))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(g => `<option ${g === sel ? 'selected' : ''}>${esc(g)}</option>`).join('');
const foodOpts = (al, g, sel) => `<option value="">Escolha o alimento</option>` + al.filter(a => !g || (a.grupo || 'Outros') === g).map(a => `<option value="${esc(a.id)}" ${a.id === sel ? 'selected' : ''}>${esc(a.nome)}</option>`).join('');
const frow = (D, it = {}) => { const a = D.alimentos.find(x => x.id === it.alId), g = a ? a.grupo || 'Outros' : '';
  return `<div class="frow"><label class="ii"><span>Grupo</span><select name="fg" aria-label="Grupo">${grupoOpts(D.alimentos, g)}</select></label>
  <label class="ii fa"><span>Alimento</span><select name="fa" aria-label="Alimento">${foodOpts(D.alimentos, g, it.alId)}</select></label>
  <label class="ii fq"><span>Quantidade</span><input name="fq" type="number" min="0.25" step="0.25" value="${it.qtd ?? 100}" aria-label="Quantidade"></label>
  <label class="ii fu"><span>Medida</span><select name="fu" aria-label="Medida"><option value="p" ${it.un === 'p' ? 'selected' : ''}>Porção</option><option value="g" ${it.un !== 'p' ? 'selected' : ''}>Gramas</option></select></label>
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
