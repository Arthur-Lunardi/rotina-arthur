// app.js — ponto de entrada principal (v4)
import { chaveHoje, lerDados, salvarDados, chavesDeDataValidas, lerPrefs, salvarPrefs } from './storage.js';
import { obterHistoricoUltimosDias, calcularSequencia } from './historico.js';
import {
  exibirDiaAtual, atualizarBarraProgresso, atualizarEstatisticas,
  renderizarHistorico, lerEstadoCheckboxes, aplicarEstadoCheckboxes,
  renderizarTarefas, abrirModalTarefas, fecharModalTarefas,
  inicializarModal, abrirConfiguracoes, fecharConfiguracoes,
  mostrarToast,
} from './ui.js';
import {
  carregarTarefas, salvarTarefas,
  carregarGrupos, salvarGrupos,
  tarefasParaHoje, tarefasParaData,
  carregarHorasEstudo, salvarMinutosEstudo, minutosParaTexto,
  gerarGrupoId,
} from './tarefas.js';
import { obterDadosMes, calcularDashboard, corProgresso } from './calendario.js';
import { exportarCSV, exportarBackupJSON, importarBackupJSON } from './exportar.js';
import { dispararConfetti, resetarConfetti } from './confetti.js';
import { renderizarGrafico } from './grafico.js';
import {
  lerConfigNotif, salvarConfigNotif,
  pedirPermissao, agendarNotificacao, inicializarNotificacoes,
} from './notificacoes.js';

registrarServiceWorker();

const CHAVE_HOJE = chaveHoje();
let tarefasTodas   = carregarTarefas();   // todas as tarefas cadastradas
let gruposAtuais   = carregarGrupos();    // grupos de dias
let tarefasAtuais  = tarefasParaHoje(tarefasTodas, gruposAtuais); // tarefas de hoje
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
  _bindBeforeUnload();
}

function _bindEventos() {
  document.getElementById('btnEditarTarefas')
    .addEventListener('click', () => abrirModalTarefas(tarefasTodas));

  document.getElementById('btnConfiguracoes')
    .addEventListener('click', () => { abrirConfiguracoes(); carregarPainelConfig(); });
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

  // Backup JSON
  document.getElementById('btnExportarBackup')
    .addEventListener('click', () => {
      exportarBackupJSON();
      mostrarToast('📤 Backup exportado com sucesso!', '', null, 2500);
    });

  document.getElementById('btnImportarBackup')
    .addEventListener('click', () => document.getElementById('inputImportarBackup').click());

  document.getElementById('inputImportarBackup')
    .addEventListener('change', async (e) => {
      const arquivo = e.target.files[0];
      if (!arquivo) return;
      try {
        const resultado = await importarBackupJSON(arquivo);
        // Recarrega tudo
        tarefasTodas  = carregarTarefas();
        gruposAtuais  = carregarGrupos();
        tarefasAtuais = tarefasParaHoje(tarefasTodas, gruposAtuais);
        renderizarTarefas(tarefasAtuais, onCheckboxChange);
        carregarDiaAtual();
        atualizarTela();
        aplicarTema();
        mostrarToast(`✅ Backup importado: ${resultado.tarefas} tarefas, ${resultado.dias} dias`, '', null, 4000);
      } catch (err) {
        mostrarToast(`❌ Erro ao importar: ${err.message}`, '', null, 4000);
      }
      e.target.value = '';
    });

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
        mostrarToast('⚠️ Permissão de notificação negada. Ative nas configurações do navegador.', '', null, 4000);
        return;
      }
    }
    const hora = document.getElementById('inputHoraNotif').value || '23:15';
    const cfg  = { ativa: e.target.checked, hora };
    salvarConfigNotif(cfg);
    if (cfg.ativa) agendarNotificacao(hora);
    mostrarToast(cfg.ativa ? '🔔 Lembrete ativado' : '🔕 Lembrete desativado', '', null, 2500);
  });

  document.getElementById('inputHoraNotif').addEventListener('change', (e) => {
    const cfg = lerConfigNotif();
    cfg.hora  = e.target.value;
    salvarConfigNotif(cfg);
    if (cfg.ativa) agendarNotificacao(cfg.hora);
    mostrarToast('🕐 Horário atualizado', '', null, 2000);
  });

  // Retrospectiva
  document.getElementById('inputDataRetro').addEventListener('change', (e) => {
    _renderizarRetroLista(e.target.value);
  });
  document.getElementById('btnSalvarRetro').addEventListener('click', salvarRetrospectiva);

  // Grupos de dias
  document.getElementById('btnGerenciarGrupos')
    .addEventListener('click', abrirModalGrupos);

  // Horas de estudo (modal ao clicar em "Estudei")
  document.addEventListener('click', (e) => {
    const label = e.target.closest('label');
    if (!label) return;
    const cb = label.querySelector('input[type="checkbox"]');
    if (!cb) return;
    const tarefa = tarefasAtuais.find(t => t.id === cb.id);
    // Abre modal de horas somente para tarefas de estudo quando marcando
    if (tarefa && tarefa.id.toLowerCase().includes('estud') && cb.checked) {
      e.preventDefault();
      cb.checked = false; // desfaz temporariamente
      abrirModalHorasEstudo(tarefa, cb);
    }
  });

  // Redimensionar
  let _resizeTimer = null;
  const _onResize = () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      const abaAtiva = document.querySelector('.aba-conteudo.ativa');
      if (abaAtiva && abaAtiva.id === 'aba-dashboard') renderizarGrafico();
    }, 150);
  };
  window.addEventListener('resize', _onResize);
  window.addEventListener('orientationchange', _onResize);
}

function _bindBeforeUnload() {
  window.addEventListener('beforeunload', (e) => {
    const modalAberto = document.getElementById('modalOverlay').classList.contains('aberto');
    if (modalAberto) { e.preventDefault(); e.returnValue = ''; }
  });
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
  const { melhorSequencia, diasPerfeitos, horasEstudadas, treinos, mediaGeral,
          minutosDoMes, mediaDiariaMin } = calcularDashboard();

  document.getElementById('dash-melhor-seq').textContent     = `${melhorSequencia} dias`;
  document.getElementById('dash-dias-perfeitos').textContent = diasPerfeitos;
  document.getElementById('dash-horas').textContent          = horasEstudadas;
  document.getElementById('dash-treinos').textContent        = treinos;
  document.getElementById('dash-media').textContent          = `${mediaGeral}%`;

  // Bloco mensal de estudo
  const mesNome = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const elMesNome = document.getElementById('dash-estudo-mes-nome');
  const elTotal   = document.getElementById('dash-estudo-total');
  const elMedia   = document.getElementById('dash-estudo-media');
  if (elMesNome) elMesNome.textContent = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);
  if (elTotal)   elTotal.textContent   = minutosParaTexto(minutosDoMes);
  if (elMedia)   elMedia.textContent   = minutosParaTexto(mediaDiariaMin);
}

// ── Aba Hoje ──────────────────────────────────────────────────────

function onCheckboxChange() {
  salvarDiaAtual();
  atualizarTela();
}

function _checkboxesTarefas() {
  return document.querySelectorAll('#cardTarefas input[type="checkbox"]');
}

function carregarDiaAtual() {
  const dadosBrutos = lerDados(CHAVE_HOJE);
  const idsAtuais   = new Set(tarefasAtuais.map(t => t.id));

  if (dadosBrutos) {
    const dadosLimpos = {};
    idsAtuais.forEach(id => { dadosLimpos[id] = dadosBrutos[id] || false; });
    if (Object.keys(dadosBrutos).length !== Object.keys(dadosLimpos).length) {
      salvarDados(CHAVE_HOJE, dadosLimpos);
    }
    aplicarEstadoCheckboxes(_checkboxesTarefas(), dadosLimpos);
  } else {
    aplicarEstadoCheckboxes(_checkboxesTarefas(), null);
  }
}

function salvarDiaAtual() {
  const dadosNovos = lerEstadoCheckboxes(_checkboxesTarefas());
  salvarDados(CHAVE_HOJE, dadosNovos);
}

function atualizarTela() {
  const cbs      = Array.from(_checkboxesTarefas());
  const total    = cbs.length;
  const marcados = cbs.filter(cb => cb.checked).length;
  const pct      = total > 0 ? Math.round((marcados / total) * 100) : 0;

  atualizarBarraProgresso(pct);

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
  tarefasTodas  = novas;
  tarefasAtuais = tarefasParaHoje(tarefasTodas, gruposAtuais);
  renderizarTarefas(tarefasAtuais, onCheckboxChange);
  carregarDiaAtual();

  const idsAtuais = new Set(tarefasAtuais.map(t => t.id));
  const dadosHoje = lerDados(CHAVE_HOJE) || {};
  const dadosLimpos = {};
  idsAtuais.forEach(id => { dadosLimpos[id] = dadosHoje[id] || false; });
  salvarDados(CHAVE_HOJE, dadosLimpos);

  atualizarTela();
  fecharModalTarefas();
  mostrarToast('✅ Tarefas salvas com sucesso!', '', null, 2500);
}

function contarDiasETreinosCompletos() {
  let dias = 0, treinos = 0;
  chavesDeDataValidas().forEach((chave) => {
    const dados = lerDados(chave);
    if (!dados) return;
    const data       = new Date(chave);
    const tarefasDia = tarefasParaData(data, tarefasTodas, gruposAtuais);
    const totalDia   = tarefasDia.length;
    if (totalDia === 0) return;
    const marcadas = tarefasDia.filter(t => dados[t.id]).length;
    if (marcadas >= totalDia) dias++;
    if (tarefasDia.some(t => dados[t.id] && t.id.toLowerCase().includes('treino'))) treinos++;
  });
  return { dias, treinos };
}

// ── Modal de horas de estudo ──────────────────────────────────────

function abrirModalHorasEstudo(tarefa, checkbox) {
  // Cria overlay se não existir
  let overlay = document.getElementById('modalHorasEstudo');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modalHorasEstudo';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box modal-horas-box">
        <h3 class="modal-horas-titulo">📚 Quanto você estudou?</h3>
        <div class="modal-horas-opcoes" id="horasOpcoes"></div>
        <div class="modal-horas-outro" id="horasOutroDiv" style="display:none">
          <input type="number" id="horasOutroInput" min="5" max="720" step="5"
                 placeholder="Minutos (ex: 90)" class="modal-input-label">
        </div>
        <div class="modal-horas-btns">
          <button id="btnHorasConfirmar" class="btn-primario">Confirmar</button>
          <button id="btnHorasCancelar" class="btn-secundario">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  const opcoes = [
    { label: '15 min', valor: 15 },
    { label: '30 min', valor: 30 },
    { label: '45 min', valor: 45 },
    { label: '1 hora', valor: 60 },
    { label: '2 horas', valor: 120 },
    { label: '3 horas', valor: 180 },
    { label: 'Outro',   valor: 0 },
  ];

  const container = document.getElementById('horasOpcoes');
  container.innerHTML = '';
  let selecionado = null;

  opcoes.forEach(op => {
    const btn = document.createElement('button');
    btn.className = 'horas-opcao';
    btn.textContent = op.label;
    btn.addEventListener('click', () => {
      container.querySelectorAll('.horas-opcao').forEach(b => b.classList.remove('ativa'));
      btn.classList.add('ativa');
      selecionado = op.valor;
      document.getElementById('horasOutroDiv').style.display = op.valor === 0 ? 'block' : 'none';
    });
    container.appendChild(btn);
  });

  document.getElementById('horasOutroDiv').style.display = 'none';
  document.getElementById('horasOutroInput').value = '';
  overlay.classList.add('aberto');

  document.getElementById('btnHorasConfirmar').onclick = () => {
    let minutos = selecionado;
    if (minutos === 0) {
      minutos = parseInt(document.getElementById('horasOutroInput').value, 10);
      if (!minutos || minutos <= 0) {
        mostrarToast('⚠️ Digite um tempo válido.', '', null, 2500);
        return;
      }
    }
    if (minutos === null) {
      mostrarToast('⚠️ Selecione o tempo estudado.', '', null, 2500);
      return;
    }
    // Marca o checkbox e salva
    checkbox.checked = true;
    salvarMinutosEstudo(CHAVE_HOJE, minutos);
    salvarDiaAtual();
    atualizarTela();
    overlay.classList.remove('aberto');
    mostrarToast(`📚 ${minutosParaTexto(minutos)} de estudo registrado!`, '', null, 2500);
  };

  document.getElementById('btnHorasCancelar').onclick = () => {
    overlay.classList.remove('aberto');
  };
}

// ── Modal de grupos de dias ───────────────────────────────────────

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function abrirModalGrupos() {
  let overlay = document.getElementById('modalGrupos');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modalGrupos';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>📅 Grupos de dias</h3>
          <button id="btnFecharGrupos" class="btn-fechar">✕</button>
        </div>
        <p class="modal-descricao">Cada grupo define quais tarefas aparecem em determinados dias da semana.</p>
        <div id="listaGrupos"></div>
        <button id="btnNovoGrupo" class="btn-secundario" style="width:100%;margin-top:12px">+ Novo grupo</button>
        <div class="modal-horas-btns" style="margin-top:16px">
          <button id="btnSalvarGrupos" class="btn-primario">Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  overlay.classList.add('aberto');
  _renderizarListaGrupos();

  document.getElementById('btnFecharGrupos').onclick = () => overlay.classList.remove('aberto');
  document.getElementById('btnNovoGrupo').onclick = () => {
    gruposAtuais.push({
      id: gerarGrupoId(),
      nome: 'Novo grupo',
      dias: [],
      tarefas: tarefasTodas.map(t => t.id),
    });
    _renderizarListaGrupos();
  };
  document.getElementById('btnSalvarGrupos').onclick = () => {
    _coletarGruposDoModal();
    salvarGrupos(gruposAtuais);
    tarefasAtuais = tarefasParaHoje(tarefasTodas, gruposAtuais);
    renderizarTarefas(tarefasAtuais, onCheckboxChange);
    carregarDiaAtual();
    atualizarTela();
    overlay.classList.remove('aberto');
    mostrarToast('✅ Grupos salvos!', '', null, 2500);
  };
}

function _renderizarListaGrupos() {
  const lista = document.getElementById('listaGrupos');
  lista.innerHTML = '';

  gruposAtuais.forEach((grupo, idx) => {
    const div = document.createElement('div');
    div.className = 'grupo-item';
    div.dataset.idx = idx;

    // Dias checkboxes
    const diasHTML = DIAS_SEMANA.map((nome, d) => `
      <label class="grupo-dia-label">
        <input type="checkbox" class="grupo-dia-cb" data-dia="${d}" ${grupo.dias.includes(d) ? 'checked' : ''}>
        ${nome}
      </label>`).join('');

    // Tarefas checkboxes
    const tarefasHTML = tarefasTodas.map(t => `
      <label class="grupo-tarefa-label">
        <input type="checkbox" class="grupo-tarefa-cb" data-tid="${t.id}" ${grupo.tarefas.includes(t.id) ? 'checked' : ''}>
        ${t.icone || ''} ${t.label}
      </label>`).join('');

    div.innerHTML = `
      <div class="grupo-header">
        <input class="grupo-nome-input modal-input-label" value="${grupo.nome}" placeholder="Nome do grupo">
        <button class="btn-excluir-grupo" data-idx="${idx}" title="Excluir grupo">🗑</button>
      </div>
      <div class="grupo-section-label">Dias da semana:</div>
      <div class="grupo-dias">${diasHTML}</div>
      <div class="grupo-section-label" style="margin-top:10px">Tarefas:</div>
      <div class="grupo-tarefas">${tarefasHTML}</div>
    `;

    div.querySelector('.btn-excluir-grupo').addEventListener('click', (e) => {
      const i = parseInt(e.currentTarget.dataset.idx);
      if (gruposAtuais.length <= 1) {
        mostrarToast('⚠️ Mantenha ao menos 1 grupo.', '', null, 2500);
        return;
      }
      gruposAtuais.splice(i, 1);
      _renderizarListaGrupos();
    });

    lista.appendChild(div);
  });
}

function _coletarGruposDoModal() {
  const itens = document.querySelectorAll('#listaGrupos .grupo-item');
  itens.forEach((div, idx) => {
    const nome = div.querySelector('.grupo-nome-input').value.trim() || `Grupo ${idx + 1}`;
    const dias = [...div.querySelectorAll('.grupo-dia-cb:checked')].map(cb => parseInt(cb.dataset.dia));
    const tarefas = [...div.querySelectorAll('.grupo-tarefa-cb:checked')].map(cb => cb.dataset.tid);
    gruposAtuais[idx] = { ...gruposAtuais[idx], nome, dias, tarefas };
  });
}

// ── Retrospectiva ─────────────────────────────────────────────────

function _renderizarRetroLista(dataISO) {
  const lista = document.getElementById('retroLista');
  lista.innerHTML = '';
  if (!dataISO) return;

  const dadosExistentes = lerDados(dataISO) || {};
  const data            = new Date(dataISO);
  const tarefasDia      = tarefasParaData(data, tarefasTodas, gruposAtuais);

  tarefasDia.forEach(t => {
    const li = document.createElement('li');
    const jaMarcada = dadosExistentes[t.id] === true;
    li.innerHTML = `
      <label style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer;font-size:15px">
        <input type="checkbox" class="retro-check" data-id="${t.id}" ${jaMarcada ? 'checked' : ''}>
        ${t.icone || ''} ${t.label}
      </label>`;
    lista.appendChild(li);
  });
}

function salvarRetrospectiva() {
  const inputData = document.getElementById('inputDataRetro').value;
  if (!inputData) { mostrarToast('⚠️ Selecione uma data.', '', null, 2500); return; }

  const hojeISO = new Date().toISOString().split('T')[0];
  if (inputData >= hojeISO) { mostrarToast('⚠️ Selecione uma data anterior a hoje.', '', null, 2500); return; }

  const checkboxes = document.querySelectorAll('.retro-check');
  if (checkboxes.length === 0) { mostrarToast('⚠️ Nenhuma tarefa disponível.', '', null, 2500); return; }

  const dados = {};
  checkboxes.forEach(cb => { dados[cb.dataset.id] = cb.checked; });

  const ok = salvarDados(inputData, dados);
  if (ok) {
    mostrarToast('✅ Dia registrado com sucesso!', '', null, 3000);
    atualizarTela();
  } else {
    mostrarToast('❌ Erro ao salvar. Tente novamente.', '', null, 3000);
  }
}

function carregarPainelConfig() {
  const prefs = lerPrefs();
  const toggleTema = document.getElementById('toggleTema');
  if (toggleTema) toggleTema.checked = !!prefs.temaClaro;

  const cfg = lerConfigNotif();
  document.getElementById('toggleNotif').checked = cfg.ativa;
  document.getElementById('inputHoraNotif').value = cfg.hora;

  const inputData = document.getElementById('inputDataRetro');
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 1);
  inputData.max = ontem.toISOString().split('T')[0];
  inputData.min = minDate.toISOString().split('T')[0];
  inputData.value = inputData.max;
  _renderizarRetroLista(inputData.value);
}

// ── Service Worker ────────────────────────────────────────────────

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
