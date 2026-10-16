# Garrote Academia

App web de academia com três perfis (**dono**, **treinador** e **aluno**). HTML, CSS e JavaScript puros, **sem build e sem npm**. Usa Firebase Authentication e Firestore. Sem configurar nada, abre em **modo demonstração** (dados só no navegador).

> Este README é o mapa do projeto: diz o que cada arquivo faz, como os dados são guardados e onde mexer para cada tipo de mudança.

## Sumário
1. [Quem faz o quê](#quem-faz-o-quê)
2. [Estrutura de pastas](#estrutura-de-pastas)
3. [Mapa dos arquivos JavaScript](#mapa-dos-arquivos-javascript)
4. [Telas e rotas](#telas-e-rotas)
5. [Dados (Firestore)](#dados-firestore)
6. [Permissões (firestore.rules)](#permissões-firestorerules)
7. [Onde mexer para…](#onde-mexer-para)
8. [Testar agora (demonstração)](#testar-agora-demonstração)
9. [Colocar no Firebase (uma vez só)](#colocar-no-firebase-uma-vez-só)
10. [Publicar mudanças e enviar para o GitHub](#publicar-mudanças-e-enviar-para-o-github)
11. [Pontos importantes](#pontos-importantes)

## Quem faz o quê
- **Dono:** cria treinadores, alunos e modalidades, vê check-ins e aulas experimentais e cuida do dinheiro:
  - **Planos:** cria os planos (Mensal, Trimestral, Semestral, Anual, Família, Total Pass...) com o valor de cada um.
  - **Financeiro:** vê todos os alunos (foto, nome, e-mail), o plano de cada um, o valor por mês, a situação (Em dia, Em atraso, Pendente, Sem plano, Total Pass) e o vencimento. Registra pagamentos (o vencimento avança sozinho) e vê o histórico.
  - **Plano família:** use o mesmo "Grupo familiar" nos alunos da família. O valor do plano é dividido entre eles.
  - O dono **não** cria treinos, categorias nem exercícios.
- **Treinador:** cria os próprios alunos, exercícios, categorias e treinos, e atribui treinos aos alunos. Não mexe em plano, grupo familiar nem vencimento.
- **Aluno:** faz check-in diário, vê e executa o treino, acompanha a sequência de dias seguidos e a meta do mês, vê modalidades e agenda aula experimental. Ao tocar em *Iniciar treino* (ou na primeira série), um **cronômetro** começa a contar e só para em *Finalizar treino* ou *Encerrar treino*; o horário fica salvo na coleção `execucoes` (campos `inicio`, `fim` e `duracao`).
- **Todos:** em *Meu perfil* trocam foto, nome e senha. A foto é guardada no Firestore (coleção `fotos`), sem precisar do Storage.
- **Layout:** pensado para celular e adaptado para computador (menu lateral). No celular, o painel do dono e do treinador tem menu lateral que abre e uma barra de atalhos em ícones na parte de baixo.
- **Listas com paginação:** todas as listas do painel mostram **10 itens por página**. Passando de 10, aparece o botão **"Ir para a Próxima Página - 1 de N"** (e "Página anterior"), na mesma tela, sem recarregar. A busca vale para todas as páginas.

## Estrutura de pastas
```
garrote-academia/
├── README.md                  este arquivo (também copiado em garrote-app/README.md)
├── atualizar.sh               script auxiliar na raiz do repositório
└── garrote-app/               o projeto Firebase (rode os comandos do firebase aqui dentro)
    ├── firebase.json          hosting (pasta public, sem cache em js/css/imagens) + caminho das regras
    ├── .firebaserc            projeto padrão: garrote-academia
    ├── firestore.rules        regras de segurança do banco
    ├── .firebase/             cache do deploy (gerado sozinho, não editar)
    └── public/                tudo que vai para o ar
        ├── index.html         página única: carrega css e js/main.js, registra o service worker
        ├── sw.js              service worker (cache do app, abre rápido). Versão em CACHE = 'garrote-v2'
        ├── manifest.webmanifest   dados para instalar como app no celular
        ├── assets/            logo.png, favicon.png, icon-180.png, icon-192.png, icon-512.png
        ├── css/styles.css     todos os estilos, em blocos comentados por versão (v2 ... v8 e paginação)
        └── js/                código do app (módulos ES, sem bundler)
            ├── main.js        roteador, login, primeiro acesso e controle de acesso por papel
            ├── api.js         camada de dados (Firebase ou demonstração)
            ├── ui.js          utilidades, ícones, toast, modal
            ├── painel.js      painel do dono e do treinador (cadastros, financeiro, visão geral)
            ├── aluno.js       telas do aluno
            ├── perfil.js      Meu perfil (foto, nome, senha)
            ├── plano.js       planos e situação de pagamento
            └── firebase-config.js   configuração do app web do Firebase
```

## Mapa dos arquivos JavaScript

### `js/main.js`
- `SCREENS`: uma função por tela. As telas `login`, `setup` (primeiro acesso, criar dono) e `semperfil` ficam aqui; `home`, `treinos`, `treino`, `exercicio`, `modalidades`, `modalidade` e `perfil` vêm de `aluno.js`; `painel` vem de `painel.js`.
- `render()`: lê a rota em `location.hash`, aplica o controle de acesso (quem não tem login vai para `#/login`; dono e treinador só usam `#/painel/...`; aluno só as telas dele) e faz a transição entre telas.
- `api.onAuth(...)`: ao entrar, carrega o perfil (`users/{uid}`) e a foto; se o perfil estiver com `ativo: 'nao'`, desloga.
- Mostra aviso "Nova versão pronta" quando o service worker detecta arquivos novos.

### `js/api.js`
Mesma interface em dois modos, escolhidos por `firebase-config.js` (com `apiKey` preenchida = Firebase; vazia = demonstração):
- Funções: `onAuth`, `login`, `logout`, `reset` (e-mail de nova senha), `signUp`, `createAccount` (cria a conta de outra pessoa sem derrubar a sessão de quem está logado), `changePassword`, `setup`, `get`, `list(coleção, filtros)`, `set`, `add`, `update`, `del`.
- **Firebase:** SDK 10.14.1 carregado do gstatic. As listas ficam em cache na memória por 30 segundos; qualquer gravação limpa o cache da coleção.
- **Demonstração:** tudo em `localStorage` (chave `garrote:demo:v3`), com dados de exemplo. Contas de teste (senha `123456`): `dono@garrote.demo`, `treinador@garrote.demo`, `aluno@garrote.demo`.

### `js/ui.js`
- Atalhos: `$`, `$$`, `esc` (escapa HTML), `brl` (R$), `dkey` (data AAAA-MM-DD), `initials`, `firstName`, `avatar`.
- `SESSION` (usuário logado, perfil, modo de visualização), `sid()` e `ro()` (somente leitura quando o dono/treinador abre a tela de um aluno).
- Ícones (`ICON`, `ICONF`, função `ic`), `logo`, `toast`, `countUp`.
- `openModal`, `confirmBox`, `fail` (erro para mostrar ao usuário) e `friendly` (traduz erros do Firebase).

### `js/painel.js` (dono e treinador)
- `MENU` e `BNAV`: abas do menu lateral e da barra de baixo, por papel. Dono: Visão geral, Treinadores, Alunos, Modalidades, Planos, Financeiro, Meu perfil. Treinador: Visão geral, Meus alunos, Treinos, Exercícios, Categorias, Meu perfil.
- `load(tab)`: busca as coleções necessárias (`users`, `modalidades`, `categorias`, `exercicios`, `treinos`, `planos`, e `pagamentos`/`checkins`/`agendamentos` quando a aba precisa).
- `schema(tab, D, E)`: **define cada cadastro** (coleção, título, campos do formulário e colunas da tabela). Para criar ou ajustar um cadastro, é aqui. Abas: `treinadores`, `alunos`, `modalidades`, `planos`, `categorias`, `exercicios`, `treinos`.
- Formulário: `openForm`, `fieldHTML` (tipos: texto, select, multi, days, items, textarea, money...), `collect` (valida e monta os dados), `saveRow` (grava; cria conta de login para treinador/aluno e mostra a senha provisória em `showCreds`).
- Tabelas: `tableHTML`, `rowHTML`, **paginação** (`PAGE = 10`, `pagerHTML`, `pager`), busca em todas as páginas (dentro de `bind`), `openDet` (Detalhes, usado no celular), `delRow`.
- Financeiro: `finCalc` (situação e valor por aluno, divide plano família), `finHTML`, `finRow`, `bindFin` (filtros por situação, busca e paginação), `openPay` (registra pagamento e avança o vencimento), `openPlano`, `openHist`, `openFinDet`.
- Visão geral: `visaoHTML` (contadores, check-ins de hoje, aulas experimentais agendadas).
- `build` monta a tela (menu, topo do celular, barra de baixo) e `bind` liga os eventos.

### `js/aluno.js` (celular)
- `home`: check-in do dia, sequência de dias seguidos (`streakInfo`, domingo não quebra a sequência), meta do mês (`META_MES = 20` treinos), treino de hoje.
- `treinos` / `treino(tid)` / `exercicio(tid, n)`: lista de treinos, execução série a série, vídeo de como fazer, descanso, cronômetro. Grava em `execucoes` (`salvarExec`).
- `modalidades` / `modalidade(id)`: lista e detalhe, com agendamento de aula experimental (grava/apaga em `agendamentos`).
- `perfil`: Meu perfil do aluno, com plano e situação do pagamento.
- Aceita modo somente leitura (`ro()`), usado quando o dono/treinador abre as telas de um aluno.

### `js/perfil.js`
`perfilHTML` e `bindPerfil`: trocar foto (recorta quadrado e reduz para 240 px, guarda em `fotos/{uid}`), nome e senha (pede a senha atual).

### `js/plano.js`
`PERIODOS`, `perLabel`, `mensalDe` (valor por mês), `ptDate`, `addMonths` (31/01 + 1 mês = 28/02) e `situ(aluno, plano)` que devolve a situação: Inativo, Sem plano, Total Pass, Pendente, Em atraso ou Em dia.

## Telas e rotas
O app usa `#/rota` (hash). Rotas:

| Rota | Quem | O que abre |
|---|---|---|
| `#/login` | todos | Entrar, esqueci minha senha |
| `#/setup` | só enquanto não existe dono | Criar a conta do dono |
| `#/home` | aluno | Início |
| `#/treinos`, `#/treino/:id`, `#/exercicio/:id/:n` | aluno | Treinos e execução |
| `#/modalidades`, `#/modalidade/:id` | aluno | Modalidades e aula experimental |
| `#/perfil` | aluno | Meu perfil |
| `#/painel/:aba` | dono e treinador | `visao`, `treinadores`, `alunos`, `modalidades`, `planos`, `financeiro`, `treinos`, `exercicios`, `categorias`, `perfil` |

## Dados (Firestore)
| Coleção | Documento | Campos principais |
|---|---|---|
| `users` | uid do login | `nome`, `email`, `telefone`, `role` (`dono`, `treinador` ou `aluno`), `ativo` (`sim`/`nao`), `treinadorId`, `modalidades[]`, `planoId`, `familiaId`, `vencimento`, `ultimoPagamento`, `criadoPor`, `criadoEm` |
| `fotos` | uid | `data` (imagem em texto) |
| `config` | `setup` | `donoUid` (marca que o primeiro acesso já foi feito) |
| `modalidades` | automático | `nome`, `icone`, `prof`, `local`, `dias[]` (1=SEG ... 7=DOM), `ini`, `fim`, `duracao`, `vagas`, `nivel`, `descricao`, `foto`, `video` |
| `categorias` | automático | `nome` |
| `exercicios` | automático | `nome`, `categoriaId`, `equip`, `video`, `descricao` |
| `treinos` | automático | `nome`, `modalidadeId`, `dias[]`, `alunoIds[]`, `itens[]` (`exId`, `series`, `reps`, `kg`, `descanso`), `criadoPor` |
| `planos` | automático | `nome`, `categoria` (`academia`/`totalpass`), `periodo` (1, 3, 6 ou 12 meses), `valor`, `familia` (`sim`/`nao`), `membros`, `descricao` |
| `pagamentos` | automático | `alunoIds[]`, `planoId`, `valor`, `data`, `meses`, `forma`, `familiaId`, `registradoPor` |
| `checkins` | `uid_AAAA-MM-DD` | `uid`, `data`, `ts` |
| `execucoes` | começa com `uid_` | `uid`, `tid`, `data`, `feitos`, `valores`, `inicio`, `fim`, `duracao` |
| `agendamentos` | `uid_idDaModalidade` | `uid`, `modId`, `slotKey`, `hora`, `ts` |

## Permissões (firestore.rules)
- **Dono:** tudo em `users`, `modalidades`, `planos` e `pagamentos`. Não escreve em categorias, exercícios e treinos.
- **Treinador:** cria e altera apenas os próprios alunos (não mexe em `planoId`, `familiaId`, `vencimento`, `ultimoPagamento`); escreve em `categorias` e `exercicios`; cria, altera e apaga só os treinos que ele criou (`criadoPor`).
- **Aluno:** lê as coleções de consulta, o próprio perfil, o próprio plano e os próprios pagamentos; grava o próprio check-in, execuções e agendamentos (o id do documento precisa começar pelo uid dele); muda só o próprio nome e telefone.
- **Qualquer pessoa logada** troca a própria foto.
- `config/setup`: qualquer um lê; só é criado enquanto o dono ainda não existe.
- Quando mudar as regras, publique com `firebase deploy --only firestore:rules`.

## Onde mexer para…
| Quero... | Arquivo e lugar |
|---|---|
| Mudar quantos itens aparecem por página | `painel.js`, constante `PAGE` |
| Adicionar ou tirar um campo de um cadastro | `painel.js`, `schema()` (campos em `fields`, colunas em `cols`); se for campo novo de `users`, ajuste também `saveRow` e, se precisar, `firestore.rules` |
| Criar uma aba nova no painel | `painel.js`: `MENU`, `BNAV` (opcional) e `schema()`; coleção nova em `load()` e em `firestore.rules` |
| Mudar planos, períodos ou regra de situação do pagamento | `plano.js` |
| Mudar como o financeiro soma ou divide valores | `painel.js`, `finCalc` |
| Mudar a meta mensal de treinos do aluno | `aluno.js`, `META_MES` |
| Mudar textos, telas de login ou regras de acesso por papel | `main.js` |
| Mudar cores, tamanhos e layout | `css/styles.css` (blocos comentados) |
| Trocar logo e ícones | `public/assets/` (mantenha os nomes) |
| Trocar de projeto Firebase | `public/js/firebase-config.js` e `.firebaserc` |
| Adicionar um arquivo `.js` novo | liste em `index.html` (`modulepreload`) e em `sw.js` (`SHELL`) e troque a versão `CACHE` do `sw.js` |

## Testar agora (demonstração)
Deixe `apiKey` vazia em `public/js/firebase-config.js` e rode:

    cd garrote-app/public && python3 -m http.server 8080     # ou: npx serve public

Abra o endereço. No login, toque em Dono, Treinador ou Aluno (senha 123456). Os dados ficam só neste navegador. Para ver a paginação, crie mais de 10 itens em qualquer lista.

## Colocar no Firebase (uma vez só)
1. **Console do Firebase > Build > Authentication > Começar > E-mail/senha > Ativar.**
2. **Build > Firestore Database > Criar banco** (modo produção, região São Paulo).
3. **Configurações do projeto > Seus apps > Web (`</>`)**: registre o app e copie o `firebaseConfig`.
4. Cole os valores em `public/js/firebase-config.js`.
5. No terminal, dentro da pasta `garrote-app`:

       firebase deploy --only hosting,firestore:rules
6. Abra o endereço do app. Como ainda não existe dono, aparece **"Primeiro acesso: criar conta do dono"**. Crie a sua na hora (essa opção some depois).
7. Entre como dono e cadastre os treinadores. Cada treinador cadastra os alunos.

## Publicar mudanças e enviar para o GitHub
Não existe compilação. Depois de editar os arquivos:

    cd garrote-app
    firebase deploy --only hosting            # só o app (use hosting,firestore:rules se mudou as regras)
    cd ..
    git status
    git add garrote-app
    git commit -m "descreva a mudança"
    git push

No celular, recarregue o app uma ou duas vezes depois de publicar (o service worker mostra o aviso "Nova versão pronta").

## Pontos importantes
- A senha provisória aparece na tela ao criar a conta, para você repassar. Também dá para mandar o e-mail de definição de senha.
- "Excluir" uma pessoa remove o acesso dela ao app. A conta de login continua no Authentication (pode apagar no console).
- Vídeos e fotos de modalidades e exercícios entram por **link** (YouTube ou arquivo .mp4/imagem já hospedado). Enviar arquivos direto exige o Firebase Storage, que hoje pede plano pago (Blaze). A foto de perfil é a exceção: fica no Firestore.
- As regras de segurança estão em `firestore.rules` (só o dono cria treinadores; o treinador só mexe nos próprios alunos).
- A sequência de dias seguidos não é quebrada pelo domingo.
- `firebase-config.js` contém a configuração pública do app web (não é senha), mas só quem está no `firestore.rules` com permissão consegue ler e gravar dados.
