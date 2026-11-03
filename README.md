# Garrote Academia

App web (PWA) para a gestão de uma academia: o **dono** cuida da academia, o **treinador** monta os treinos e o **aluno** treina pelo celular.

## O que o app faz

**Aluno**
- Vê os treinos e abre o modo treino, com cronômetro e descanso entre as séries.
- Cada série traz a repetição definida pelo treinador (editável) e a carga como referência: o aluno digita o peso que usou.
- Os treinos aparecem na ordem da semana a partir de hoje, com os dias escritos por extenso.
- Exercícios de tempo (ex.: prancha) usam segundos em vez de kg e têm um cronômetro dentro do próprio exercício, com a meta de cada série.
- O descanso e o cronômetro continuam contando mesmo saindo do app; com a permissão de notificações, o celular avisa quando o descanso acaba e mostra o treino em andamento.
- Ao finalizar o treino, dá uma nota de 0 a 10 para a dificuldade e uma observação; em seguida vê o resumo do dia (cargas, repetições, volume) comparado com o último treino. Série marcada sem carga anotada usa a carga de referência do professor.
- **Histórico** (em Treino): médias e evolução dos treinos passados, lista do mais recente ao mais antigo com o resumo de cada dia, busca por treino, grupo muscular ou data (ex.: peito, 12/10) e busca avançada por treino, grupo e período.
- Faz check-in (ao iniciar um treino, o check-in do dia é feito automaticamente), vê as modalidades, agenda aula experimental e edita o próprio perfil (foto, nome e senha).

**Novidades (lista de melhorias)**
- **Cardio no treino**: se o treino tem cardio, aparece o cartão "Fazer cardio junto ao treino" (abre um cronômetro, como o da prancha) ou "Marcar como feito" com o tempo, agora ou depois. Conta no mesmo dia do treino e **nunca é obrigatório** para finalizar.
- **Técnicas avançadas**: biset, triset, dropset, rest-pause, cluster e outras, por exercício (em todas as séries ou só na última). Biset/triset agrupam este exercício com os próximos e dispensam o descanso entre eles.
- **Dados do treino anterior**: carga e repetições vêm primeiro do último treino feito; só sem histórico entra a recomendação do treinador.
- **Treinador externo** (dono, menu Treinadores externos): usa o app como os internos e paga mensalidade ao João; o dono registra pagamentos e o vencimento avança um mês.
- **Dieta** (menu do treinador, com abas Dietas e Alimentos): **Alimentos** é a base (grupo, porção e macros; a lista padrão de ~40 alimentos é cadastrada sozinha na primeira abertura, e dá para editar, excluir e acrescentar). Em **Dietas** o treinador monta as refeições por **horário**, escolhendo grupo e alimento, quantidade em porções ou gramas, e os alunos que a seguem. Dentro da criação da dieta fica a **calculadora**: macros e calorias de cada alimento, de cada refeição e do dia (com a divisão entre carboidrato, proteína e gordura), e, com sexo, idade, peso, altura e nível de atividade, a **TMB** (Mifflin-St Jeor), o gasto diário, o saldo da dieta e a estimativa de ganho ou perda por semana e em 30 dias. O aluno vê a dieta em "Minha dieta".
- **Professores das modalidades**: cada modalidade lista professores, dias e horários, e a tela do aluno mostra quem dá aula em cada horário.
- **Sem zoom**: pinça e toque duplo bloqueados (viewport, eventos de gesto e `touch-action`).
- **Vitrine de produtos**: o aluno monta o pedido (pagamento na retirada); o painel do dono avisa na hora (som, vibração e título; consulta a cada 20 s) para a recepção separar. O dono cadastra produtos e estoque (baixa ao marcar "separado"), vê pedidos e faturamento.

- **Painel inicial do dono**: indicadores clicáveis (alunos, recebido no mês com variação, receita prevista, atrasos, check-ins de hoje, loja), gráfico de frequência (7/30/90 dias, com dia da semana e horário de pico), receita por mês (mensalidades ou loja), situação dos alunos, vencimentos da semana, alunos sem treinar há 14 dias e estoque baixo da loja.

**Treinador**
- Painel com visão geral, alunos, treinos, exercícios e categorias.
- Categorias com subcategorias (ex.: Peito > Peito superior, Peito medial, Peito inferior), com botões separados para criar cada uma; a lista mostra as categorias fechadas e abre as subcategorias ao tocar.
- Exercícios com busca avançada: categorias em grade (4 por linha) e lista de subcategorias da categoria escolhida.
- Ao montar o treino, escolhe Categoria → Subcategoria → Exercício, e a medida de cada exercício (carga em kg ou tempo em segundos).
- Monta o treino com séries, repetições, carga de referência e descanso, e pode **personalizar as repetições de cada série** (ex.: 12/10/8) num modal rápido. Só um exercício fica aberto por vez.

**Dono**
- Painel com visão geral, treinadores, alunos, modalidades, planos e financeiro. Cada modalidade pode ter vários treinadores.
- Planos com valor cheio, desconto (em % ou em R$) e parcelas: o app calcula o valor final e o valor de cada parcela (ex.: R$ 1.800 com 10% em 12× = R$ 135 por mês).
- A visão geral mostra só as aulas experimentais de hoje em diante; as que já passaram ficam no **Histórico**.

Todo campo de senha tem um olho para mostrar ou ocultar o que foi digitado. Em todos os painéis, a foto e o nome no canto inferior esquerdo do menu levam ao perfil. As listas são paginadas (5 itens por página no celular, 10 no computador).

**Cache no aparelho:** as listas de cadastro (alunos, treinos, exercícios, modalidades, planos, alimentos, produtos, dietas) ficam salvas no celular de cada pessoa (`localStorage`, por usuário, até 3 dias). A segunda abertura mostra a lista salva na hora e atualiza por trás; qualquer gravação limpa a coleção e sair da conta apaga tudo. Check-ins, execuções, pedidos e pagamentos não são salvos como lista, para aparecerem sempre atualizados; já os **check-ins de dias que passaram** ficam salvos (não mudam) e só os dias novos são lidos.

**Economia de leituras (plano gratuito do Firebase):** cadastros ficam 10 min sem nova leitura; o dashboard do dono lê 30 dias de check-ins (90 só ao escolher), 6 meses de pagamentos e 60 dias de pedidos; o aviso de pedidos consulta a cada 30 s só com a aba visível e, depois da primeira vez, só os pedidos novos; o aluno lê só os check-ins novos.

## Tecnologias

- HTML, CSS e JavaScript (módulos ES), sem etapa de build
- Firebase: Authentication, Firestore (versão lite, mais leve) e Hosting
- Service worker para abrir rápido e funcionar como app instalado (PWA)

## Vitrine

O endereço principal abre a vitrine da academia (`index.html`): Cimerian, diferenciais, modalidades, maquete 3D da academia, telas do app, planos, cases em vídeo, avaliações do Google, horários e contato. Os botões **Área do aluno** e **Já sou aluno** abrem o app em `app.html`, que funciona como antes.

Vão direto para o app, sem passar pela vitrine: o app instalado na tela inicial do celular, o link do e-mail de redefinição de senha e links antigos com rota (ex.: `/#/treino/...`).

## Estrutura

```
garrote-app/
  firebase.json          configuração do Hosting e das regras
  firestore.rules        regras de acesso ao Firestore
  .firebaserc            projeto do Firebase
  public/
    index.html           vitrine da academia (página de entrada); "Área do aluno" leva ao app
    app.html             o app (login, aluno, treinador e dono)
    site/                fotos, vídeos dos cases e imagens da vitrine
    manifest.webmanifest
    sw.js                service worker: cache e notificações (a constante CACHE muda a cada atualização)
    css/styles.css
    js/
      main.js            rotas e transições
      api.js             camada de dados (Firebase ou modo demonstração)
      ui.js              componentes e utilitários
      aluno.js           telas do aluno
      painel.js          painel do dono e do treinador
      perfil.js          tela de perfil
      plano.js           planos, descontos, parcelas e pagamentos
      loja.js            vitrine de produtos, pedidos e aviso para a recepção
      dieta.js           alimentos, macros e montagem das refeições por horário
      dash.js            indicadores e gráficos do painel inicial do dono
      semzoom.js         bloqueio de zoom por gestos
      notif.js           avisos do treino (fim do descanso, treino em andamento)
      firebase-config.js configuração do seu projeto Firebase
  email/
    redefinir-senha.html modelo do e-mail para colar no Firebase
atualizar.sh             aplica um zip de atualização e faz o deploy
```

## Como rodar

1. Preencha `garrote-app/public/js/firebase-config.js` com a configuração do seu app web do Firebase e confira o projeto em `garrote-app/.firebaserc`.
2. Se `apiKey` ficar vazia, o app roda em **modo demonstração**, com dados salvos só no navegador.
3. Para publicar:

```
cd garrote-app
firebase deploy --only hosting,firestore:rules
```

## E-mail de redefinição de senha

O e-mail sai em português e o link abre a tela **Criar nova senha** dentro do próprio app. Para deixar tudo com a cara da academia, no Console do Firebase:

1. **Authentication > Templates > Redefinição de senha**, clique no lápis e cole o conteúdo de `garrote-app/email/redefinir-senha.html` (as instruções de nome do remetente e assunto estão no topo do arquivo).
2. Na mesma tela, em **Personalizar URL de ação**, coloque o endereço do app com `/` no final (ex.: `https://SEU-PROJETO.web.app/`).

## Atualizando o app

Coloque o `.zip` de atualização (`garrote-app*.zip`) na raiz do repositório e rode:

```
./atualizar.sh
```

O script guarda o seu `firebase-config.js` e o `.firebaserc`, extrai o zip por cima, remove o zip e faz o deploy.
