/* Perfil: foto, nome e senha. Vale para dono, treinador e aluno. */
import { api } from './api.js';
import { $, esc, toast, avatar, SESSION, fail, friendly } from './ui.js';

export const perfilHTML = () => {
  const me = SESSION.me;
  return `<section class="card prof"><h2 class="h2" style="margin-bottom:14px">Meus dados</h2>
    <div class="pf-head"><div id="pfav">${avatar(me, 96)}</div>
      <div class="pf-btns"><label class="upl">Trocar foto<input class="sr" type="file" accept="image/*" id="pfile"></label><button type="button" class="btn ghost sm" id="pfrm">Remover foto</button></div></div>
    <form id="pf" novalidate style="display:flex;flex-direction:column;gap:12px">
      <label class="field">Nome<input name="nome" value="${esc(me.nome)}" autocomplete="name"></label>
      <label class="field">E-mail<input value="${esc(me.email || '')}" disabled></label>
      <p class="err" id="pfe" aria-live="polite"></p>
      <button class="btn dark" type="submit" style="height:48px">Salvar alterações</button></form></section>
  <section class="card prof"><h2 class="h2" style="margin-bottom:14px">Alterar senha</h2>
    <form id="pw" novalidate style="display:flex;flex-direction:column;gap:12px">
      <label class="field">Senha atual<input name="cur" type="password" autocomplete="current-password"></label>
      <label class="field">Nova senha<input name="n1" type="password" autocomplete="new-password"></label>
      <label class="field">Confirmar nova senha<input name="n2" type="password" autocomplete="new-password"></label>
      <p class="err" id="pwe" aria-live="polite"></p>
      <button class="btn dark" type="submit" style="height:48px">Alterar senha</button></form></section>`;
};

function resize(file, max = 240) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = max;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, max, max);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(Object.assign(new Error('Escolha um arquivo de imagem.'), { user: true })); };
    img.src = url;
  });
}

export function bindPerfil(el, onSaved) {
  let foto = SESSION.me.foto || '';
  const paint = () => { $('#pfav', el).innerHTML = avatar({ nome: $('[name=nome]', el).value || SESSION.me.nome, foto }, 96); };
  $('#pfile', el).onchange = async e => { const f = e.target.files[0]; if (!f) return; try { foto = await resize(f); paint(); } catch (err) { toast(friendly(err)); } e.target.value = ''; };
  $('#pfrm', el).onclick = () => { foto = ''; paint(); };
  $('#pf', el).onsubmit = async e => {
    e.preventDefault(); const nome = $('[name=nome]', el).value.trim(), msg = $('#pfe', el); msg.textContent = '';
    try {
      if (nome.length < 3) fail('Informe seu nome.');
      await api.update('users', SESSION.user.uid, { nome });
      if (foto !== (SESSION.me.foto || '')) { if (foto) await api.set('fotos', SESSION.user.uid, { data: foto }); else await api.del('fotos', SESSION.user.uid); }
      SESSION.me = { ...SESSION.me, nome, foto }; toast('Perfil atualizado.'); onSaved && onSaved();
    } catch (err) { msg.textContent = friendly(err); }
  };
  $('#pw', el).onsubmit = async e => {
    e.preventDefault(); const f = e.target, cur = f.cur.value, n1 = f.n1.value, n2 = f.n2.value, msg = $('#pwe', el); msg.textContent = '';
    try {
      if (!cur) fail('Digite a senha atual.'); if (n1.length < 6) fail('A nova senha precisa ter pelo menos 6 caracteres.'); if (n1 !== n2) fail('A confirmação não confere.');
      await api.changePassword(cur, n1); f.reset(); toast('Senha alterada.');
    } catch (err) { msg.textContent = /wrong-password|invalid-credential/.test((err && err.code) || '') ? 'Senha atual incorreta.' : friendly(err); }
  };
}
