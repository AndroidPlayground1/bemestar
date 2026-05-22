// ═══════════════════════════════════════════════
//  CONFIGURAÇÃO SUPABASE
//  → Preenche estas duas linhas depois de criar
//    o projeto no Supabase
// ═══════════════════════════════════════════════
const SUPABASE_URL  = 'https://ecgixgxmzjowniwyusbv.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ2l4Z3htempvd25pd3l1c2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTg5MjYsImV4cCI6MjA5NTAzNDkyNn0.Ze_RPJvkiUxc9HbenfunCyha-hSh6Y8pDAeGgBhUT3k';

// ═══════════════════════════════════════════════
//  HÁBITOS (personaliza à vontade)
// ═══════════════════════════════════════════════
const HABITOS = [
  { id: 'exercicio',  icon: '🏃', nome: 'Exercício'       },
  { id: 'agua',       icon: '💧', nome: 'Beber água'      },
  { id: 'meditacao',  icon: '🧘', nome: 'Meditação'       },
  { id: 'leitura',    icon: '📚', nome: 'Leitura'         },
  { id: 'semtelemovel', icon: '📵', nome: 'Sem telemóvel 1h' },
];

// ═══════════════════════════════════════════════
//  ESTADO DA APP
// ═══════════════════════════════════════════════
let estado = {
  data:     hojeISO(),
  habitos:  {},
  humor:    null,
  energia:  null,
  sono:     7,
  notas:    ''
};

// ═══════════════════════════════════════════════
//  UTILIDADES
// ═══════════════════════════════════════════════
function hojeISO() {
  return new Date().toISOString().split('T')[0];
}

function hojeFormatado() {
  return new Date().toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ═══════════════════════════════════════════════
//  SUPABASE — funções de acesso
// ═══════════════════════════════════════════════
async function supabaseGet(tabela, filtros = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${tabela}?`;
  for (const [k, v] of Object.entries(filtros)) {
    url += `${k}=eq.${encodeURIComponent(v)}&`;
  }
  url += 'limit=50&order=data.desc';
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function supabaseUpsert(tabela, dados) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(dados)
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}

const supabaseAtivo = () =>
  SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY';

// ═══════════════════════════════════════════════
//  RENDER — hábitos
// ═══════════════════════════════════════════════
function renderHabitos() {
  const grid = document.getElementById('habits-grid');
  grid.innerHTML = '';
  HABITOS.forEach(h => {
    const feito = !!estado.habitos[h.id];
    const row = document.createElement('div');
    row.className = 'habit-row' + (feito ? ' done' : '');
    row.onclick = () => toggleHabito(h.id);
    row.innerHTML = `
      <div class="habit-check">${feito ? '✓' : ''}</div>
      <span class="habit-icon">${h.icon}</span>
      <span class="habit-name">${h.nome}</span>
    `;
    grid.appendChild(row);
  });
  atualizarSummary();
}

function toggleHabito(id) {
  estado.habitos[id] = !estado.habitos[id];
  renderHabitos();
}

// ═══════════════════════════════════════════════
//  RENDER — pickers
// ═══════════════════════════════════════════════
function iniciarPicker(containerId, campo) {
  const btns = document.querySelectorAll(`#${containerId} .emoji-btn`);
  btns.forEach(btn => {
    btn.onclick = () => {
      btns.forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      estado[campo] = parseInt(btn.dataset.val);
      atualizarSummary();
    };
  });
}

// ═══════════════════════════════════════════════
//  RENDER — sono
// ═══════════════════════════════════════════════
function iniciarSlider() {
  const slider = document.getElementById('sono-slider');
  const display = document.getElementById('sono-display');
  const bar = document.getElementById('sono-bar');

  const atualizar = () => {
    const v = parseFloat(slider.value);
    estado.sono = v;
    display.textContent = v % 1 === 0 ? `${v}h` : `${v}h`;
    bar.style.width = ((v - 4) / 8 * 100) + '%';
    atualizarSummary();
  };

  slider.addEventListener('input', atualizar);
  atualizar();
}

// ═══════════════════════════════════════════════
//  SUMMARY BAR
// ═══════════════════════════════════════════════
function atualizarSummary() {
  const feitos = Object.values(estado.habitos).filter(Boolean).length;
  const total  = HABITOS.length;
  document.getElementById('s-hab').textContent   = `${feitos}/${total}`;
  document.getElementById('s-humor').textContent = estado.humor   ? estado.humor   : '—';
  document.getElementById('s-energia').textContent = estado.energia ? estado.energia : '—';
  document.getElementById('s-sono').textContent  = `${estado.sono}h`;
  document.getElementById('hab-badge').textContent = `${feitos}/${total}`;
}

// ═══════════════════════════════════════════════
//  GUARDAR
// ═══════════════════════════════════════════════
async function guardarDia() {
  estado.notas = document.getElementById('notas').value;
  const btn = document.getElementById('btn-guardar');
  btn.classList.add('loading');
  btn.querySelector('span').textContent = 'A guardar...';

  const dados = {
    data:    estado.data,
    habitos: JSON.stringify(estado.habitos),
    humor:   estado.humor,
    energia: estado.energia,
    sono:    estado.sono,
    notas:   estado.notas
  };

  const badge = document.getElementById('save-status');

  if (supabaseAtivo()) {
    try {
      await supabaseUpsert('registos', dados);
      badge.textContent = '✓ guardado';
      badge.className = 'save-badge ok';
    } catch(e) {
      badge.textContent = '✗ erro';
      badge.className = 'save-badge err';
      console.error(e);
    }
  } else {
    // fallback localStorage enquanto Supabase não está configurado
    const chave = `bemestar_${estado.data}`;
    localStorage.setItem(chave, JSON.stringify(dados));
    badge.textContent = '✓ local';
    badge.className = 'save-badge ok';
  }

  btn.classList.remove('loading');
  btn.querySelector('span').textContent = 'Guardar o dia';
  setTimeout(() => {
    badge.textContent = '';
    badge.className = 'save-badge';
  }, 3000);
}

// ═══════════════════════════════════════════════
//  HISTÓRICO
// ═══════════════════════════════════════════════
function mudarTab(tab) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'hoje') || (i === 1 && tab === 'historico'));
  });
  const main   = document.querySelector('.main');
  const histPanel = document.getElementById('painel-historico');
  if (tab === 'historico') {
    main.style.display = 'none';
    histPanel.classList.remove('hidden');
    carregarHistorico();
  } else {
    main.style.display = '';
    histPanel.classList.add('hidden');
  }
}

const EMOJIS_HUMOR   = ['', '😞', '😐', '🙂', '😊', '😄'];
const EMOJIS_ENERGIA = ['', '🪫', '😴', '⚡', '🔥', '🚀'];

async function carregarHistorico() {
  const lista = document.getElementById('historico-lista');
  lista.innerHTML = '<p class="historico-empty">A carregar...</p>';

  let registos = [];

  if (supabaseAtivo()) {
    try {
      registos = await supabaseGet('registos');
    } catch(e) {
      lista.innerHTML = '<p class="historico-empty">Erro ao carregar dados.</p>';
      return;
    }
  } else {
    // ler do localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('bemestar_')) {
        try { registos.push(JSON.parse(localStorage.getItem(k))); } catch(e) {}
      }
    }
    registos.sort((a, b) => b.data.localeCompare(a.data));
  }

  if (!registos.length) {
    lista.innerHTML = '<p class="historico-empty">Ainda não há registos guardados.</p>';
    return;
  }

  lista.innerHTML = '';
  registos.forEach(r => {
    const habObj = typeof r.habitos === 'string' ? JSON.parse(r.habitos) : r.habitos;
    const feitos = Object.values(habObj || {}).filter(Boolean).length;
    const data = new Date(r.data + 'T12:00:00').toLocaleDateString('pt-PT', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
    const card = document.createElement('div');
    card.className = 'hist-card';
    card.innerHTML = `
      <div class="hist-data">${capitalize(data)}</div>
      <div class="hist-stats">
        <div class="hist-stat">Hábitos <span>${feitos}/${HABITOS.length}</span></div>
        ${r.humor   ? `<div class="hist-stat">Humor <span>${EMOJIS_HUMOR[r.humor]}</span></div>` : ''}
        ${r.energia ? `<div class="hist-stat">Energia <span>${EMOJIS_ENERGIA[r.energia]}</span></div>` : ''}
        ${r.sono    ? `<div class="hist-stat">Sono <span>${r.sono}h</span></div>` : ''}
      </div>
      ${r.notas ? `<div class="hist-nota">${r.notas.substring(0, 120)}${r.notas.length > 120 ? '…' : ''}</div>` : ''}
    `;
    lista.appendChild(card);
  });
}

// ═══════════════════════════════════════════════
//  CARREGAR REGISTO DO DIA (se já existir)
// ═══════════════════════════════════════════════
async function carregarHoje() {
  if (!supabaseAtivo()) {
    const guardado = localStorage.getItem(`bemestar_${estado.data}`);
    if (guardado) aplicarEstado(JSON.parse(guardado));
    return;
  }
  try {
    const res = await supabaseGet('registos', { data: estado.data });
    if (res && res.length > 0) aplicarEstado(res[0]);
  } catch(e) { console.warn('Não foi possível carregar o registo de hoje.', e); }
}

function aplicarEstado(r) {
  const habObj = typeof r.habitos === 'string' ? JSON.parse(r.habitos) : r.habitos;
  estado.habitos = habObj || {};
  estado.humor   = r.humor;
  estado.energia = r.energia;
  estado.sono    = r.sono || 7;
  estado.notas   = r.notas || '';

  renderHabitos();
  document.getElementById('notas').value = estado.notas;
  document.getElementById('sono-slider').value = estado.sono;
  document.getElementById('sono-display').textContent = `${estado.sono}h`;
  document.getElementById('sono-bar').style.width = ((estado.sono - 4) / 8 * 100) + '%';

  if (estado.humor) {
    const btn = document.querySelector(`#humor-picker [data-val="${estado.humor}"]`);
    if (btn) btn.classList.add('sel');
  }
  if (estado.energia) {
    const btn = document.querySelector(`#energia-picker [data-val="${estado.energia}"]`);
    if (btn) btn.classList.add('sel');
  }
  atualizarSummary();
}

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('data-hoje').textContent = capitalize(hojeFormatado());
  renderHabitos();
  iniciarPicker('humor-picker', 'humor');
  iniciarPicker('energia-picker', 'energia');
  iniciarSlider();
  carregarHoje();
});
