# Segurança dos pagamentos — Garrote Academia

## O que o código já faz

**Limites de requisição (anti-bot)** — contados no Firestore (coleção `limites`, chave em hash, sem guardar IP):

| Rota | Limite |
|---|---|
| `/api/pagar` | 15 por IP e 6 por aluno a cada 10 min |
| Cartão (fraude com cartão roubado) | 5 por aluno/hora, 10 por aluno/dia, 8 por IP/hora |
| `/api/status` | 120 por IP e 60 por aluno a cada 5 min |
| `/api/config` | 60 por IP/min |
| `/api/webhook` | 120 por IP/min; sem assinatura válida, 20 por IP/min |

Ao passar do limite: resposta 429 com `Retry-After` e aviso `[limite] bloqueado` nos logs da Vercel.

**Outras proteções**
- Só aceita chamadas do endereço do app (`APP_ORIGINS`); outros sites recebem 403.
- Toda chamada de pagamento exige o login do Firebase, conferido no servidor (sessões encerradas caem na hora).
- Aluno, plano, valor e família vêm do Firestore. O app não consegue mudar o preço nem pagar por outra pessoa.
- O número do cartão nunca chega aqui: só o token de uso único do Mercado Pago.
- Pix em aberto é reaproveitado por 50 min (apertar o botão várias vezes não gera várias cobranças).
- Webhook nunca confia no aviso: busca o pedido direto no Mercado Pago. Pedido inexistente é ignorado.
- Cabeçalhos de segurança (sem cache, sem iframe, HSTS), entradas validadas e erros internos sem detalhes.
- Regras do Firestore: `cobrancas`, `pixAbertos` e `limites` são fechadas para o navegador.

## O que precisa ser feito nas contas (fora do código)

Não existe servidor próprio para alguém "invadir" por acesso remoto: tudo roda em serviços gerenciados
(Firebase, Vercel, Mercado Pago, GitHub). O ponto de ataque real são as **contas** e as **chaves**.

1. **Verificação em duas etapas (2FA)** em: Google (Firebase), GitHub, Vercel e Mercado Pago.
2. **Chaves só na Vercel.** Nunca no código, no chat ou em print. Se vazar: gere outra no painel e troque na Vercel.
3. **Chave do Firebase (conta de serviço):** uma só, usada só pela Vercel. Apague as antigas em
   Google Cloud > IAM > Contas de serviço.
4. **Restringir a apiKey do Firebase** em Google Cloud > APIs e serviços > Credenciais: aceitar só os
   endereços do app (garrote-academia.web.app, garrote-academia.firebaseapp.com).
5. **Firebase Authentication > Configurações:** ativar a proteção contra enumeração de e-mails.
6. **Vercel > Firewall:** em caso de ataque, ligar o *Attack Challenge Mode*.
7. **Acompanhar:** logs da Vercel (avisos `[limite]` e `[recusado]`) e o painel de vendas do Mercado Pago.

## Próximo passo recomendado

**Firebase App Check** (reCAPTCHA): prova que a chamada veio do app de verdade, não de um script,
tanto para o Firestore quanto para este servidor.
