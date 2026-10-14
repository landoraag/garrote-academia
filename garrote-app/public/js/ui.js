/* Utilidades compartilhadas: estado da sessão, ícones, toast, modal. */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const SESSION = { user: null, me: null, viewAs: null, view: { mode: 'dono', trainerId: '', alunoId: '' } };
export const sid = () => SESSION.viewAs || SESSION.user.uid;
export const ro = () => sid() !== SESSION.user.uid;
export const go = p => { location.hash = p; };
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const DIAS = ['', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'], LET = ['', 'S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
export const SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const iso = d => (d.getDay() + 6) % 7 + 1;
export const dkey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
export const kgTxt = n => n ? Number(n).toLocaleString('pt-BR') + ' kg' : 'Corpo';
export const initials = n => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
export const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
export const brl = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const avatar = (u, size = 40, cls = '') => u && u.foto
  ? `<img class="avimg ${cls}" src="${esc(u.foto)}" alt="" style="width:${size}px;height:${size}px">`
  : `<span class="avtxt ${cls}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .36)}px">${esc(initials(u && u.nome))}</span>`;
export const raf2 = fn => requestAnimationFrame(() => requestAnimationFrame(fn));

let toastT;
export function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }
export function countUp(el, from, to, ms = 800) {
  if (reduce || from === to) { el.textContent = to; return; }
  const t0 = performance.now();
  (function f(t) { const p = Math.min(1, (t - t0) / ms); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
}

export const ICON = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', db: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  bell: 'M6 9a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8zM10 21h4', check: 'M5 12l5 5 9-10', back: 'M15 5l-7 7 7 7', chev: 'M9 5l7 7-7 7',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  note: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  arrow: 'M5 12h14M13 6l6 6-6 6', plus: 'M12 5v14M5 12h14', pause: 'M8 5v14M16 5v14', menu: 'M4 6h16M4 12h16M4 18h16', close: 'M6 6l12 12M18 6L6 18', logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'
};
export const ic = (n, s = 22, c = 'currentColor', sw = 1.8, cls = '') =>
  `<svg class="${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[n] || ICON.db}"/></svg>`;
export const playIc = '<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
export const logo = h => `<img class="logo" src="assets/logo.png" alt="Garrote Academia Piraju" style="height:${h}px">`;

export function fail(msg) { const e = new Error(msg); e.user = true; throw e; }
export function friendly(err) {
  if (err && err.user) return err.message;
  const c = (err && (err.code || err.message)) || '';
  const M = { 'email-already-in-use': 'Este e-mail já tem acesso.', 'invalid-credential': 'E-mail ou senha incorretos.', 'wrong-password': 'E-mail ou senha incorretos.', 'user-not-found': 'E-mail ou senha incorretos.', 'invalid-email': 'E-mail inválido.', 'weak-password': 'A senha precisa ter pelo menos 6 caracteres.', 'permission-denied': 'Você não tem permissão para fazer isso.', 'too-many-requests': 'Muitas tentativas. Aguarde um pouco.', 'network': 'Sem conexão. Verifique a internet.' };
  for (const k in M) if (c.includes(k)) return M[k];
  console.error(err); return 'Não foi possível concluir. Tente de novo.';
}

export function openModal({ title, html, submit = 'Salvar', onSubmit, wide = false, foot = '', onClose }) {
  const ov = document.createElement('div'); ov.className = 'ov';
  ov.innerHTML = `<form class="dlg ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}" novalidate><h2 class="h2">${esc(title)}</h2><div class="dbody">${html}</div><p class="err" data-err aria-live="polite"></p><div class="dfoot">${foot}<button type="button" class="btn ghost" data-x>${onSubmit ? 'Cancelar' : 'Fechar'}</button>${onSubmit ? `<button class="btn red" type="submit">${esc(submit)}</button>` : ''}</div></form>`;
  document.body.appendChild(ov);
  const form = $('form', ov), prev = document.activeElement;
  const onKey = e => { if (e.key === 'Escape') close(); };
  function close() { document.removeEventListener('keydown', onKey); ov.classList.add('out'); setTimeout(() => ov.remove(), 200); prev && prev.focus && prev.focus(); onClose && onClose(); }
  document.addEventListener('keydown', onKey);
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  $('[data-x]', ov).onclick = close;
  form.onsubmit = async e => {
    e.preventDefault(); if (!onSubmit) return;
    const b = $('.btn.red', form); b.disabled = true; $('[data-err]', form).textContent = '';
    try { const r = await onSubmit(form, close); if (r !== false) close(); }
    catch (err) { $('[data-err]', form).textContent = friendly(err); }
    finally { b.disabled = false; }
  };
  setTimeout(() => { const f = $('input:not([type=hidden]):not([type=checkbox]),select,textarea', form); f && f.focus(); }, 60);
  return { close, form };
}
export const confirmBox = (msg, ok = 'Excluir') => new Promise(res => {
  let yes = false;
  openModal({ title: 'Confirmar', html: `<p style="font:400 15px/1.5 var(--b)">${esc(msg)}</p>`, submit: ok, onSubmit: async () => { yes = true; }, onClose: () => res(yes) });
});
