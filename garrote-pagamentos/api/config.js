/* GET /api/config — dados públicos para a tela de pagamento do app. */
import { cors } from '../lib/acesso.js';
import { ok, metodo } from '../lib/http.js';

export default function handler(req, res) {
  if (cors(req, res) || !metodo(req, res, 'GET')) return;
  ok(res, { publicKey: process.env.MP_PUBLIC_KEY || null, modoTeste: process.env.MP_MODO_TESTE === '1' });
}
