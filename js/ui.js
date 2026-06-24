// ui.js — tudo que toca no DOM

import { gerarId, validarTarefa } from './tarefas.js';

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
  document.getElementById('diasConcluidos').textContent    = dias;
  document.getElementById('treinosRealizados').textContent = treinos;
  document.getElementById('sequenciaAtual').textContent    = sequencia;
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
    // 'change' funciona em desktop e mobile; touch-action é tratado via CSS
    cb.addEventListener('change', onchange);
    label.appendChild(cb);
    label.appendChild(document.createTextNode(` ${tarefa.icone || ''} ${tarefa.label}`));
    if (tarefa.horario) {
      const hora = document.createElement('span');
      hora.className = 'tarefa-horario';
      hora.textContent = tarefa.horario;
      label.appendChild(hora);
    }
    frag.appendChild(label);
  });

  card.appendChild(frag);
}

export function renderizarHistorico(historico) {
  const container = document.getElementById('historico');
  if (!container) return;
  const frag = document.createDocumentFragment();

  historico.forEach((dia) => {
    const nomeDia = dia.data.toLocaleDateString('pt-BR', NOMES_DIA).replace('.', '');
    const numDia  = dia.data.getDate();

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

// ── Toast universal ──────────────────────────────────────────────
let _toastTimer = null;

export function mostrarToast(mensagem, labelAcao, callbackAcao, duracaoMs = 4500) {
  let toast = document.getElementById('toastUndo');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastUndo';
    toast.className = 'toast-undo';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  // Limpa qualquer timer anterior antes de reutilizar
  if (_toastTimer) {
    clearTimeout(_toastTimer);
    _toastTimer = null;
  }

  toast.innerHTML = `
    <span>${mensagem}</span>
    ${callbackAcao ? `<button id="toastAcaobtn">${labelAcao || 'Desfazer'}</button>` : ''}
  `;

  if (callbackAcao) {
    document.getElementById('toastAcaobtn').addEventListener('click', () => {
      callbackAcao();
      ocultarToast();
    });
  }

  // Garante visibilidade mesmo se já estava visível
  toast.classList.remove('visivel');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('visivel');
    });
  });

  _toastTimer = setTimeout(ocultarToast, duracaoMs);
}

function ocultarToast() {
  const toast = document.getElementById('toastUndo');
  if (toast) toast.classList.remove('visivel');
  _toastTimer = null;
}

// ── Modal de edição de tarefas ────────────────────────────────────

let _callbacks     = {};
let _lixeira       = [];
let _alterado      = false; // controla aviso de saída sem salvar
let _arrastando    = null;  // referência para drag & drop touch

export function inicializarModal({ onSalvar, onCancelar }) {
  _callbacks = { onSalvar, onCancelar };

  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') _confirmarCancelar();
  });
  document.getElementById('btnModalCancelar').addEventListener('click', _confirmarCancelar);
  document.getElementById('btnModalSalvar').addEventListener('click', coletarESalvar);
  document.getElementById('btnAdicionarTarefa').addEventListener('click', () => adicionarLinhaNoModal());

  // Esc fecha modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modalAberto  = document.getElementById('modalOverlay').classList.contains('aberto');
      const configAberto = document.getElementById('configOverlay').classList.contains('aberto');
      if (modalAberto)  _confirmarCancelar();
      if (configAberto) fecharConfiguracoes();
    }
  });

  // Drag-and-drop na lista do modal (mouse + touch)
  _inicializarDragDrop();
}

function _confirmarCancelar() {
  if (_alterado) {
    if (!confirm('Você tem alterações não salvas. Deseja sair mesmo assim?')) return;
  }
  _callbacks.onCancelar();
}

export function abrirModalTarefas(tarefas) {
  const lista = document.getElementById('listaTarefasModal');
  lista.innerHTML = '';
  _lixeira  = [];
  _alterado = false;

  tarefas.forEach((t) => adicionarLinhaNoModal(t));

  document.getElementById('modalOverlay').classList.add('aberto');
  document.body.style.overflow = 'hidden';
}

export function fecharModalTarefas() {
  document.getElementById('modalOverlay').classList.remove('aberto');
  document.body.style.overflow = '';
  _alterado = false;
}

function adicionarLinhaNoModal(tarefa = null) {
  const lista = document.getElementById('listaTarefasModal');
  const id    = tarefa ? tarefa.id : gerarId();

  const linha = document.createElement('div');
  linha.className  = 'modal-linha';
  linha.dataset.id = id;
  linha.draggable  = true;

  const iconeVal  = tarefa ? (tarefa.icone   || '') : '';
  const labelVal  = tarefa ? _escaparHTML(tarefa.label) : '';
  const horarioVal = tarefa ? (tarefa.horario || '') : '';

  linha.innerHTML = `
    <span class="drag-handle" title="Arraste para reordenar" aria-hidden="true">⠿</span>
    <input class="modal-input-icone" type="text" maxlength="2" placeholder="🔔"
      value="${iconeVal}" aria-label="Ícone da tarefa">
    <input class="modal-input-label" type="text" maxlength="60" placeholder="Nome da tarefa"
      value="${labelVal}" aria-label="Nome da tarefa">
    <input class="modal-input-horario" type="time"
      value="${horarioVal}" aria-label="Horário da tarefa" title="Horário (opcional)">
    <button class="btn-remover-tarefa" aria-label="Remover tarefa">🗑️</button>
  `;

  // Marca como alterado ao editar
  linha.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => { _alterado = true; });
  });

  linha.querySelector('.btn-remover-tarefa').addEventListener('click', () => {
    const snapshot = {
      id,
      icone:   linha.querySelector('.modal-input-icone').value,
      label:   linha.querySelector('.modal-input-label').value,
      horario: linha.querySelector('.modal-input-horario').value,
      posicao: Array.from(lista.children).indexOf(linha),
    };
    _lixeira.push(snapshot);
    _alterado = true;

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
      _alterado = true;
    });
  });

  lista.appendChild(linha);

  if (!tarefa) {
    _alterado = true;
    setTimeout(() => linha.querySelector('.modal-input-label').focus(), 50);
  }
}

function _criarLinhaSnapshot(snap) {
  const div = document.createElement('div');
  div.className  = 'modal-linha';
  div.dataset.id = snap.id;
  div.draggable  = true;

  div.innerHTML = `
    <span class="drag-handle" aria-hidden="true">⠿</span>
    <input class="modal-input-icone" type="text" maxlength="2" placeholder="🔔" value="${_escaparHTML(snap.icone)}">
    <input class="modal-input-label" type="text" maxlength="60" placeholder="Nome da tarefa" value="${_escaparHTML(snap.label)}">
    <input class="modal-input-horario" type="time" value="${_escaparHTML(snap.horario || '')}" aria-label="Horário da tarefa" title="Horário (opcional)">
    <button class="btn-remover-tarefa" aria-label="Remover tarefa">🗑️</button>
  `;

  div.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => { _alterado = true; });
  });

  div.querySelector('.btn-remover-tarefa').addEventListener('click', () => {
    div.classList.add('saindo');
    setTimeout(() => div.remove(), 200);
    _alterado = true;
  });

  return div;
}

function _escaparHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Drag & Drop (mouse + touch) ───────────────────────────────────

function _inicializarDragDrop() {
  const lista = document.getElementById('listaTarefasModal');
  let arrastando = null;

  // ─── Mouse drag ────────────────────────────────────────────────
  lista.addEventListener('dragstart', (e) => {
    arrastando = e.target.closest('.modal-linha');
    if (!arrastando) return;
    arrastando.classList.add('arrastando');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // necessário Firefox
  });

  lista.addEventListener('dragend', () => {
    if (arrastando) arrastando.classList.remove('arrastando');
    lista.querySelectorAll('.modal-linha').forEach(l => l.classList.remove('drag-over'));
    arrastando = null;
    _alterado = true;
  });

  lista.addEventListener('dragover', (e) => {
    e.preventDefault();
    const alvo = e.target.closest('.modal-linha');
    if (!alvo || alvo === arrastando) return;

    lista.querySelectorAll('.modal-linha').forEach(l => l.classList.remove('drag-over'));
    alvo.classList.add('drag-over');

    const rect = alvo.getBoundingClientRect();
    const meio = rect.top + rect.height / 2;
    if (e.clientY < meio) {
      lista.insertBefore(arrastando, alvo);
    } else {
      lista.insertBefore(arrastando, alvo.nextSibling);
    }
  });

  lista.addEventListener('drop', (e) => {
    e.preventDefault();
    lista.querySelectorAll('.modal-linha').forEach(l => l.classList.remove('drag-over'));
  });

  // ─── Touch drag ────────────────────────────────────────────────
  // Estratégia: esconde o elemento arrastado temporariamente antes de
  // chamar elementFromPoint — resolve o bug onde o próprio elemento
  // bloqueava a detecção do alvo por baixo dele.

  lista.addEventListener('touchstart', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    _arrastando = handle.closest('.modal-linha');
    if (!_arrastando) return;
    _arrastando.classList.add('arrastando');
    e.preventDefault(); // evita scroll acidental
  }, { passive: false });

  lista.addEventListener('touchmove', (e) => {
    if (!_arrastando) return;
    e.preventDefault();

    const touch = e.touches[0];

    // Esconde temporariamente para que elementFromPoint detecte o elemento abaixo
    _arrastando.style.visibility = 'hidden';
    const elementoAbaixo = document.elementFromPoint(touch.clientX, touch.clientY);
    _arrastando.style.visibility = '';

    const alvo = elementoAbaixo?.closest('.modal-linha');
    if (!alvo || alvo === _arrastando) return;

    lista.querySelectorAll('.modal-linha').forEach(l => l.classList.remove('drag-over'));
    alvo.classList.add('drag-over');

    const rect = alvo.getBoundingClientRect();
    const meio = rect.top + rect.height / 2;
    if (touch.clientY < meio) {
      lista.insertBefore(_arrastando, alvo);
    } else {
      lista.insertBefore(_arrastando, alvo.nextSibling);
    }
  }, { passive: false });

  lista.addEventListener('touchend', () => {
    if (!_arrastando) return;
    _arrastando.classList.remove('arrastando');
    _arrastando.style.visibility = '';
    lista.querySelectorAll('.modal-linha').forEach(l => l.classList.remove('drag-over'));
    _arrastando = null;
    _alterado   = true;
  });

  // touchcancel: dedo saiu da tela inesperadamente (ex: ligação recebida)
  lista.addEventListener('touchcancel', () => {
    if (!_arrastando) return;
    _arrastando.classList.remove('arrastando');
    _arrastando.style.visibility = '';
    lista.querySelectorAll('.modal-linha').forEach(l => l.classList.remove('drag-over'));
    _arrastando = null;
  });
}

function coletarESalvar() {
  const linhas        = document.querySelectorAll('.modal-linha');
  const novasTarefas  = [];
  const erros         = [];

  linhas.forEach((linha, idx) => {
    const label = linha.querySelector('.modal-input-label').value.trim();
    const icone = linha.querySelector('.modal-input-icone').value.trim();
    const id    = linha.dataset.id;

    if (!label) return; // ignora linhas completamente vazias

    const horario = linha.querySelector('.modal-input-horario').value.trim();
    const errosLinha = validarTarefa(label, icone, horario);
    if (errosLinha.length > 0) {
      erros.push(`Tarefa ${idx + 1}: ${errosLinha.join(' ')}`);
      // Destaca o campo com erro
      linha.querySelector('.modal-input-label').style.borderColor = '#ef4444';
      return;
    }

    linha.querySelector('.modal-input-label').style.borderColor = '';
    novasTarefas.push({ id, label, icone, horario });
  });

  if (erros.length > 0) {
    mostrarToast(`⚠️ ${erros[0]}`, '', null, 3500);
    return;
  }

  if (novasTarefas.length === 0) {
    mostrarToast('⚠️ Adicione pelo menos uma tarefa.', '', null, 3000);
    return;
  }

  _alterado = false;
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
