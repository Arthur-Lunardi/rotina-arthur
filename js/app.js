// app.js — ponto de entrada principal
import { chaveHoje, lerDados, salvarDados, chavesDeDataValidas, lerPrefs, salvarPrefs } from './storage.js';
import { obterHistoricoUltimosDias, calcularSequencia } from './historico.js';
import {
  exibirDiaAtual, atualizarBarraProgresso, atualizarEstatisticas,
  renderizarHistorico, lerEstadoCheckboxes, aplicarEstadoCheckboxes,
  renderizarTarefas, abrirModalTarefas, fecharModalTarefas,
  inicializarModal, abrirConfiguracoes, fecharConfiguracoes,
} from './ui.js';
import { carregarTarefas, salvarTarefas } from './tarefas.js';
import { obterDadosMes, calcularDashboard, corProgresso } from './calendario.js';
import { exportarCSV } from './exportar.js';
import { dispararConfetti, resetarConfetti } from './confetti.js';
import { renderizarGrafico } from './grafico.js';
import {
  lerConfigNotif, salvarConfigNotif,
  pedirPermissao, agendarNotificacao, inicializarNotificacoes,
} from './notificacoes.js';

registrarServiceWorker();

const CHAVE_HOJE = chaveHoje();
let tarefasAtuais = carregarTarefas();
let calMes  = new Date().getMonth();
let calAno  = new Date().getFullYear();
let _ultimoPct = -1;

iniciar();

// ── Bootstrap ─────────────────────────────────────────────────────

function iniciar() {
  aplicarTema();
  exibirDiaAtual();
  renderizarTarefas(tarefasAtuais, onCheckboxChange);
  carregarDiaAtual();
  atualizarTela();
  inicializarModal({ onSalvar: salvarEdicaoTarefas, onCancelar: fecharModalTarefas });
  inicializarNotificacoes();
  _bindEventos();
}

function _bindEventos() {
  document.getElementById('btnEditarTarefas')
    .addEventListener('click', () => abrirModalTarefas(tarefasAtuais));

  // Botão de configurações no header
  document.getElementById('btnConfiguracoes')
    .addEventListener('click', abrirConfiguracoes);
  document.getElementById('btnFecharConfig')
    .addEventListener('click', fecharConfiguracoes);
  document.getElementById('configOverlay')
    .addEventListener('click', (e) => { if (e.target.id === 'configOverlay') fecharConfiguracoes(); });

  // Abas
  document.querySelectorAll('.aba')
    .forEach(btn => btn.addEventListener('click', () => trocarAba(btn.dataset.aba)));

  // Calendário
  document.getElementById('btnMesAnterior').addEventListener('click', () => {
    if (--calMes < 0) { calMes = 11; calAno--; }
    renderizarCalendario();
  });
  document.getElementById('btnProximoMes').addEventListener('click', () => {
    if (++calMes > 11) { calMes = 0; calAno++; }
    renderizarCalendario();
  });

  // Exportar CSV
  document.getElementById('btnExportarCSV')
    .addEventListener('click', exportarCSV);

  // Tema
  document.getElementById('toggleTema').addEventListener('change', (e) => {
    const prefs = lerPrefs();
    prefs.temaClaro = e.target.checked;
    salvarPrefs(prefs);
    aplicarTema();
  });

  // Notificações
  document.getElementById('toggleNotif').addEventListener('change', async (e) => {
    if (e.target.checked) {
      const perm = await pedirPermissao();
      if (perm !== 'granted') {
        e.target.checked = false;
        alert('Permissão de notificação negada. Ative nas configurações do navegador.');
        return;
      }
    }
    const hora = document.getElementById('inputHoraNotif').value || '23:15';
    const cfg  = { ativa: e.target.checked, hora };
    salvarConfigNotif(cfg);
    if (cfg.ativa) agendarNotificacao(hora);
  });

  document.getElementById('inputHoraNotif').addEventListener('change', (e) => {
    const cfg = lerConfigNotif();
    cfg.hora  = e.target.value;
    salvarConfigNotif(cfg);
    if (cfg.ativa) agendarNotificacao(cfg.hora);
  });

  // Retrospectiva: marcar dia passado
  document.getElementById('btnSalvarRetro').addEventListener('click', salvarRetrospectiva);
}

// ── Tema ──────────────────────────────────────────────────────────

function aplicarTema() {
  const prefs = lerPrefs();
  document.documentElement.classList.toggle('tema-claro', !!prefs.temaClaro);
  const toggle = document.getElementById('toggleTema');
  if (toggle) toggle.checked = !!prefs.temaClaro;
}

// ── Abas ──────────────────────────────────────────────────────────

function trocarAba(aba) {
  document.querySelectorAll('.aba')
    .forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
  document.querySelectorAll('.aba-conteudo')
    .forEach(c => c.classList.toggle('ativa', c.id === `aba-${aba}`));

  if (aba === 'calendario') renderizarCalendario();
  if (aba === 'dashboard')  { renderizarDashboard(); renderizarGrafico(); }
  if (aba === 'config')     carregarPainelConfig();
}

// ── Calendário ────────────────────────────────────────────────────

function renderizarCalendario() {
  const { dias, primeiroDia } = obterDadosMes(calAno, calMes);

  const nomeMes = new Date(calAno, calMes, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  document.getElementById('tituloMes').textContent =
    nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  const grid = document.getElementById('calendarioGrid');
  const frag = document.createDocumentFragment();

  const offset = primeiroDia.getDay();
  for (let i = 0; i < offset; i++) {
    const v = document.createElement('div');
    v.className = 'cal-dia vazio';
    frag.appendChild(v);
  }

  dias.forEach((d) => {
    const cel = document.createElement('div');
    let cls = `cal-dia cor-${corProgresso(d.porcentagem, d.semDados)}`;
    if (d.ehHoje)   cls += ' cal-hoje';
    if (d.isFuturo) cls += ' cal-futuro';
    cel.className   = cls;
    cel.textContent = d.dia;
    if (!d.isFuturo && !d.semDados) cel.title = `${d.porcentagem}%`;

    if (!d.isFuturo) {
      cel.addEventListener('click', () => {
        document.querySelectorAll('.cal-dia.selecionado')
          .forEach(el => el.classList.remove('selecionado'));
        cel.classList.add('selecionado');
        mostrarDetalheDia(d);
      });
    }
    frag.appendChild(cel);
  });

  grid.innerHTML = '';
  grid.appendChild(frag);
  document.getElementById('detalhe-dia').style.display = 'none';
}

function mostrarDetalheDia(d) {
  const dataFmt = d.data.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  document.getElementById('detalhe-data').textContent =
    dataFmt.charAt(0).toUpperCase() + dataFmt.slice(1);
  document.getElementById('detalhe-percentual').textContent =
    d.semDados ? '—' : `${d.porcentagem}%`;

  const lista = document.getElementById('detalhe-lista');
  const frag  = document.createDocumentFragment();

  if (d.semDados && !d.ehHoje) {
    const li = document.createElement('li');
    li.className   = 'detalhe-sem-dados';
    li.textContent = 'Sem dados registrados';
    frag.appendChild(li);
  } else {
    d.tarefas.forEach((t) => {
      const marcada = d.dadosMarcados[t.id] === true;
      const li      = document.createElement('li');
      li.className  = marcada ? 'detalhe-ok' : 'detalhe-nao';
      li.textContent = `${marcada ? '✓' : '✗'} ${t.icone || ''} ${t.label}`.trim();
      frag.appendChild(li);
    });
  }

  lista.innerHTML = '';
  lista.appendChild(frag);
  document.getElementById('detalhe-dia').style.display = 'block';
}

// ── Dashboard ─────────────────────────────────────────────────────

function renderizarDashboard() {
  const { melhorSequencia, diasPerfeitos, horasEstudadas, treinos, mediaGeral } = calcularDashboard();
  document.getElementById('dash-melhor-seq').textContent     = `${melhorSequencia} dias`;
  document.getElementById('dash-dias-perfeitos').textContent = diasPerfeitos;
  document.getElementById('dash-horas').textContent          = horasEstudadas;
  document.getElementById('dash-treinos').textContent        = treinos;
  document.getElementById('dash-media').textContent          = `${mediaGeral}%`;
}

// ── Aba Hoje ──────────────────────────────────────────────────────

function onCheckboxChange() {
  salvarDiaAtual();
  atualizarTela();
}

function carregarDiaAtual() {
  const dados = lerDados(CHAVE_HOJE);
  aplicarEstadoCheckboxes(
    document.querySelectorAll('input[type="checkbox"]'),
    dados
  );
}

function salvarDiaAtual() {
  salvarDados(CHAVE_HOJE,
    lerEstadoCheckboxes(document.querySelectorAll('input[type="checkbox"]'))
  );
}

function atualizarTela() {
  const cbs      = Array.from(document.querySelectorAll('input[type="checkbox"]'));
  const total    = cbs.length;
  const marcados = cbs.filter(cb => cb.checked).length;
  const pct      = total > 0 ? Math.round((marcados / total) * 100) : 0;

  atualizarBarraProgresso(pct);

  // Confetti ao completar 100%
  if (pct === 100 && _ultimoPct !== 100) dispararConfetti(pct);
  else if (pct < 100) resetarConfetti();
  _ultimoPct = pct;

  const historico = obterHistoricoUltimosDias(total, 7);
  renderizarHistorico(historico);

  const { dias, treinos } = contarDiasETreinosCompletos();
  atualizarEstatisticas({ dias, treinos, sequencia: calcularSequencia(historico) });
}

function salvarEdicaoTarefas(novas) {
  salvarTarefas(novas);
  tarefasAtuais = novas;
  renderizarTarefas(tarefasAtuais, onCheckboxChange);
  carregarDiaAtual();
  atualizarTela();
  fecharModalTarefas();
}

function contarDiasETreinosCompletos() {
  let dias = 0, treinos = 0;
  chavesDeDataValidas().forEach((chave) => {
    const dados = lerDados(chave);
    if (!dados) return;
    const ent = Object.entries(dados);
    if (ent.length > 0 && ent.every(([, v]) => v)) dias++;
    if (ent.some(([id, v]) => v && id.toLowerCase().includes('treino'))) treinos++;
  });
  return { dias, treinos };
}

// ── Retrospectiva ─────────────────────────────────────────────────

function salvarRetrospectiva() {
  const inputData = document.getElementById('inputDataRetro').value;
  if (!inputData) { alert('Selecione uma data.'); return; }

  const checkboxes = document.querySelectorAll('.retro-check');
  const dados = {};
  checkboxes.forEach(cb => { dados[cb.dataset.id] = cb.checked; });

  salvarDados(inputData, dados);
  alert('Dia registrado com sucesso!');
  document.getElementById('retroContainer').style.display = 'none';
}

function carregarPainelConfig() {
  // Notificações
  const cfg = lerConfigNotif();
  document.getElementById('toggleNotif').checked  = cfg.ativa;
  document.getElementById('inputHoraNotif').value  = cfg.hora;

  // Retrospectiva: preencher lista de tarefas
  const lista = document.getElementById('retroLista');
  lista.innerHTML = '';
  tarefasAtuais.forEach(t => {
    const li = document.createElement('li');
    li.innerHTML = `
      <label style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer">
        <input type="checkbox" class="retro-check" data-id="${t.id}">
        ${t.icone || ''} ${t.label}
      </label>`;
    lista.appendChild(li);
  });

  const inputData = document.getElementById('inputDataRetro');
  const hoje = new Date();
  hoje.setDate(hoje.getDate() - 1); // começa ontem
  inputData.max   = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  inputData.value = inputData.max;
}

// ── Service Worker ────────────────────────────────────────────────

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
