/* Respostas padronizadas para as funções da Vercel. */
export const ok = (res, dados, cod = 200) => res.status(cod).json(dados);
export const erro = (res, e, cod) => {
  const status = cod || e.http || (e.status >= 400 && e.status < 500 ? 400 : 500);
  console.error('[erro]', status, e.message, e.detalhes ? JSON.stringify(e.detalhes) : '');
  // erros internos não expõem detalhes ao app
  return res.status(status).json({ erro: status >= 500 ? 'Não foi possível concluir agora. Tente de novo em instantes.' : (e.message || String(e)) });
};
export const metodo = (req, res, ...permitidos) => {
  if (permitidos.includes(req.method)) return true;
  res.setHeader('Allow', permitidos.join(', '));
  res.status(405).json({ erro: 'Método não permitido' });
  return false;
};
