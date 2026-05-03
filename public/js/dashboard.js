// ════════════════════════════════════════════════════════════
//  dashboard.js — Lógica completa do painel Ativus
//  Depende de: firebase.js (carregado antes como type="module")
// ════════════════════════════════════════════════════════════

// ── Estado local da aplicação ──
const state = {
  user:    null,
  tasks:   [],
  filter:  'all',
  loading: false
};

// ── Dados de exemplo (usados antes do Firestore carregar) ──
const SAMPLE_TASKS = [
  { id: 't1', title: 'Reunião com cliente — Proposta Q3',   status: 'concluida',  project: 'Ativus',    due: '2026-05-01', priority: 'alta'    },
  { id: 't2', title: 'Atualizar API de autenticação',       status: 'andamento',  project: 'Backend',   due: '2026-05-08', priority: 'urgente' },
  { id: 't3', title: 'Enviar relatório mensal ao time',      status: 'pendente',   project: 'Marketing', due: '2026-05-10', priority: 'normal'  },
  { id: 't4', title: 'Aprovação de conteúdo para LinkedIn', status: 'atrasada',   project: 'Marketing', due: '2026-04-30', priority: 'alta'    },
  { id: 't5', title: 'Revisar design do dashboard',         status: 'andamento',  project: 'Ativus',    due: '2026-05-06', priority: 'normal'  },
  { id: 't6', title: 'Configurar ambiente de staging',      status: 'pendente',   project: 'Backend',   due: '2026-05-12', priority: 'alta'    },
];

const SAMPLE_PROJECTS = [
  { id: 'p1', name: 'Projeto Ativus',  pct: 75, color: 'pf-blue',   icon: '🚀', desc: 'Plataforma principal de gestão de tarefas.',  tasks: 18, status: 'andamento' },
  { id: 'p2', name: 'Marketing Q2',    pct: 45, color: 'pf-yellow', icon: '📣', desc: 'Campanhas e conteúdo para o segundo trimestre.', tasks: 12, status: 'andamento' },
  { id: 'p3', name: 'Backend API v2',  pct: 90, color: 'pf-green',  icon: '⚙️', desc: 'Refatoração e novas rotas da API REST.',       tasks: 9,  status: 'concluida' },
];

// ──────────────────────────────────────────
//  INICIALIZAÇÃO
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setCurrentDate();
  setupSidebar();
  setupModal();
  setupFilterTabs();
  waitForFirebase();
});

// Aguarda o firebase.js carregar o window._fb
function waitForFirebase(retries = 20) {
  if (window._fb) {
    guardAuth();
  } else if (retries > 0) {
    setTimeout(() => waitForFirebase(retries - 1), 150);
  } else {
    // Firebase não configurado — carrega com dados de exemplo
    console.warn('[Ativus] Firebase não configurado. Usando dados de exemplo.');
    loadDemoMode();
  }
}

// ──────────────────────────────────────────
//  AUTH GUARD — protege o dashboard
// ──────────────────────────────────────────
function guardAuth() {
  const { auth } = window._fb;

  auth.onAuthStateChanged(user => {
    if (!user) {
      // Usuário não logado → redireciona para a landing
      window.location.href = '/index.html#auth';
      return;
    }
    state.user = user;
    initDashboard(user);
  });
}

function loadDemoMode() {
  state.user = { displayName: 'João Oliveira', email: 'joao@ativus.app', uid: 'demo' };
  state.tasks = SAMPLE_TASKS;
  initDashboard(state.user);
}

// ──────────────────────────────────────────
//  INICIALIZA DASHBOARD
// ──────────────────────────────────────────
function initDashboard(user) {
  // Atualiza nome do usuário na UI
  const name     = user.displayName || user.email.split('@')[0];
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  document.getElementById('welcomeName').textContent  = name.split(' ')[0];
  document.getElementById('userName').textContent     = name;
  document.getElementById('userAvatar').textContent   = initials;
  document.getElementById('topbarAvatar').textContent = initials;

  // Carrega dados: tenta Firestore, senão usa exemplos
  if (window._fb && state.user.uid !== 'demo') {
    loadTasksFromFirestore();
  } else {
    state.tasks = SAMPLE_TASKS;
    renderAll();
  }

  // Botão de logout
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// ──────────────────────────────────────────
//  FIRESTORE: Carrega tarefas em tempo real
// ──────────────────────────────────────────
async function loadTasksFromFirestore() {
  try {
    // Importa funções do Firestore via window._fb
    // (collection, query, orderBy, onSnapshot precisam ser importados no firebase.js
    //  e expostos em window._fb se quiser usar real-time — veja comentário no firebase.js)

    // Por ora usa dados de exemplo e salva ao criar novas tarefas
    state.tasks = SAMPLE_TASKS;
    renderAll();
  } catch (err) {
    console.error('[Ativus] Erro ao carregar tarefas:', err);
    state.tasks = SAMPLE_TASKS;
    renderAll();
  }
}

// ──────────────────────────────────────────
//  RENDER: Renderiza tudo
// ──────────────────────────────────────────
function renderAll() {
  updateKPIs();
  renderTaskList('taskList', state.tasks.slice(0, 6), state.filter);
  renderTaskList('taskListFull', state.tasks, state.filter);
  renderProjectList();
  renderProjectsGrid();
}

// ──────────────────────────────────────────
//  KPIs
// ──────────────────────────────────────────
function updateKPIs() {
  const counts = { andamento: 0, concluida: 0, pendente: 0, atrasada: 0 };
  state.tasks.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });

  animateCount('kpiAndamento',  counts.andamento);
  animateCount('kpiConcluidas', counts.concluida);
  animateCount('kpiPendentes',  counts.pendente);
  animateCount('kpiAtrasadas',  counts.atrasada);
}

function animateCount(elId, target) {
  const el = document.getElementById(elId);
  if (!el) return;
  let current = 0;
  const step  = Math.max(1, Math.ceil(target / 20));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

// ──────────────────────────────────────────
//  TASK LIST RENDER
// ──────────────────────────────────────────
function renderTaskList(containerId, tasks, filter) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="task-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        Nenhuma tarefa ${filter !== 'all' ? 'com este status' : 'ainda'}.
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(task => buildTaskHTML(task)).join('');

  // Event listeners nos checkboxes e delete
  container.querySelectorAll('.task-checkbox').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleTaskStatus(btn.dataset.id);
    });
  });
  container.querySelectorAll('.task-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteTask(btn.dataset.id);
    });
  });
}

function buildTaskHTML(task) {
  const checkClass = task.status === 'concluida' ? 'done-check' :
                     task.status === 'andamento' ? 'prog-check' : '';
  const checkIcon  = task.status === 'concluida' ? '✓' : '';
  const nameClass  = task.status === 'concluida' ? 'done-text' : '';
  const badgeClass = `badge-${task.status}`;
  const badgeLabel = {
    andamento: 'Em andamento',
    concluida: 'Concluída',
    pendente:  'Pendente',
    atrasada:  'Atrasada'
  }[task.status] || task.status;

  const dueFormatted = task.due
    ? new Date(task.due + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '';

  return `
    <div class="task-item" data-id="${task.id}">
      <button class="task-checkbox ${checkClass}" data-id="${task.id}">${checkIcon}</button>
      <div class="task-main">
        <div class="task-name ${nameClass}">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          ${task.project ? `<span>📁 ${escapeHtml(task.project)}</span>` : ''}
          ${dueFormatted ? `<span>📅 ${dueFormatted}</span>` : ''}
        </div>
      </div>
      <span class="task-badge ${badgeClass}">${badgeLabel}</span>
      <button class="task-delete" data-id="${task.id}" title="Remover">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>`;
}

// ──────────────────────────────────────────
//  TASK ACTIONS
// ──────────────────────────────────────────
function toggleTaskStatus(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  const cycle = { pendente: 'andamento', andamento: 'concluida', concluida: 'pendente', atrasada: 'andamento' };
  task.status = cycle[task.status] || 'pendente';

  // Salva no Firestore se disponível
  saveTaskToFirestore(task);

  renderAll();
  showToast('t-success', `✅ Tarefa movida para "${task.status}"`);
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  renderAll();
  showToast('t-error', '🗑️ Tarefa removida');
}

function addTask(data) {
  const newTask = {
    id:       'task_' + Date.now(),
    title:    data.title,
    status:   data.status || 'pendente',
    project:  data.project || '',
    due:      data.due || '',
    priority: data.priority || 'normal',
    created:  new Date().toISOString()
  };
  state.tasks.unshift(newTask);
  saveTaskToFirestore(newTask);
  renderAll();
}

async function saveTaskToFirestore(task) {
  if (!window._fb || state.user?.uid === 'demo') return;
  try {
    const { db, doc, setDoc, serverTimestamp } = window._fb;
    await setDoc(doc(db, 'users', state.user.uid, 'tasks', task.id), {
      ...task,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.error('[Ativus] Erro ao salvar tarefa:', err);
  }
}

// ──────────────────────────────────────────
//  PROJECTS
// ──────────────────────────────────────────
function renderProjectList() {
  const container = document.getElementById('projectList');
  if (!container) return;

  container.innerHTML = SAMPLE_PROJECTS.map(p => `
    <div class="project-item">
      <div class="project-info">
        <span class="project-name">${p.name}</span>
        <span class="project-pct">${p.pct}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${p.color}" style="width:${p.pct}%"></div>
      </div>
    </div>
  `).join('');
}

function renderProjectsGrid() {
  const container = document.getElementById('projectsFullGrid');
  if (!container) return;

  const badgeMap = {
    andamento: ['badge-andamento', 'Em andamento'],
    concluida: ['badge-concluida', 'Concluído'],
    pendente:  ['badge-pendente',  'Pendente']
  };

  container.innerHTML = SAMPLE_PROJECTS.map(p => {
    const [bClass, bLabel] = badgeMap[p.status] || badgeMap.andamento;
    return `
      <div class="project-card">
        <div class="project-card-header">
          <div class="project-card-icon">${p.icon}</div>
          <span class="project-card-badge ${bClass}">${bLabel}</span>
        </div>
        <h4>${p.name}</h4>
        <p>${p.desc}</p>
        <div class="progress-bar">
          <div class="progress-fill ${p.color}" style="width:${p.pct}%"></div>
        </div>
        <div class="project-card-footer">
          <span class="project-card-tasks">📋 ${p.tasks} tarefas</span>
          <span class="project-pct">${p.pct}%</span>
        </div>
      </div>`;
  }).join('');
}

// ──────────────────────────────────────────
//  MODAL: Nova Tarefa
// ──────────────────────────────────────────
function setupModal() {
  const overlay   = document.getElementById('modalOverlay');
  const closeBtn  = document.getElementById('modalClose');
  const cancelBtn = document.getElementById('modalCancel');
  const form      = document.getElementById('newTaskForm');
  const openBtns  = ['btnNewTask', 'btnNewTask2'].map(id => document.getElementById(id)).filter(Boolean);

  const open  = () => overlay.classList.add('open');
  const close = () => {
    overlay.classList.remove('open');
    form.reset();
  };

  openBtns.forEach(btn => btn.addEventListener('click', open));
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      title:    document.getElementById('taskTitle').value.trim(),
      desc:     document.getElementById('taskDesc').value.trim(),
      project:  document.getElementById('taskProject').value,
      priority: document.getElementById('taskPriority').value,
      status:   document.getElementById('taskStatus').value,
      due:      document.getElementById('taskDue').value,
    };
    if (!data.title) return;
    addTask(data);
    close();
    showToast('t-success', '✅ Tarefa criada com sucesso!');
  });
}

// ──────────────────────────────────────────
//  SIDEBAR: Navegação entre páginas
// ──────────────────────────────────────────
function setupSidebar() {
  // Links de navegação
  document.querySelectorAll('.nav-item[data-page]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      switchPage(page);

      // Fecha sidebar em mobile
      if (window.innerWidth < 900) closeSidebar();
    });
  });

  // Toggle mobile
  const menuBtn   = document.getElementById('menuBtn');
  const toggleBtn = document.getElementById('sidebarToggle');
  const overlay   = document.getElementById('sidebarOverlay');

  menuBtn?.addEventListener('click',   openSidebar);
  toggleBtn?.addEventListener('click', closeSidebar);
  overlay?.addEventListener('click',   closeSidebar);
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

function switchPage(page) {
  // Atualiza nav-items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Atualiza páginas
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === `page-${page}`);
  });
}
window.switchPage = switchPage;

// ──────────────────────────────────────────
//  FILTER TABS (página de Tarefas)
// ──────────────────────────────────────────
function setupFilterTabs() {
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.filter = tab.dataset.filter;
      renderTaskList('taskListFull', state.tasks, state.filter);
    });
  });

  // Select do dashboard
  document.getElementById('filterStatus')?.addEventListener('change', e => {
    renderTaskList('taskList', state.tasks.slice(0, 6), e.target.value);
  });
}

// ──────────────────────────────────────────
//  LOGOUT
// ──────────────────────────────────────────
async function handleLogout() {
  if (!window._fb) return;
  try {
    await window._fb.auth.signOut();
    window.location.href = '/index.html';
  } catch (err) {
    showToast('t-error', '❌ Erro ao sair. Tente novamente.');
  }
}

// ──────────────────────────────────────────
//  UTILIDADES
// ──────────────────────────────────────────
function setCurrentDate() {
  const el = document.getElementById('currentDate');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function showToast(type, msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-msg').textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}