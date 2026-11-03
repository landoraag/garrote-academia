/* Calculadora de macros (aba Dieta): lista de alimentos com busca e busca avançada por grupo, como a de exercícios.
   Usa os alimentos cadastrados; enquanto faltarem, completa com a lista padrão do app. */
import { $, $$, esc, ic, toast, openModal } from './ui.js';
import { PADRAO, GRUPOS, n1, sa, fator, mac, soma, tilesHTML } from './dieta.js';

const MK = 'garrote:refeicao';
const lsGet = () => { try { return JSON.parse(localStorage.getItem(MK)) || []; } catch { return []; } };
const lsSet = v => { try { localStorage.setItem(MK, JSON.stringify(v)); } catch {} };
export const todosAlimentos = D => { const custom = D.alimentos || [], nomes = new Set(custom.map(c => sa(c.nome)));
  return [...custom, ...PADRAO.filter(p => !nomes.has(sa(p.nome)))].sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR')); };

const row = a => `<tr data-n="${esc(a.nome)}"><td><b>${esc(a.nome)}</b></td><td>${esc(a.grupo || 'Outros')}</td><td>${esc(a.porcao)}</td><td>${n1(a.kcal)} kcal</td><td>${n1(a.carb)} g</td><td>${n1(a.prot)} g</td><td>${n1(a.gord)} g</td><td class="act"><button class="det" data-calc>Calcular</button></td></tr>`;

export const macrosHTML = D => { const todos = todosAlimentos(D), gr = [...new Set([...GRUPOS, ...todos.map(a => a.grupo || 'Outros')])].filter(g => todos.some(a => (a.grupo || 'Outros') === g));
  return `<div class="head"><div><h1 class="h1">Calculadora de macros</h1><p class="muted" style="margin-top:4px;font-size:14px">${todos.length} alimentos · valores médios, podem variar por marca e preparo</p></div>
    <div class="tools"><input id="nq" type="search" placeholder="Buscar" aria-label="Buscar alimento"><button type="button" class="advb" id="nadv" aria-expanded="false" aria-controls="nadvp">${ic('sliders', 18)}<span>Busca avançada</span><em></em></button></div></div>
  <section class="card advp" id="nadvp" hidden><small class="advt">Grupo</small><div class="catgrid" role="group" aria-label="Filtrar por grupo">${gr.map(g => `<button type="button" class="catb" data-g="${esc(g)}">${esc(g)}<span>${todos.filter(a => (a.grupo || 'Outros') === g).length}</span></button>`).join('')}</div></section>
  <section class="card tblcard"><table class="tbl"><thead><tr><th>Nome</th><th>Grupo</th><th>Porção</th><th>Calorias</th><th>Carboidratos</th><th>Proteínas</th><th>Gorduras</th><th></th></tr></thead><tbody id="ntb"></tbody></table></section>
  <button type="button" class="btn ghost" id="nmais" hidden style="height:46px">Mostrar mais</button>
  <section class="card" id="nref" hidden><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px"><h2 class="h2">Minha refeição</h2><button type="button" class="btn link" id="nclr" style="height:34px">Limpar</button></div><div id="nitens"></div><div id="ntot"></div></section>`; };

export function bindMacros(el, D) {
  const todos = todosAlimentos(D); let lim = 10, g = '', term = '', ref = lsGet(), list = todos;
  const draw = () => { list = todos.filter(a => (!term || term.split(/\s+/).every(w => sa(a.nome + ' ' + (a.grupo || '')).includes(w))) && (!g || (a.grupo || 'Outros') === g));
    $('#ntb', el).innerHTML = list.slice(0, lim).map(row).join('') || `<tr><td colspan="8" class="empty">Nenhum alimento encontrado.</td></tr>`; $('#nmais', el).hidden = list.length <= lim; };
  const refresh = () => { const box = $('#nref', el); box.hidden = !ref.length; if (!ref.length) return;
    $('#nitens', el).innerHTML = ref.map((r, i) => `<div class="nut-r"><div><b>${esc(r.nome)}</b><small>${esc(r.desc)} · ${n1(r.kcal)} kcal</small></div><button type="button" class="iconbtn nut-x" data-i="${i}" aria-label="Remover ${esc(r.nome)}">${ic('close', 16, 'currentColor', 2.4)}</button></div>`).join('');
    $('#ntot', el).innerHTML = tilesHTML(soma(ref)); };
  const abrir = a => { let modo = 'p';
    const m = openModal({ title: a.nome, html: `<p class="muted" style="margin:0 0 12px;font-size:13px">1 porção = ${esc(a.porcao)}</p><div class="nut-in"><div class="nut-modo" role="group" aria-label="Medida"><button type="button" class="on" data-modo="p">Porções</button><button type="button" data-modo="g">Gramas</button></div>
      <label class="nut-qtd"><input id="nqtd" type="text" inputmode="decimal" value="1" aria-label="Quantidade"><em id="nun">porção</em></label></div><div id="nres" style="margin-top:12px"></div>`,
      foot: '<button type="button" class="btn red" data-add>Adicionar à refeição</button>' });
    const f = m.form, num = () => { const v = parseFloat(String($('#nqtd', f).value).replace(',', '.')); return isFinite(v) && v > 0 ? v : 0; };
    const calc = () => { const q = num(); $('#nres', f).innerHTML = q ? tilesHTML(mac(a, fator(a, q, modo))) : '<p class="muted" style="font-size:13px;margin:8px 0 0">Digite uma quantidade maior que zero.</p>'; };
    $$('[data-modo]', f).forEach(b => b.onclick = () => { modo = b.dataset.modo; $$('[data-modo]', f).forEach(x => x.classList.toggle('on', x === b)); $('#nun', f).textContent = modo === 'g' ? 'g' : 'porção'; $('#nqtd', f).value = modo === 'g' ? Math.round(+a.g || 100) : 1; calc(); });
    $('#nqtd', f).oninput = calc; calc();
    $('[data-add]', f).onclick = () => { const q = num(); if (!q) return toast('Digite uma quantidade maior que zero.');
      ref.push({ nome: a.nome, desc: modo === 'g' ? `${n1(q)} g` : `${n1(q)} ${q === 1 ? 'porção' : 'porções'}`, ...mac(a, fator(a, q, modo)) }); lsSet(ref); refresh(); m.close(); toast(`${a.nome} adicionado à refeição.`); }; };
  $('#nq', el).oninput = e => { term = sa(e.target.value.trim()); lim = 10; draw(); };
  const ab = $('#nadv', el), ap = $('#nadvp', el);
  ab.onclick = () => { const on = ap.hidden; ap.hidden = !on; ab.classList.toggle('on', on); ab.setAttribute('aria-expanded', on); };
  $('.catgrid', ap).onclick = e => { const b = e.target.closest('[data-g]'); if (!b) return; g = b.dataset.g === g ? '' : b.dataset.g;
    $$('[data-g]', ap).forEach(c => c.classList.toggle('on', c.dataset.g === g)); ab.querySelector('em').textContent = g; lim = 10; draw(); };
  $('#nmais', el).onclick = () => { lim += 10; draw(); };
  $('#ntb', el).onclick = e => { const tr = e.target.closest('tr[data-n]'); if (!tr) return; const a = todos.find(x => x.nome === tr.dataset.n); if (a) abrir(a); };
  $('#nitens', el).onclick = e => { const b = e.target.closest('.nut-x'); if (!b) return; ref.splice(+b.dataset.i, 1); lsSet(ref); refresh(); };
  $('#nclr', el).onclick = () => { ref = []; lsSet(ref); refresh(); };
  draw(); refresh();
}
