// storage.js
// Responsável por toda leitura e escrita no localStorage.
// Não conhece nada sobre a tela — só lida com dados.

const REGEX_CHAVE_DIA = /^\d{4}-\d{2}-\d{2}$/;

/** Converte uma Date em chave no formato AAAA-MM-DD (usada como chave no localStorage) */
export function formatarChave(data) {
  return data.toISOString().split('T')[0];
}

/** Chave do dia de hoje */
export function chaveHoje() {
  return formatarChave(new Date());
}

/** Lê os dados salvos de um dia específico. Retorna null se não existir ou se estiver corrompido. */
export function lerDados(chave) {
  try {
    return JSON.parse(localStorage.getItem(chave));
  } catch {
    return null;
  }
}

/** Salva o objeto de marcações de um dia (ex: { acordar: true, estudo: false, ... }) */
export function salvarDados(chave, dados) {
  localStorage.setItem(chave, JSON.stringify(dados));
}

/** Retorna apenas as chaves do localStorage que são datas válidas (ignora qualquer outra coisa salva ali) */
export function chavesDeDataValidas() {
  const chaves = [];
  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i);
    if (REGEX_CHAVE_DIA.test(chave)) chaves.push(chave);
  }
  return chaves;
}
