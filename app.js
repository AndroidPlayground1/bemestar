// ============================================================
// CONFIGURAÇÃO SUPABASE
// ============================================================
const SUPABASE_URL = 'https://ecgixgxmzjowniwyusbv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ2l4Z3htempvd25pd3l1c2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTg5MjYsImV4cCI6MjA5NTAzNDkyNn0.Ze_RPJvkiUxc9HbenfunCyha-hSh6Y8pDAeGgBhUT3k';

// ============================================================
// ESTADO
// ============================================================
const habState = {};
const hiddenBase = {};
let currentUser = null;
let dadosAlterados = false;
let acaoPendente = null; // função a executar após aviso

const tabTargets = {
  fisica: { manha: 'fisica-manha', tarde: 'fisica-tarde' },
  higiene: { manha: 'higiene-manha', tarde: 'higiene-noite' },
  bons:    { manha: 'bons-list',    tarde: 'bons-list'    }
};
const tabLabels = { fisica: 'Saúde Física', higiene: 'Higiene', bons: 'Hábitos Bons' };
const perLabels = { manha: 'Manhã', tarde: 'Tarde/Noite' };

// ============================================================
// SUPABASE AUTH
// ============================================================
async function supabaseFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    ...options.headers
  };
  if (currentUser?.access_token) {
    headers['Authorization'] = `Bearer ${currentUser.access_token}`;
  } else {
    headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  }
  const res = await fetch(SUPABASE_URL + path, { ...options, headers });
  return res;
}

async function fazerSignup() {
  const nome  = document.getElementById('signup-nome').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-pass').value;
  const err   = document.getElementById('signup-error');

  err.textContent = '';
  if (!nome)  { err.textContent = 'Insere o teu nome.'; return; }
  if (!email) { err.textContent = 'Insere o teu email.'; return; }
  if (pass.length < 6) { err.textContent = 'A password tem de ter pelo menos 6 caracteres.'; return; }

  const btn = document.querySelector('#form-signup .auth-btn');
  btn.disabled = true; btn.textContent = 'A criar conta...';

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email, password: pass, data: { nome } })
    });
    const data = await res.json();
    if (data.error) { err.textContent = traduzirErro(data.error.message || data.msg); return; }

    // Guardar sessão e nome
    currentUser = { ...data.user, access_token: data.access_token, nome };
    localStorage.setItem('bemestar_session', JSON.stringify(currentUser));
    mostrarApp();
  } catch(e) {
    err.textContent = 'Erro de ligação. Tenta novamente.';
  } finally {
    btn.disabled = false; btn.textContent = 'Criar conta';
  }
}

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const err   = document.getElementById('login-error');

  err.textContent = '';
  if (!email || !pass) { err.textContent = 'Preenche email e password.'; return; }

  const btn = document.querySelector('#form-login .auth-btn');
  btn.disabled = true; btn.textContent = 'A entrar...';

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (data.error || data.error_description) {
      err.textContent = traduzirErro(data.error_description || data.error);
      return;
    }

    const nome = data.user?.user_metadata?.nome || email.split('@')[0];
    currentUser = { ...data.user, access_token: data.access_token, nome };
    localStorage.setItem('bemestar_session', JSON.stringify(currentUser));
    mostrarApp();
  } catch(e) {
    err.textContent = 'Erro de ligação. Tenta novamente.';
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}

function fazerLogout() {
  if (dadosAlterados) {
    acaoPendente = () => { _logout(); };
    mostrarAviso();
  } else {
    _logout();
  }
}

function _logout() {
  currentUser = null;
  localStorage.removeItem('bemestar_session');
  location.reload();
}

function traduzirErro(msg) {
  if (!msg) return 'Erro desconhecido.';
  if (msg.includes('Invalid login')) return 'Email ou password incorretos.';
  if (msg.includes('already registered')) return 'Este email já tem conta. Faz login.';
  if (msg.includes('Password should')) return 'A password tem de ter pelo menos 6 caracteres.';
  if (msg.includes('valid email')) return 'Insere um email válido.';
  return msg;
}

function authTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'signup'));
  });
  document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('form-signup').classList.toggle('hidden', tab !== 'signup');
}

// ============================================================
// MOSTRAR APP / AUTH
// ============================================================
function mostrarApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('header-nome').textContent = '— ' + currentUser.nome;
  document.getElementById('data-hoje').textContent =
    new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
  updateStats();
  carregarDaCloud();
}

// ============================================================
// DADOS NÃO GUARDADOS — aviso
// ============================================================
function marcarAlterado() {
  dadosAlterados = true;
}

function mostrarAviso() {
  document.getElementById('aviso-overlay').classList.remove('hidden');
}

function fecharAviso() {
  document.getElementById('aviso-overlay').classList.add('hidden');
  acaoPendente = null;
}

async function guardarESair() {
  await guardar();
  fecharAviso();
  if (acaoPendente) { acaoPendente(); acaoPendente = null; }
}

function sairSemGuardar() {
  dadosAlterados = false;
  fecharAviso();
  if (acaoPendente) { acaoPendente(); acaoPendente = null; }
}

// Aviso ao fechar/sair da página
window.addEventListener('beforeunload', (e) => {
  if (dadosAlterados) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ============================================================
// SUPABASE — guardar e carregar registo diário
// ============================================================
function hojeStr() {
  return new Date().toISOString().slice(0, 10);
}

async function guardarNaCloud(dados) {
  try {
    const res = await supabaseFetch('/rest/v1/registos', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: currentUser.id, data: hojeStr(), ...dados })
    });
    if (res.ok) { mostrarSave('Guardado ✓'); dadosAlterados = false; }
    else mostrarSave('Erro ao guardar');
  } catch {
    mostrarSave('Sem ligação');
  }
}

async function carregarDaCloud() {
  try {
    const res = await supabaseFetch(
      `/rest/v1/registos?user_id=eq.${currentUser.id}&data=eq.${hojeStr()}&select=*`
    );
    const rows = await res.json();
    if (rows && rows.length > 0) aplicarDados(rows[0]);
  } catch { /* sem ligação */ }
}

function recolherDados() {
  const habFeitos = Object.entries(habState).filter(([,v])=>v).map(([k])=>k);
  const sliders = {};
  document.querySelectorAll('input[type=range][id]').forEach(el => {
    sliders[el.id] = parseInt(el.value);
  });
  document.querySelectorAll('input[type=time]').forEach(el => {
    if (el.id) sliders[el.id] = el.value;
  });
  const notas = {};
  ['nota-manha','nota-tarde','nota-noite','nota-gratidao','nota-geral'].forEach(id => {
    const el = document.getElementById(id);
    if (el) notas[id] = el.value;
  });
  return { hab_feitos: habFeitos, sliders, notas };
}

function aplicarDados(dados) {
  if (!dados) return;
  if (dados.hab_feitos) {
    dados.hab_feitos.forEach(id => {
      const el = document.querySelector(`.hab[data-id="${id}"]`);
      if (el && !habState[id]) { habState[id] = true; el.classList.add('done'); }
    });
  }
  if (dados.sliders) {
    Object.entries(dados.sliders).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) { el.value = val; el.dispatchEvent(new Event('input')); }
    });
  }
  if (dados.notas) {
    Object.entries(dados.notas).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
  }
  dadosAlterados = false;
  updateStats();
}

// ============================================================
// UI — TABS
// ============================================================
function showTab(id) {
  const ids = ['fisica','sono','mental','higiene','bons','cfg'];
  document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', ids[i] === id));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + id));
  if (id === 'cfg') renderBaseList();
}

// ============================================================
// HÁBITOS
// ============================================================
function toggleHab(el) {
  const id = el.dataset.id;
  habState[id] = !habState[id];
  el.classList.toggle('done', habState[id]);
  marcarAlterado();
  updateStats();
}

function updateStats() {
  const all = document.querySelectorAll('.hab:not([style*="display: none"])');
  const total = all.length;
  const done = Object.values(habState).filter(Boolean).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('s-hab').textContent = done + '/' + total;
  document.getElementById('s-pct').textContent = pct + '%';
  document.getElementById('prog').style.width = pct + '%';
}

// ============================================================
// SLIDERS TRIPARTIDOS
// ============================================================
function calcMedia(tipo) {
  const ids = tipo === 'humor'
    ? ['humor-manha', 'humor-tarde', 'humor-noite']
    : ['energia-manha', 'energia-tarde', 'energia-noite'];
  const vals = ids.map(id => parseInt(document.getElementById(id).value));
  const media = Math.round(vals.reduce((a,b) => a+b, 0) / vals.length);
  document.getElementById('media-' + tipo).textContent = media;
  document.getElementById('s-' + tipo).textContent = media + '/10';
}

// ============================================================
// GERIR HÁBITOS PERSONALIZADOS
// ============================================================
function adicionarHabito() {
  const nome = document.getElementById('new-nome').value.trim();
  const tab = document.getElementById('new-tab').value;
  const periodo = document.getElementById('new-periodo').value;
  if (!nome) return;

  const id = 'custom-' + Date.now();
  const listId = tabTargets[tab]?.[periodo] || 'bons-list';
  const list = document.getElementById(listId);
  if (list) {
    const el = document.createElement('div');
    el.className = 'hab'; el.dataset.id = id; el.dataset.removable = 'true';
    el.onclick = function() { toggleHab(this); };
    el.innerHTML = '<div class="chk"><i class="ti ti-check"></i></div><span class="nm">' + nome + '</span>';
    list.appendChild(el);
  }

  const emptyMsg = document.getElementById('empty-msg');
  if (emptyMsg) emptyMsg.style.display = 'none';

  const cfgEl = document.createElement('div');
  cfgEl.className = 'cfg-card'; cfgEl.id = 'cfg-' + id;
  cfgEl.innerHTML =
    '<div class="nm">' + nome + '</div>' +
    '<span class="cat-badge">' + tabLabels[tab] + ' · ' + perLabels[periodo] + '</span>' +
    '<button class="btn-rm" onclick="removerCustom(\'' + id + '\')">remover</button>';
  document.getElementById('custom-list').appendChild(cfgEl);

  document.getElementById('new-nome').value = '';
  updateStats();
}

function removerCustom(id) {
  document.querySelector('.hab[data-id="' + id + '"]')?.remove();
  document.getElementById('cfg-' + id)?.remove();
  delete habState[id];
  const remaining = document.querySelectorAll('#custom-list .cfg-card');
  if (!remaining.length) {
    const msg = document.getElementById('empty-msg');
    if (msg) msg.style.display = 'block';
  }
  updateStats();
}

// ============================================================
// GERIR HÁBITOS DE BASE
// ============================================================
function renderBaseList() {
  const bl = document.getElementById('base-list');
  bl.innerHTML = '';
  document.querySelectorAll('.hab[data-id]').forEach(h => {
    if (h.dataset.removable === 'true') return;
    const id = h.dataset.id;
    const nome = h.querySelector('.nm').textContent;
    const isHidden = !!hiddenBase[id];
    const card = document.createElement('div');
    card.className = 'cfg-card';
    card.innerHTML =
      '<div class="nm' + (isHidden ? ' hidden' : '') + '">' + nome + '</div>' +
      '<button class="btn-rm' + (isHidden ? ' ativar' : '') + '" onclick="toggleBase(\'' + id + '\')">' +
      (isHidden ? 'ativar' : 'ocultar') + '</button>';
    bl.appendChild(card);
  });
}

function toggleBase(id) {
  const hab = document.querySelector('.hab[data-id="' + id + '"]');
  if (!hab) return;
  hiddenBase[id] = !hiddenBase[id];
  hab.style.display = hiddenBase[id] ? 'none' : '';
  if (hiddenBase[id]) delete habState[id];
  updateStats();
  renderBaseList();
}

// ============================================================
// GUARDAR REGISTO
// ============================================================
async function guardar() {
  const dados = recolherDados();
  await guardarNaCloud(dados);
}

function mostrarSave(msg) {
  const el = document.getElementById('save-status');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ============================================================
// INIT
// ============================================================
function init() {
  // Verificar sessão guardada
  const sessaoGuardada = localStorage.getItem('bemestar_session');
  if (sessaoGuardada) {
    try {
      currentUser = JSON.parse(sessaoGuardada);
      mostrarApp();
      return;
    } catch(e) {
      localStorage.removeItem('bemestar_session');
    }
  }
  // Mostrar ecrã de auth
  document.getElementById('auth-screen').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', init);
