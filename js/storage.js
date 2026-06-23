// storage.js — leitura/escrita no localStorage + helpers de data

const REGEX_CHAVE_DIA = /^\d{4}-\d{2}-\d{2}$/;

export function formatarChave(data) {
  return data.toISOString().split('T')[0];
}

export function chaveHoje() {
  return formatarChave(new Date());
}

export function lerDados(chave) {
  try { return JSON.parse(localStorage.getItem(chave)); }
  catch { return null; }
}

export function salvarDados(chave, dados) {
  try {
    localStorage.setItem(chave, JSON.stringify(dados));
    return true;
  } catch (e) {
    console.error('Erro ao salvar dados:', e);
    return false;
  }
}

export function chavesDeDataValidas() {
  const chaves = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (REGEX_CHAVE_DIA.test(k)) chaves.push(k);
  }
  return chaves;
}

// ── Preferências gerais ───────────────────────────────────────────
const CHAVE_PREFS = 'prefs_config';

export function lerPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE_PREFS));
    return p || {};
  } catch { return {}; }
}

export function salvarPrefs(prefs) {
  try {
    localStorage.setItem(CHAVE_PREFS, JSON.stringify(prefs));
  } catch (e) {
    console.error('Erro ao salvar preferências:', e);
  }
}
