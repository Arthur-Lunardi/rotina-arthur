// app.js
// Ponto de entrada da aplicação. Conecta storage + historico + ui.
// É o único arquivo que conhece todas as outras peças.

import { chaveHoje, lerDados, salvarDados, chavesDeDataValidas } from './storage.js';
import { obterHistoricoUltimosDias, calcularSequencia } from './historico.js';
import {
  exibirDiaAtual,
  atualizarBarraProgresso,
  atualizarEstatisticas,
  renderizarHistorico,
  lerEstadoCheckboxes,
  aplicarEstadoCheckboxes,
} from './ui.js';

registrarServiceWorker();

const checkboxes = document.querySelectorAll('input[type="checkbox"]');
const CHAVE_HOJE = chaveHoje();

iniciar();

function iniciar() {
  exibirDiaAtual();
  carregarDiaAtual();

  checkboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      salvarDiaAtual();
      atualizarTela();
    });
  });

  atualizarTela();
}

function carregarDiaAtual() {
  const dados = lerDados(CHAVE_HOJE);
  aplicarEstadoCheckboxes(checkboxes, dados);
}

function salvarDiaAtual() {
  const dados = lerEstadoCheckboxes(checkboxes);
  salvarDados(CHAVE_HOJE, dados);
}

function atualizarTela() {
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

/** Conta, em todo o histórico salvo, quantos dias foram 100% completos e quantos treinos foram feitos */
function contarDiasETreinosCompletos() {
  let dias = 0;
  let treinos = 0;

  chavesDeDataValidas().forEach((chave) => {
    const dados = lerDados(chave);
    if (!dados) return;

    const valores = Object.values(dados);
    if (valores.length > 0 && valores.every((v) => v)) dias++;
    if (dados.treino) treinos++;
  });

  return { dias, treinos };
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((erro) => console.log('Erro ao registrar service worker:', erro));
  });
}
