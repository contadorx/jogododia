import { z } from "zod";

/**
 * Formato de cada jogo em content/jogos/<id>.json. O build confere tudo e para com o nome do
 * arquivo e do campo quando algo estiver errado (lib/conteudo.ts).
 *
 * Mesma régua do Brincadeira do Dia: "treina" começa sempre com "Treina", nada de "melhora" ou
 * "desenvolve", e todo jogo publicado diz de onde veio a ideia.
 */

/** Origem da ideia (não é nota de eficácia). Mesmas letras do Brincadeira do Dia. */
export const EVIDENCIAS = {
  A: "Inspirado em atividade estudada com crianças",
  B: "Inspirado em sugestão de atividade de uma instituição",
  C: "Jogo tradicional ou variação dele",
  D: "Ligado a um objetivo da BNCC",
} as const;

export const MODOS = {
  "cada-um-no-seu": "Cada um no seu aparelho",
  "mesmo-aparelho": "Os dois no mesmo aparelho",
  "mesmo-ou-distancia": "No mesmo aparelho ou à distância",
  papel: "No papel",
} as const;

const Fonte = z.object({
  titulo: z.string().min(3),
  url: z.string().regex(/^https:\/\/\S+$/, "use um endereço completo começando com https://"),
});

const Revisao = z.object({
  profissao: z.string().min(3),
  nome: z.string().min(3),
  /** Fica só no arquivo, nunca vai para a página. */
  registro: z.string().optional(),
  em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mostrarNome: z.boolean(),
  /** Fica só no arquivo, nunca vai para a página. */
  observacoes: z.string().optional(),
});

const Comum = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "só minúsculas, números e hífen"),
  nome: z.string().min(2),
  /** Posição no catálogo (1 = primeiro). */
  ordem: z.number().int().min(1),
  /** Idade mínima sugerida. */
  idade: z.number().int().min(5).max(12),
  modo: z.enum(["cada-um-no-seu", "mesmo-aparelho", "mesmo-ou-distancia", "papel"]),
  treina: z.string().startsWith("Treina ", 'comece com "Treina"').max(160),
  resumo: z.string().min(10).max(200),
});

const EmBreve = Comum.extend({ status: z.literal("em-breve") });

const Disponivel = Comum.extend({
  status: z.literal("disponivel"),
  /** Quantos jogam: um número, ou uma faixa como "2 a 8". */
  jogadores: z.union([z.number().int().min(2).max(4), z.string().regex(/^\d+ a \d+$/)]),
  /** Duração de uma partida, como "15 a 25". */
  minutos: z.string().regex(/^\d+( a \d+)?$/),
  precisa: z.array(z.string().min(3)).min(1),
  passos: z.array(z.string().min(3)).min(2),
  combinados: z.array(z.string().min(3)).min(1),
  conversa: z.array(z.string().min(3)).min(1),
  /** De onde veio a ideia, em até 200 letras: inspiração, nunca aval. */
  base: z.string().min(10).max(200),
  evidencia: z.enum(["A", "B", "C", "D"]),
  fontes: z.array(Fonte).min(1).max(4),
  revisao: Revisao.nullable(),
});

export const Jogo = z.union([Disponivel, EmBreve]);

export type Jogo = z.infer<typeof Jogo>;
export type JogoDisponivel = z.infer<typeof Disponivel>;
export type Modo = keyof typeof MODOS;
