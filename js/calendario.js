// calendario.js
// Lógica do calendário mensal e do dashboard.

import { formatarChave, lerDados, chavesDeDataValidas } from './storage.js';
import { carregarTarefas } from './tarefas.js';

/**
 * Retorna cor baseada no progresso do dia
 */
export function corProgresso(porcentagem, semDados) {
  if (semDados) return 'vazio';
  if (porcentagem === 100) return 'completo';
  if (porcentagem >= 70) return 'alto';
  if (porcentagem >= 40) return 'medio';
  return 'baixo';
}

/**
 * Monta os dados de um mês inteiro
 */
export function obterDadosMes(ano, mes) {
  const tarefas = carregarTarefas();
  const totalTarefas = tarefas.length;
  const hoje = new Date();

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);

  const dias = [];

  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    const data = new Date(ano, mes, d);
    const chave = formatarChave(data);
    const dados = lerDados(chave);

    const isFuturo = data > hoje && formatarChave(data) !== formatarChave(hoje);
    const ehHoje   = formatarChave(data) === formatarChave(hoje);
    const valores  = dados ? Object.values(dados) : [];
    const marcadas = valores.filter(Boolean).length;

    // Usa o total do próprio dia salvo; fallback para total atual
    const totalDia    = ehHoje ? totalTarefas : (valores.length || totalTarefas);
    const porcentagem = totalDia > 0 ? Math.round((marcadas / totalDia) * 100) : 0;
    const semDados    = dados === null || isFuturo;

    dias.push({
      dia: d,
      data,
      chave,
      porcentagem,
      semDados,
      isFuturo,
      ehHoje,
      diaSemana: data.getDay(), // 0=dom
      tarefas,
      dadosMarcados: dados || {},
    });
  }

  return { dias, primeiroDia, totalTarefas };
}

/**
 * Calcula todas as estatísticas para o dashboard
 */
export function calcularDashboard() {
  const tarefas = carregarTarefas();
  const totalTarefas = tarefas.length;
  const chaves = chavesDeDataValidas().sort();

  let diasPerfeitos = 0;
  let treinos = 0;
  let horasEstudadas = 0; // conta dias com estudo marcado
  let totalPorcentagem = 0;
  let diasComDados = 0;

  // Melhor sequência
  let melhorSequencia = 0;
  let sequenciaAtual = 0;
  let sequenciaHoje = 0;

  const hoje = formatarChave(new Date());
  const todasChavesOrdenadas = [];

  // Gerar todas as datas desde a primeira entrada até hoje
  if (chaves.length > 0) {
    const inicio = new Date(chaves[0]);
    const fim = new Date(hoje);
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      todasChavesOrdenadas.push(formatarChave(new Date(d)));
    }
  }

  todasChavesOrdenadas.forEach((chave) => {
    const dados = lerDados(chave);
    if (!dados) {
      if (chave !== hoje) {
        if (sequenciaAtual > melhorSequencia) melhorSequencia = sequenciaAtual;
        sequenciaAtual = 0;
      }
      return;
    }

    const valores = Object.values(dados);
    if (valores.length === 0) return;

    const marcadas   = valores.filter(Boolean).length;
    // Usa o total salvo naquele dia (não o total atual de tarefas)
    const totalDia   = valores.length;
    const porcentagem = Math.round((marcadas / totalDia) * 100);

    diasComDados++;
    totalPorcentagem += porcentagem;

    if (porcentagem === 100) {
      diasPerfeitos++;
      sequenciaAtual++;
      if (sequenciaAtual > melhorSequencia) melhorSequencia = sequenciaAtual;
    } else {
      if (chave !== hoje) {
        if (sequenciaAtual > melhorSequencia) melhorSequencia = sequenciaAtual;
        sequenciaAtual = 0;
      }
    }

    // Treino: qualquer tarefa com "treino" no id
    const temTreino = Object.entries(dados).some(([id, val]) => val && id.toLowerCase().includes('treino'));
    if (temTreino) treinos++;

    // Estudo: qualquer tarefa com "estudo" no id
    const temEstudo = Object.entries(dados).some(([id, val]) => val && id.toLowerCase().includes('estudo'));
    if (temEstudo) horasEstudadas++;
  });

  // Sequência atual (de hoje para trás)
  for (let i = todasChavesOrdenadas.length - 1; i >= 0; i--) {
    const chave = todasChavesOrdenadas[i];
    const dados = lerDados(chave);
    if (!dados) break;
    const valores  = Object.values(dados);
    const marcadas = valores.filter(Boolean).length;
    // Usa o total do próprio dia
    const porcentagem = valores.length > 0 ? Math.round((marcadas / valores.length) * 100) : 0;
    if (porcentagem === 100) {
      sequenciaHoje++;
    } else if (chave !== hoje) {
      break;
    }
  }

  const mediaGeral = diasComDados > 0 ? Math.round(totalPorcentagem / diasComDados) : 0;

  return {
    melhorSequencia,
    sequenciaAtual: sequenciaHoje,
    diasPerfeitos,
    treinos,
    horasEstudadas,
    mediaGeral,
  };
}
