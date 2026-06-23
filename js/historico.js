// historico.js
// Cálculos relacionados ao histórico de dias e à sequência (streak).
// Funções puras: recebem dados e devolvem dados, sem tocar na tela.

import { formatarChave, lerDados } from './storage.js';

/**
 * Monta os últimos N dias (hoje incluso) com informações de progresso de cada um.
 * @param {number} totalTarefas - quantidade total de tarefas do checklist
 * @param {number} quantidadeDias - quantos dias olhar pra trás (padrão: 7)
 */
export function obterHistoricoUltimosDias(totalTarefas, quantidadeDias = 7) {
  const hoje = new Date();
  const dias = [];

  for (let i = quantidadeDias - 1; i >= 0; i--) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() - i);

    const chave = formatarChave(data);
    const dados = lerDados(chave);

    const marcadas = dados ? Object.values(dados).filter(Boolean).length : 0;
    const porcentagem = totalTarefas > 0 ? Math.round((marcadas / totalTarefas) * 100) : 0;
    const completo = dados !== null && marcadas === totalTarefas && totalTarefas > 0;

    dias.push({ data, chave, porcentagem, completo, ehHoje: i === 0 });
  }

  return dias;
}

/**
 * Calcula quantos dias consecutivos e completos (100%) o usuário mantém,
 * contando de hoje pra trás. O dia de hoje não quebra a sequência mesmo
 * incompleto, já que o dia ainda não terminou.
 */
export function calcularSequencia(historico) {
  let sequencia = 0;

  for (let i = historico.length - 1; i >= 0; i--) {
    const dia = historico[i];
    if (dia.completo) { sequencia++; continue; }
    if (dia.ehHoje) continue; // hoje não quebra
    break;
  }

  return sequencia;
}
