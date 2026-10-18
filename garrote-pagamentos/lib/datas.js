/* Datas no formato do app ("AAAA-MM-DD"), sempre no fuso de São Paulo
   (o servidor da Vercel roda em UTC). */
export function hoje() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}
const dkey = dt =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

/* igual ao addMonths do app: 31/01 + 1 mês = 28/02 */
export function addMonths(k, n) {
  const [y, m, d] = k.split('-').map(Number), dt = new Date(y, m - 1 + n, d);
  if (dt.getDate() !== d) dt.setDate(0);
  return dkey(dt);
}

/* mesma regra do situ() do app */
export function situacao(aluno) {
  if (!aluno.vencimento) return 'pendente';
  return aluno.vencimento < hoje() ? 'atrasado' : 'emdia';
}
