/* Respostas padronizadas e cabeçalhos de segurança para todas as rotas. */
export function protegerResposta(res) {
  res.setHeader('Cache-Control', 'no-store');                 // nada de pagamento fica guardado em cache
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
}
export const ok = (res, dados, cod = 200) => res.status(cod).json(dados);
export const erro = (res, e, cod) => {
  const status = cod || e.http || (e.status >= 400 && e.status < 500 ? 400 : 500);
  if (status >= 500) console.error('[erro]', status, e.message, e.detalhes ? JSON.stringify(e.detalhes) : '');
  else console.warn('[recusado]', status, e.message);
  // erros internos não expõem detalhes
  return res.status(status).json({ erro: status >= 500 ? 'Não foi possível concluir agora. Tente de novo em instantes.' : (e.message || String(e)) });
};
export const metodo = (req, res, ...permitidos) => {
  protegerResposta(res);
  if (permitidos.includes(req.method)) return true;
  res.setHeader('Allow', permitidos.join(', '));
  res.status(405).json({ erro: 'Método não permitido' });
  return false;
};
/* corpo JSON pequeno e no formato certo (a Vercel já recusa corpos muito grandes) */
export const corpoValido = req => req.body && typeof req.body === 'object' && !Array.isArray(req.body)
  && JSON.stringify(req.body).length <= 4000;
