/* CORS (o app roda em outro endereço) e login: só aceita chamadas de quem está logado no app. */
import { auth } from './firebase.js';
import { protegerResposta } from './http.js';

const origens = () => (process.env.APP_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

/* Responde ao "preflight" do navegador. Retorna true se a requisição já foi respondida. */
export function cors(req, res) {
  protegerResposta(res);
  const origin = req.headers.origin;
  // só o endereço do app; localhost apenas se PERMITIR_LOCALHOST=1 (desenvolvimento)
  const local = process.env.PERMITIR_LOCALHOST === '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  if (origin && (origens().includes(origin) || local)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  // navegador de outro site tentando usar a API: recusa (bots sem navegador ainda precisam do login)
  if (origin && !res.getHeader('Access-Control-Allow-Origin')) { res.status(403).json({ erro: 'Origem não permitida' }); return true; }
  return false;
}

/* Confere o token de login do Firebase enviado pelo app. Retorna o uid ou lança erro 401. */
export async function usuarioLogado(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (token.length > 4096) throw Object.assign(new Error('Faça login para pagar.'), { http: 401 });
  if (!token) throw Object.assign(new Error('Faça login para pagar.'), { http: 401 });
  // checkRevoked: senha trocada ou sessão encerrada pelo dono derruba o acesso na hora
  try { return (await auth().verifyIdToken(token, true)).uid; }
  catch { throw Object.assign(new Error('Sua sessão expirou. Entre de novo no app.'), { http: 401 }); }
}
