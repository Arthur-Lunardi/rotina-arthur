// confetti.js — animação de celebração ao atingir 100%

let _jaDisparou = false;

export function resetarConfetti() {
  _jaDisparou = false;
}

export function dispararConfetti(porcentagem) {
  if (porcentagem < 100 || _jaDisparou) {
    if (porcentagem < 100) _jaDisparou = false;
    return;
  }
  _jaDisparou = true;

  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;

  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const cores = ['#22c55e','#84cc16','#f97316','#3b82f6','#a855f7','#ec4899','#fbbf24'];
  const particulas = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 100,
    r: 5 + Math.random() * 6,
    cor: cores[Math.floor(Math.random() * cores.length)],
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 4,
    rotacao: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.2,
    opacidade: 1,
  }));

  let frame;
  let t = 0;

  function animar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t++;

    particulas.forEach((p) => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.08; // gravidade
      p.rotacao += p.vrot;
      if (t > 80) p.opacidade -= 0.015;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacidade);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotacao);
      ctx.fillStyle = p.cor;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.5);
      ctx.restore();
    });

    if (t < 160) {
      frame = requestAnimationFrame(animar);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }

  if (frame) cancelAnimationFrame(frame);
  animar();
}
