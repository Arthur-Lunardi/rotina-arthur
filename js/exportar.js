// exportar.js — exporta histórico em CSV

import { chavesDeDataValidas, lerDados } from './storage.js';
import { carregarTarefas } from './tarefas.js';

export function exportarCSV() {
  const tarefas = carregarTarefas();
  const chaves  = chavesDeDataValidas().sort();

  if (chaves.length === 0) {
    alert('Nenhum dado para exportar ainda.');
    return;
  }

  // Cabeçalho
  const cabecalho = ['Data', 'Porcentagem', ...tarefas.map(t => `${t.icone || ''} ${t.label}`.trim())];
  const linhas = [cabecalho];

  chaves.forEach((chave) => {
    const dados = lerDados(chave);
    if (!dados) return;
    const marcadas = tarefas.map(t => dados[t.id] ? '1' : '0');
    const total    = tarefas.length;
    const pct      = total > 0 ? Math.round((marcadas.filter(v => v === '1').length / total) * 100) : 0;
    linhas.push([chave, `${pct}%`, ...marcadas]);
  });

  const csv = linhas.map(l => l.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  a.download = `rotina-arthur-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
