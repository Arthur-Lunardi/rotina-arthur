// ui.js
// Tudo que toca no DOM mora aqui. Recebe dados já calculados e só exibe.

import { gerarId } from './tarefas.js';

const NOMES_DIA_SEMANA = { weekday: 'short' };

/** Exibe o nome do dia da semana atual no topo da tela */
export function exibirDiaAtual() {
  const nome = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  document.getElementById('diaAtual').innerText = nome.toUpperCase();
}

/** Atualiza a barra de progresso e o texto de porcentagem do dia atual */
export function atualizarBarraProgresso(porcentagem) {
  document.getElementById('barraInterna').style.width = porcentagem + '%';
  document.getElementById('percentual').innerText = porcentagem + '%';
}

/** Atualiza os números do bloco de estatísticas */
export function atualizarEstatisticas({ dias, treinos, sequencia }) {
  document.getElementById('diasConcluidos').innerText = dias;
  document.getElementById('treinosRealizados').innerText = treinos;
  document.getElementById('sequenciaAtual').innerText = sequencia;
}

/**
 * Renderiza dinamicamente as tarefas no card de checkboxes.
 * @param {Array} tarefas - lista de { id, label, icone }
 * @param {Function} onchange - callback chamado quando um checkbox muda
 */
export function renderizarTarefas(tarefas, onchange) {
  const card = document.getElementById('cardTarefas');
  card.innerHTML = '';

  tarefas.forEach((tarefa) => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = tarefa.id;
    cb.addEventListener('change', onchange);

    label.appendChild(cb);
    label.appendChild(document.createTextNode(` ${tarefa.icone || ''} ${tarefa.label}`));
    card.appendChild(label);
  });
}

/** Renderiza a fileira de círculos de progresso dos últimos dias */
export function renderizarHistorico(historico) {
  const container = document.getElementById('historico');
  if (!container) return;

  container.innerHTML = '';

  historico.forEach((dia) => {
    const diaSemana = dia.data.toLocaleDateString('pt-BR', NOMES_DIA_SEMANA).replace('.', '');
    const numeroDia = dia.data.getDate();

    const item = document.createElement('div');
    item.className = 'dia-historico' + (dia.ehHoje ? ' dia-hoje' : '');
    item.title = `${dia.data.toLocaleDateString('pt-BR')} — ${dia.porcentagem}% concluído`;

    item.innerHTML = `
      <span class="dia-historico-nome">${diaSemana}</span>
      <div class="dia-historico-circulo" style="--progresso: ${dia.porcentagem}%">
        <span>${numeroDia}</span>
      </div>
    `;

    container.appendChild(item);
  });
}

/** Lê o estado atual dos checkboxes na tela como um objeto { id: true/false } */
export function lerEstadoCheckboxes(checkboxes) {
  const dados = {};
  checkboxes.forEach((cb) => {
    dados[cb.id] = cb.checked;
  });
  return dados;
}

/** Aplica um objeto de estado salvo aos checkboxes da tela */
export function aplicarEstadoCheckboxes(checkboxes, dados) {
  if (!dados) return;
  checkboxes.forEach((cb) => {
    cb.checked = dados[cb.id] || false;
  });
}

// ─── Modal de edição de tarefas ───────────────────────────────────────────────

let _callbacks = {};

/** Inicializa os callbacks do modal */
export function inicializarModal({ onSalvar, onCancelar }) {
  _callbacks = { onSalvar, onCancelar };

  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') onCancelar();
  });
  document.getElementById('btnModalCancelar').addEventListener('click', onCancelar);
  document.getElementById('btnModalSalvar').addEventListener('click', coletarESalvar);
  document.getElementById('btnAdicionarTarefa').addEventListener('click', adicionarLinhaNoModal);
}

/** Abre o modal preenchido com as tarefas atuais */
export function abrirModalTarefas(tarefas) {
  const lista = document.getElementById('listaTarefasModal');
  lista.innerHTML = '';

  tarefas.forEach((t) => adicionarLinhaNoModal(null, t));

  document.getElementById('modalOverlay').classList.add('aberto');
  document.body.style.overflow = 'hidden';
}

/** Fecha o modal */
export function fecharModalTarefas() {
  document.getElementById('modalOverlay').classList.remove('aberto');
  document.body.style.overflow = '';
}

/** Adiciona uma linha de edição no modal */
function adicionarLinhaNoModal(e, tarefa = null) {
  const lista = document.getElementById('listaTarefasModal');
  const id = tarefa ? tarefa.id : gerarId();

  const linha = document.createElement('div');
  linha.className = 'modal-linha';
  linha.dataset.id = id;

  linha.innerHTML = `
    <input class="modal-input-icone" type="text" maxlength="2" placeholder="🔔"
      value="${tarefa ? tarefa.icone || '' : ''}" aria-label="Ícone da tarefa">
    <input class="modal-input-label" type="text" placeholder="Nome da tarefa"
      value="${tarefa ? tarefa.label : ''}" aria-label="Nome da tarefa">
    <button class="btn-remover-tarefa" aria-label="Remover tarefa">🗑️</button>
  `;

  linha.querySelector('.btn-remover-tarefa').addEventListener('click', () => {
    linha.classList.add('saindo');
    setTimeout(() => linha.remove(), 200);
  });

  lista.appendChild(linha);

  // Foca no campo de label se for nova tarefa
  if (!tarefa) {
    setTimeout(() => linha.querySelector('.modal-input-label').focus(), 50);
  }
}

/** Coleta os dados do modal e chama o callback de salvar */
function coletarESalvar() {
  const linhas = document.querySelectorAll('.modal-linha');
  const novasTarefas = [];

  linhas.forEach((linha) => {
    const label = linha.querySelector('.modal-input-label').value.trim();
    if (!label) return; // ignora linhas vazias
    const icone = linha.querySelector('.modal-input-icone').value.trim();
    const id = linha.dataset.id;
    novasTarefas.push({ id, label, icone });
  });

  if (novasTarefas.length === 0) {
    alert('Adicione pelo menos uma tarefa.');
    return;
  }

  _callbacks.onSalvar(novasTarefas);
}
