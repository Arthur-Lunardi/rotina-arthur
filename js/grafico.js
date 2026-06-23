// grafico.js — gráfico de linha de progresso no dashboard (canvas puro)

import { chavesDeDataValidas, lerDados, formatarChave } from './storage.js';
import { carregarTarefas } from './tarefas.js';

export function renderizarGrafico() {
  const canvas = document.getElementById('graficoCanvas');
  if (!canvas) return;

  const tarefas = carregarTarefas();
  const total   = tarefas.length;
  const chaves  = chavesDeDataValidas().sort();

  if (chaves.length === 0) {
    canvas.style.display = 'none';
    return;
  }

  // Pega últimos 30 dias com dado (ou todos se menos)
  const ultimas = chaves.slice(-30);

  const pontos = ultimas.map((chave) => {
    const dados = lerDados(chave);
    if (!dados) return { chave, pct: 0 };
    const marcadas = Object.values(dados).filter(Boolean).length;
    return { chave, pct: total > 0 ? Math.round((marcadas / total) * 100) : 0 };
  });

  canvas.style.display = 'block';

  // DPR para telas retina
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth  || canvas.parentElement.offsetWidth || 300;
  const H   = 160;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 16, right: 16, bottom: 32, left: 36 };
  const gW  = W - pad.left - pad.right;
  const gH  = H - pad.top  - pad.bottom;

  // Fundo transparente
  ctx.clearRect(0, 0, W, H);

  const n = pontos.length;
  const xOf = (i) => pad.left + (i / Math.max(n - 1, 1)) * gW;
  const yOf = (v) => pad.top  + gH - (v / 100) * gH;

  // Linhas de grade horizontais
  ctx.strokeStyle = 'rgba(51,65,85,0.6)';
  ctx.lineWidth = 1;
  [0, 25, 50, 75, 100].forEach((v) => {
    const y = yOf(v);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + gW, y);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(v + '%', pad.left - 6, y + 3.5);
  });

  // Área preenchida
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + gH);
  grad.addColorStop(0,   'rgba(34,197,94,0.35)');
  grad.addColorStop(1,   'rgba(34,197,94,0.02)');

  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(pontos[0].pct));
  for (let i = 1; i < n; i++) ctx.lineTo(xOf(i), yOf(pontos[i].pct));
  ctx.lineTo(xOf(n - 1), pad.top + gH);
  ctx.lineTo(xOf(0),     pad.top + gH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Linha principal
  ctx.beginPath();
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.moveTo(xOf(0), yOf(pontos[0].pct));
  for (let i = 1; i < n; i++) ctx.lineTo(xOf(i), yOf(pontos[i].pct));
  ctx.stroke();

  // Pontos + labels de data (a cada ~5)
  const step = Math.ceil(n / 6);
  pontos.forEach((p, i) => {
    const x = xOf(i);
    const y = yOf(p.pct);

    // Ponto
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle   = '#22c55e';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth   = 1.5;
    ctx.fill();
    ctx.stroke();

    // Label de data no eixo X
    if (i % step === 0 || i === n - 1) {
      const d = new Date(p.chave + 'T12:00:00');
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      ctx.fillStyle   = '#64748b';
      ctx.font        = '9px system-ui, sans-serif';
      ctx.textAlign   = 'center';
      ctx.fillText(label, x, H - pad.bottom + 14);
    }
  });
}
