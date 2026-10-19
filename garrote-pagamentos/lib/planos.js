/* Preço e grupo familiar: mesmas regras do app (js/plano.js e o "Registrar pagamento" do painel). */
const r2 = n => Math.round(n * 100) / 100;
export const precoFinal = p => {
  if (!p) return 0;
  const v = +p.valor || 0, d = +p.desconto || 0;
  return Math.max(0, r2(p.descontoTipo === 'valor' ? v - d : v * (1 - d / 100)));
};
export const nParc = p => Math.max(1, (p && p.parcelas) | 0 || 1);
export const periodo = p => Math.max(1, (p && p.periodo) | 0 || 1);
/* Pix com desconto extra: só nos planos que podem ser parcelados (padrão 10%, ajustável no cadastro) — mesma regra do app */
export const pctPix = p => !p || p.categoria === 'totalpass' || nParc(p) <= 1 ? 0 : Math.min(100, Math.max(0, p.descontoPix == null || p.descontoPix === '' ? 10 : +p.descontoPix || 0));
export const precoPix = p => r2(precoFinal(p) * (1 - pctPix(p) / 100));
export const valorStr = n => n.toFixed(2); // a API de Orders pede "120.00"

/* Quem é renovado por este pagamento: a família toda (plano família com grupo) ou só o aluno. */
export async function grupoDoAluno(banco, aluno, plano) {
  const chave = plano.familia === 'sim' && aluno.familiaId ? aluno.familiaId.trim().toLowerCase() : null;
  if (!chave) return { chave: null, ids: [aluno.id] };
  const snap = await banco.collection('users').where('planoId', '==', plano.id).get();
  const ids = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => u.role === 'aluno' && u.ativo !== 'nao' && (u.familiaId || '').trim().toLowerCase() === chave)
    .map(u => u.id);
  if (!ids.includes(aluno.id)) ids.push(aluno.id);
  return { chave, ids };
}

/* Motivo pelo qual o aluno não pode pagar pelo app (ou null se pode). */
export function bloqueio(aluno, plano) {
  if (!aluno || aluno.role !== 'aluno') return 'Só alunos pagam a mensalidade pelo app.';
  if (aluno.ativo === 'nao') return 'Seu acesso está inativo. Fale com a academia.';
  if (!plano) return 'Nenhum plano definido. Fale com a recepção.';
  if (plano.categoria === 'totalpass') return 'Seu plano é pelo Total Pass: o pagamento é feito no app parceiro.';
  if (!(precoFinal(plano) > 0)) return 'Este plano está sem valor. Fale com a recepção.';
  return null;
}
