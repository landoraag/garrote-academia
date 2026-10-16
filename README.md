# Garrote Academia

App web (PWA) para a gestão de uma academia: o **dono** cuida da academia, o **treinador** monta os treinos e o **aluno** treina pelo celular.

## O que o app faz

**Aluno**
- Vê os treinos e abre o modo treino, com cronômetro e descanso entre as séries.
- Cada série traz a repetição definida pelo treinador (editável) e a carga como referência: o aluno digita o peso que usou.
- Faz check-in, vê as modalidades, agenda aula experimental e edita o próprio perfil (foto, nome e senha).

**Treinador**
- Painel com visão geral, alunos, treinos, exercícios e categorias.
- Monta o treino com séries, repetições, carga de referência e descanso, e pode **personalizar as repetições de cada série** (ex.: 12/10/8).

**Dono**
- Painel com visão geral, treinadores, alunos, modalidades, planos e financeiro.

Em todos os painéis, a foto e o nome no canto inferior esquerdo do menu levam ao perfil. As listas são paginadas (5 itens por página no celular, 10 no computador).

## Tecnologias

- HTML, CSS e JavaScript (módulos ES), sem etapa de build
- Firebase: Authentication, Firestore e Hosting
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
    sw.js                service worker (a constante CACHE muda a cada atualização)
    css/styles.css
    js/
      main.js            rotas e transições
      api.js             camada de dados (Firebase ou modo demonstração)
      ui.js              componentes e utilitários
      aluno.js           telas do aluno
      painel.js          painel do dono e do treinador
      perfil.js          tela de perfil
      plano.js           planos e pagamentos
      firebase-config.js configuração do seu projeto Firebase
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

## Atualizando o app

Coloque o `.zip` de atualização (`garrote-app*.zip`) na raiz do repositório e rode:

```
./atualizar.sh
```

O script guarda o seu `firebase-config.js` e o `.firebaserc`, extrai o zip por cima, remove o zip e faz o deploy.
