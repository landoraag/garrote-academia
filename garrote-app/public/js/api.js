/* Camada de dados. Duas implementações com a mesma interface:
   - firebase: Authentication + Firestore (quando firebase-config.js está preenchido)
   - demo: tudo em localStorage, para testar sem backend */
import { firebaseConfig as cfg } from './firebase-config.js';
export const mode = cfg.apiKey ? 'firebase' : 'demo';

async function makeFirebase() {
  const B = 'https://www.gstatic.com/firebasejs/10.14.1/';
  const [App, A, F] = await Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-auth.js'), import(B + 'firebase-firestore-lite.js').catch(() => import(B + 'firebase-firestore.js'))]);   // lite: carrega mais rápido e cada gravação responde na hora
  const app = App.initializeApp(cfg), auth = A.getAuth(app), db = F.getFirestore(app);
  auth.languageCode = 'pt-BR';   // e-mails do Firebase (redefinição de senha) em português
  const withId = s => ({ id: s.id, ...s.data() });
  const clean = d => JSON.parse(JSON.stringify(d));
  /* gravação: o Firestore só responde quando o servidor confirma; com internet instável isso podia demorar e a tela travava.
     Se passar de 10 s sem resposta, libera a tela (o envio continua em segundo plano) */
  const wr = p => { p.catch(e => console.error('gravação', e)); return Promise.race([p, new Promise(r => setTimeout(r, 10000))]); };
  /* cache de listas na memória (30 s): trocar de tela fica instantâneo; qualquer gravação limpa a coleção */
  const cache = new Map(), TTL = 30000, drop = c => { for (const k of [...cache.keys()]) if (k.startsWith(c + '|')) cache.delete(k); };
  const CATALOGO = new Set(['users', 'modalidades', 'categorias', 'exercicios', 'treinos', 'planos']), STALE = 600000;   // só listas completas do painel; check-ins, pagamentos etc. sempre frescos
  const fetchList = (k, c, filters) => {
    const e = { t: Date.now(), p: F.getDocs(F.query(F.collection(db, c), ...filters.map(([f, o, v]) => F.where(f, o, v)))).then(s => s.docs.map(withId)) };
    cache.set(k, e); e.p.catch(() => { if (cache.get(k) === e) cache.delete(k); }); return e;
  };
  return {
    mode: 'firebase',
    onAuth: cb => A.onAuthStateChanged(auth, u => { cache.clear(); cb(u ? { uid: u.uid, email: u.email } : null); }),
    login: (e, p) => A.signInWithEmailAndPassword(auth, e, p),
    logout: () => A.signOut(auth),
    /* o link do e-mail volta para o próprio app (tela "Criar nova senha"); depois de salvar, o botão leva ao login */
    reset: e => A.sendPasswordResetEmail(auth, e, { url: location.origin + '/' }),
    checkReset: code => A.verifyPasswordResetCode(auth, code),          // devolve o e-mail da conta
    confirmReset: (code, pass) => A.confirmPasswordReset(auth, code, pass),
    async signUp(email, pass) { return (await A.createUserWithEmailAndPassword(auth, email, pass)).user.uid; },
    // Cria a conta de outra pessoa sem derrubar a sessão de quem está logado (app secundário).
    async createAccount(email, pass) {
      const sec = App.initializeApp(cfg, 'sec' + Date.now()), sa = A.getAuth(sec);
      try { return (await A.createUserWithEmailAndPassword(sa, email, pass)).user.uid; }
      finally { try { await A.signOut(sa); } catch {} App.deleteApp(sec).catch(() => {}); }
    },
    async changePassword(cur, next) {
      const u = auth.currentUser, cred = A.EmailAuthProvider.credential(u.email, cur);
      await A.reauthenticateWithCredential(u, cred); await A.updatePassword(u, next);
    },
    async setup(uid, profile) {
      const b = F.writeBatch(db);
      b.set(F.doc(db, 'users', uid), clean(profile));
      b.set(F.doc(db, 'config', 'setup'), { donoUid: uid, criadoEm: Date.now() });
      await b.commit(); drop('users'); drop('config');
    },
    async get(c, id) { const s = await F.getDoc(F.doc(db, c, id)); return s.exists() ? withId(s) : null; },
    async list(c, filters = []) {
      const k = c + '|' + JSON.stringify(filters), hit = cache.get(k), age = hit ? Date.now() - hit.t : Infinity;
      if (hit && (age < TTL || (age < STALE && !filters.length && CATALOGO.has(c)))) {   // recente: usa; cadastro um pouco velho: usa agora e atualiza por trás
        if (age >= TTL) fetchList(k, c, filters);
        return [...await hit.p];
      }
      return [...await fetchList(k, c, filters).p];
    },
    async set(c, id, d) { await wr(F.setDoc(F.doc(db, c, id), clean(d))); drop(c); },
    async add(c, d) { const ref = F.doc(F.collection(db, c)); await wr(F.setDoc(ref, clean(d))); drop(c); return ref.id; },
    async update(c, id, d) { await wr(F.updateDoc(F.doc(db, c, id), clean(d))); drop(c); },
    async del(c, id) { await wr(F.deleteDoc(F.doc(db, c, id))); drop(c); }
  };
}

function makeDemo() {
  const KEY = 'garrote:demo:v4', clone = x => JSON.parse(JSON.stringify(x));
  const day = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const seed = () => {
    const u = (id, nome, email, role, extra = {}) => [id, { nome, email, role, ativo: 'sim', telefone: '(19) 99999-0000', criadoEm: Date.now(), ...extra }];
    const users = Object.fromEntries([
      u('u-dono', 'Dono da Garrote', 'dono@garrote.demo', 'dono'),
      u('u-rafael', 'Rafael Souza', 'treinador@garrote.demo', 'treinador'),
      u('u-diego', 'Diego Moura', 'diego@garrote.demo', 'treinador'),
      u('u-lucas', 'Lucas Martins', 'aluno@garrote.demo', 'aluno', { treinadorId: 'u-rafael', modalidades: ['musculacao', 'muay-thai'], planoId: 'p-mensal', vencimento: day(-10) }),
      u('u-ana', 'Ana Lima', 'ana@garrote.demo', 'aluno', { treinadorId: 'u-diego', modalidades: ['danca'], planoId: 'p-familia', familiaId: 'Família Lima', vencimento: day(-3) }),
      u('u-marta', 'Marta Lima', 'marta@garrote.demo', 'aluno', { treinadorId: 'u-diego', modalidades: ['danca'], planoId: 'p-familia', familiaId: 'Família Lima', vencimento: day(-3) }),
      u('u-bruno', 'Bruno Costa', 'bruno@garrote.demo', 'aluno', { treinadorId: 'u-rafael', modalidades: ['musculacao'], planoId: 'p-total' }),
      u('u-carla', 'Carla Souza', 'carla@garrote.demo', 'aluno', { treinadorId: 'u-rafael', modalidades: ['muay-thai'], planoId: 'p-tri', vencimento: day(5) }),
      u('u-pedro', 'Pedro Alves', 'pedro@garrote.demo', 'aluno', { treinadorId: 'u-diego', modalidades: [] })
    ]);
    const pl = (nome, periodo, valor, extra = {}) => ({ nome, categoria: 'academia', periodo, valor, descontoTipo: 'pct', desconto: 0, parcelas: 1, familia: 'nao', membros: 1, descricao: '', ...extra });
    const planos = { 'p-mensal': pl('Mensal', 1, 150), 'p-tri': pl('Trimestral', 3, 450, { desconto: 5, parcelas: 3 }), 'p-sem': pl('Semestral', 6, 900, { descontoTipo: 'valor', desconto: 60, parcelas: 6 }), 'p-anual': pl('Anual', 12, 1800, { desconto: 10, parcelas: 12 }),
      'p-familia': pl('Plano Família', 1, 180, { familia: 'sim', membros: 3 }), 'p-total': pl('Total Pass', 1, 45, { categoria: 'totalpass' }) };
    const pagamentos = { pg1: { alunoIds: ['u-lucas'], planoId: 'p-mensal', valor: 99, data: day(0), meses: 1, forma: 'Pix' } };
    const accounts = {}; Object.entries(users).forEach(([id, p]) => accounts[p.email] = { pass: '123456', uid: id });
    const mod = (id, nome, icone, prof, local, duracao, desc, dias, ini, fim, vagas) => [id, { nome, icone, prof, local, duracao, nivel: 'Todos os níveis', descricao: desc, dias, ini, fim, vagas, foto: '', video: '' }];
    const modalidades = Object.fromEntries([
      mod('musculacao', 'Musculação', 'db', 'Prof. Rafael', 'Área livre', 'Livre', 'Treino com acompanhamento de professor, aparelhos e pesos livres.', [1, 2, 3, 4, 5, 6], '6h', '22h', 'Sem limite de vagas'),
      mod('muay-thai', 'Muay Thai', 'bolt', 'Prof. Diego', 'Tatame', '60 min', 'Técnica de socos, chutes, joelhadas e cotoveladas, com condicionamento físico.', [1, 3, 5], '19h', '20h', '6 vagas'),
      mod('danca', 'Dança', 'note', 'Profª. Camila', 'Sala 2', '60 min', 'Ritmos para soltar o corpo, queimar calorias e ganhar coordenação.', [2, 4], '18h30', '19h30', '8 vagas')
    ]);
    const categorias = Object.fromEntries([['peito', 'Peito'], ['costas', 'Costas'], ['quadriceps', 'Quadríceps'], ['ombros', 'Ombro'], ['bracos', 'Braços'], ['core', 'Core'],
      ['peito-sup', 'Peito superior', 'peito'], ['peito-med', 'Peito medial', 'peito'], ['peito-inf', 'Peito inferior', 'peito'], ['triceps', 'Tríceps', 'bracos'], ['biceps', 'Bíceps', 'bracos'],
      ['abdomen', 'Abdômen', 'core'], ['lombar', 'Lombar', 'core']].map(([id, nome, paiId]) => [id, { nome, ...(paiId ? { paiId } : {}) }]));
    const ex = (id, nome, categoriaId, equip) => [id, { nome, categoriaId, equip, video: '', descricao: '' }];
    const exercicios = Object.fromEntries([
      ex('flexao', 'Flexão de braço', 'peito-med', 'Peso do corpo'), ex('supino-maquina', 'Supino máquina', 'peito-med', 'Máquina'), ex('supino-reto', 'Supino reto com barra', 'peito-med', 'Barra'),
      ex('supino-inclinado', 'Supino inclinado com halteres', 'peito-sup', 'Halteres'), ex('crucifixo', 'Crucifixo na máquina', 'peito-med', 'Máquina'), ex('supino-declinado', 'Supino declinado', 'peito-inf', 'Barra'),
      ex('triceps-corda', 'Tríceps corda na polia', 'triceps', 'Polia'), ex('triceps-testa', 'Tríceps testa', 'triceps', 'Barra W'), ex('rosca-direta', 'Rosca direta', 'biceps', 'Barra'),
      ex('puxada', 'Puxada frontal', 'costas', 'Polia'), ex('remada', 'Remada curvada', 'costas', 'Barra'), ex('agachamento', 'Agachamento livre', 'quadriceps', 'Barra'),
      ex('prancha', 'Prancha abdominal', 'abdomen', 'Peso do corpo'), ex('desenvolvimento', 'Desenvolvimento com halteres', 'ombros', 'Halteres')
    ]);
    const it = (exId, series, reps, kg, descanso) => ({ exId, series, reps, kg, descanso });
    const treinos = {
      t1: { nome: 'Peito e Tríceps', modalidadeId: 'musculacao', dias: [1, 2, 3, 4, 5, 6], alunoIds: ['u-lucas'], criadoPor: 'u-rafael', criadoEm: Date.now(),
        itens: [it('flexao', 3, 15, 0, 45), it('supino-maquina', 3, 12, 30, 60), it('supino-reto', 4, 10, 40, 90), it('supino-inclinado', 4, 12, 16, 90), it('crucifixo', 3, 12, 35, 60), it('triceps-corda', 4, 12, 25, 60), it('triceps-testa', 3, 10, 20, 60),
          { exId: 'prancha', series: 3, reps: 1, kg: 0, descanso: 30, un: 's', seg: 30 }] },
      t2: { nome: 'Costas e Pernas', modalidadeId: 'musculacao', dias: [2, 4], alunoIds: ['u-lucas'], criadoPor: 'u-rafael', criadoEm: Date.now(),
        itens: [it('puxada', 4, 12, 45, 60), it('remada', 4, 10, 30, 60), it('agachamento', 4, 10, 40, 90)] }
    };
    const checkins = {}; for (let i = 1; i <= 11; i++) { const d = day(i); checkins['u-lucas_' + d] = { uid: 'u-lucas', data: d, ts: Date.now() }; }
    const v = (kg, reps) => ({ kg, reps });
    const execucoes = { [`u-lucas_t1_${day(0)}`]: { uid: 'u-lucas', tid: 't1', data: day(0), feitos: { flexao: [true, true, true], 'supino-maquina': [true, true, true], 'supino-reto': [true, true, false, false] } },
      [`u-lucas_t1_${day(7)}`]: { uid: 'u-lucas', tid: 't1', data: day(7), inicio: Date.now() - 7 * 864e5, fim: Date.now() - 7 * 864e5 + 3480e3, duracao: 3480, dificuldade: 7, obs: 'Senti o ombro no supino inclinado.',
        feitos: { flexao: [true, true, true], 'supino-maquina': [true, true, true], 'supino-reto': [true, true, true, true], 'supino-inclinado': [true, true, true, true], crucifixo: [true, true, true], 'triceps-corda': [true, true, true, true], 'triceps-testa': [true, true, true], prancha: [true, true, true] },
        valores: { flexao: [v(0, 15), v(0, 14), v(0, 12)], 'supino-maquina': [v(30, 12), v(30, 12), v(30, 10)], 'supino-reto': [v(40, 10), v(40, 10), v(40, 8), v(40, 8)], 'supino-inclinado': [v(16, 12), v(16, 12), v(16, 10), v(16, 10)],
          crucifixo: [v(35, 12), v(35, 12), v(35, 12)], 'triceps-corda': [v(25, 12), v(25, 12), v(25, 12), v(25, 10)], 'triceps-testa': [v(20, 10), v(20, 10), v(20, 8)], prancha: [{ seg: 30 }, { seg: 28 }, { seg: 25 }] } } };
    const agendamentos = { [`u-pedro_muay-thai_${day(4)}`]: { uid: 'u-pedro', modId: 'muay-thai', slotKey: day(4), hora: '19h', ts: Date.now() }, [`u-carla_danca_${day(-2)}`]: { uid: 'u-carla', modId: 'danca', slotKey: day(-2), hora: '18h30', ts: Date.now() } };
    return { cols: { users, modalidades, categorias, exercicios, treinos, checkins, execucoes, agendamentos, planos, pagamentos, config: { setup: { donoUid: 'u-dono' } } }, accounts, session: null };
  };
  let db; try { db = JSON.parse(localStorage.getItem(KEY)); } catch {} if (!db) db = seed();
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  const col = c => db.cols[c] || (db.cols[c] = {});
  const cbs = [];
  const cur_ = () => db.session ? { email: (db.cols.users[db.session] || {}).email } : null;
  const cur = () => db.session ? { uid: db.session, email: (db.cols.users[db.session] || {}).email } : null;
  const err = code => Object.assign(new Error(code), { code });
  const rid = () => 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  return {
    mode: 'demo', seed,
    onAuth(cb) { cbs.push(cb); setTimeout(() => cb(cur()), 0); },
    async login(e, p) { const a = db.accounts[e.toLowerCase()]; if (!a || a.pass !== p) throw err('auth/invalid-credential'); db.session = a.uid; save(); cbs.forEach(cb => cb(cur())); },
    async logout() { db.session = null; save(); cbs.forEach(cb => cb(null)); },
    async reset() {},
    async checkReset() { return 'aluno@garrote.demo'; },
    async confirmReset() {},
    async signUp(email, pass) { return this.createAccount(email, pass); },
    async createAccount(email, pass) { email = email.toLowerCase(); if (db.accounts[email]) throw err('auth/email-already-in-use'); const uid = 'u' + rid(); db.accounts[email] = { pass, uid }; save(); return uid; },
    async changePassword(cur, next) { const a = db.accounts[(cur_() || {}).email]; if (!a || a.pass !== cur) throw err('auth/wrong-password'); a.pass = next; save(); },
    async setup() {},
    async get(c, id) { const d = col(c)[id]; return d ? { id, ...clone(d) } : null; },
    async list(c, filters = []) {
      return Object.entries(col(c)).map(([id, d]) => ({ id, ...clone(d) }))
        .filter(d => filters.every(([f, o, v]) => o === '==' ? d[f] === v : o === 'array-contains' ? (d[f] || []).includes(v) : true));
    },
    async set(c, id, d) { col(c)[id] = clone(d); save(); },
    async add(c, d) { const id = rid(); col(c)[id] = clone(d); save(); return id; },
    async update(c, id, d) { col(c)[id] = { ...col(c)[id], ...clone(d) }; save(); },
    async del(c, id) { delete col(c)[id]; save(); },
    resetDemo() { db = seed(); save(); }
  };
}

export const api = mode === 'firebase' ? await makeFirebase() : makeDemo();
