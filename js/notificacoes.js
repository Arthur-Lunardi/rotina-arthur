// notificacoes.js — push notifications locais via Service Worker

const CHAVE_NOTIF = 'notif_config';

export function lerConfigNotif() {
  try { return JSON.parse(localStorage.getItem(CHAVE_NOTIF)) || { ativa: false, hora: '23:15' }; }
  catch { return { ativa: false, hora: '23:15' }; }
}

export function salvarConfigNotif(cfg) {
  localStorage.setItem(CHAVE_NOTIF, JSON.stringify(cfg));
}

export async function pedirPermissao() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  const result = await Notification.requestPermission();
  return result;
}

export function agendarNotificacao(hora) {
  // Agenda via setTimeout calculando ms até o próximo horário
  const agora = new Date();
  const [h, m] = hora.split(':').map(Number);
  const alvo = new Date(agora);
  alvo.setHours(h, m, 0, 0);
  if (alvo <= agora) alvo.setDate(alvo.getDate() + 1);

  const ms = alvo - agora;

  // Limpa timer anterior
  if (window._notifTimer) clearTimeout(window._notifTimer);

  window._notifTimer = setTimeout(() => {
    dispararNotificacao();
    // Reagenda para o dia seguinte
    agendarNotificacao(hora);
  }, ms);
}

function dispararNotificacao() {
  if (Notification.permission !== 'granted') return;
  const cfg = lerConfigNotif();
  if (!cfg.ativa) return;

  new Notification('📋 Rotina Arthur', {
    body: 'Hora de registrar suas tarefas do dia!',
    icon: './icon-192.png',
    badge: './icon-96.png',
    tag: 'rotina-lembrete',
    renotify: true,
  });
}

export function inicializarNotificacoes() {
  const cfg = lerConfigNotif();
  if (cfg.ativa && Notification.permission === 'granted') {
    agendarNotificacao(cfg.hora);
  }
}
