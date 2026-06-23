// historico.js
// Cálculos relacionados ao histórico de dias e à sequência (streak).
// Funções puras: recebem dados e devolvem dados, sem tocar na tela.

import { formatarChave, lerDados } from './storage.js';

/**
 * Monta os últimos N dias (hoje incluso) com informações de progresso de cada um.
 * @param {number} totalTarefas - quantidade total de tarefas do checklist
 * @param {number} quantidadeDias - quantos dias olhar pra trás (padrão: 7)
 * @returns {Array} lista do dia mais antigo pro mais recente, cada item com:
 *   { data, chave, porcentagem, completo, ehHoje }
 */
export function obterHistoricoUltimosDias(totalTarefasAtual, quantidadeDias = 7) {
  const hoje = new Date();
  const dias = [];

  for (let i = quantidadeDias - 1; i >= 0; i--) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() - i);

    const chave  = formatarChave(data);
    const dados  = lerDados(chave);
    const ehHoje = i === 0;

    // Para dias passados: usa o total de entradas salvas naquele dia
    // Para hoje: usa o total atual de tarefas na tela
    const valores  = dados ? Object.values(dados) : [];
    const totalDia = ehHoje ? totalTarefasAtual : (valores.length || totalTarefasAtual);
    const marcadas = valores.filter(Boolean).length;

    const porcentagem = totalDia > 0 ? Math.round((marcadas / totalDia) * 100) : 0;
    // Completo = tem dados E todas as tarefas marcadas
    const completo = dados !== null && valores.length > 0 && marcadas === valores.length;

    dias.push({
      data,
      chave,
      porcentagem,
      completo,
      ehHoje,
    });
  }

  return dias;
}

/**
 * Calcula quantos dias consecutivos e completos (100%) o usuário mantém,
 * contando de hoje pra trás. O dia de hoje não quebra a sequência mesmo
 * incompleto, já que o dia ainda não terminou.
 */
export function calcularSequencia(historico) {
  // historico vem do mais antigo pro mais recente — percorremos de trás pra frente (hoje primeiro)
  let sequencia = 0;

  for (let i = historico.length - 1; i >= 0; i--) {
    const dia = historico[i];

    if (dia.completo) {
      sequencia++;
      continue;
    }

    if (dia.ehHoje) {
      // hoje ainda não terminou, não conta nem quebra
      continue;
    }

    break;
  }

  return sequencia;
}
