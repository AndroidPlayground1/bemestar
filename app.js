// ============================================================
// CONFIGURAÇÃO SUPABASE — preencher amanhã
// ============================================================
const SUPABASE_URL = 'https://ecgixgxmzjowniwyusbv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ2l4Z3htempvd25pd3l1c2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTg5MjYsImV4cCI6MjA5NTAzNDkyNn0.Ze_RPJvkiUxc9HbenfunCyha-hSh6Y8pDAeGgBhUT3k';
const USER_ID = 'miguel'; // identificador único do utilizador

// ============================================================
// ESTADO
// ============================================================
const habState = {};
const hiddenBase = {};

const tabTargets = {
  fisica: { manha: 'fisica-manha', tarde: 'fisica-tarde' },
  higiene: { manha: 'higiene-manha', tarde: 'higiene-noite' },
  bons:    { manha: 'bons-list',    tarde: 'bons-list'    }
};
const tabLabels = { fisica: 'Saúde Física', higiene: 'Higiene', bons: 'Hábitos Bons' };
const perLabels = { manha: 'Manhã', tarde: 'Tarde/Noite' };

// ============================================================
// SUPABASE — guardar e carregar registo diário
// ============================================================
function hojeStr() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

async function guardarNaCloud(dados) {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') return; // ainda não configurado
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ user_id: USER_ID, data: hojeStr(), ...dados })
    });
    if (res.ok) mostrarSave('Guardado ✓');
    else mostrarSave('Erro ao guardar');
  } catch {
    mostrarSave('Sem ligação');
  }
}

async function carregarDaCloud() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') return;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/registos?user_id=eq.${USER_ID}&data=eq.${hojeStr()}&select=*`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await res.json();
    if (rows && rows.length > 0) aplicarDados(rows[0]);
  } catch { /* sem ligação, continua normalmente */ }
}

function recolherDados() {
  // hábitos
  const habFeitos = Object.entries(habState).filter(([,v])=>v).map(([k])=>k);

  // sliders e números — recolher todos
  const sliders = {};
  document.querySelectorAll('input[type=range][id]').forEach(el => {
    sliders[el.id] = parseInt(el.value);
  });
  document.querySelectorAll('input[type=time]').forEach(el => {
    if (el.id) sliders[el.id] = el.value;
  });

  // notas
  const notas = {};
  ['nota-manha','nota-tarde','nota-noite','nota-gratidao','nota-geral'].forEach(id => {
    const el = document.getElementById(id);
    if (el) notas[id] = el.value;
  });

  return { hab_feitos: habFeitos, sliders, notas };
}

function aplicarDados(dados) {
  if (!dados) return;

  // hábitos
  if (dados.hab_feitos) {
    dados.hab_feitos.forEach(id => {
      const el = document.querySelector(`.hab[data-id="${id}"]`);
      if (el && !habState[id]) { habState[id] = true; el.classList.add('done'); }
    });
  }

  // sliders/times
  if (dados.sliders) {
    Object.entries(dados.sliders).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input'));
      }
    });
  }

  // notas
  if (dados.notas) {
    Object.entries(dados.notas).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
  }

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
// SLIDERS TRIPARTIDOS — HUMOR & ENERGIA
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
// GERIR HÁBITOS DE BASE (ocultar/mostrar)
// ============================================================
function renderBaseList() {
  const bl = document.getElementById('base-list');
  bl.innerHTML = '';
  document.querySelectorAll('.hab[data-id]').forEach(h => {
    if (h.dataset.removable === 'true') return; // só os de base
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
  mostrarSave('Guardado ✓');
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
  // Data de hoje
  document.getElementById('data-hoje').textContent =
    new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  // Stats iniciais
  updateStats();

  // Calcular médias iniciais (sem dados = mostrar valor dos sliders)
  // Deixamos em branco até o utilizador mexer

  // Carregar dados de hoje da cloud
  carregarDaCloud();
}

document.addEventListener('DOMContentLoaded', init);
