/**
 * Xadrez, com as regras completas (roque, en passant, promoção, xeque-mate e empates). Quem confere
 * se um lance é permitido é a biblioteca chess.js (licença BSD-2-Clause).
 *
 * O estado guarda a posição em FEN, e não o objeto da biblioteca, para que cada lance gere um estado
 * novo sem mudar o anterior. A contagem de posições repetidas fica no próprio estado (o FEN não
 * guarda o histórico).
 *
 * Empates automáticos: afogamento, material insuficiente, a mesma posição três vezes e 50 lances de
 * cada lado sem captura nem movimento de peão.
 */
import { Chess, type Square } from "chess.js";
import { outroLado, type Lado, type Motor } from "./motor.ts";

export type Promocao = "q" | "r" | "b" | "n";
export type JogadaXadrez = { de: string; para: string; promo?: Promocao };

export type EstadoXadrez = {
  fen: string;
  vez: Lado;
  /** Os lances em notação algébrica (como a biblioteca escreve, com as letras em inglês). */
  lances: string[];
  ultima: { de: string; para: string } | null;
  repeticoes: Record<string, number>;
  xeque: boolean;
  fim: { vencedor: Lado | null; motivo: string } | null;
};

const INICIAL = new Chess().fen();
/** Posição para contar repetição: peças, vez, roques e en passant (sem os contadores de lances). */
const chaveDaPosicao = (fen: string) => fen.split(" ").slice(0, 4).join(" ");
const CASA = /^[a-h][1-8]$/;

export function lancesPossiveis(e: EstadoXadrez, de?: string) {
  if (e.fim) return [];
  const c = new Chess(e.fen);
  return de ? c.moves({ square: de as Square, verbose: true }) : c.moves({ verbose: true });
}

export const motorXadrez: Motor<EstadoXadrez, JogadaXadrez> = {
  id: "xadrez",
  inicial: () => ({
    fen: INICIAL,
    vez: 0,
    lances: [],
    ultima: null,
    repeticoes: { [chaveDaPosicao(INICIAL)]: 1 },
    xeque: false,
    fim: null,
  }),
  vez: (e) => e.vez,
  valida: (e, j) => lancesPossiveis(e, j.de).some((m) => m.to === j.para && (m.promotion ?? null) === (j.promo ?? null)),
  aplicar: (e, j) => {
    const c = new Chess(e.fen);
    let san: string;
    try {
      san = c.move({ from: j.de, to: j.para, promotion: j.promo }).san;
    } catch {
      return e;
    }
    const fen = c.fen();
    const chave = chaveDaPosicao(fen);
    const repeticoes = { ...e.repeticoes, [chave]: (e.repeticoes[chave] ?? 0) + 1 };
    let fim: EstadoXadrez["fim"] = null;
    if (c.isCheckmate()) fim = { vencedor: e.vez, motivo: "xeque-mate" };
    else if (c.isStalemate()) fim = { vencedor: null, motivo: "afogamento: quem ia jogar não tinha nenhum lance, mas não estava em xeque" };
    else if (c.isInsufficientMaterial()) fim = { vencedor: null, motivo: "não sobraram peças suficientes para dar xeque-mate" };
    else if (repeticoes[chave] >= 3) fim = { vencedor: null, motivo: "a mesma posição apareceu três vezes" };
    else if (c.isDrawByFiftyMoves()) fim = { vencedor: null, motivo: "50 lances de cada lado sem captura nem movimento de peão" };
    return {
      fen,
      vez: outroLado(e.vez),
      lances: [...e.lances, san],
      ultima: { de: j.de, para: j.para },
      repeticoes,
      xeque: c.inCheck(),
      fim,
    };
  },
  resultado: (e) => e.fim,
  ehJogada: (x): x is JogadaXadrez => {
    const j = x as JogadaXadrez | null;
    return (
      !!j &&
      typeof j === "object" &&
      typeof j.de === "string" &&
      CASA.test(j.de) &&
      typeof j.para === "string" &&
      CASA.test(j.para) &&
      (j.promo === undefined || ["q", "r", "b", "n"].includes(j.promo))
    );
  },
};

/** Notação em português: R rei, D dama, T torre, B bispo, C cavalo. */
const LETRA_PT: Record<string, string> = { K: "R", Q: "D", R: "T", B: "B", N: "C" };
export const emPortugues = (san: string) => san.replace(/[KQRBN]/g, (l) => LETRA_PT[l]);
