// app.js
// Ponto de entrada da aplicação. Conecta storage + historico + ui + tarefas.

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
import { carregarTarefas, salvarTarefas, gerarId } from './tarefas.js';

registrarServiceWorker();

const CHAVE_HOJE = chaveHoje();
let tarefasAtuais = carregarTarefas();

iniciar();

function iniciar() {
  exibirDiaAtual();
  renderizarTarefas(tarefasAtuais, onCheckboxChange);
  carregarDiaAtual();
  atualizarTela();
  inicializarModal({
    onSalvar: salvarEdicaoTarefas,
    onCancelar: fecharModalTarefas,
  });

  // Botão para abrir o editor
  document.getElementById('btnEditarTarefas').addEventListener('click', () => {
    abrirModalTarefas(tarefasAtuais);
  });
}

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
  const dados = lerEstadoCheckboxes(checkboxes);
  salvarDados(CHAVE_HOJE, dados);
}

function atualizarTela() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  const total = checkboxes.length;
  const marcados = Array.from(checkboxes).filter((cb) => cb.checked).length;
  const porcentagem = total > 0 ? Math.round((marcados / total) * 100) : 0;

  atualizarBarraProgresso(porcentagem);

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

    const valores = Object.values(dados);
    if (valores.length > 0 && valores.every((v) => v)) dias++;

    // Conta treino se qualquer tarefa com "treino" no id estiver marcada
    const temTreino = Object.entries(dados).some(
      ([id, val]) => val && id.toLowerCase().includes('treino')
    );
    if (temTreino) treinos++;
  });

  return { dias, treinos };
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((err) => console.log('Erro ao registrar service worker:', err));
  });
}
