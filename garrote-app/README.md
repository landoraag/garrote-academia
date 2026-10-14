# Garrote Academia — sistema com dono, treinador e aluno

HTML, CSS e JavaScript puros (sem build). Usa Firebase Authentication e Firestore.
Sem configurar nada, abre em **modo demonstração** (dados só no navegador).

## Quem faz o quê
- **Dono:** cria treinadores, alunos e modalidades, vê check-ins e aulas experimentais e cuida do dinheiro:
  - **Planos:** cria os planos (Mensal, Trimestral, Semestral, Anual, Família, Total Pass...) com o valor de cada um.
  - **Financeiro:** vê todos os alunos (foto, nome, e-mail), o plano de cada um, o valor por mês, a situação (Em dia, Em atraso, Pendente, Sem plano, Total Pass) e o vencimento. Registra pagamentos (o vencimento avança sozinho) e vê o histórico.
  - **Plano família:** use o mesmo "Grupo familiar" nos alunos da família. O valor do plano é dividido entre eles.
  - O dono **não** cria treinos, categorias nem exercícios e não alterna entre telas.
- **Treinador:** cria os próprios alunos, exercícios, categorias e treinos, e atribui treinos aos alunos.
- **Aluno:** faz check-in diário, vê e executa o treino, vê modalidades e agenda aula experimental.
- **Todos:** em *Meu perfil* trocam foto, nome e senha. A foto é guardada no Firestore (coleção `fotos`), sem precisar do Storage.
- **Layout:** pensado para celular e adaptado para computador (menu lateral).

## Testar agora (demonstração)
    cd public && python3 -m http.server 8080     # ou: npx serve public
Abra o endereço. No login, toque em Dono, Treinador ou Aluno (senha 123456).

## Colocar no Firebase (uma vez só)
1. **Console do Firebase > Build > Authentication > Começar > E-mail/senha > Ativar.**
2. **Build > Firestore Database > Criar banco** (modo produção, região São Paulo).
3. **Configurações do projeto > Seus apps > Web (`</>`)**: registre o app e copie o `firebaseConfig`.
4. Cole os valores em `public/js/firebase-config.js`.
5. No terminal, dentro da pasta do projeto:
       firebase deploy --only hosting,firestore:rules
6. Abra o endereço do app. Como ainda não existe dono, aparece **“Primeiro acesso: criar conta do dono”**. Crie a sua na hora (essa opção some depois).
7. Entre como dono e cadastre os treinadores. Cada treinador cadastra os alunos.

## Pontos importantes
- A senha provisória aparece na tela ao criar a conta, para você repassar. Também dá para mandar o e-mail de definição de senha.
- “Excluir” uma pessoa remove o acesso dela ao app. A conta de login continua no Authentication (pode apagar no console).
- Vídeos e fotos entram por **link** (YouTube ou arquivo .mp4/imagem já hospedado). Enviar arquivos direto exige o Firebase Storage, que hoje pede plano pago (Blaze).
- As regras de segurança estão em `firestore.rules` (só o dono cria treinadores; o treinador só mexe nos próprios alunos).
- A sequência de dias seguidos não é quebrada pelo domingo.
