# garrote-pagamentos

Servidor de pagamentos da Garrote Academia (Mercado Pago: Pix e cartão), publicado na Vercel.
A Vercel publica sozinha a cada mudança nesta pasta na branch `main` (Root Directory: `garrote-pagamentos`).

| Rota | O que faz |
|---|---|
| `GET /api/config` | Public Key e modo (teste/produção) para a tela de pagamento |
| `POST /api/pagar` | Cria o Pix ou o pagamento com cartão do aluno logado |
| `GET /api/status` | Situação de uma cobrança (a tela consulta enquanto espera o Pix) |
| `POST /api/webhook` | Aviso do Mercado Pago: confere o pedido e dá a baixa automática |

Variáveis de ambiente: veja `.env.example` (cadastre só em **Production** na Vercel).
Segurança e checklist das contas: veja `SEGURANCA.md`.

## Trocar de conta Mercado Pago (ex.: conta do dono da academia)
1. Na conta nova: criar a aplicação (Checkout Transparente, API de Orders) e ativar as credenciais de produção.
2. Na Vercel: trocar `MP_PUBLIC_KEY`, `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET`.
3. No Mercado Pago: webhook de produção apontando para `https://garrote-pagamentos.vercel.app/api/webhook`, evento Order.
4. Na Vercel: Deployments → Create Deployment → `main` (ou qualquer mudança nesta pasta).
