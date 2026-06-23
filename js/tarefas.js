// tarefas.js — gerencia lista de tarefas personalizadas

const CHAVE_TAREFAS = 'tarefas_config';

const TAREFAS_PADRAO = [
  { id: 'acordar',    label: 'Acordei às 06:30',     icone: '⏰' },
  { id: 'estudo',     label: 'Estudei',               icone: '📚' },
  { id: 'faculdade',  label: 'Faculdade concluída',   icone: '🎓' },
  { id: 'treino',     label: 'Academia',              icone: '💪' },
  { id: 'sono',       label: 'Dormi antes de 23:45',  icone: '😴' },
  { id: 'agua',       label: 'Hidratação adequada',   icone: '💧' },
];

export function carregarTarefas() {
  try {
    const salvas = JSON.parse(localStorage.getItem(CHAVE_TAREFAS));
    if (Array.isArray(salvas) && salvas.length > 0) return salvas;
  } catch {}
  return [...TAREFAS_PADRAO];
}

export function salvarTarefas(tarefas) {
  try {
    localStorage.setItem(CHAVE_TAREFAS, JSON.stringify(tarefas));
    return true;
  } catch (e) {
    console.error('Erro ao salvar tarefas:', e);
    return false;
  }
}

export function gerarId() {
  return 'tarefa_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/**
 * Valida uma tarefa antes de salvar
 */
export function validarTarefa(label, icone = '') {
  const erros = [];
  const labelTrim = label.trim();
  if (!labelTrim) erros.push('O nome da tarefa não pode estar vazio.');
  if (labelTrim.length > 60) erros.push('O nome deve ter no máximo 60 caracteres.');
  if (icone.trim().length > 2) erros.push('O ícone deve ter no máximo 1 emoji.');
  return erros;
}
