// storage.js
// Responsável por toda leitura e escrita no localStorage.
// Não conhece nada sobre a tela — só lida com dados.

const REGEX_CHAVE_DIA = /^\d{4}-\d{2}-\d{2}$/;

// Cache em memória para evitar múltiplas leituras do localStorage na mesma sessão
const _cache = new Map();

/**
 * Converte uma Date em chave no formato AAAA-MM-DD (local, não UTC).
 * Usa o fuso do dispositivo para evitar bug de virada de meia-noite.
 */
export function formatarChave(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Chave do dia de hoje */
export function chaveHoje() {
  return formatarChave(new Date());
}

/** Lê os dados salvos de um dia específico. Usa cache em memória. */
export function lerDados(chave) {
  if (_cache.has(chave)) return _cache.get(chave);
  try {
    const valor = JSON.parse(localStorage.getItem(chave));
    _cache.set(chave, valor);
    return valor;
  } catch {
    _cache.set(chave, null);
    return null;
  }
}

/** Salva o objeto de marcações de um dia e atualiza o cache */
export function salvarDados(chave, dados) {
  localStorage.setItem(chave, JSON.stringify(dados));
  _cache.set(chave, dados);
}

/** Invalida o cache de uma chave (use após modificar dados externos) */
export function invalidarCache(chave) {
  _cache.delete(chave);
}

/** Retorna apenas as chaves do localStorage que são datas válidas */
export function chavesDeDataValidas() {
  const chaves = [];
  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i);
    if (REGEX_CHAVE_DIA.test(chave)) chaves.push(chave);
  }
  return chaves;
}
