/* GET /api/config — dados públicos para a tela de pagamento do app. */
import { cors } from '../lib/acesso.js';
import { ok, erro, metodo } from '../lib/http.js';
import { limitar, ipDe } from '../lib/limite.js';

export default async function handler(req, res) {
  if (cors(req, res) || !metodo(req, res, 'GET')) return;
  try { await limitar(res, 'config-ip', ipDe(req), 60, 60); } catch (e) { return erro(res, e); }
  ok(res, { publicKey: process.env.MP_PUBLIC_KEY || null, modoTeste: process.env.MP_MODO_TESTE === '1' });
}
