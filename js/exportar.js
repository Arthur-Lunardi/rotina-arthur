// exportar.js — exporta/importa backup JSON e CSV (v4)

import { chavesDeDataValidas, lerDados, salvarDados, lerPrefs, salvarPrefs } from './storage.js';
import { carregarTarefas, salvarTarefas, carregarGrupos, salvarGrupos, carregarHorasEstudo } from './tarefas.js';
import { lerConfigNotif, salvarConfigNotif } from './notificacoes.js';

// ── CSV ───────────────────────────────────────────────────────────

export function exportarCSV() {
  const tarefas = carregarTarefas();
  const chaves  = chavesDeDataValidas().sort();

  if (chaves.length === 0) {
    alert('Nenhum dado para exportar ainda.');
    return;
  }

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
  _download(
    '\uFEFF' + csv,
    `rotina-arthur-${new Date().toISOString().split('T')[0]}.csv`,
    'text/csv;charset=utf-8;'
  );
}

// ── Backup JSON ───────────────────────────────────────────────────

export function exportarBackupJSON() {
  const chaves = chavesDeDataValidas();
  const historico = {};
  chaves.forEach(k => { historico[k] = lerDados(k); });

  const backup = {
    versao: 4,
    exportadoEm: new Date().toISOString(),
    tarefas: carregarTarefas(),
    grupos: carregarGrupos(),
    horasEstudo: carregarHorasEstudo(),
    historico,
    configuracoes: {
      prefs: lerPrefs(),
      notificacoes: lerConfigNotif(),
    },
  };

  _download(
    JSON.stringify(backup, null, 2),
    `backup-rotina-${new Date().toISOString().split('T')[0]}.json`,
    'application/json'
  );
}

export function importarBackupJSON(arquivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);

        // Validação mínima
        if (!backup || typeof backup !== 'object') throw new Error('Arquivo inválido.');
        if (!Array.isArray(backup.tarefas)) throw new Error('Campo "tarefas" ausente.');

        // Restaura tarefas
        salvarTarefas(backup.tarefas);

        // Restaura grupos (v4+)
        if (Array.isArray(backup.grupos)) salvarGrupos(backup.grupos);

        // Restaura horas de estudo (v4+)
        if (backup.horasEstudo && typeof backup.horasEstudo === 'object') {
          localStorage.setItem('horas_estudo_config', JSON.stringify(backup.horasEstudo));
        }

        // Restaura histórico diário
        if (backup.historico && typeof backup.historico === 'object') {
          Object.entries(backup.historico).forEach(([chave, dados]) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(chave) && dados) {
              salvarDados(chave, dados);
            }
          });
        }

        // Restaura configurações
        if (backup.configuracoes) {
          if (backup.configuracoes.prefs) salvarPrefs(backup.configuracoes.prefs);
          if (backup.configuracoes.notificacoes) salvarConfigNotif(backup.configuracoes.notificacoes);
        }

        resolve({ tarefas: backup.tarefas.length, dias: Object.keys(backup.historico || {}).length });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));
    reader.readAsText(arquivo, 'utf-8');
  });
}

// ── Utilitário ────────────────────────────────────────────────────

function _download(conteudo, nomeArquivo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
