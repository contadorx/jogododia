/** Cores que a criança pode escolher para a frota (todas legíveis sobre o mar). */
export const CORES = [
  { id: "azul", nome: "Azul", cor: "#2f55c9" },
  { id: "verde", nome: "Verde", cor: "#23804f" },
  { id: "vermelho", nome: "Vermelho", cor: "#a8322a" },
  { id: "roxo", nome: "Roxo", cor: "#6a3fbf" },
  { id: "laranja", nome: "Laranja", cor: "#b4570c" },
] as const;

export type CorId = (typeof CORES)[number]["id"];

export const corDe = (id: string) => CORES.find((c) => c.id === id)?.cor ?? CORES[0].cor;

export const ehCor = (id: unknown): id is CorId => CORES.some((c) => c.id === id);
