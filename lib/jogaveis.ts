/**
 * Jogos que têm versão para jogar no site, em /jogos/<id>/jogar/. Os outros publicados têm só a
 * ficha (para jogar no papel ou no tabuleiro de casa). Novo jogo no site: acrescente o id aqui e o
 * componente em app/jogos/[id]/jogar/page.tsx (o build para se faltar um dos dois).
 */
export const JOGAVEIS = [
  "batalha-naval",
  "mancala",
  "quatro-em-linha",
  "descubra-o-codigo",
  "damas",
  "pontinhos",
  "nim",
  "trilha",
  "hex",
] as const;

export type Jogavel = (typeof JOGAVEIS)[number];

export function temVersaoNoSite(id: string): id is Jogavel {
  return (JOGAVEIS as readonly string[]).includes(id);
}
