/**
 * Stop (adedonha): sorteia uma letra e cada um escreve, para cada categoria, uma palavra que comece
 * com ela. Quem preencher tudo pode pedir "Stop!", e a rodada acaba para os dois. Pontos de cada
 * categoria: palavra que vale e é diferente da do outro, 10; igual à do outro, 5; em branco ou que
 * não vale, 0.
 *
 * Aqui ficam as regras e a partida à distância, só com funções puras (testadas em
 * scripts/testar-stop.mjs). No mesmo aparelho o jogo é no papel e o site só sorteia, marca o tempo
 * e soma os pontos, então não precisa de nada disto além das listas e da conta de pontos.
 *
 * Partida à distância: os dois aparelhos trocam o que é de cada um. O criador da sala manda a letra
 * de cada rodada ("rodada"); cada aparelho manda o seu estado da rodada atual ("eu"): as respostas
 * (depois do Stop), as palavras do outro que ele não aceita e se está pronto para a próxima. As
 * mensagens repetem a cada poucos segundos, então perder uma não atrapalha.
 */

export const LETRAS_STOP = "ABCDEFGHIJLMNOPRSTUV".split("");

export const CATEGORIAS_STOP = [
  { id: "nome", nome: "Nome de gente" },
  { id: "animal", nome: "Animal" },
  { id: "comida", nome: "Comida" },
  { id: "objeto", nome: "Objeto" },
  { id: "lugar", nome: "Lugar (cidade, estado ou país)" },
  { id: "profissao", nome: "Profissão" },
  { id: "fruta", nome: "Fruta" },
  { id: "cor", nome: "Cor" },
  { id: "corpo", nome: "Parte do corpo" },
  { id: "brinquedo", nome: "Brinquedo ou jogo" },
] as const;

export type IdCategoria = (typeof CATEGORIAS_STOP)[number]["id"];
export const PADRAO_STOP: IdCategoria[] = ["nome", "animal", "comida", "objeto", "lugar", "profissao"];
export const nomeDaCategoria = (id: string) => CATEGORIAS_STOP.find((c) => c.id === id)?.nome ?? id;
const ehCategoria = (x: unknown): x is IdCategoria => typeof x === "string" && CATEGORIAS_STOP.some((c) => c.id === x);

export const RODADAS_OPCOES = [3, 5, 7] as const;
export const TEMPOS_OPCOES = [60, 120, 180] as const;

export type Config = { categorias: IdCategoria[]; total: number; tempo: number };
export const CONFIG_PADRAO: Config = { categorias: PADRAO_STOP, total: 5, tempo: 120 };

export function configValida(c: unknown): c is Config {
  const x = c as Config | null;
  return (
    !!x &&
    Array.isArray(x.categorias) &&
    x.categorias.length >= 3 &&
    x.categorias.length <= CATEGORIAS_STOP.length &&
    new Set(x.categorias).size === x.categorias.length &&
    x.categorias.every(ehCategoria) &&
    (RODADAS_OPCOES as readonly number[]).includes(x.total) &&
    (TEMPOS_OPCOES as readonly number[]).includes(x.tempo)
  );
}

/** Para comparar palavras: sem acento, sem maiúscula, sem espaço sobrando. */
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ç\- ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Por que a palavra não vale sozinha (antes de qualquer pessoa reclamar), ou null se vale. */
export function problema(palavra: string | undefined, letra: string): string | null {
  const n = normalizar(palavra ?? "");
  if (!n) return "em branco";
  if (!n.startsWith(normalizar(letra))) return `não começa com ${letra}`;
  if (n.replace(/[^a-z]/g, "").length < 2) return "curta demais";
  return null;
}

export type Respostas = Partial<Record<IdCategoria, string>>;

/** Pontos de uma categoria para [eu, outro]. `anuladas`: palavras (normalizadas) que alguém não aceitou. */
export function pontosDaCategoria(minha: string | undefined, dele: string | undefined, letra: string, anuladas: readonly string[]): [number, number] {
  const vale = (p: string | undefined) => problema(p, letra) === null && !anuladas.includes(normalizar(p ?? ""));
  const a = vale(minha);
  const b = vale(dele);
  if (a && b) return normalizar(minha ?? "") === normalizar(dele ?? "") ? [5, 5] : [10, 10];
  return [a ? 10 : 0, b ? 10 : 0];
}

export function sortearLetra(usadas: readonly string[], sorte: () => number = Math.random): string {
  const livres = LETRAS_STOP.filter((l) => !usadas.includes(l));
  const lista = livres.length ? livres : LETRAS_STOP;
  return lista[Math.floor(sorte() * lista.length)];
}

// ------------------------------------------------------------------------------- à distância

export type Papel = "criador" | "convidado";

export type RodadaStop = {
  r: number;
  letra: string;
  /** Quando a rodada começou neste aparelho (para o relógio). */
  inicio: number;
  minhas: Respostas | null;
  dele: Respostas | null;
  /** Palavras do outro que eu não aceito, e as minhas que ele não aceita. */
  anuladasPorMim: string[];
  anuladasPeloOutro: string[];
  prontoEu: boolean;
  prontoEle: boolean;
  quemParou: "eu" | "ele" | null;
};

export type PartidaStop = {
  v: 1;
  jogo: "stop";
  codigo: string;
  papel: Papel;
  meuId: string;
  /** Número da partida na sala (a revanche soma 1). */
  p: number;
  config: Config;
  rodadas: RodadaStop[];
  fim: boolean;
  outro: { id: string; p: number; r: number; pronto: boolean } | null;
};

export type MsgStop =
  | { t: "rodada"; p: number; r: number; letra: string; config: Config; ant: string[] }
  | {
      t: "eu";
      p: number;
      r: number;
      respostas: Respostas | null;
      anuladas: string[];
      pronto: boolean;
      parou: boolean;
      /** Se eu já tenho as respostas do outro nesta rodada (senão ele manda de novo). */
      tenho: boolean;
    };

export type PassoStop = { partida: PartidaStop; enviar: MsgStop[] };
const nada = (partida: PartidaStop): PassoStop => ({ partida, enviar: [] });

export const atual = (p: PartidaStop): RodadaStop | null => p.rodadas[p.rodadas.length - 1] ?? null;

export type FaseStop = "esperando" | "escrevendo" | "aguardando" | "conferindo" | "fim";

export function faseDe(p: PartidaStop): FaseStop {
  if (p.fim) return "fim";
  const r = atual(p);
  if (!r) return "esperando";
  if (!r.minhas) return "escrevendo";
  if (!r.dele) return "aguardando";
  return "conferindo";
}

export function novaPartidaStop(codigo: string, papel: Papel, meuId: string): PartidaStop {
  return { v: 1, jogo: "stop", codigo, papel, meuId, p: 1, config: CONFIG_PADRAO, rodadas: [], fim: false, outro: null };
}

export const msgEu = (p: PartidaStop): MsgStop => {
  const r = atual(p);
  return {
    t: "eu",
    p: p.p,
    r: r?.r ?? 0,
    respostas: r?.minhas ?? null,
    anuladas: r?.anuladasPorMim ?? [],
    pronto: r?.prontoEu ?? false,
    parou: r?.quemParou === "eu",
    tenho: !!r?.dele,
  };
};

function msgRodada(p: PartidaStop): MsgStop | null {
  const r = atual(p);
  if (!r || p.papel !== "criador") return null;
  const anterior = p.rodadas[p.rodadas.length - 2];
  return { t: "rodada", p: p.p, r: r.r, letra: r.letra, config: p.config, ant: anterior?.anuladasPorMim ?? [] };
}

const novaRodada = (r: number, letra: string, agora: number): RodadaStop => ({
  r,
  letra,
  inicio: agora,
  minhas: null,
  dele: null,
  anuladasPorMim: [],
  anuladasPeloOutro: [],
  prontoEu: false,
  prontoEle: false,
  quemParou: null,
});

/** O criador começa a partida (com as categorias, o número de rodadas e o tempo escolhidos). */
export function comecar(p: PartidaStop, config: Config, agora: number, sorte: () => number = Math.random): PassoStop {
  // só com o outro na sala, na mesma partida (na revanche, depois de ele também pedir para jogar de novo)
  if (p.papel !== "criador" || p.rodadas.length > 0 || !configValida(config) || p.outro?.p !== p.p) return nada(p);
  const nova: PartidaStop = { ...p, config, rodadas: [novaRodada(1, sortearLetra([], sorte), agora)], fim: false };
  return { partida: nova, enviar: [msgRodada(nova) as MsgStop, msgEu(nova)] };
}

/** Pedi Stop (ou o tempo acabou): fecho as minhas respostas e aviso o outro. */
export function parar(p: PartidaStop, respostas: Respostas): PassoStop {
  const r = atual(p);
  if (!r || r.minhas || p.fim) return nada(p);
  const limpas = limpar(respostas, p.config.categorias);
  const rodadas = [...p.rodadas.slice(0, -1), { ...r, minhas: limpas, quemParou: r.dele ? r.quemParou : ("eu" as const) }];
  const nova = { ...p, rodadas };
  return { partida: nova, enviar: [msgEu(nova)] };
}

/** Não aceito (ou volto a aceitar) uma palavra do outro. */
export function anular(p: PartidaStop, palavra: string, anulada: boolean): PassoStop {
  const r = atual(p);
  if (!r || !r.minhas || !r.dele || r.prontoEu) return nada(p);
  const n = normalizar(palavra);
  const lista = anulada ? [...new Set([...r.anuladasPorMim, n])] : r.anuladasPorMim.filter((x) => x !== n);
  const nova = { ...p, rodadas: [...p.rodadas.slice(0, -1), { ...r, anuladasPorMim: lista }] };
  return { partida: nova, enviar: [msgEu(nova)] };
}

/** Pronto para a próxima rodada. Se os dois estiverem prontos, o criador sorteia a próxima letra. */
export function ficarPronto(p: PartidaStop, agora: number, sorte: () => number = Math.random): PassoStop {
  const r = atual(p);
  if (!r || !r.minhas || !r.dele || r.prontoEu) return nada(p);
  const nova = { ...p, rodadas: [...p.rodadas.slice(0, -1), { ...r, prontoEu: true }] };
  return avancar(nova, [msgEu(nova)], agora, sorte);
}

/** Com os dois prontos: o criador abre a próxima rodada; na última, a partida acaba (nos dois). */
function avancar(p: PartidaStop, enviar: MsgStop[], agora: number, sorte: () => number): PassoStop {
  const r = atual(p);
  if (!r || !r.prontoEu || !r.prontoEle) return { partida: p, enviar };
  if (r.r >= p.config.total) return { partida: { ...p, fim: true }, enviar };
  if (p.papel !== "criador") return { partida: p, enviar };
  const usadas = p.rodadas.map((x) => x.letra);
  const nova = { ...p, rodadas: [...p.rodadas, novaRodada(r.r + 1, sortearLetra(usadas, sorte), agora)] };
  return { partida: nova, enviar: [...enviar, msgRodada(nova) as MsgStop, msgEu(nova)] };
}

const limpar = (respostas: Respostas, categorias: readonly IdCategoria[]): Respostas => {
  const limpas: Respostas = {};
  for (const c of categorias) limpas[c] = (respostas[c] ?? "").slice(0, 40).trim();
  return limpas;
};

/**
 * Recebe uma mensagem do outro. `rascunho` é o que eu já escrevi na rodada atual: se o outro pediu
 * Stop, é isso que vai como minha resposta.
 */
export function receberStop(
  p: PartidaStop,
  msg: MsgStop,
  de: string,
  rascunho: Respostas,
  agora: number,
  sorte: () => number = Math.random,
): PassoStop {
  if (msg.t === "rodada") {
    if (p.papel !== "convidado") return nada(p);
    let base = p;
    // o outro já começou uma partida nova (revanche) e eu estava no fim da anterior
    if (msg.p > p.p) {
      if (!p.fim && p.rodadas.length > 0) return nada(p);
      base = { ...p, p: msg.p, rodadas: [], fim: false };
    } else if (msg.p < p.p) return nada(p);
    const r = atual(base);
    const esperada = (r?.r ?? 0) + 1;
    if (msg.r !== esperada || !configValida(msg.config) || !LETRAS_STOP.includes(msg.letra)) return nada(base === p ? p : base);
    // a rodada anterior está fechada: o criador só abre a próxima com os dois prontos
    const rodadas = base.rodadas.map((x, i) => (i === base.rodadas.length - 1 ? { ...x, prontoEle: true, anuladasPeloOutro: msg.ant } : x));
    const nova: PartidaStop = { ...base, config: msg.config, rodadas: [...rodadas, novaRodada(msg.r, msg.letra, agora)], fim: false };
    return { partida: nova, enviar: [msgEu(nova)] };
  }

  // "eu" do outro
  if (msg.p !== p.p) {
    return { partida: { ...p, outro: { id: de, p: msg.p, r: msg.r, pronto: msg.pronto } }, enviar: [] };
  }
  let nova: PartidaStop = { ...p, outro: { id: de, p: msg.p, r: msg.r, pronto: msg.pronto } };
  const r = atual(nova);
  const enviar: MsgStop[] = [];
  if (!r || msg.r !== r.r) {
    // o outro está atrás (não recebeu a rodada nova): o criador reenvia
    const rodada = msgRodada(nova);
    if (rodada && msg.r < (r?.r ?? 0)) enviar.push(rodada, msgEu(nova));
    return { partida: nova, enviar };
  }
  let rodada: RodadaStop = { ...r, anuladasPeloOutro: msg.anuladas, prontoEle: msg.pronto };
  let fechei = false;
  if (msg.respostas && !rodada.dele) {
    rodada = { ...rodada, dele: limpar(msg.respostas, nova.config.categorias) };
    if (!rodada.minhas) {
      // o outro pediu Stop: a rodada acaba aqui também, com o que eu já tinha escrito
      rodada = { ...rodada, minhas: limpar(rascunho, nova.config.categorias), quemParou: "ele" };
      fechei = true;
    }
  }
  nova = { ...nova, rodadas: [...nova.rodadas.slice(0, -1), rodada] };
  // respondo só quando o outro precisa de algo meu (assim os dois não ficam se respondendo para sempre)
  if (fechei || (rodada.minhas && !msg.tenho)) enviar.push(msgEu(nova));
  return avancar(nova, enviar, agora, sorte);
}

/** O que mandar de novo de tempos em tempos (e depois de reconectar). */
export function reenviarStop(p: PartidaStop): MsgStop[] {
  const rodada = msgRodada(p);
  return rodada ? [rodada, msgEu(p)] : [msgEu(p)];
}

/** Jogar de novo na mesma sala. O criador escolhe de novo as categorias e começa. */
export function revancheStop(p: PartidaStop): PassoStop {
  const nova: PartidaStop = { ...p, p: Math.max(p.p, p.outro?.p ?? 0) + (p.outro && p.outro.p > p.p ? 0 : 1), rodadas: [], fim: false };
  return { partida: nova, enviar: [msgEu(nova)] };
}

/** Pontos de cada rodada (só das que já têm as duas respostas) e o total, como [eu, outro]. */
export function placarStop(p: PartidaStop) {
  const porRodada = p.rodadas.map((r) => {
    if (!r.minhas || !r.dele) return null;
    const anuladas = [...r.anuladasPorMim, ...r.anuladasPeloOutro];
    const porCategoria = p.config.categorias.map((c) => pontosDaCategoria(r.minhas?.[c], r.dele?.[c], r.letra, anuladas));
    return porCategoria.reduce<[number, number]>((s, [a, b]) => [s[0] + a, s[1] + b], [0, 0]);
  });
  const total = porRodada.reduce<[number, number]>((s, x) => (x ? [s[0] + x[0], s[1] + x[1]] : s), [0, 0]);
  return { porRodada, total };
}

export function ehMsgStop(x: unknown): x is MsgStop {
  const m = x as Record<string, unknown> | null;
  if (!m || typeof m !== "object" || typeof m.p !== "number" || typeof m.r !== "number") return false;
  const textos = (v: unknown) => Array.isArray(v) && v.length <= 20 && v.every((s) => typeof s === "string" && s.length <= 40);
  if (m.t === "rodada") return typeof m.letra === "string" && configValida(m.config) && textos(m.ant);
  if (m.t === "eu") {
    if (typeof m.tenho !== "boolean") return false;
    const respostasOk =
      m.respostas === null ||
      (typeof m.respostas === "object" &&
        Object.entries(m.respostas as object).every(([k, v]) => ehCategoria(k) && typeof v === "string" && v.length <= 40));
    return respostasOk && textos(m.anuladas) && typeof m.pronto === "boolean" && typeof m.parou === "boolean";
  }
  return false;
}
