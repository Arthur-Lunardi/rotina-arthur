// tarefas.js
// Gerencia as tarefas personalizadas do usuário.
// Tarefas são salvas no localStorage com a chave "tarefas_config".

const CHAVE_TAREFAS = 'tarefas_config';

const TAREFAS_PADRAO = [
  { id: 'acordar', label: 'Acordei às 06:30', icone: '⏰' },
  { id: 'estudo',  label: 'Estudei',          icone: '📚' },
  { id: 'faculdade', label: 'Faculdade concluída', icone: '🎓' },
  { id: 'treino',  label: 'Academia',          icone: '💪' },
  { id: 'sono',    label: 'Dormi antes de 23:45', icone: '😴' },
  { id: 'agua',    label: 'Hidratação adequada',  icone: '💧' },
];

/** Retorna a lista de tarefas salvas ou as tarefas padrão */
export function carregarTarefas() {
  try {
    const salvas = JSON.parse(localStorage.getItem(CHAVE_TAREFAS));
    if (Array.isArray(salvas) && salvas.length > 0) return salvas;
  } catch {}
  return [...TAREFAS_PADRAO];
}

/** Salva a lista de tarefas */
export function salvarTarefas(tarefas) {
  localStorage.setItem(CHAVE_TAREFAS, JSON.stringify(tarefas));
}

/** Gera um id único para nova tarefa */
export function gerarId() {
  return 'tarefa_' + Date.now();
}
