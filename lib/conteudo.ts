import fs from "node:fs";
import path from "node:path";
import { Jogo, type JogoDisponivel } from "./esquema";

/**
 * Lê e confere os jogos de content/jogos/ no build. Qualquer erro para o build com o nome do
 * arquivo e do campo, para nunca ir ao ar uma ficha incompleta.
 */
const PASTA = path.join(process.cwd(), "content", "jogos");

let lidos: Jogo[] | null = null;

export function todosOsJogos(): Jogo[] {
  if (lidos) return lidos;
  const arquivos = fs
    .readdirSync(PASTA)
    .filter((a) => a.endsWith(".json"))
    .sort();

  const jogos = arquivos.map((arquivo) => {
    const local = `content/jogos/${arquivo}`;
    let bruto: unknown;
    try {
      bruto = JSON.parse(fs.readFileSync(path.join(PASTA, arquivo), "utf8"));
    } catch (e) {
      throw new Error(`${local}: o JSON está com erro de digitação (${(e as Error).message})`);
    }
    const r = Jogo.safeParse(bruto);
    if (!r.success) {
      const campos = r.error.issues.map((i) => `${i.path.join(".") || "(arquivo)"}: ${i.message}`).join("; ");
      throw new Error(`${local}: ${campos}`);
    }
    const jogo = r.data;
    if (`${jogo.id}.json` !== arquivo) throw new Error(`${local}: o "id" (${jogo.id}) precisa ser igual ao nome do arquivo.`);
    if (jogo.status === "disponivel" && jogo.evidencia === "D" && !jogo.fontes.some((f) => f.titulo.includes("BNCC"))) {
      throw new Error(`${local}: evidência D exige uma fonte com "BNCC" no título.`);
    }
    return jogo;
  });

  const ordens = new Map<number, string>();
  for (const j of jogos) {
    const outro = ordens.get(j.ordem);
    if (outro) throw new Error(`content/jogos: "${j.id}" e "${outro}" estão com a mesma ordem (${j.ordem}).`);
    ordens.set(j.ordem, j.id);
  }

  lidos = jogos.sort((a, b) => a.ordem - b.ordem);
  return lidos;
}

export function jogosDisponiveis(): JogoDisponivel[] {
  return todosOsJogos().filter((j): j is JogoDisponivel => j.status === "disponivel");
}

export function jogoDisponivel(id: string): JogoDisponivel | undefined {
  return jogosDisponiveis().find((j) => j.id === id);
}
