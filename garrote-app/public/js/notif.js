/* Notificações do treino (descanso, cronômetro de exercício por tempo, treino em andamento).
   Quem mostra é o service worker: assim o aviso chega mesmo com o app em segundo plano.
   Tudo é "melhor esforço": sem permissão ou sem suporte, o app funciona igual, só sem o aviso. */
const temSW = () => 'serviceWorker' in navigator;
export const notifOk = () => 'Notification' in window && Notification.permission === 'granted';

/* pede permissão (precisa vir de um toque do usuário, por exemplo "Iniciar treino") */
export async function pedirNotif() {
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  try { await Notification.requestPermission(); } catch {}
}
async function sw() {
  if (!temSW()) return null;
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 3000))]).catch(() => null);
  return reg && (navigator.serviceWorker.controller || reg.active);
}
const post = async m => { try { const w = await sw(); w && w.postMessage(m); } catch {} };
const url = hash => location.origin + String(hash).replace(/^#/, '');

/* aviso num horário futuro (fim do descanso, meta do cronômetro) */
export const agendar = (tag, at, title, body, hash) => { if (notifOk()) post({ type: 'agendar', tag, at, title, body, url: url(hash) }); };
export const cancelar = tag => post({ type: 'cancelar', tag });
/* aviso fixo agora (ex.: "treino em andamento" quando sai do app) */
export const mostrar = (tag, title, body, hash) => { if (notifOk()) post({ type: 'mostrar', tag, title, body, url: url(hash) }); };
/* volta para o app: some com os avisos que já estão na tela */
export const limpar = () => post({ type: 'limpar' });

export const hora = t => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
