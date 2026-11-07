import { LETRAS, colunaDe, linhaDe, navio, type Resposta } from "@/lib/batalha";

export const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** "coluna B, linha 5" */
export const porExtenso = (c: number) => `coluna ${LETRAS[colunaDe(c)]}, linha ${linhaDe(c) + 1}`;

/** O que dizer em voz alta (ou o que aparece na tela) para cada resposta. */
export function fala(r: Resposta): string {
  switch (r.tipo) {
    case "agua":
      return "Água!";
    case "acertou":
      return "Acertou!";
    case "afundou":
      return `Afundou o ${navio(r.navioId).nome}!`;
    case "repetido":
      return "Repetido!";
  }
}
