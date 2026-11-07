/**
 * Regras da batalha naval, sem nada de tela: funções puras, testadas em scripts/testar-batalha.mjs.
 *
 * Tabuleiro de 10 x 10. Cada casa é um número de 0 a 99 (linha * 10 + coluna).
 * A coordenada falada é a letra da coluna e depois o número da linha, como B5,
 * na mesma ordem do plano cartesiano: primeiro a horizontal, depois a vertical.
 *
 * Este arquivo não importa nada, para rodar direto no Node nos testes.
 */

export const LADO = 10;
export const LETRAS = "ABCDEFGHIJ";

export type Orientacao = "h" | "v";

export type Navio = { id: string; nome: string; tamanho: number };

/** A frota de cada jogador, do maior para o menor. Os navios não podem se encostar, nem na diagonal. */
export const FROTA: readonly Navio[] = [
  { id: "porta-avioes", nome: "porta-aviões", tamanho: 5 },
  { id: "encouracado", nome: "encouraçado", tamanho: 4 },
  { id: "cruzador", nome: "cruzador", tamanho: 3 },
  { id: "submarino", nome: "submarino", tamanho: 3 },
  { id: "destroier", nome: "destróier", tamanho: 2 },
];

/** Casas ocupadas pela frota inteira (17). */
export const TOTAL_CASAS = FROTA.reduce((t, n) => t + n.tamanho, 0);

/** Um navio no tabuleiro: a primeira casa (a da esquerda, ou a de cima) e a direção. */
export type Posicao = { navioId: string; casa: number; orientacao: Orientacao };

/** Resposta marcada em "Seus tiros". */
export type MarcaTiro = "agua" | "acerto" | "afundou";

export function navio(id: string): Navio {
  const n = FROTA.find((x) => x.id === id);
  if (!n) throw new Error(`Navio desconhecido: ${id}`);
  return n;
}

export const linhaDe = (casa: number) => Math.floor(casa / LADO);
export const colunaDe = (casa: number) => casa % LADO;
export const casaEm = (linha: number, coluna: number) => linha * LADO + coluna;

/** "B5" para a casa da coluna B, linha 5. */
export function coordenada(casa: number): string {
  return `${LETRAS[colunaDe(casa)]}${linhaDe(casa) + 1}`;
}

/** Casas que um navio ocupa a partir da primeira. null = sai do tabuleiro. */
export function casasDoNavio(tamanho: number, casa: number, orientacao: Orientacao): number[] | null {
  const l = linhaDe(casa);
  const c = colunaDe(casa);
  if (orientacao === "h" ? c + tamanho > LADO : l + tamanho > LADO) return null;
  return Array.from({ length: tamanho }, (_, i) => (orientacao === "h" ? casaEm(l, c + i) : casaEm(l + i, c)));
}

/** As até 8 casas em volta, contando as diagonais. */
export function vizinhas(casa: number): number[] {
  const l = linhaDe(casa);
  const c = colunaDe(casa);
  const res: number[] = [];
  for (let dl = -1; dl <= 1; dl++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dl === 0 && dc === 0) continue;
      const nl = l + dl;
      const nc = c + dc;
      if (nl >= 0 && nl < LADO && nc >= 0 && nc < LADO) res.push(casaEm(nl, nc));
    }
  }
  return res;
}

/** Casas ocupadas pela frota: casa -> id do navio. */
export function mapaDaFrota(frota: readonly Posicao[]): Map<number, string> {
  const mapa = new Map<number, string>();
  for (const p of frota) {
    const casas = casasDoNavio(navio(p.navioId).tamanho, p.casa, p.orientacao);
    if (casas) for (const c of casas) mapa.set(c, p.navioId);
  }
  return mapa;
}

export type Motivo = "fora" | "ocupada" | "encosta";
export type Encaixe = { ok: true; casas: number[] } | { ok: false; motivo: Motivo };

/** Confere se o navio cabe ali sem sobrepor nem encostar nos outros. O próprio navio é ignorado (para mover). */
export function encaixe(frota: readonly Posicao[], navioId: string, casa: number, orientacao: Orientacao): Encaixe {
  const casas = casasDoNavio(navio(navioId).tamanho, casa, orientacao);
  if (!casas) return { ok: false, motivo: "fora" };
  const outros = mapaDaFrota(frota.filter((p) => p.navioId !== navioId));
  if (casas.some((c) => outros.has(c))) return { ok: false, motivo: "ocupada" };
  if (casas.some((c) => vizinhas(c).some((v) => outros.has(v)))) return { ok: false, motivo: "encosta" };
  return { ok: true, casas };
}

/** Puxa a primeira casa para dentro quando o navio passaria da borda (tocar perto da borda também funciona). */
export function ajustarNaBorda(tamanho: number, casa: number, orientacao: Orientacao): number {
  const l = linhaDe(casa);
  const c = colunaDe(casa);
  return orientacao === "h" ? casaEm(l, Math.min(c, LADO - tamanho)) : casaEm(Math.min(l, LADO - tamanho), c);
}

/** Põe (ou move) um navio. Não confere o encaixe: chame `encaixe` antes. */
export function colocar(frota: readonly Posicao[], navioId: string, casa: number, orientacao: Orientacao): Posicao[] {
  return [...frota.filter((p) => p.navioId !== navioId), { navioId, casa, orientacao }];
}

export function tirar(frota: readonly Posicao[], navioId: string): Posicao[] {
  return frota.filter((p) => p.navioId !== navioId);
}

export function frotaCompleta(frota: readonly Posicao[]): boolean {
  return FROTA.every((n) => frota.some((p) => p.navioId === n.id));
}

/** Sorteia a frota inteira. `aleatorio` devolve um número de 0 a 1 (nos testes, um sorteio fixo). */
export function sortearFrota(aleatorio: () => number = Math.random): Posicao[] {
  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const frota: Posicao[] = [];
    let deuCerto = true;
    for (const n of FROTA) {
      let colocado = false;
      for (let i = 0; i < 400 && !colocado; i++) {
        const orientacao: Orientacao = aleatorio() < 0.5 ? "h" : "v";
        const casa = Math.floor(aleatorio() * LADO * LADO);
        if (encaixe(frota, n.id, casa, orientacao).ok) {
          frota.push({ navioId: n.id, casa, orientacao });
          colocado = true;
        }
      }
      if (!colocado) {
        deuCerto = false;
        break;
      }
    }
    if (deuCerto) return frota;
  }
  throw new Error("Não deu para sortear a frota.");
}

export type Resposta =
  | { tipo: "agua" }
  | { tipo: "acertou"; navioId: string }
  | { tipo: "afundou"; navioId: string; fimDeJogo: boolean }
  | { tipo: "repetido" };

/**
 * O outro jogador atirou em `casa`. `recebidos` são os tiros que ele já tinha dado (sem este).
 * Quem chama acrescenta a casa em `recebidos` quando a resposta não for "repetido".
 */
export function responderTiro(frota: readonly Posicao[], recebidos: readonly number[], casa: number): Resposta {
  if (recebidos.includes(casa)) return { tipo: "repetido" };
  const mapa = mapaDaFrota(frota);
  const id = mapa.get(casa);
  if (!id) return { tipo: "agua" };
  const atingidas = new Set([...recebidos, casa]);
  const casasDele = [...mapa].filter(([, n]) => n === id).map(([c]) => c);
  if (!casasDele.every((c) => atingidas.has(c))) return { tipo: "acertou", navioId: id };
  const fimDeJogo = [...mapa.keys()].every((c) => atingidas.has(c));
  return { tipo: "afundou", navioId: id, fimDeJogo };
}

/** Quantas casas de cada navio da minha frota já foram atingidas. */
export function situacaoDaFrota(frota: readonly Posicao[], recebidos: readonly number[]) {
  const atingidas = new Set(recebidos);
  return FROTA.map((n) => {
    const p = frota.find((x) => x.navioId === n.id);
    const casas = p ? (casasDoNavio(n.tamanho, p.casa, p.orientacao) ?? []) : [];
    const acertos = casas.filter((c) => atingidas.has(c)).length;
    return { navioId: n.id, nome: n.nome, tamanho: n.tamanho, acertos, afundou: casas.length > 0 && acertos === casas.length };
  });
}

/**
 * Acertos ligados à casa do tiro que afundou (para cima, para baixo e para os lados).
 * Como os navios não se encostam, esse grupo é o navio que afundou.
 */
export function grupoDeAcertos(tiros: Readonly<Record<number, MarcaTiro>>, casa: number): number[] {
  const grupo = new Set<number>([casa]);
  const fila = [casa];
  while (fila.length > 0) {
    const atual = fila.pop() as number;
    const l = linhaDe(atual);
    const c = colunaDe(atual);
    const lados: [number, number][] = [
      [l - 1, c],
      [l + 1, c],
      [l, c - 1],
      [l, c + 1],
    ];
    for (const [nl, nc] of lados) {
      if (nl < 0 || nl >= LADO || nc < 0 || nc >= LADO) continue;
      const v = casaEm(nl, nc);
      if (!grupo.has(v) && tiros[v] === "acerto") {
        grupo.add(v);
        fila.push(v);
      }
    }
  }
  return [...grupo].sort((a, b) => a - b);
}

/** Casas em volta de um navio afundado que ainda estão em branco: pela regra, ali só pode ter água. */
export function aguaEmVolta(casasDoAfundado: readonly number[], marcadas: ReadonlySet<number>): number[] {
  const navioInteiro = new Set(casasDoAfundado);
  const res = new Set<number>();
  for (const c of casasDoAfundado) {
    for (const v of vizinhas(c)) if (!navioInteiro.has(v) && !marcadas.has(v)) res.add(v);
  }
  return [...res].sort((a, b) => a - b);
}

/** Tiros dados, acertos e aproveitamento (porcentagem inteira). */
export function aproveitamento(tiros: Readonly<Record<number, MarcaTiro>>) {
  const marcas = Object.values(tiros);
  const total = marcas.length;
  const acertos = marcas.filter((m) => m !== "agua").length;
  return { tiros: total, acertos, porcentagem: total ? Math.round((acertos / total) * 100) : 0 };
}
