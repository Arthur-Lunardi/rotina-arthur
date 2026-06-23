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
  localStorage.setItem(CHAVE_TAREFAS, JSON.stringify(tarefas));
}

export function gerarId() {
  return 'tarefa_' + Date.now();
}
