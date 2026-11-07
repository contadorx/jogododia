import { mapaDaFrota, navio, situacaoDaFrota, type MarcaTiro, type Posicao } from "@/lib/batalha";
import { Marcas, type AparenciaDaCasa } from "./Tabuleiro";

/** Como cada casa aparece no mar do outro (os meus tiros). */
export function aparenciaDoAtaque(
  tiros: Readonly<Record<number, MarcaTiro>>,
  deduzidas: readonly number[],
  pendente?: number | null,
): (c: number) => AparenciaDaCasa {
  const porDeducao = new Set(deduzidas);
  return (c) => {
    if (pendente === c) return { conteudo: Marcas.mira, descricao: "tiro esperando a resposta" };
    const m = tiros[c];
    if (m === "agua") return { conteudo: Marcas.agua, descricao: "água" };
    if (m === "acerto") return { conteudo: Marcas.acerto, descricao: "acertou" };
    if (m === "afundou") return { conteudo: Marcas.x, fundo: "var(--color-fogo)", descricao: "afundado" };
    if (porDeducao.has(c)) return { conteudo: Marcas.deduzida, descricao: "água, por dedução" };
    return { descricao: "mar" };
  };
}

/** Como cada casa aparece na minha frota, com os tiros que o outro já deu. */
export function aparenciaDaDefesa(frota: readonly Posicao[], recebidos: readonly number[], cor: string): (c: number) => AparenciaDaCasa {
  const mapa = mapaDaFrota(frota);
  const atingidas = new Set(recebidos);
  const afundados = new Set(
    situacaoDaFrota(frota, recebidos)
      .filter((s) => s.afundou)
      .map((s) => s.navioId),
  );
  return (c) => {
    const id = mapa.get(c);
    const atingida = atingidas.has(c);
    if (id) {
      const afundou = afundados.has(id);
      return {
        fundo: afundou ? `color-mix(in srgb, ${cor} 55%, #000)` : cor,
        conteudo: atingida ? Marcas.x : null,
        descricao: `${navio(id).nome}${afundou ? ", afundado" : atingida ? ", atingido" : ""}`,
      };
    }
    return atingida ? { conteudo: Marcas.agua, descricao: "tiro na água" } : { descricao: "mar" };
  };
}
