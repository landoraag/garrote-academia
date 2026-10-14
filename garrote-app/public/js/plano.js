/* Planos e situação de pagamento (usado pelo painel do dono e pelo perfil do aluno). */
import { dkey } from './ui.js';
export const PERIODOS = [[1, 'Mensal'], [3, 'Trimestral'], [6, 'Semestral'], [12, 'Anual']];
export const perLabel = n => (PERIODOS.find(x => x[0] === Number(n)) || [0, `${n} meses`])[1];
export const mensalDe = p => p ? (p.valor || 0) / (p.periodo || 1) : 0;          // quanto o plano vale por mês
export const ptDate = k => k ? k.split('-').reverse().join('/') : '—';
export function addMonths(k, n) {
  const [y, m, d] = k.split('-').map(Number), dt = new Date(y, m - 1 + n, d);
  if (dt.getDate() !== d) dt.setDate(0);                                            // 31/01 + 1 mês = 28/02
  return dkey(dt);
}
/* situação do aluno: [classe, texto] */
export function situ(a, p) {
  if (a.ativo === 'nao') return ['inativo', 'Inativo'];
  if (!p) return ['semplano', 'Sem plano'];
  if (p.categoria === 'totalpass') return ['totalpass', 'Total Pass'];
  if (!a.vencimento) return ['pendente', 'Pendente'];
  return a.vencimento < dkey(new Date()) ? ['atrasado', 'Em atraso'] : ['emdia', 'Em dia'];
}
