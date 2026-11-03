/* Calculadora de macros: converte um alimento (porções ou gramas) em calorias, carboidratos, proteínas e gorduras.
   A lista padrão traz valores médios aproximados; a academia pode cadastrar os seus em Alimentos (no painel), e o cadastro vale no lugar do padrão. */
import { $, $$, esc, ic, toast } from './ui.js';

// [nome, porção, peso da porção em g, kcal, carboidrato g, proteína g, gordura g]
const PADRAO = [
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
].map(([nome, porcao, g, kcal, carb, prot, gord]) => ({ nome, porcao, g, kcal, carb, prot, gord, padrao: true }));

const sa = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const n1 = v => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const MK = 'garrote:refeicao';
const lsGet = () => { try { return JSON.parse(localStorage.getItem(MK)) || []; } catch { return []; } };
const lsSet = v => { try { localStorage.setItem(MK, JSON.stringify(v)); } catch {} };
const fator = (a, qtd, modo) => modo === 'g' ? qtd / Math.max(1, +a.g || 1) : qtd;
const mac = (a, f) => ({ kcal: (+a.kcal || 0) * f, carb: (+a.carb || 0) * f, prot: (+a.prot || 0) * f, gord: (+a.gord || 0) * f });
const tiles = m => `<div class="nut-tiles"><div class="nt-k"><small>Calorias</small><b>${n1(m.kcal)}<span> kcal</span></b></div><div><small>Carboidratos</small><b>${n1(m.carb)}<span> g</span></b></div>
  <div><small>Proteínas</small><b>${n1(m.prot)}<span> g</span></b></div><div><small>Gorduras</small><b>${n1(m.gord)}<span> g</span></b></div></div>`;

const todosDe = D => {
  const custom = D.alimentos || [], nomes = new Set(custom.map(c => sa(c.nome)));
  const todos = [...custom.map(c => ({ ...c, nome: c.nome })), ...PADRAO.filter(p => !nomes.has(sa(p.nome)))].sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  return todos;
};

export const macrosHTML = () => `<div class="head"><div><h1 class="h1">Calculadora de macros</h1><p class="muted" style="margin-top:4px;font-size:14px">Escolha o alimento e a quantidade para ver calorias e macros. Valores médios, podem variar por marca e preparo. Para usar seus próprios valores, cadastre em Alimentos.</p></div></div>
    <div class="nut-wrap">
      <label class="hq nut-q">${ic('search', 18)}<input id="nq" type="search" placeholder="Buscar alimento: pão, arroz, frango..." aria-label="Buscar alimento" autocomplete="off"></label>
      <div class="nut-list" id="nlist" role="listbox" aria-label="Alimentos"></div>
      <section class="card nut-calc" id="ncalc" hidden>
        <div class="nut-hd"><div><b id="nnome"></b><small id="nporc"></small></div></div>
        <div class="nut-in"><div class="nut-modo" role="group" aria-label="Medida"><button type="button" class="on" data-modo="p">Porções</button><button type="button" data-modo="g">Gramas</button></div>
          <label class="nut-qtd"><input id="nqtd" type="text" inputmode="decimal" value="1" aria-label="Quantidade"><em id="nun">porção</em></label></div>
        <div id="nres"></div><button type="button" class="btn red" id="nadd" style="margin-top:12px">Adicionar à refeição</button>
      </section>
      <section class="card" id="nref" hidden><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px"><h2 class="h2">Minha refeição</h2><button type="button" class="btn link" id="nclr" style="height:34px">Limpar</button></div>
        <div id="nitens"></div><div id="ntot"></div></section></div>`;

export function bindMacros(el, D) {
    const todos = todosDe(D);
    let sel = null, modo = 'p', ref = lsGet();
    const num = () => { const v = parseFloat(String($('#nqtd', el).value).replace(',', '.')); return isFinite(v) && v > 0 ? v : 0; };
    const lista = () => { const q = sa($('#nq', el).value.trim()), l = todos.filter(a => !q || q.split(/\s+/).every(w => sa(a.nome).includes(w))).slice(0, 6);
      $('#nlist', el).innerHTML = l.map(a => `<button type="button" class="nut-it ${sel && sel.nome === a.nome ? 'on' : ''}" role="option" data-n="${esc(a.nome)}"><b>${esc(a.nome)}</b><em>${n1(a.kcal)} kcal</em><small>${esc(a.porcao)}</small></button>`).join('') || '<p class="empty" style="padding:12px 4px">Nada encontrado. A academia pode cadastrar esse alimento.</p>'; };
    const calc = () => { if (!sel) return; const q = num(); $('#nres', el).innerHTML = q ? tiles(mac(sel, fator(sel, q, modo))) : '<p class="muted" style="font-size:13px;margin:8px 0 0">Digite uma quantidade maior que zero.</p>'; };
    const refresh = () => { const box = $('#nref', el); box.hidden = !ref.length; if (!ref.length) return;
      $('#nitens', el).innerHTML = ref.map((r, i) => `<div class="nut-r"><div><b>${esc(r.nome)}</b><small>${esc(r.desc)} · ${n1(r.kcal)} kcal</small></div><button type="button" class="iconbtn nut-x" data-i="${i}" aria-label="Remover ${esc(r.nome)}">${ic('close', 16, 'currentColor', 2.4)}</button></div>`).join('');
      $('#ntot', el).innerHTML = tiles(ref.reduce((t, r) => ({ kcal: t.kcal + r.kcal, carb: t.carb + r.carb, prot: t.prot + r.prot, gord: t.gord + r.gord }), { kcal: 0, carb: 0, prot: 0, gord: 0 })); };
    $('#nq', el).oninput = lista;
    $('#nlist', el).onclick = e => { const b = e.target.closest('.nut-it'); if (!b) return; sel = todos.find(a => a.nome === b.dataset.n); if (!sel) return;
      $('#ncalc', el).hidden = false; $('#nnome', el).textContent = sel.nome; $('#nporc', el).textContent = `1 porção = ${sel.porcao}`; lista(); calc(); $('#ncalc', el).scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
    $$('[data-modo]', el).forEach(b => b.onclick = () => { modo = b.dataset.modo; $$('[data-modo]', el).forEach(x => x.classList.toggle('on', x === b)); $('#nun', el).textContent = modo === 'g' ? 'g' : 'porção';
      $('#nqtd', el).value = modo === 'g' ? Math.round(sel ? +sel.g || 100 : 100) : 1; calc(); });
    $('#nqtd', el).oninput = calc;
    $('#nadd', el).onclick = () => { if (!sel) return; const q = num(); if (!q) return toast('Digite uma quantidade maior que zero.');
      const m = mac(sel, fator(sel, q, modo)); ref.push({ nome: sel.nome, desc: modo === 'g' ? `${n1(q)} g` : `${n1(q)} ${q === 1 ? 'porção' : 'porções'}`, ...m }); lsSet(ref); refresh(); toast(`${sel.nome} adicionado à refeição.`); };
    $('#nitens', el).onclick = e => { const b = e.target.closest('.nut-x'); if (!b) return; ref.splice(+b.dataset.i, 1); lsSet(ref); refresh(); };
    $('#nclr', el).onclick = () => { ref = []; lsSet(ref); refresh(); };
    lista(); refresh();
}
