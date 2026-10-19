/* Freio de tentativas no aparelho: login, "Esqueci minha senha" e troca de senha.
   É a primeira camada (por dispositivo). A segunda é do próprio Firebase Authentication,
   que bloqueia por rede (IP) e por conta depois de muitas tentativas erradas
   ("Muitas tentativas. Aguarde um pouco."). Um robô pode apagar o armazenamento do navegador,
   por isso este freio serve para o uso normal e ataques simples; o do Firebase é o que vale contra robôs.

   Regras:
   - login: 5 erros em 15 min → espera 1 min; cada novo erro dobra a espera (até 15 min). Acertar zera.
   - esqueci a senha: até 3 e-mails a cada 15 min no aparelho, e 1 a cada 2 min para o mesmo e-mail.
   - trocar senha: 5 senhas atuais erradas em 15 min → espera 5 min. */
const PREFIXO = 'garrote:freio:', MEM = {};
const ler = k => { try { return JSON.parse(localStorage.getItem(PREFIXO + k)) || MEM[k] || null; } catch { return MEM[k] || null; } };
const gravar = (k, v) => { MEM[k] = v; try { v ? localStorage.setItem(PREFIXO + k, JSON.stringify(v)) : localStorage.removeItem(PREFIXO + k); } catch {} };
const agora = () => Date.now();
const MIN = 60e3;

const tempoTxt = ms => { const s = Math.ceil(ms / 1000); return s >= 60 ? `${Math.ceil(s / 60)} min` : `${s} s`; };
const erroFreio = ms => Object.assign(new Error(`Muitas tentativas neste aparelho. Aguarde ${tempoTxt(ms)} e tente de novo.`), { user: true });

/* chave curta para um e-mail, sem guardar o e-mail em texto no aparelho */
function chaveEmail(email) {
  let h = 5381; for (const c of String(email).trim().toLowerCase()) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
}

/* ---- erros seguidos com espera crescente (login e troca de senha) ---- */
function conferirBloqueio(nome) {
  const d = ler(nome);
  if (d && d.ate && d.ate > agora()) throw erroFreio(d.ate - agora());
}
function registrarErro(nome, { limite, janela, esperaBase, esperaMax }) {
  const t = agora(); let d = ler(nome);
  if (!d || t - d.inicio > janela) d = { inicio: t, n: 0, ate: 0, nivel: 0 };
  d.n++;
  if (d.n >= limite) { d.ate = t + Math.min(esperaMax, esperaBase * 2 ** d.nivel); d.nivel++; }
  gravar(nome, d);
}

export const freioLogin = {
  antes: () => conferirBloqueio('login'),
  erro: () => registrarErro('login', { limite: 5, janela: 15 * MIN, esperaBase: MIN, esperaMax: 15 * MIN }),
  ok: () => gravar('login', null)
};
export const freioSenha = {
  antes: () => conferirBloqueio('senha'),
  erro: () => registrarErro('senha', { limite: 5, janela: 15 * MIN, esperaBase: 5 * MIN, esperaMax: 30 * MIN }),
  ok: () => gravar('senha', null)
};

/* ---- e-mails de redefinição ---- */
export function freioReset(email) {
  const t = agora();
  const lista = (ler('reset') || []).filter(x => t - x < 15 * MIN);
  if (lista.length >= 3) throw erroFreio(15 * MIN - (t - lista[0]));
  const k = 'reset-' + chaveEmail(email), ult = ler(k);
  if (ult && t - ult < 2 * MIN) throw erroFreio(2 * MIN - (t - ult));
  lista.push(t); gravar('reset', lista); gravar(k, t);
}

/* erros do Firebase que contam como tentativa errada (senha ou e-mail incorretos) */
export const ehCredencialErrada = err => /wrong-password|invalid-credential|user-not-found|invalid-email/.test((err && (err.code || err.message)) || '');
