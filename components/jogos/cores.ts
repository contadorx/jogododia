/** Cores dos lados nos jogos por turnos. "forte" para peças e linhas, "claro" para fundos. */
export const COR = {
  azul: { forte: "#2f55c9", claro: "#dbe5fa", texto: "#ffffff" },
  vermelho: { forte: "#c8381f", claro: "#fde7e2", texto: "#ffffff" },
  amarelo: { forte: "#f6b915", claro: "#fff4d6", texto: "#1c2333" },
  branco: { forte: "#fbfaf7", claro: "#ffffff", texto: "#1c2333" },
  preto: { forte: "#1c2333", claro: "#c9d0dc", texto: "#ffffff" },
} as const;

export type NomeCor = keyof typeof COR;

/** Textos prontos de um lado, no masculino ("do azul") ou no feminino plural ("das brancas"). */
export function lado(cor: NomeCor, nome: string, genero: "o" | "as", pecas?: string) {
  const de = genero === "o" ? "do" : "das";
  const com = pecas ?? (genero === "o" ? `o ${nome}` : `as ${nome}`);
  return {
    cor: COR[cor].forte,
    vez: `Vez ${de} ${nome}`,
    vitoria: `Vitória ${de} ${nome}!`,
    voce: `Você joga com ${com}.`,
  };
}
