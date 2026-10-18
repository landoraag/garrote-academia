/* Planos e situação de pagamento (usado pelo painel do dono e pelo perfil do aluno). */
import { dkey, brl } from './ui.js';
export const PERIODOS = [[1, 'Mensal'], [3, 'Trimestral'], [6, 'Semestral'], [12, 'Anual']];
export const perLabel = n => (PERIODOS.find(x => x[0] === Number(n)) || [0, `${n} meses`])[1];
/* preço: valor cheio do período, menos o desconto (em % ou em R$), dividido nas parcelas */
const r2 = n => Math.round(n * 100) / 100;
export const precoFinal = p => { if (!p) return 0; const v = +p.valor || 0, d = +p.desconto || 0;
  return Math.max(0, r2(p.descontoTipo === 'valor' ? v - d : v * (1 - d / 100))); };
export const nParc = p => Math.max(1, (p && p.parcelas) | 0 || 1);
export const parcelaDe = p => r2(precoFinal(p) / nParc(p));
export const mensalDe = p => p ? precoFinal(p) / (p.periodo || 1) : 0;          // quanto o plano vale por mês
const num = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
export const descTxt = p => !p || !(+p.desconto) ? '' : p.descontoTipo === 'valor' ? `${brl(p.desconto)} de desconto` : `${num(p.desconto)}% de desconto`;
export const parcTxt = p => nParc(p) > 1 ? `${nParc(p)}× de ${brl(parcelaDe(p))}` : 'À vista';
/* texto completo: "R$ 1.620,00 (R$ 1.800,00 com 10% de desconto) · 12× de R$ 135,00 · R$ 135,00 por mês" */
export function precoTxt(p) {
  const f = precoFinal(p), parts = [brl(f) + (descTxt(p) ? ` (${brl(p.valor)} com ${descTxt(p)})` : '')];
  if (nParc(p) > 1) parts.push(parcTxt(p));
  if ((p.periodo || 1) > 1 && !(nParc(p) === (p.periodo || 1))) parts.push(`${brl(mensalDe(p))} por mês`);
  else if ((p.periodo || 1) > 1) parts[parts.length - 1] += ' por mês';
  return parts.join(' · ');
}
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
