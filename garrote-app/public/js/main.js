/* Roteador, login e controle de acesso por papel (dono, treinador, aluno). */
import { api, mode } from './api.js';
import * as A from './aluno.js';
import { painel } from './painel.js';
import { $, $$, esc, toast, ic, logo, SESSION, go, friendly, fail, reduce, dkey } from './ui.js';

const app = $('#app');
const home = () => SESSION.me && SESSION.me.role === 'aluno' ? '/home' : '/painel/visao';

const SCREENS = {
  async login() {
    let setupDone = true; try { setupDone = !!(await api.get('config', 'setup')); } catch {}
    return { depth: 0, dark: true, html: `
    <div class="login-top">${logo(52)}<p>Treine com constância</p></div>
    <form class="sheet" id="f" novalidate>
      <div><h1 class="h1">Bem-vindo de volta</h1><p class="muted" style="margin-top:6px;font-size:15px">Entre para ver seu treino de hoje</p></div>
      <label class="field">E-mail<input name="u" type="email" autocomplete="username" placeholder="seu@email.com"></label>
      <label class="field">Senha<input name="p" type="password" autocomplete="current-password"></label>
      <p class="err" id="e" aria-live="polite"></p>
      <a class="link" href="#/login" id="forgot">Esqueci minha senha</a>
      <button class="btn red" type="submit">Entrar</button>
      ${mode === 'demo' ? `<div class="demo"><small>Modo demonstração. Toque para preencher:</small><div><button type="button" data-fill="dono@garrote.demo">Dono</button><button type="button" data-fill="treinador@garrote.demo">Treinador</button><button type="button" data-fill="aluno@garrote.demo">Aluno</button></div></div>` : ''}
      ${setupDone ? '<p class="small">Seu acesso é criado pela academia. Fale com a recepção.</p>' : '<a class="btn ghost" href="#/setup">Primeiro acesso: criar conta do dono</a>'}
    </form>`,
    after(el) {
      const set = (u, p) => { $('[name=u]', el).value = u; $('[name=p]', el).value = p; };
      $$('[data-fill]', el).forEach(b => b.onclick = () => set(b.dataset.fill, '123456'));
      $('#forgot', el).onclick = async e => { e.preventDefault(); const u = $('[name=u]', el).value.trim(); if (!u) return $('#e', el).textContent = 'Digite seu e-mail e toque de novo.';
        try { await api.reset(u); toast(mode === 'demo' ? 'No modo demonstração nenhum e-mail é enviado.' : 'Enviamos um e-mail para redefinir a senha.'); } catch (err) { $('#e', el).textContent = friendly(err); } };
      $('#f', el).onsubmit = async e => {
        e.preventDefault();
        const u = $('[name=u]', el).value.trim(), p = $('[name=p]', el).value, b = $('.btn.red', el);
        if (!u || !p) { $('#e', el).textContent = 'Informe o e-mail e a senha.'; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
        b.disabled = true; b.innerHTML = '<i class="spin"></i>Entrando'; $('#e', el).textContent = '';
        try { await api.login(u, p); }
        catch (err) { $('#e', el).textContent = friendly(err); b.disabled = false; b.textContent = 'Entrar'; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
      };
    } };
  },
  async setup() {
    return { depth: 0, dark: true, html: `
    <div class="login-top">${logo(52)}<p>Primeiro acesso</p></div>
    <form class="sheet" id="f" novalidate>
      <div><h1 class="h1">Conta do dono</h1><p class="muted" style="margin-top:6px;font-size:15px">Esta conta cria os treinadores e controla tudo. Só pode ser criada uma vez.</p></div>
      <label class="field">Seu nome<input name="n" autocomplete="name"></label>
      <label class="field">E-mail<input name="u" type="email" autocomplete="username"></label>
      <label class="field">Senha (mínimo 6 caracteres)<input name="p" type="password" autocomplete="new-password"></label>
      <p class="err" id="e" aria-live="polite"></p>
      <button class="btn red" type="submit">Criar conta do dono</button>
      <a class="link" style="align-self:center;color:var(--muted)" href="#/login">Voltar</a>
    </form>`,
    after(el) {
      $('#f', el).onsubmit = async e => {
        e.preventDefault();
        const n = $('[name=n]', el).value.trim(), u = $('[name=u]', el).value.trim().toLowerCase(), p = $('[name=p]', el).value, b = $('.btn.red', el);
        try {
          if (n.length < 3) fail('Informe seu nome.'); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)) fail('Digite um e-mail válido.'); if (p.length < 6) fail('A senha precisa ter pelo menos 6 caracteres.');
          b.disabled = true; busy = true;
          const uid = await api.signUp(u, p);
          await api.setup(uid, { nome: n, email: u, role: 'dono', ativo: 'sim', criadoEm: Date.now() });
          SESSION.user = { uid, email: u }; SESSION.me = await api.get('users', uid); busy = false; toast('Conta do dono criada.'); go('/painel/visao');
        } catch (err) { busy = false; b.disabled = false; $('#e', el).textContent = friendly(err); }
      };
    } };
  },
  async semperfil() {
    return { depth: 0, dark: true, html: `<div class="login-top">${logo(52)}</div><div class="sheet"><h1 class="h1">Acesso ainda não liberado</h1><p class="muted" style="font-size:15px;line-height:1.5">Seu e-mail entrou, mas ainda não tem um perfil na academia. Peça para o dono ou seu professor liberar o seu acesso.</p><button class="btn dark" id="out">Sair</button></div>`, after(el) { $('#out', el).onclick = () => api.logout(); } };
  },
  home: A.home, treinos: A.treinos, treino: A.treino, exercicio: A.exercicio, modalidades: A.modalidades, modalidade: A.modalidade, perfil: A.perfil, painel
};

/* ---------- roteador com transição ---------- */
let cur = null, curDepth = null, curWide = false, cleanup = null, token = 0, busy = false;
async function render() {
  if (busy) return;
  const parts = (location.hash.slice(1) || '/login').split('/'), name = parts[1] || 'login', args = parts.slice(2), pub = ['login', 'setup'];
  let target = SCREENS[name] ? name : 'login';
  if (!SESSION.user) { if (!pub.includes(target)) { location.replace('#/login'); target = 'login'; } }
  else if (!SESSION.me) { if (!pub.includes(target)) target = 'semperfil'; }
  else {
    if (pub.includes(target)) { location.replace('#' + home()); return; }
    const staff = SESSION.me.role !== 'aluno';
    if (target === 'painel') { if (!staff) { location.replace('#/home'); return; } }
    else if (staff) { location.replace('#/painel/' + (target === 'perfil' ? 'perfil' : 'visao')); return; }   // dono e treinador usam só o painel
  }
  const my = ++token;
  document.body.classList.add('loading');
  let v; try { v = await SCREENS[target](...args); } catch (err) { console.error(err); toast(friendly(err)); if (my === token) document.body.classList.remove('loading'); return; }
  if (my !== token) return;
  document.body.classList.remove('loading');
  if (cleanup) { cleanup(); cleanup = null; }
  document.body.classList.toggle('wide', !!v.wide);
  const el = document.createElement('section'); el.className = 'screen' + (v.dark ? ' dark' : ''); el.innerHTML = v.html;
  const back = curDepth !== null && v.depth < curDepth;
  if (cur) {
    if (reduce || (curWide && v.wide)) cur.remove();   // trocar de aba do painel: sem animação, na hora
    else { const old = cur; el.classList.add(back ? 'in-back' : 'in-fwd'); setTimeout(() => el.classList.remove('in-back', 'in-fwd'), 420); old.classList.add(back ? 'out-back' : 'out-fwd'); old.inert = true; setTimeout(() => old.remove(), 380); }
  }
  app.appendChild(el); const boot = $('#boot'); boot && boot.remove(); cur = el; curDepth = v.depth; curWide = !!v.wide;
  cleanup = (v.after && v.after(el)) || null;
}

api.onAuth(async u => {
  SESSION.user = u; SESSION.me = null; SESSION.viewAs = null;
  if (u && !busy) {
    let last = ''; try { last = localStorage.getItem('garrote:role') || ''; } catch {}
    if (last === 'dono' || last === 'treinador') {   // painel: já pede as listas junto com o perfil, em vez de esperar
      ['users', 'modalidades', 'categorias', 'exercicios', 'treinos', ...(last === 'dono' ? ['planos'] : [])].forEach(c => api.list(c).catch(() => {}));
      if (!/^#\/painel\/(?!visao)/.test(location.hash)) { api.list('checkins', [['data', '==', dkey(new Date())]]).catch(() => {}); api.list('agendamentos').catch(() => {}); }
    }
    const [me, f] = await Promise.all([api.get('users', u.uid).catch(e => { console.error(e); return null; }), api.get('fotos', u.uid).catch(() => null)]);   // em paralelo
    SESSION.me = me; if (me && f) me.foto = f.data;
    if (me) try { localStorage.setItem('garrote:role', me.role); } catch {}
    if (SESSION.me && SESSION.me.ativo === 'nao') { toast('Seu acesso está inativo. Fale com a academia.'); SESSION.me = null; await api.logout(); return; }
  }
  if (!u) { cur && cur.remove(); cur = null; curDepth = null; location.hash = '#/login'; }
  render();
});
document.addEventListener('click', e => { const s = e.target.closest('[data-soon]'); if (s) { e.preventDefault(); toast(s.dataset.soon); } });
addEventListener('hashchange', render);
