// calendario.js — lógica do calendário mensal e dashboard (v4)

import { formatarChave, lerDados, chavesDeDataValidas } from './storage.js';
import { carregarTarefas, carregarGrupos, tarefasParaData, carregarHorasEstudo, minutosParaTexto } from './tarefas.js';

export function corProgresso(porcentagem, semDados) {
  if (semDados) return 'vazio';
  if (porcentagem === 100) return 'completo';
  if (porcentagem >= 70) return 'alto';
  if (porcentagem >= 40) return 'medio';
  return 'baixo';
}

export function obterDadosMes(ano, mes) {
  const tarefas = carregarTarefas();
  const grupos  = carregarGrupos();
  const hoje    = new Date();

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia   = new Date(ano, mes + 1, 0);
  const dias = [];

  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    const data  = new Date(ano, mes, d);
    const chave = formatarChave(data);
    const dados = lerDados(chave);

    const isFuturo = data > hoje && chave !== formatarChave(hoje);
    const ehHoje   = chave === formatarChave(hoje);

    // Usa as tarefas do grupo correspondente ao dia da semana
    const tarefasDia  = tarefasParaData(data, tarefas, grupos);
    const totalDia    = tarefasDia.length;
    const marcadas    = tarefasDia.filter(t => dados && dados[t.id]).length;
    const porcentagem = totalDia > 0 ? Math.round((marcadas / totalDia) * 100) : 0;
    const semDados    = dados === null || isFuturo;

    dias.push({
      dia: d, data, chave, porcentagem, semDados, isFuturo, ehHoje,
      diaSemana: data.getDay(),
      tarefas: tarefasDia,
      dadosMarcados: dados || {},
    });
  }

  return { dias, primeiroDia, totalTarefas: tarefas.length };
}

export function calcularDashboard() {
  const tarefas = carregarTarefas();
  const grupos  = carregarGrupos();
  const horasMap = carregarHorasEstudo();
  const chaves  = chavesDeDataValidas().sort();

  let diasPerfeitos = 0;
  let treinos = 0;
  let totalPorcentagem = 0;
  let diasComDados = 0;
  let melhorSequencia = 0;
  let sequenciaAtual = 0;
  let sequenciaHoje  = 0;
  let totalMinutosEstudo = 0;

  const hoje = formatarChave(new Date());
  const todasChavesOrdenadas = [];

  if (chaves.length > 0) {
    const inicio = new Date(chaves[0]);
    const fim    = new Date(hoje);
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

    const data       = new Date(chave);
    const tarefasDia = tarefasParaData(data, tarefas, grupos);
    const totalDia   = tarefasDia.length;
    if (totalDia === 0) return;

    const marcadas    = tarefasDia.filter(t => dados[t.id]).length;
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

    // Treino
    const temTreino = tarefasDia.some(t => dados[t.id] && t.id.toLowerCase().includes('treino'));
    if (temTreino) treinos++;
  });

  // Horas de estudo: soma minutos do mapa
  const mesAtual  = hoje.slice(0, 7); // 'YYYY-MM'
  let minutosDoMes = 0;
  Object.entries(horasMap).forEach(([chave, min]) => {
    totalMinutosEstudo += min;
    if (chave.startsWith(mesAtual)) minutosDoMes += min;
  });

  // Média diária do mês atual (só dias com registro)
  const diasComEstudoMes = Object.entries(horasMap).filter(
    ([c, m]) => c.startsWith(mesAtual) && m > 0
  ).length;
  const mediaDiariaMin = diasComEstudoMes > 0 ? Math.round(minutosDoMes / diasComEstudoMes) : 0;

  // Sequência atual (de hoje para trás)
  for (let i = todasChavesOrdenadas.length - 1; i >= 0; i--) {
    const chave      = todasChavesOrdenadas[i];
    const dados      = lerDados(chave);
    if (!dados) break;
    const data       = new Date(chave);
    const tarefasDia = tarefasParaData(data, tarefas, grupos);
    const totalDia   = tarefasDia.length;
    const marcadas   = tarefasDia.filter(t => dados[t.id]).length;
    const pct        = totalDia > 0 ? Math.round((marcadas / totalDia) * 100) : 0;
    if (pct === 100) { sequenciaHoje++; }
    else if (chave !== hoje) { break; }
  }

  const mediaGeral = diasComDados > 0 ? Math.round(totalPorcentagem / diasComDados) : 0;

  return {
    melhorSequencia,
    sequenciaAtual: sequenciaHoje,
    diasPerfeitos,
    treinos,
    // Exibe total de horas acumuladas (formato legível)
    horasEstudadas: minutosParaTexto(totalMinutosEstudo),
    // Extras para o dashboard de estudo mensal
    minutosDoMes,
    mediaDiariaMin,
    mediaGeral,
  };
}
