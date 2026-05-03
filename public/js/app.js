// ════════════════════════════════════════════════════════════
//  app.js — Lógica de UI, formulários e efeitos de scroll
//  Depende de: firebase.js (carregado antes via type="module")
// ════════════════════════════════════════════════════════════

// ──────────────────────────────────────────
//  SCROLL: navbar shadow + reveal de seções
// ──────────────────────────────────────────
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

// Ativa animação de entrada nas seções ao rolar
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ──────────────────────────────────────────
//  TABS: Alternar entre Login e Cadastro
// ──────────────────────────────────────────
function switchTab(tab) {
  const isLogin = tab === 'login';

  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0) === isLogin);
  });

  document.getElementById('form-login').classList.toggle('visible', isLogin);
  document.getElementById('form-cadastro').classList.toggle('visible', !isLogin);
}
window.switchTab = switchTab;

// ──────────────────────────────────────────
//  SENHA: Toggle visibilidade
// ──────────────────────────────────────────
function togglePw(id, btn) {
  const input = document.getElementById(id);
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.textContent = isText ? '👁' : '🙈';
}
window.togglePw = togglePw;

// ──────────────────────────────────────────
//  FORÇA DA SENHA: Indicador visual
// ──────────────────────────────────────────
const cadSenha = document.getElementById('cad-senha');
if (cadSenha) {
  cadSenha.addEventListener('input', function () {
    const v = this.value;
    const wrap = document.getElementById('pw-strength');
    wrap.style.display = v ? 'block' : 'none';

    let score = 0;
    if (v.length >= 8)           score++;
    if (/[A-Z]/.test(v))         score++;
    if (/[0-9]/.test(v))         score++;
    if (/[^A-Za-z0-9]/.test(v))  score++;

    const colors = ['#EF4444', '#F97316', '#FACC15', '#22C55E'];
    const labels = ['Muito fraca', 'Fraca', 'Boa', 'Forte 💪'];

    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById('ps' + i);
      el.style.background = i <= score ? colors[score - 1] : 'var(--border)';
    }

    document.getElementById('ps-label').textContent =
      score > 0 ? labels[score - 1] : '';
  });
}

// ──────────────────────────────────────────
//  TOAST: Notificações visuais
// ──────────────────────────────────────────
let toastTimer;

function showToast(type, msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;

  // Remove classes anteriores antes de aplicar nova
  toast.className = 'toast';
  toast.classList.add(type, 'show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}
window.showToast = showToast;

// ──────────────────────────────────────────
//  BOTÕES: Estado de loading
// ──────────────────────────────────────────
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.querySelector('.btn-text').style.display    = loading ? 'none' : '';
  btn.querySelector('.loading-state').style.display = loading ? 'flex' : 'none';
  btn.disabled = loading;
}

// ──────────────────────────────────────────
//  FIREBASE: Tradução de erros para PT-BR
// ──────────────────────────────────────────
function getErrorMsg(code) {
  const msgs = {
    'auth/email-already-in-use':   'Este email já está cadastrado.',
    'auth/weak-password':          'Senha muito fraca. Use ao menos 6 caracteres.',
    'auth/invalid-email':          'Email inválido.',
    'auth/user-not-found':         'Email não encontrado.',
    'auth/wrong-password':         'Senha incorreta.',
    'auth/invalid-credential':     'Email ou senha incorretos.',
    'auth/too-many-requests':      'Muitas tentativas. Aguarde e tente novamente.',
    'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
    'auth/popup-closed-by-user':   null, // silencioso
  };
  return msgs[code] || 'Erro inesperado. Tente novamente.';
}

// ──────────────────────────────────────────
//  HANDLER: Cadastro com email/senha
// ──────────────────────────────────────────
async function handleCadastro(e) {
  e.preventDefault();

  if (!window._fb) {
    return showToast('error', '⚠️ Firebase não configurado. Verifique js/firebase.js.');
  }

  const nome      = document.getElementById('cad-nome').value.trim();
  const sobrenome = document.getElementById('cad-sobrenome').value.trim();
  const email     = document.getElementById('cad-email').value.trim();
  const senha     = document.getElementById('cad-senha').value;
  const fullName  = `${nome} ${sobrenome}`.trim();

  setLoading('btn-cadastro', true);

  try {
    const {
      auth, db,
      createUserWithEmailAndPassword,
      updateProfile,
      doc, setDoc, serverTimestamp
    } = window._fb;

    const cred = await createUserWithEmailAndPassword(auth, email, senha);

    // Salva nome de exibição no Auth
    await updateProfile(cred.user, { displayName: fullName });

    // Salva perfil completo no Firestore
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid:       cred.user.uid,
      name:      fullName,
      email,
      plan:      'free',
      createdAt: serverTimestamp()
    });

    showToast('success', `🎉 Conta criada! Bem-vindo, ${nome}!`);

  } catch (err) {
    const msg = getErrorMsg(err.code);
    if (msg) showToast('error', '❌ ' + msg);
  } finally {
    setLoading('btn-cadastro', false);
  }
}
window.handleCadastro = handleCadastro;

// ──────────────────────────────────────────
//  HANDLER: Login com email/senha
// ──────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();

  if (!window._fb) {
    return showToast('error', '⚠️ Firebase não configurado. Verifique js/firebase.js.');
  }

  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;

  setLoading('btn-login', true);

  try {
    const { auth, signInWithEmailAndPassword } = window._fb;
    await signInWithEmailAndPassword(auth, email, senha);
    // onAuthStateChanged em firebase.js cuida do feedback de sucesso
  } catch (err) {
    const msg = getErrorMsg(err.code);
    if (msg) showToast('error', '❌ ' + msg);
    setLoading('btn-login', false); // só reseta em erro; sucesso redireciona
  }
}
window.handleLogin = handleLogin;

// ──────────────────────────────────────────
//  HANDLER: Recuperação de senha
// ──────────────────────────────────────────
async function handleForgotPassword(e) {
  e.preventDefault();

  if (!window._fb) {
    return showToast('error', '⚠️ Firebase não configurado.');
  }

  const email = document.getElementById('login-email').value.trim();
  if (!email) return showToast('error', '📧 Digite seu email no campo acima primeiro.');

  try {
    const { auth, sendPasswordResetEmail } = window._fb;
    await sendPasswordResetEmail(auth, email);
    showToast('success', '📬 Email de recuperação enviado! Verifique sua caixa de entrada.');
  } catch (err) {
    const msg = getErrorMsg(err.code);
    if (msg) showToast('error', '❌ ' + msg);
  }
}
window.handleForgotPassword = handleForgotPassword;

// ──────────────────────────────────────────
//  HANDLER: Login com Google
// ──────────────────────────────────────────
async function handleGoogle() {
  if (!window._fb) {
    return showToast('error', '⚠️ Firebase não configurado.');
  }

  try {
    const { auth, GoogleAuthProvider, signInWithPopup } = window._fb;
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    const msg = getErrorMsg(err.code);
    if (msg) showToast('error', '❌ ' + msg);
  }
}
window.handleGoogle = handleGoogle;

// ──────────────────────────────────────────
//  HANDLER: Login com GitHub
// ──────────────────────────────────────────
async function handleGithub() {
  if (!window._fb) {
    return showToast('error', '⚠️ Firebase não configurado.');
  }

  try {
    const { auth, GithubAuthProvider, signInWithPopup } = window._fb;
    await signInWithPopup(auth, new GithubAuthProvider());
  } catch (err) {
    const msg = getErrorMsg(err.code);
    if (msg) showToast('error', '❌ ' + msg);
  }
}
window.handleGithub = handleGithub;