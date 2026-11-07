/**
 * Jogos que têm versão para jogar no site, em /jogos/<id>/jogar/. Os outros publicados têm só a
 * ficha (para jogar no papel ou no tabuleiro de casa). Novo jogo no site: acrescente o id aqui e o
 * componente em app/jogos/[id]/jogar/page.tsx.
 */
export const JOGAVEIS = ["batalha-naval"] as const;

export function temVersaoNoSite(id: string): boolean {
  return (JOGAVEIS as readonly string[]).includes(id);
}
