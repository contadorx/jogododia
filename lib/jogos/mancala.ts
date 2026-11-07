/**
 * Mancala, na versão awalé (oware abapa), jogada na África Ocidental.
 *
 * - 12 casas, 6 de cada jogador, com 4 sementes em cada. As casas 0 a 5 são do lado 0 (embaixo, da
 *   esquerda para a direita); as casas 6 a 11 são do lado 1 (em cima, da direita para a esquerda).
 *   Assim, semear "para a frente" é sempre somar 1 à casa: o giro é no sentido anti-horário.
 * - Na sua vez, pegue todas as sementes de uma casa sua e solte uma em cada casa seguinte. Se a casa
 *   tinha 12 ou mais, ela é pulada na volta (fica vazia).
 * - Se a última semente cair numa casa do outro e ela ficar com 2 ou 3, você colhe essas sementes. E
 *   também as das casas anteriores, enquanto forem do outro e tiverem 2 ou 3.
 * - Se a colheita fosse levar todas as sementes do outro, não colhe nada (a jogada vale, a colheita não).
 * - Se o outro ficou sem sementes, você tem que jogar uma casa que leve sementes para ele. Se nenhuma
 *   casa leva, você fica com as sementes do seu lado e a partida acaba.
 * - Ganha quem colher 25 ou mais. 24 a 24 é empate.
 * - Para a partida não rodar para sempre: depois de 50 jogadas seguidas sem ninguém colher, cada um
 *   fica com as sementes do seu lado e a partida acaba.
 */
import { inteiro, outroLado, type Lado, type Motor } from "./motor.ts";

export const CASAS = 12;
export const SEMENTES = 4;
export const PARA_VENCER = 25;
export const LIMITE_SEM_COLHER = 50;

export const donoDa = (casa: number): Lado => (casa < 6 ? 0 : 1);
export const casasDo = (lado: Lado) => (lado === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11]);
const somaDo = (casas: readonly number[], lado: Lado) => casasDo(lado).reduce((s, i) => s + casas[i], 0);

export type Rastro = {
  origem: number;
  /** Casas que receberam sementes, na ordem em que receberam. */
  caminho: number[];
  /** Como as casas estavam antes da jogada (para mostrar a semeadura passo a passo). */
  antes: number[];
  /** Casas colhidas nesta jogada. */
  colhidas: number[];
  /** A colheita levaria tudo do outro, então não aconteceu. */
  perdoou: boolean;
};

export type EstadoMancala = {
  casas: number[];
  vez: Lado;
  colhidas: [number, number];
  semColher: number;
  feitas: number;
  rastro: Rastro | null;
  fim: { vencedor: Lado | null; motivo: string } | null;
};

export type JogadaMancala = { casa: number };

/** Solta as sementes da casa de origem, uma por casa, pulando a própria origem. */
function semear(casas: readonly number[], origem: number): { casas: number[]; caminho: number[] } {
  const nova = [...casas];
  let sementes = nova[origem];
  nova[origem] = 0;
  const caminho: number[] = [];
  let i = origem;
  while (sementes > 0) {
    i = (i + 1) % CASAS;
    if (i === origem) continue;
    nova[i] += 1;
    caminho.push(i);
    sementes -= 1;
  }
  return { casas: nova, caminho };
}

/** Esta jogada leva pelo menos uma semente para o lado do outro? */
export function alimenta(e: EstadoMancala, casa: number): boolean {
  const outro = outroLado(donoDa(casa));
  return semear(e.casas, casa).caminho.some((i) => donoDa(i) === outro);
}

/** As casas que o jogador da vez pode jogar agora. */
export function casasJogaveis(e: EstadoMancala): number[] {
  if (e.fim) return [];
  const minhas = casasDo(e.vez).filter((i) => e.casas[i] > 0);
  const outroVazio = somaDo(e.casas, outroLado(e.vez)) === 0;
  return outroVazio ? minhas.filter((i) => alimenta(e, i)) : minhas;
}

/** Fim por contagem: cada um fica com as sementes do seu lado (ou só quem a regra mandar). */
function contar(colhidas: [number, number], motivo: string): EstadoMancala["fim"] {
  const [a, b] = colhidas;
  if (a === b) return { vencedor: null, motivo: `${motivo}: ${a} sementes para cada um` };
  return { vencedor: a > b ? 0 : 1, motivo: `${motivo}: ${Math.max(a, b)} sementes a ${Math.min(a, b)}` };
}

export const motorMancala: Motor<EstadoMancala, JogadaMancala> = {
  id: "mancala",
  inicial: () => ({
    casas: Array(CASAS).fill(SEMENTES),
    vez: 0,
    colhidas: [0, 0],
    semColher: 0,
    feitas: 0,
    rastro: null,
    fim: null,
  }),
  vez: (e) => e.vez,
  valida: (e, j) => casasJogaveis(e).includes(j.casa),
  aplicar: (e, j) => {
    const quem = e.vez;
    const outro = outroLado(quem);
    const { casas, caminho } = semear(e.casas, j.casa);

    // colheita: da última casa para trás, enquanto for do outro e tiver 2 ou 3
    const colher: number[] = [];
    const ultima = caminho[caminho.length - 1];
    // (andando para trás, a casa antes da primeira do outro já é minha, e aí para)
    for (let i = ultima; donoDa(i) === outro && (casas[i] === 2 || casas[i] === 3); i = (i - 1 + CASAS) % CASAS) colher.push(i);
    const tudo = colher.reduce((s, i) => s + casas[i], 0);
    const perdoou = colher.length > 0 && tudo === somaDo(casas, outro);
    const colhidas: [number, number] = [e.colhidas[0], e.colhidas[1]];
    if (colher.length > 0 && !perdoou) {
      colhidas[quem] += tudo;
      for (const i of colher) casas[i] = 0;
    }
    const colheu = colher.length > 0 && !perdoou;

    let novo: EstadoMancala = {
      casas,
      vez: outro,
      colhidas,
      semColher: colheu ? 0 : e.semColher + 1,
      feitas: e.feitas + 1,
      rastro: { origem: j.casa, caminho, antes: e.casas, colhidas: colheu ? colher : [], perdoou },
      fim: null,
    };

    if (colhidas[quem] >= PARA_VENCER) return { ...novo, fim: { vencedor: quem, motivo: `colheu ${colhidas[quem]} sementes` } };
    if (colhidas[0] === 24 && colhidas[1] === 24) return { ...novo, fim: { vencedor: null, motivo: "24 sementes para cada um" } };

    // quem jogou ficou sem sementes e o outro não consegue alimentar: o outro fica com as dele
    if (somaDo(casas, quem) === 0 && casasJogaveis(novo).length === 0) {
      const final: [number, number] = [colhidas[0], colhidas[1]];
      final[outro] += somaDo(casas, outro);
      const vazias = casas.map(() => 0);
      novo = { ...novo, casas: vazias, colhidas: final };
      return { ...novo, fim: contar(final, "ninguém conseguia mais levar sementes para o outro lado") };
    }

    if (novo.semColher >= LIMITE_SEM_COLHER) {
      const final: [number, number] = [colhidas[0] + somaDo(casas, 0), colhidas[1] + somaDo(casas, 1)];
      novo = { ...novo, casas: casas.map(() => 0), colhidas: final };
      return { ...novo, fim: contar(final, `${LIMITE_SEM_COLHER} jogadas sem colheita, cada um ficou com as do seu lado`) };
    }
    return novo;
  },
  resultado: (e) => e.fim,
  ehJogada: (x): x is JogadaMancala => !!x && typeof x === "object" && inteiro((x as JogadaMancala).casa, 0, CASAS - 1),
};
