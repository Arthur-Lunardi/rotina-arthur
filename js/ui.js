// ui.js — tudo que toca no DOM

import { gerarId } from './tarefas.js';

const NOMES_DIA = { weekday: 'short' };

export function exibirDiaAtual() {
  const nome = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  document.getElementById('diaAtual').textContent = nome.toUpperCase();
}

export function atualizarBarraProgresso(pct) {
  document.getElementById('barraInterna').style.width = pct + '%';
  document.getElementById('percentual').textContent   = pct + '%';
}

export function atualizarEstatisticas({ dias, treinos, sequencia }) {
  document.getElementById('diasConcluidos').textContent   = dias;
  document.getElementById('treinosRealizados').textContent = treinos;
  document.getElementById('sequenciaAtual').textContent   = sequencia;
}

export function renderizarTarefas(tarefas, onchange) {
  const card = document.getElementById('cardTarefas');
  card.innerHTML = '';
  const frag = document.createDocumentFragment();

  tarefas.forEach((tarefa) => {
    const label = document.createElement('label');
    const cb    = document.createElement('input');
    cb.type = 'checkbox';
    cb.id   = tarefa.id;
    cb.addEventListener('change', onchange);
    label.appendChild(cb);
    label.appendChild(document.createTextNode(` ${tarefa.icone || ''} ${tarefa.label}`));
    frag.appendChild(label);
  });

  card.appendChild(frag);
}

export function renderizarHistorico(historico) {
  const container = document.getElementById('historico');
  if (!container) return;
  const frag = document.createDocumentFragment();

  historico.forEach((dia) => {
    const nomeDia  = dia.data.toLocaleDateString('pt-BR', NOMES_DIA).replace('.', '');
    const numDia   = dia.data.getDate();

    const item = document.createElement('div');
    item.className = 'dia-historico' + (dia.ehHoje ? ' dia-hoje' : '');
    item.title     = `${dia.data.toLocaleDateString('pt-BR')} — ${dia.porcentagem}%`;

    item.innerHTML = `
      <span class="dia-historico-nome">${nomeDia}</span>
      <div class="dia-historico-circulo" style="--progresso:${dia.porcentagem}%">
        <span>${numDia}</span>
      </div>`;

    frag.appendChild(item);
  });

  container.innerHTML = '';
  container.appendChild(frag);
}

export function lerEstadoCheckboxes(checkboxes) {
  const dados = {};
  checkboxes.forEach(cb => { dados[cb.id] = cb.checked; });
  return dados;
}

export function aplicarEstadoCheckboxes(checkboxes, dados) {
  if (!dados) return;
  checkboxes.forEach(cb => { cb.checked = dados[cb.id] || false; });
}

// ── Toast "desfazer" ──────────────────────────────────────────────
let _toastTimer = null;

export function mostrarToast(mensagem, labelAcao, callbackAcao, duracaoMs = 4000) {
  let toast = document.getElementById('toastUndo');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastUndo';
    toast.className = 'toast-undo';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <span>${mensagem}</span>
    ${callbackAcao ? `<button id="toastAcaobtn">${labelAcao}</button>` : ''}
  `;

  if (callbackAcao) {
    document.getElementById('toastAcaobtn').addEventListener('click', () => {
      callbackAcao();
      ocultarToast();
    });
  }

  toast.classList.add('visivel');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(ocultarToast, duracaoMs);
}

function ocultarToast() {
  const toast = document.getElementById('toastUndo');
  if (toast) toast.classList.remove('visivel');
}

// ── Modal de edição de tarefas ────────────────────────────────────

let _callbacks  = {};
let _lixeira    = []; // histórico para desfazer remoção

export function inicializarModal({ onSalvar, onCancelar }) {
  _callbacks = { onSalvar, onCancelar };

  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') onCancelar();
  });
  document.getElementById('btnModalCancelar').addEventListener('click', onCancelar);
  document.getElementById('btnModalSalvar').addEventListener('click', coletarESalvar);
  document.getElementById('btnAdicionarTarefa').addEventListener('click', () => adicionarLinhaNoModal());

  // Drag-and-drop na lista do modal
  _inicializarDragDrop();
}

export function abrirModalTarefas(tarefas) {
  const lista = document.getElementById('listaTarefasModal');
  lista.innerHTML = '';
  _lixeira = [];

  tarefas.forEach((t) => adicionarLinhaNoModal(t));

  document.getElementById('modalOverlay').classList.add('aberto');
  document.body.style.overflow = 'hidden';
}

export function fecharModalTarefas() {
  document.getElementById('modalOverlay').classList.remove('aberto');
  document.body.style.overflow = '';
}

function adicionarLinhaNoModal(tarefa = null) {
  const lista = document.getElementById('listaTarefasModal');
  const id    = tarefa ? tarefa.id : gerarId();

  const linha = document.createElement('div');
  linha.className    = 'modal-linha';
  linha.dataset.id   = id;
  linha.draggable    = true;

  linha.innerHTML = `
    <span class="drag-handle" title="Arraste para reordenar">⠿</span>
    <input class="modal-input-icone" type="text" maxlength="2" placeholder="🔔"
      value="${tarefa ? (tarefa.icone || '') : ''}" aria-label="Ícone">
    <input class="modal-input-label" type="text" placeholder="Nome da tarefa"
      value="${tarefa ? tarefa.label : ''}" aria-label="Nome da tarefa">
    <button class="btn-remover-tarefa" aria-label="Remover">🗑️</button>
  `;

  linha.querySelector('.btn-remover-tarefa').addEventListener('click', () => {
    const snapshot = {
      id,
      icone: linha.querySelector('.modal-input-icone').value,
      label: linha.querySelector('.modal-input-label').value,
      posicao: Array.from(lista.children).indexOf(linha),
    };
    _lixeira.push(snapshot);

    linha.classList.add('saindo');
    setTimeout(() => linha.remove(), 200);

    mostrarToast('Tarefa removida', 'Desfazer', () => {
      const snap = _lixeira.pop();
      if (!snap) return;
      const novaLinha = _criarLinhaSnapshot(snap);
      const filhos    = lista.children;
      if (snap.posicao >= filhos.length) {
        lista.appendChild(novaLinha);
      } else {
        lista.insertBefore(novaLinha, filhos[snap.posicao]);
      }
    });
  });

  lista.appendChild(linha);

  if (!tarefa) {
    setTimeout(() => linha.querySelector('.modal-input-label').focus(), 50);
  }
}

function _criarLinhaSnapshot(snap) {
  const div = document.createElement('div');
  div.className  = 'modal-linha';
  div.dataset.id = snap.id;
  div.draggable  = true;

  div.innerHTML = `
    <span class="drag-handle">⠿</span>
    <input class="modal-input-icone" type="text" maxlength="2" placeholder="🔔" value="${snap.icone}">
    <input class="modal-input-label" type="text" placeholder="Nome da tarefa" value="${snap.label}">
    <button class="btn-remover-tarefa">🗑️</button>
  `;

  div.querySelector('.btn-remover-tarefa').addEventListener('click', () => {
    div.classList.add('saindo');
    setTimeout(() => div.remove(), 200);
  });

  return div;
}

// ── Drag & Drop ───────────────────────────────────────────────────

function _inicializarDragDrop() {
  const lista = document.getElementById('listaTarefasModal');
  let arrastando = null;

  lista.addEventListener('dragstart', (e) => {
    arrastando = e.target.closest('.modal-linha');
    if (!arrastando) return;
    arrastando.classList.add('arrastando');
    e.dataTransfer.effectAllowed = 'move';
  });

  lista.addEventListener('dragend', () => {
    if (arrastando) arrastando.classList.remove('arrastando');
    lista.querySelectorAll('.modal-linha').forEach(l => l.classList.remove('drag-over'));
    arrastando = null;
  });

  lista.addEventListener('dragover', (e) => {
    e.preventDefault();
    const alvo = e.target.closest('.modal-linha');
    if (!alvo || alvo === arrastando) return;

    lista.querySelectorAll('.modal-linha').forEach(l => l.classList.remove('drag-over'));
    alvo.classList.add('drag-over');

    const rect  = alvo.getBoundingClientRect();
    const meio  = rect.top + rect.height / 2;
    if (e.clientY < meio) {
      lista.insertBefore(arrastando, alvo);
    } else {
      lista.insertBefore(arrastando, alvo.nextSibling);
    }
  });
}

function coletarESalvar() {
  const linhas      = document.querySelectorAll('.modal-linha');
  const novasTarefas = [];

  linhas.forEach((linha) => {
    const label = linha.querySelector('.modal-input-label').value.trim();
    if (!label) return;
    const icone = linha.querySelector('.modal-input-icone').value.trim();
    const id    = linha.dataset.id;
    novasTarefas.push({ id, label, icone });
  });

  if (novasTarefas.length === 0) {
    alert('Adicione pelo menos uma tarefa.');
    return;
  }

  _callbacks.onSalvar(novasTarefas);
}

// ── Painel de configurações ───────────────────────────────────────

export function abrirConfiguracoes() {
  document.getElementById('configOverlay').classList.add('aberto');
  document.body.style.overflow = 'hidden';
}

export function fecharConfiguracoes() {
  document.getElementById('configOverlay').classList.remove('aberto');
  document.body.style.overflow = '';
}
