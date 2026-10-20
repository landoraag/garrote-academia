/* Política de Privacidade, Termos de Uso e aviso de armazenamento (LGPD — Lei 13.709/2018).
   Os textos descrevem o que o app realmente faz. Ao mudar o app (novo dado, novo serviço), atualize aqui.
   Preencha os dados da academia em CONTROLADOR antes do lançamento: campos vazios aparecem destacados. */
import { esc, logo } from './ui.js';

export const CONTROLADOR = {
  nome: 'Garrote Academia',
  razaoSocial: '',          // ex.: Garrote Academia Ltda.
  cnpj: '',                 // ex.: 00.000.000/0001-00
  endereco: '',             // endereço completo
  emailPrivacidade: '',     // e-mail para pedidos sobre dados pessoais
  encarregado: '',          // nome do encarregado de dados (DPO) ou "o próprio responsável"
  cidadeForo: ''            // cidade da academia
};
export const ATUALIZADO = '19/10/2026';
const AVISO_KEY = 'garrote:aviso-privacidade:v1';

const f = v => v ? esc(v) : '<mark class="lg-falta">[a preencher]</mark>';
const C = CONTROLADOR;
const contato = () => C.emailPrivacidade ? `<a href="mailto:${esc(C.emailPrivacidade)}">${esc(C.emailPrivacidade)}</a>` : f('');

const voltar = `<a class="lg-voltar" href="#/login" onclick="if(history.length>1){event.preventDefault();history.back()}">← Voltar</a>`;
const pagina = (titulo, corpo) => ({ depth: 3, html: `<div class="lg">
  <header class="lg-top">${voltar}${logo(30)}</header>
  <article class="lg-doc"><h1 class="h1">${titulo}</h1><p class="muted">Última atualização: ${ATUALIZADO}</p>${corpo}
  <nav class="lg-nav"><a href="#/privacidade">Política de Privacidade</a> · <a href="#/termos">Termos de Uso</a></nav></article></div>` });

/* ---------------- Política de Privacidade ---------------- */
export const privacidade = () => pagina('Política de Privacidade', `
<p>Esta política explica quais dados pessoais o app da ${f(C.nome)} coleta, por que, com quem compartilha, por quanto tempo guarda e como você exerce seus direitos, de acordo com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).</p>

<h2>1. Quem cuida dos seus dados</h2>
<p><b>Controlador:</b> ${f(C.razaoSocial || C.nome)}, CNPJ ${f(C.cnpj)}, ${f(C.endereco)}.<br>
<b>Encarregado de dados (DPO):</b> ${f(C.encarregado)} · ${contato()}</p>
<p>A academia decide como os dados são usados. Os serviços listados no item 5 tratam dados em nome da academia, como operadores.</p>

<h2>2. Quais dados coletamos</h2>
<table class="lg-tab"><thead><tr><th>Dado</th><th>De onde vem</th></tr></thead><tbody>
<tr><td>Nome, e-mail e telefone</td><td>Cadastro feito pela academia; você pode alterar nome e telefone</td></tr>
<tr><td>Senha</td><td>Criada por você. Fica guardada pelo Google (Firebase) de forma criptografada; a academia não tem acesso a ela</td></tr>
<tr><td>Foto de perfil</td><td>Opcional, enviada por você</td></tr>
<tr><td>Plano, modalidades, treinador, grupo familiar, vencimento e situação da matrícula</td><td>Cadastro feito pela academia</td></tr>
<tr><td>Treinos, cargas, repetições, tempos, nível de esforço e observações</td><td>Registrados por você e pelo seu treinador ao usar o app</td></tr>
<tr><td>Check-ins (dias em que treinou) e aulas experimentais agendadas</td><td>Registrados quando você usa o app</td></tr>
<tr><td>Pagamentos: valor, data, forma (Pix ou cartão), plano e identificador da transação</td><td>Gerados quando você paga pelo app ou quando a academia registra um pagamento</td></tr>
<tr><td>CPF do titular do cartão</td><td>Informado por você ao pagar com cartão; é enviado ao Mercado Pago e <b>não fica guardado</b> no app</td></tr>
<tr><td>Dados técnicos: endereço IP, tipo de navegador, data e hora de acesso</td><td>Coletados automaticamente pelos servidores para segurança</td></tr>
</tbody></table>
<p><b>Dados do cartão:</b> número, validade e código de segurança são digitados em campos do próprio Mercado Pago e <b>nunca passam pelos servidores da academia</b>. Recebemos apenas um código de uso único (token) para concluir o pagamento.</p>
<p><b>Dados de saúde:</b> o app não pede informações de saúde. Evite escrever condições de saúde nos campos de observação; se precisar informar algo assim, fale diretamente com seu treinador.</p>

<h2>3. Para que usamos e com qual base legal</h2>
<table class="lg-tab"><thead><tr><th>Finalidade</th><th>Base legal (LGPD, art. 7º)</th></tr></thead><tbody>
<tr><td>Criar e manter sua conta, montar e acompanhar seus treinos, controlar check-ins e agendamentos</td><td>Execução de contrato (inciso V)</td></tr>
<tr><td>Cobrar a mensalidade, processar pagamentos e atualizar seu vencimento automaticamente</td><td>Execução de contrato (inciso V)</td></tr>
<tr><td>Guardar o histórico de pagamentos para fins fiscais e contábeis</td><td>Cumprimento de obrigação legal (inciso II)</td></tr>
<tr><td>Proteger o app contra fraudes, robôs e acessos indevidos (limites de tentativas, registros técnicos)</td><td>Legítimo interesse (inciso IX) e prevenção à fraude</td></tr>
<tr><td>Foto de perfil e avisos no celular (fim do descanso, treino em andamento)</td><td>Consentimento (inciso I): você escolhe ativar e pode desativar quando quiser</td></tr>
</tbody></table>
<p>Não vendemos seus dados, não usamos para publicidade e não fazemos perfis de comportamento para marketing.</p>

<h2>4. Quem vê seus dados dentro da academia</h2>
<ul><li><b>Você:</b> seus próprios dados, treinos e pagamentos.</li>
<li><b>Seu treinador:</b> seu cadastro e seus treinos, para acompanhar sua evolução. Ele não altera plano, vencimento nem pagamentos.</li>
<li><b>Dono/administração:</b> cadastro, plano, situação e pagamentos, para a gestão da academia.</li></ul>

<h2>5. Com quem compartilhamos</h2>
<table class="lg-tab"><thead><tr><th>Serviço</th><th>Para quê</th><th>Dados</th></tr></thead><tbody>
<tr><td>Google Firebase (Google LLC)</td><td>Login, banco de dados e hospedagem do app</td><td>Todos os dados do app</td></tr>
<tr><td>Vercel (Vercel Inc.)</td><td>Servidor que processa os pagamentos</td><td>Dados da cobrança, IP e registros técnicos</td></tr>
<tr><td>Mercado Pago (Mercado Pago Instituição de Pagamento Ltda.)</td><td>Processar Pix e cartão</td><td>Nome, e-mail, valor, CPF e dados do cartão (digitados direto no Mercado Pago)</td></tr>
<tr><td>Google Fonts</td><td>Fontes do app</td><td>Endereço IP e navegador</td></tr>
<tr><td>YouTube (Google)</td><td>Vídeos de exercícios, só quando você abre um vídeo</td><td>Endereço IP e navegador. Usamos o modo de privacidade aprimorada</td></tr>
</tbody></table>
<p>Também podemos compartilhar dados quando a lei exigir ou por ordem de autoridade competente.</p>
<p><b>Transferência internacional:</b> Google e Vercel podem armazenar dados em servidores fora do Brasil. Essa transferência ocorre com base no art. 33 da LGPD, com fornecedores que adotam cláusulas contratuais e medidas de segurança compatíveis com a lei.</p>

<h2>6. Por quanto tempo guardamos</h2>
<ul><li><b>Conta, treinos e check-ins:</b> enquanto você for aluno. Após o fim do vínculo, a academia exclui ou anonimiza os dados quando não houver mais necessidade, salvo obrigação legal.</li>
<li><b>Pagamentos:</b> pelo prazo exigido pela legislação fiscal e contábil (em regra, 5 anos).</li>
<li><b>Registros técnicos e de segurança:</b> pelo tempo necessário à segurança, conforme a política de cada fornecedor. Os contadores anti-robô do app expiram em poucas horas e não guardam o IP em texto.</li>
<li><b>Cobranças Pix não pagas:</b> expiram em 1 hora no Mercado Pago.</li></ul>

<h2>7. Como protegemos</h2>
<ul><li>Conexão sempre criptografada (HTTPS).</li>
<li>Senhas guardadas pelo Google com criptografia; ninguém da academia tem acesso a elas.</li>
<li>Regras de acesso no banco de dados: cada pessoa só vê o que precisa.</li>
<li>Pagamentos conferidos direto com o Mercado Pago antes de qualquer baixa; o app não aceita valores enviados pelo navegador.</li>
<li>Limites de tentativas contra robôs e contra uso de cartões roubados.</li>
<li>Chaves de acesso guardadas apenas nos servidores, nunca no app.</li></ul>
<p>Nenhum sistema é 100% invulnerável. Se ocorrer um incidente de segurança que possa trazer risco a você, avisaremos você e a Autoridade Nacional de Proteção de Dados (ANPD), como determina a lei.</p>

<h2>8. Seus direitos (LGPD, art. 18)</h2>
<p>Você pode, a qualquer momento e de graça:</p>
<ul><li>confirmar se tratamos seus dados e ter acesso a eles;</li>
<li>corrigir dados incompletos, inexatos ou desatualizados;</li>
<li>pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
<li>pedir a portabilidade dos seus dados;</li>
<li>pedir a eliminação dos dados tratados com seu consentimento e revogar esse consentimento;</li>
<li>saber com quem compartilhamos seus dados;</li>
<li>saber o que acontece se não der o consentimento;</li>
<li>pedir revisão de decisões tomadas apenas de forma automatizada.</li></ul>
<p><b>Como pedir:</b> envie um e-mail para ${contato()} ou fale com a recepção. Respondemos em até 15 dias. Podemos pedir uma confirmação de identidade para proteger você. Alguns dados podem precisar ser mantidos por obrigação legal, como o histórico de pagamentos.</p>
<p>Você também pode reclamar à ANPD em <a href="https://www.gov.br/anpd" target="_blank" rel="noopener">gov.br/anpd</a>.</p>

<h2>9. Cookies e armazenamento no aparelho</h2>
<p>O app <b>não usa cookies de publicidade nem de rastreamento</b>. Ele guarda no seu aparelho apenas o necessário para funcionar:</p>
<table class="lg-tab"><thead><tr><th>O quê</th><th>Para quê</th><th>Tipo</th></tr></thead><tbody>
<tr><td>Sessão de login (Firebase)</td><td>Manter você conectado com segurança</td><td>Essencial</td></tr>
<tr><td>Cópia do app (service worker)</td><td>Abrir o app rápido e funcionar com internet fraca</td><td>Essencial</td></tr>
<tr><td>Cronômetro do treino e descanso</td><td>Manter o tempo certo ao trocar de tela</td><td>Essencial</td></tr>
<tr><td>Tipo de conta (aluno ou equipe)</td><td>Abrir direto na tela certa</td><td>Funcional</td></tr>
<tr><td>Tema claro/escuro</td><td>Lembrar sua preferência</td><td>Preferência</td></tr>

<tr><td>Contador de tentativas de login e de senha</td><td>Proteger sua conta contra tentativas repetidas (não guarda o e-mail em texto)</td><td>Essencial (segurança)</td></tr>
<tr><td>Aviso de privacidade lido</td><td>Não mostrar o aviso de novo</td><td>Preferência</td></tr>
</tbody></table>
<p>Ao abrir um vídeo do YouTube, o próprio YouTube pode gravar dados no seu navegador, conforme a política dele. Você pode apagar todos esses dados nas configurações do navegador; você só precisará entrar de novo no app.</p>

<h2>10. Crianças e adolescentes</h2>
<p>Alunos menores de 18 anos só são cadastrados com autorização de pai, mãe ou responsável legal, que pode exercer todos os direitos desta política em nome do menor. Os dados de menores são tratados no melhor interesse deles, como determina o art. 14 da LGPD.</p>

<h2>11. Mudanças nesta política</h2>
<p>Podemos atualizar esta política quando o app mudar. A data no topo indica a última versão. Mudanças importantes serão avisadas no app.</p>
`);

/* ---------------- Termos de Uso ---------------- */
export const termos = () => pagina('Termos de Uso', `
<p>Estes termos regem o uso do app da ${f(C.nome)} (${f(C.razaoSocial || C.nome)}, CNPJ ${f(C.cnpj)}). Ao usar o app, você concorda com eles e com a <a href="#/privacidade">Política de Privacidade</a>.</p>

<h2>1. O que o app oferece</h2>
<p>Acesso aos seus treinos, registro de check-ins e evolução, agendamento de aulas experimentais, consulta do seu plano e pagamento da mensalidade.</p>

<h2>2. Sua conta</h2>
<ul><li>A conta é criada pela academia e é pessoal e intransferível.</li>
<li>Você é responsável por manter sua senha em segredo. Se suspeitar de uso indevido, troque a senha e avise a academia.</li>
<li>Mantenha seus dados de contato atualizados.</li></ul>

<h2>3. Uso correto</h2>
<p>É proibido tentar acessar dados de outras pessoas, burlar as regras do app, usar robôs ou programas automáticos, testar cartões ou fazer pagamentos com cartão de terceiros sem autorização. Esse uso pode levar ao bloqueio da conta e à comunicação às autoridades.</p>

<h2>4. Treinos e saúde</h2>
<p>Os treinos são orientados pelos profissionais da academia. O app não substitui avaliação médica. Antes de começar ou mudar sua rotina de exercícios, consulte um médico. Pare o exercício e procure ajuda se sentir dor, tontura ou mal-estar.</p>

<h2>5. Pagamentos</h2>
<ul><li>Os valores e as condições dos planos são definidos pela academia e aparecem no app antes do pagamento.</li>
<li>Os pagamentos são processados pelo <b>Mercado Pago</b>, que segue as próprias regras e a regulação do Banco Central.</li>
<li><b>Pix:</b> pagamento à vista. Nos planos que podem ser parcelados, o Pix tem desconto extra, mostrado na tela de pagamento.</li>
<li><b>Cartão:</b> pode ser parcelado até o limite do plano. Juros de parcelamento, quando houver, são informados pelo Mercado Pago antes da confirmação.</li>
<li>Depois da confirmação do pagamento, o vencimento do plano é atualizado automaticamente. Se você pagar antes do vencimento, o novo período começa depois do atual.</li>
<li>Nos planos família, um pagamento renova todos os membros do grupo.</li>
<li>Não há cobrança automática recorrente: cada período é pago por você.</li>
<li>Cancelamentos, trocas de plano e reembolsos seguem o contrato com a academia e o Código de Defesa do Consumidor. Fale com a recepção.</li>
<li>Planos pelo Total Pass são pagos no aplicativo do Total Pass, não por este app.</li></ul>

<h2>6. Disponibilidade</h2>
<p>Trabalhamos para manter o app sempre no ar, mas podem ocorrer interrupções por manutenção, falhas de internet ou dos serviços parceiros. Se um pagamento não aparecer no app, guarde o comprovante e fale com a recepção.</p>

<h2>7. Conteúdo e propriedade</h2>
<p>A marca, o visual e os conteúdos do app pertencem à academia ou a seus parceiros e não podem ser copiados sem autorização. Os vídeos de exercícios podem vir do YouTube e seguem as regras dele.</p>

<h2>8. Encerramento</h2>
<p>A conta pode ser desativada ao fim do vínculo com a academia ou em caso de descumprimento destes termos. Seus dados seguem o que está na Política de Privacidade.</p>

<h2>9. Mudanças e foro</h2>
<p>Estes termos podem ser atualizados; a data no topo indica a versão atual. Aplica-se a lei brasileira. Fica eleito o foro do domicílio do consumidor${C.cidadeForo ? ` ou o da comarca de ${esc(C.cidadeForo)}` : ''}, conforme o Código de Defesa do Consumidor.</p>
<p>Dúvidas: ${contato()}.</p>
`);

/* ---------------- aviso de armazenamento (primeira visita) ----------------
   O app só usa armazenamento essencial e de preferência, sem rastreamento:
   não precisa de consentimento, mas a LGPD pede transparência. */
export function avisoPrivacidade() {
  try { if (localStorage.getItem(AVISO_KEY)) return; } catch { return; }
  if (document.querySelector('.lg-aviso') || /^\/(privacidade|termos)/.test(location.hash.slice(1) || location.pathname)) return;   // quem já está lendo a política não precisa do aviso
  const d = document.createElement('div');
  d.className = 'lg-aviso'; d.setAttribute('role', 'region'); d.setAttribute('aria-label', 'Aviso de privacidade');
  d.innerHTML = `<p>Este app usa apenas armazenamento essencial para funcionar (login, preferências e cronômetro). Não usamos cookies de publicidade nem de rastreamento. Saiba mais na <a href="#/privacidade">Política de Privacidade</a>.</p><button type="button" class="btn red">Entendi</button>`;
  d.querySelector('button').onclick = () => { try { localStorage.setItem(AVISO_KEY, new Date().toISOString()); } catch {} d.remove(); };
  document.body.appendChild(d);
}

export const linksLegais = (cls = '') => `<p class="lg-links ${cls}"><a href="#/privacidade">Privacidade</a> · <a href="#/termos">Termos de uso</a></p>`;
