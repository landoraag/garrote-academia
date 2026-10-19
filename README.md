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

## Tecnologias

- HTML, CSS e JavaScript (módulos ES), sem etapa de build
- Firebase: Authentication, Firestore (versão lite, mais leve) e Hosting
- Service worker para abrir rápido e funcionar como app instalado (PWA)

## Estrutura

```
garrote-app/
  firebase.json          configuração do Hosting e das regras
  firestore.rules        regras de acesso ao Firestore
  .firebaserc            projeto do Firebase
  public/
    index.html
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
