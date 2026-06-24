// tarefas.js — gerencia lista de tarefas + grupos de dias (v4)

const CHAVE_TAREFAS = 'tarefas_config';
const CHAVE_GRUPOS  = 'grupos_dias_config';

// ── Defaults ──────────────────────────────────────────────────────

const TAREFAS_PADRAO = [
  { id: 'acordar',    label: 'Acordei às 06:30',     icone: '⏰' },
  { id: 'estudo',     label: 'Estudei',               icone: '📚' },
  { id: 'faculdade',  label: 'Faculdade concluída',   icone: '🎓' },
  { id: 'treino',     label: 'Academia',              icone: '💪' },
  { id: 'sono',       label: 'Dormi antes de 23:45',  icone: '😴' },
  { id: 'agua',       label: 'Hidratação adequada',   icone: '💧' },
];

// Grupos padrão flexíveis: cada grupo tem nome, dias (0=dom..6=sáb) e lista de IDs de tarefas
const GRUPOS_PADRAO = [
  {
    id: 'grupo_semana',
    nome: 'Segunda a Sexta',
    dias: [1, 2, 3, 4, 5],
    tarefas: ['acordar', 'estudo', 'faculdade', 'treino', 'sono', 'agua'],
  },
  {
    id: 'grupo_sabado',
    nome: 'Sábado',
    dias: [6],
    tarefas: ['treino', 'sono', 'agua'],
  },
  {
    id: 'grupo_domingo',
    nome: 'Domingo',
    dias: [0],
    tarefas: ['estudo', 'sono', 'agua'],
  },
];

// ── Tarefas ───────────────────────────────────────────────────────

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

// ── Grupos de dias ────────────────────────────────────────────────

export function carregarGrupos() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_GRUPOS));
    if (Array.isArray(salvo) && salvo.length > 0) return salvo;
  } catch {}
  return JSON.parse(JSON.stringify(GRUPOS_PADRAO));
}

export function salvarGrupos(grupos) {
  try {
    localStorage.setItem(CHAVE_GRUPOS, JSON.stringify(grupos));
    return true;
  } catch (e) {
    console.error('Erro ao salvar grupos:', e);
    return false;
  }
}

/**
 * Retorna o grupo correspondente ao dia da semana (0=dom..6=sáb).
 * Se nenhum grupo cobre aquele dia, retorna null.
 */
export function grupoParaDia(diaSemana, grupos) {
  return grupos.find(g => g.dias.includes(diaSemana)) || null;
}

/**
 * Retorna as tarefas que devem aparecer hoje, de acordo com o grupo do dia.
 * Se não houver grupo para hoje, retorna todas as tarefas (fallback).
 */
export function tarefasParaHoje(tarefas, grupos) {
  const diaSemana = new Date().getDay();
  const grupo = grupoParaDia(diaSemana, grupos);
  if (!grupo) return tarefas;
  const idsGrupo = new Set(grupo.tarefas);
  const filtradas = tarefas.filter(t => idsGrupo.has(t.id));
  return filtradas.length > 0 ? filtradas : tarefas;
}

/**
 * Igual a tarefasParaHoje mas para uma data específica (objeto Date).
 */
export function tarefasParaData(data, tarefas, grupos) {
  const diaSemana = data.getDay();
  const grupo = grupoParaDia(diaSemana, grupos);
  if (!grupo) return tarefas;
  const idsGrupo = new Set(grupo.tarefas);
  const filtradas = tarefas.filter(t => idsGrupo.has(t.id));
  return filtradas.length > 0 ? filtradas : tarefas;
}

// ── Horas estudadas ────────────────────────────────────────────────

const CHAVE_HORAS = 'horas_estudo_config'; // { 'YYYY-MM-DD': minutosEstudados }

export function carregarHorasEstudo() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_HORAS));
    return salvo && typeof salvo === 'object' ? salvo : {};
  } catch { return {}; }
}

export function salvarMinutosEstudo(dataISO, minutos) {
  const dados = carregarHorasEstudo();
  dados[dataISO] = minutos;
  try {
    localStorage.setItem(CHAVE_HORAS, JSON.stringify(dados));
    return true;
  } catch { return false; }
}

export function minutosParaTexto(minutos) {
  if (!minutos || minutos === 0) return '0 min';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ── Utilitários ───────────────────────────────────────────────────

export function gerarId() {
  return 'tarefa_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

export function gerarGrupoId() {
  return 'grupo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

export function validarTarefa(label, icone = '', horario = '') {
  const erros = [];
  const labelTrim = label.trim();
  if (!labelTrim) erros.push('O nome da tarefa não pode estar vazio.');
  if (labelTrim.length > 60) erros.push('O nome deve ter no máximo 60 caracteres.');
  if (icone.trim().length > 2) erros.push('O ícone deve ter no máximo 1 emoji.');
  if (horario && !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario.trim())) {
    erros.push('Horário inválido.');
  }
  return erros;
}
