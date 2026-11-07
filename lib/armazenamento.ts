/**
 * Tudo o que o site guarda fica no próprio aparelho (localStorage): o aceite dos Termos, a partida
 * frente a frente, as salas à distância em andamento e o último modo escolhido. Nada vai para servidor.
 * Leitura e gravação nunca quebram o jogo: em janela anônima ou com o armazenamento bloqueado, o jogo
 * funciona e só não lembra da partida.
 */
const PREFIXO = "jdd.";

export const CHAVES = {
  aceite: "jdd.aceite",
  batalha: "jdd.batalha.v1",
  modo: "jdd.modo",
} as const;

/** Cada sala à distância fica guardada pelo código, para voltar a ela depois. */
export const chaveDaSala = (codigo: string) => `${PREFIXO}sala.${codigo}`;

export function ler<T>(chave: string): T | null {
  try {
    const valor = window.localStorage.getItem(chave);
    return valor ? (JSON.parse(valor) as T) : null;
  } catch {
    return null;
  }
}

export function gravar(chave: string, valor: unknown) {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem armazenamento: segue sem lembrar */
  }
}

export function apagar(chave: string) {
  try {
    window.localStorage.removeItem(chave);
  } catch {
    /* nada a fazer */
  }
}

/**
 * De que jogo é a sala guardada com este código (null se não houver). As salas da batalha naval,
 * as primeiras, não têm o campo "jogo".
 */
export function jogoDaSalaGuardada(codigo: string): string | null {
  const s = ler<{ v?: unknown; jogo?: unknown; partida?: { codigo?: unknown } }>(chaveDaSala(codigo));
  if (!s || s.v !== 1 || s.partida?.codigo !== codigo) return null;
  return typeof s.jogo === "string" ? s.jogo : "batalha-naval";
}

/** Códigos das salas guardadas neste aparelho. */
export function salasGuardadas(): string[] {
  try {
    const codigos: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const chave = window.localStorage.key(i);
      if (chave?.startsWith(`${PREFIXO}sala.`)) codigos.push(chave.slice(`${PREFIXO}sala.`.length));
    }
    return codigos;
  } catch {
    return [];
  }
}

/** Apaga tudo o que o site guardou neste aparelho. */
export function apagarTudo() {
  try {
    const chaves: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const chave = window.localStorage.key(i);
      if (chave?.startsWith(PREFIXO)) chaves.push(chave);
    }
    for (const chave of chaves) window.localStorage.removeItem(chave);
  } catch {
    /* nada a fazer */
  }
}
