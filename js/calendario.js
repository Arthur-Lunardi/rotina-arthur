// calendario.js
// Lógica do calendário mensal e do dashboard.

import { formatarChave, lerDados, chavesDeDataValidas } from './storage.js';
import { carregarTarefas } from './tarefas.js';

/** Retorna cor baseada no progresso do dia */
export function corProgresso(porcentagem, semDados) {
  if (semDados) return 'vazio';
  if (porcentagem === 100) return 'completo';
  if (porcentagem >= 70) return 'alto';
  if (porcentagem >= 40) return 'medio';
  return 'baixo';
}

/**
 * Monta os dados de um mês inteiro.
 * Fix: trata hoje corretamente mesmo sem dados salvos ainda
 * (hoje sem dados = exibe o estado atual dos checkboxes, não "sem dados").
 */
export function obterDadosMes(ano, mes) {
  const tarefas = carregarTarefas();
  const totalTarefas = tarefas.length;
  const hoje = new Date();
  const chaveHoje = formatarChave(hoje);

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const dias = [];

  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    const data = new Date(ano, mes, d);
    const chave = formatarChave(data);
    const dados = lerDados(chave);

    // Considera futuro apenas dias APÓS hoje
    const isFuturo = chave > chaveHoje;
    // "sem dados" = não é hoje, não tem dados registrados, não é futuro (futuro exibe vazio por design)
    const ehHoje = chave === chaveHoje;
    const semDados = dados === null && !ehHoje;

    const marcadas = dados ? Object.values(dados).filter(Boolean).length : 0;
    const porcentagem = totalTarefas > 0 ? Math.round((marcadas / totalTarefas) * 100) : 0;

    dias.push({
      dia: d,
      data,
      chave,
      porcentagem,
      semDados: semDados || isFuturo,
      isFuturo,
      ehHoje,
      diaSemana: data.getDay(),
      tarefas,
      dadosMarcados: dados || {},
    });
  }

  return { dias, primeiroDia, totalTarefas };
}

/**
 * Calcula todas as estatísticas para o dashboard.
 * Reutiliza a mesma lógica de contagem que app.js usava (unificado aqui).
 */
export function calcularDashboard() {
  const tarefas = carregarTarefas();
  const totalTarefas = tarefas.length;
  const chaves = chavesDeDataValidas().sort();
  const hoje = formatarChave(new Date());

  let diasPerfeitos = 0;
  let treinos = 0;
  let horasEstudadas = 0;
  let totalPorcentagem = 0;
  let diasComDados = 0;
  let melhorSequencia = 0;
  let sequenciaAtual = 0;

  // Gera todas as datas desde a primeira entrada até hoje
  const todasChaves = [];
  if (chaves.length > 0) {
    const inicio = new Date(chaves[0]);
    const fim = new Date(hoje);
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      todasChaves.push(formatarChave(new Date(d)));
    }
  }

  todasChaves.forEach((chave) => {
    const dados = lerDados(chave);
    if (!dados || Object.keys(dados).length === 0) {
      // Dia sem dados — só quebra sequência se não for hoje
      if (chave !== hoje) {
        if (sequenciaAtual > melhorSequencia) melhorSequencia = sequenciaAtual;
        sequenciaAtual = 0;
      }
      return;
    }

    const valores = Object.values(dados);
    const marcadas = valores.filter(Boolean).length;
    const porcentagem = totalTarefas > 0 ? Math.round((marcadas / totalTarefas) * 100) : 0;

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

    const temTreino = Object.entries(dados).some(([id, val]) => val && id.toLowerCase().includes('treino'));
    if (temTreino) treinos++;

    const temEstudo = Object.entries(dados).some(([id, val]) => val && id.toLowerCase().includes('estudo'));
    if (temEstudo) horasEstudadas++;
  });

  // Garante que a sequência atual seja contabilizada
  if (sequenciaAtual > melhorSequencia) melhorSequencia = sequenciaAtual;

  const mediaGeral = diasComDados > 0 ? Math.round(totalPorcentagem / diasComDados) : 0;

  return { melhorSequencia, diasPerfeitos, treinos, horasEstudadas, mediaGeral };
}

/**
 * Conta dias totalmente concluídos e dias com treino (para a aba Hoje).
 * Centralizado aqui para evitar duplicação com calcularDashboard.
 */
export function contarDiasETreinos() {
  const tarefas = carregarTarefas();
  const totalTarefas = tarefas.length;
  const chaves = chavesDeDataValidas();
  let dias = 0;
  let treinos = 0;

  chaves.forEach((chave) => {
    const dados = lerDados(chave);
    if (!dados) return;
    const valores = Object.values(dados);
    if (valores.length > 0 && valores.every(Boolean)) dias++;
    const temTreino = Object.entries(dados).some(([id, val]) => val && id.toLowerCase().includes('treino'));
    if (temTreino) treinos++;
  });

  return { dias, treinos };
}
