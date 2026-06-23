// app.js — ponto de entrada principal
import { chaveHoje, lerDados, salvarDados, chavesDeDataValidas } from './storage.js';
import { obterHistoricoUltimosDias, calcularSequencia } from './historico.js';
import {
  exibirDiaAtual,
  atualizarBarraProgresso,
  atualizarEstatisticas,
  renderizarHistorico,
  lerEstadoCheckboxes,
  aplicarEstadoCheckboxes,
  renderizarTarefas,
  abrirModalTarefas,
  fecharModalTarefas,
  inicializarModal,
} from './ui.js';
import { carregarTarefas, salvarTarefas } from './tarefas.js';
import { obterDadosMes, calcularDashboard, corProgresso } from './calendario.js';

registrarServiceWorker();

const CHAVE_HOJE = chaveHoje();
let tarefasAtuais = carregarTarefas();

// Estado do calendário
let calMes = new Date().getMonth();
let calAno = new Date().getFullYear();

iniciar();

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function iniciar() {
  exibirDiaAtual();
  renderizarTarefas(tarefasAtuais, onCheckboxChange);
  carregarDiaAtual();
  atualizarTela();
  inicializarModal({ onSalvar: salvarEdicaoTarefas, onCancelar: fecharModalTarefas });

  document.getElementById('btnEditarTarefas')
    .addEventListener('click', () => abrirModalTarefas(tarefasAtuais));

  // Abas
  document.querySelectorAll('.aba').forEach((btn) => {
    btn.addEventListener('click', () => trocarAba(btn.dataset.aba));
  });

  // Navegação do calendário
  document.getElementById('btnMesAnterior').addEventListener('click', () => {
    if (--calMes < 0) { calMes = 11; calAno--; }
    renderizarCalendario();
  });
  document.getElementById('btnProximoMes').addEventListener('click', () => {
    if (++calMes > 11) { calMes = 0; calAno++; }
    renderizarCalendario();
  });
}

// ─── Navegação por abas ───────────────────────────────────────────────────────

function trocarAba(aba) {
  document.querySelectorAll('.aba')
    .forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
  document.querySelectorAll('.aba-conteudo')
    .forEach(c => c.classList.toggle('ativa', c.id === `aba-${aba}`));

  if (aba === 'calendario') renderizarCalendario();
  if (aba === 'dashboard')  renderizarDashboard();
}

// ─── Calendário ───────────────────────────────────────────────────────────────

function renderizarCalendario() {
  const { dias, primeiroDia } = obterDadosMes(calAno, calMes);

  // Título do mês
  const nomeMes = new Date(calAno, calMes, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  document.getElementById('tituloMes').textContent =
    nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  const grid = document.getElementById('calendarioGrid');
  const frag = document.createDocumentFragment();

  // Células vazias para offset do dia da semana
  const offset = primeiroDia.getDay();
  for (let i = 0; i < offset; i++) {
    const vazio = document.createElement('div');
    vazio.className = 'cal-dia vazio';
    frag.appendChild(vazio);
  }

  dias.forEach((d) => {
    const cel = document.createElement('div');
    const cor = corProgresso(d.porcentagem, d.semDados);
    let cls = `cal-dia cor-${cor}`;
    if (d.ehHoje)   cls += ' cal-hoje';
    if (d.isFuturo) cls += ' cal-futuro';
    cel.className = cls;
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

  // Esconde detalhe ao trocar de mês
  const detalhe = document.getElementById('detalhe-dia');
  detalhe.style.display = 'none';
}

function mostrarDetalheDia(d) {
  const dataFormatada = d.data.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  document.getElementById('detalhe-data').textContent =
    dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
  document.getElementById('detalhe-percentual').textContent =
    d.semDados ? '—' : `${d.porcentagem}%`;

  const lista = document.getElementById('detalhe-lista');
  const frag  = document.createDocumentFragment();

  if (d.semDados && !d.ehHoje) {
    const li = document.createElement('li');
    li.className = 'detalhe-sem-dados';
    li.textContent = 'Sem dados registrados';
    frag.appendChild(li);
  } else {
    d.tarefas.forEach((t) => {
      const marcada = d.dadosMarcados[t.id] === true;
      const li = document.createElement('li');
      li.className = marcada ? 'detalhe-ok' : 'detalhe-nao';
      li.textContent = `${marcada ? '✓' : '✗'} ${t.icone || ''} ${t.label}`.trim();
      frag.appendChild(li);
    });
  }

  lista.innerHTML = '';
  lista.appendChild(frag);

  const container = document.getElementById('detalhe-dia');
  container.style.display = 'block';
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function renderizarDashboard() {
  const { melhorSequencia, diasPerfeitos, horasEstudadas, treinos, mediaGeral } = calcularDashboard();
  document.getElementById('dash-melhor-seq').textContent    = `${melhorSequencia} dias`;
  document.getElementById('dash-dias-perfeitos').textContent = diasPerfeitos;
  document.getElementById('dash-horas').textContent          = horasEstudadas;
  document.getElementById('dash-treinos').textContent        = treinos;
  document.getElementById('dash-media').textContent          = `${mediaGeral}%`;
}

// ─── Aba Hoje ─────────────────────────────────────────────────────────────────

function onCheckboxChange() {
  salvarDiaAtual();
  atualizarTela();
}

function carregarDiaAtual() {
  const dados = lerDados(CHAVE_HOJE);
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  aplicarEstadoCheckboxes(checkboxes, dados);
}

function salvarDiaAtual() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  salvarDados(CHAVE_HOJE, lerEstadoCheckboxes(checkboxes));
}

function atualizarTela() {
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
  const total    = checkboxes.length;
  const marcados = checkboxes.filter(cb => cb.checked).length;
  const pct      = total > 0 ? Math.round((marcados / total) * 100) : 0;

  atualizarBarraProgresso(pct);

  const historico = obterHistoricoUltimosDias(total, 7);
  renderizarHistorico(historico);

  const { dias, treinos } = contarDiasETreinosCompletos();
  const sequencia = calcularSequencia(historico);
  atualizarEstatisticas({ dias, treinos, sequencia });
}

function salvarEdicaoTarefas(novasTarefas) {
  salvarTarefas(novasTarefas);
  tarefasAtuais = novasTarefas;
  renderizarTarefas(tarefasAtuais, onCheckboxChange);
  carregarDiaAtual();
  atualizarTela();
  fecharModalTarefas();
}

function contarDiasETreinosCompletos() {
  let dias = 0;
  let treinos = 0;

  chavesDeDataValidas().forEach((chave) => {
    const dados = lerDados(chave);
    if (!dados) return;
    const entradas = Object.entries(dados);
    if (entradas.length > 0 && entradas.every(([, v]) => v)) dias++;
    if (entradas.some(([id, v]) => v && id.toLowerCase().includes('treino'))) treinos++;
  });

  return { dias, treinos };
}

// ─── Service Worker ───────────────────────────────────────────────────────────

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
