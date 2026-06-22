// ui.js
// Tudo que toca no DOM mora aqui. Recebe dados já calculados e só exibe.

const NOMES_DIA_SEMANA = { weekday: 'short' };

/** Exibe o nome do dia da semana atual no topo da tela */
export function exibirDiaAtual() {
  const nome = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  document.getElementById('diaAtual').innerText = nome.toUpperCase();
}

/** Atualiza a barra de progresso e o texto de porcentagem do dia atual */
export function atualizarBarraProgresso(porcentagem) {
  document.getElementById('barraInterna').style.width = porcentagem + '%';
  document.getElementById('percentual').innerText = porcentagem + '%';
}

/** Atualiza os números do bloco de estatísticas */
export function atualizarEstatisticas({ dias, treinos, sequencia }) {
  document.getElementById('diasConcluidos').innerText = dias;
  document.getElementById('treinosRealizados').innerText = treinos;
  document.getElementById('sequenciaAtual').innerText = sequencia;
}

/**
 * Renderiza a fileira de círculos de progresso dos últimos dias.
 * @param {Array} historico - lista vinda de obterHistoricoUltimosDias(), do mais antigo pro mais recente
 */
export function renderizarHistorico(historico) {
  const container = document.getElementById('historico');
  if (!container) return;

  container.innerHTML = '';

  historico.forEach((dia) => {
    const diaSemana = dia.data.toLocaleDateString('pt-BR', NOMES_DIA_SEMANA).replace('.', '');
    const numeroDia = dia.data.getDate();

    const item = document.createElement('div');
    item.className = 'dia-historico' + (dia.ehHoje ? ' dia-hoje' : '');
    item.title = `${dia.data.toLocaleDateString('pt-BR')} — ${dia.porcentagem}% concluído`;

    item.innerHTML = `
      <span class="dia-historico-nome">${diaSemana}</span>
      <div class="dia-historico-circulo" style="--progresso: ${dia.porcentagem}%">
        <span>${numeroDia}</span>
      </div>
    `;

    container.appendChild(item);
  });
}

/** Lê o estado atual dos checkboxes na tela como um objeto { id: true/false } */
export function lerEstadoCheckboxes(checkboxes) {
  const dados = {};
  checkboxes.forEach((cb) => {
    dados[cb.id] = cb.checked;
  });
  return dados;
}

/** Aplica um objeto de estado salvo aos checkboxes da tela */
export function aplicarEstadoCheckboxes(checkboxes, dados) {
  if (!dados) return;
  checkboxes.forEach((cb) => {
    cb.checked = dados[cb.id] || false;
  });
}
