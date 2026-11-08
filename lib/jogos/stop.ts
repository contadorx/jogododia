/**
 * Stop (adedonha): sorteia uma letra e cada um escreve, para cada categoria, uma palavra que comece
 * com ela. Quem preencher tudo pode pedir "Stop!", e a rodada acaba para todos. Pontos de cada
 * categoria: palavra que vale e que ninguém mais escreveu, 10; igual à de alguém, 5; em branco ou que
 * não vale, 0.
 *
 * Aqui ficam as regras e a partida à distância, só com funções puras (testadas em
 * scripts/testar-stop.mjs). No mesmo aparelho o jogo é no papel e o site só sorteia, marca o tempo e
 * soma os pontos, então não precisa de nada disto além das listas.
 *
 * Partida à distância, de 2 a 6 jogadores. Ninguém tem nome: cada um é um bicho (Arara, Onça,
 * Tatu…), pela ordem de chegada na sala. Quem criou a sala é o juiz: guarda a lista de quem chegou,
 * sorteia a letra, diz quem joga cada rodada e fecha os pontos de cada uma. Ele manda tudo isso numa
 * mensagem só ("sala"). Cada aparelho manda o seu estado na rodada ("eu"): as respostas (depois do
 * Stop ou do fim do tempo), as palavras dos outros que ele não aceita, se está pronto para a próxima e
 * de quem já tem as respostas. As duas se repetem de tempos em tempos, então perder uma não atrapalha.
 *
 * Uma palavra deixa de valer quando a maioria dos outros jogadores da rodada marca "não vale" (com
 * dois jogadores, basta o outro). Quem escreveu a mesma palavra não vota nela e conta como "vale".
 *
 * Se alguém sai no meio, quem criou a sala pode seguir sem ele: se faltam as respostas dele, ele fica
 * de fora da rodada; se ele já tinha respondido, a rodada fecha com o que ele mandou. Quem chega depois
 * de a partida começar (ou volta) entra na rodada seguinte.
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
  { id: "carro", nome: "Carro (marca ou modelo)" },
  { id: "adjetivo", nome: "Adjetivo (como algo ou alguém é)" },
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

export function sortearLetra(usadas: readonly string[], sorte: () => number = Math.random): string {
  const livres = LETRAS_STOP.filter((l) => !usadas.includes(l));
  const lista = livres.length ? livres : LETRAS_STOP;
  return lista[Math.floor(sorte() * lista.length)];
}

// ------------------------------------------------------------------------------- à distância

/**
 * Jogadores ao mesmo tempo numa sala. Cada mensagem vai para todos os outros, e o plano gratuito do
 * Supabase tem limite de mensagens por segundo no projeto inteiro (veja docs/tempo-real.md).
 */
export const MAX_JOGADORES = 6;

/** O bicho de cada um, pela ordem de chegada na sala (`a`: o artigo, para "a Onça", "o Tatu"). */
export const BICHOS = [
  { nome: "Arara", a: "a" },
  { nome: "Onça", a: "a" },
  { nome: "Tatu", a: "o" },
  { nome: "Capivara", a: "a" },
  { nome: "Tucano", a: "o" },
  { nome: "Boto", a: "o" },
  { nome: "Jabuti", a: "o" },
  { nome: "Mico", a: "o" },
  { nome: "Cutia", a: "a" },
  { nome: "Coruja", a: "a" },
  { nome: "Quati", a: "o" },
  { nome: "Ema", a: "a" },
  { nome: "Jacaré", a: "o" },
  { nome: "Preguiça", a: "a" },
  { nome: "Tamanduá", a: "o" },
  { nome: "Seriema", a: "a" },
] as const;

export type Bicho = { nome: string; a: "a" | "o" };
export const bicho = (i: number): Bicho => BICHOS[i] ?? { nome: `Jogador ${i + 1}`, a: "o" };

/** Quantos aparelhos diferentes podem passar pela sala (cada um fica com o seu bicho). */
export const MAX_ELENCO = BICHOS.length;

export type Papel = "criador" | "convidado";

export type RodadaStop = {
  r: number;
  letra: string;
  /** Quem joga a rodada (posições no elenco). Quem criou a sala decide; a lista só diminui. */
  quem: number[];
  /** Quando a rodada começou neste aparelho (para o relógio). */
  inicio: number;
  /** As respostas de cada um (por posição no elenco), fechadas no Stop ou no fim do tempo. */
  respostas: Record<number, Respostas>;
  /** As palavras dos outros que cada um não aceita, como "categoria:palavra" (palavra normalizada). */
  votos: Record<number, string[]>;
  prontos: number[];
  /** Quem pediu Stop (o primeiro de que este aparelho soube). null: ninguém pediu (o tempo acabou). */
  parou: number | null;
  /** Quando este aparelho fechou as próprias respostas. */
  fecheiEm: number | null;
  /** Os pontos de cada um de `quem`, quando quem criou a sala fecha a rodada. */
  pontos: number[] | null;
};

export type PartidaStop = {
  v: 2;
  jogo: "stop";
  codigo: string;
  papel: Papel;
  meuId: string;
  /** Número da partida na sala (jogar de novo soma 1). */
  p: number;
  /** Os aparelhos que já entraram na sala, na ordem de chegada (a posição dá o bicho). Só cresce. */
  elenco: string[];
  config: Config;
  rodadas: RodadaStop[];
  fim: boolean;
  /** Quem criou a sala: em que partida e rodada cada um disse por último que está. */
  vistos: Record<string, { p: number; r: number }>;
  /** Convidado: a partida em que quem criou a sala está (para o "quer jogar de novo"). */
  pSala: number;
};

export type RodadaNaSala = { letra: string; quem: number[]; pontos: number[] | null };
export type MsgSala = { t: "sala"; p: number; elenco: string[]; config: Config; rodadas: RodadaNaSala[]; fim: boolean };
export type MsgEu = {
  t: "eu";
  p: number;
  r: number;
  respostas: Respostas | null;
  anuladas: string[];
  pronto: boolean;
  parou: boolean;
  /** De quem eu já tenho as respostas nesta rodada (um bit por posição no elenco). */
  tenho: number;
};
export type MsgStop = MsgSala | MsgEu;

/**
 * `enviar`: o que mandar agora. `responder`: alguém precisa do que este aparelho sabe; mande o estado
 * inteiro (reenviarStop) daqui a pouco, juntando vários pedidos num envio só.
 */
export type PassoStop = { partida: PartidaStop; enviar: MsgStop[]; responder?: boolean };

export type Contexto = {
  agora: number;
  /** Quem está na sala agora (ids), pela presença. */
  presentes: readonly string[];
  /** O que eu já escrevi na rodada: se alguém pedir Stop, vira a minha resposta. */
  rascunho?: Respostas;
  sorte?: () => number;
};

/** Até esse tempo depois de mandar, uma mensagem ainda pode estar a caminho: não precisa mandar de novo. */
const A_CAMINHO_MS = 2_000;

const nada = (partida: PartidaStop): PassoStop => ({ partida, enviar: [] });
export const atual = (p: PartidaStop): RodadaStop | null => p.rodadas[p.rodadas.length - 1] ?? null;
export const meuIndice = (p: PartidaStop) => p.elenco.indexOf(p.meuId);
const trocarAtual = (p: PartidaStop, r: RodadaStop): PartidaStop => ({ ...p, rodadas: [...p.rodadas.slice(0, -1), r] });

export type FaseStop = "cheia" | "esperando" | "fora" | "escrevendo" | "aguardando" | "conferindo" | "entre" | "fim";

/**
 * "fora": a rodada começou sem mim (cheguei depois ou caí); "entre": a rodada fechou e a próxima ainda
 * não abriu (falta gente na sala); "cheia": a sala já recebeu todos os aparelhos que cabem.
 */
export function faseDe(p: PartidaStop): FaseStop {
  if (p.fim) return "fim";
  const eu = meuIndice(p);
  if (eu < 0 && p.elenco.length >= MAX_ELENCO) return "cheia";
  const r = atual(p);
  if (!r) return "esperando";
  if (r.pontos) return "entre";
  if (!r.quem.includes(eu)) return "fora";
  if (!r.respostas[eu]) return "escrevendo";
  if (r.quem.some((i) => !r.respostas[i])) return "aguardando";
  return "conferindo";
}

export function novaPartidaStop(codigo: string, papel: Papel, meuId: string): PartidaStop {
  return {
    v: 2,
    jogo: "stop",
    codigo,
    papel,
    meuId,
    p: 1,
    elenco: papel === "criador" ? [meuId] : [],
    config: CONFIG_PADRAO,
    rodadas: [],
    fim: false,
    vistos: {},
    pSala: 1,
  };
}

export function msgEu(p: PartidaStop): MsgEu {
  const r = atual(p);
  const eu = meuIndice(p);
  const joga = !!r && r.quem.includes(eu);
  return {
    t: "eu",
    p: p.p,
    r: r?.r ?? 0,
    respostas: joga ? (r.respostas[eu] ?? null) : null,
    anuladas: joga ? (r.votos[eu] ?? []) : [],
    pronto: joga && r.prontos.includes(eu),
    parou: joga && r.parou === eu,
    tenho: r ? r.quem.reduce((bits, i) => (r.respostas[i] ? bits | (1 << i) : bits), 0) : 0,
  };
}

function msgSala(p: PartidaStop): MsgSala {
  return {
    t: "sala",
    p: p.p,
    elenco: p.elenco,
    config: p.config,
    rodadas: p.rodadas.map((r) => ({ letra: r.letra, quem: r.quem, pontos: r.pontos })),
    fim: p.fim,
  };
}

const novaRodada = (r: number, letra: string, quem: number[], agora: number): RodadaStop => ({
  r,
  letra,
  quem,
  inicio: agora,
  respostas: {},
  votos: {},
  prontos: [],
  parou: null,
  fecheiEm: null,
  pontos: null,
});

/** Quem joga a próxima rodada: quem criou a sala e quem está na sala agora e já entrou nesta partida. */
export function quemJoga(p: PartidaStop, presentes: readonly string[]): number[] {
  return p.elenco.flatMap((id, i) => (id === p.meuId || (presentes.includes(id) && p.vistos[id]?.p === p.p) ? [i] : []));
}

/** Quem criou a sala começa a partida (com as categorias, o número de rodadas e o tempo escolhidos). */
export function comecar(p: PartidaStop, config: Config, ctx: Contexto): PassoStop {
  if (p.papel !== "criador" || p.rodadas.length > 0 || p.fim || !configValida(config)) return nada(p);
  const quem = quemJoga(p, ctx.presentes);
  if (quem.length < 2) return nada(p);
  const nova: PartidaStop = { ...p, config, rodadas: [novaRodada(1, sortearLetra([], ctx.sorte), quem, ctx.agora)] };
  return { partida: nova, enviar: [msgSala(nova), msgEu(nova)] };
}

/** Fecho as minhas respostas: pedi Stop (`pediStop`) ou o meu tempo acabou. */
export function parar(p: PartidaStop, respostas: Respostas, pediStop: boolean, agora: number): PassoStop {
  const r = atual(p);
  const eu = meuIndice(p);
  if (!r || p.fim || r.pontos || !r.quem.includes(eu) || r.respostas[eu]) return nada(p);
  const nova = trocarAtual(p, {
    ...r,
    respostas: { ...r.respostas, [eu]: limpar(respostas, p.config.categorias) },
    parou: pediStop && r.parou === null ? eu : r.parou,
    fecheiEm: agora,
  });
  return { partida: nova, enviar: [msgEu(nova)] };
}

/** Não aceito (ou volto a aceitar) a palavra de outro jogador numa categoria. */
export function anular(p: PartidaStop, categoria: IdCategoria, palavra: string, anulada: boolean): PassoStop {
  const r = atual(p);
  const eu = meuIndice(p);
  if (!r || faseDe(p) !== "conferindo" || r.prontos.includes(eu)) return nada(p);
  const w = normalizar(palavra);
  // não vale votar na própria palavra, nem numa que ninguém da rodada escreveu
  if (!w || normalizar(r.respostas[eu]?.[categoria] ?? "") === w) return nada(p);
  if (!r.quem.some((i) => i !== eu && normalizar(r.respostas[i]?.[categoria] ?? "") === w)) return nada(p);
  const chave = `${categoria}:${w}`;
  const meus = r.votos[eu] ?? [];
  const lista = anulada ? [...new Set([...meus, chave])] : meus.filter((x) => x !== chave);
  const nova = trocarAtual(p, { ...r, votos: { ...r.votos, [eu]: lista } });
  return { partida: nova, enviar: [msgEu(nova)] };
}

/** Terminei de conferir. Quando todos da rodada estiverem prontos, quem criou a sala fecha os pontos. */
export function ficarPronto(p: PartidaStop, ctx: Contexto): PassoStop {
  const r = atual(p);
  const eu = meuIndice(p);
  if (!r || faseDe(p) !== "conferindo" || r.prontos.includes(eu)) return nada(p);
  const nova = trocarAtual(p, { ...r, prontos: [...r.prontos, eu] });
  return fecharSePuder(nova, [msgEu(nova)], ctx);
}

/** Quem criou a sala: com todos da rodada prontos, fecha os pontos e abre a próxima (ou termina). */
function fecharSePuder(p: PartidaStop, enviar: MsgStop[], ctx: Contexto): PassoStop {
  const r = atual(p);
  if (p.papel !== "criador" || !r || p.fim || r.pontos) return { partida: p, enviar };
  if (!r.quem.every((i) => r.respostas[i] && r.prontos.includes(i))) return { partida: p, enviar };
  let nova = trocarAtual(p, { ...r, pontos: pontosDaRodada(r, p.config.categorias) });
  if (r.r >= p.config.total) nova = { ...nova, fim: true };
  else nova = abrirProxima(nova, ctx).partida;
  return { partida: nova, enviar: [...enviar, msgSala(nova), msgEu(nova)] };
}

/**
 * Quem criou a sala: abre a próxima rodada, se a última já fechou e há pelo menos mais alguém na sala
 * (a tela chama de novo quando alguém volta).
 */
export function abrirProxima(p: PartidaStop, ctx: Contexto): PassoStop {
  const r = atual(p);
  if (p.papel !== "criador" || p.fim || !r || !r.pontos) return nada(p);
  const quem = quemJoga(p, ctx.presentes);
  if (quem.length < 2) return nada(p);
  const usadas = p.rodadas.map((x) => x.letra);
  const nova: PartidaStop = { ...p, rodadas: [...p.rodadas, novaRodada(r.r + 1, sortearLetra(usadas, ctx.sorte), quem, ctx.agora)] };
  return { partida: nova, enviar: [msgSala(nova), msgEu(nova)] };
}

/**
 * Quem criou a sala pode seguir sem um jogador que saiu: se faltam as respostas dele (e alguém já
 * fechou as suas), ele fica de fora da rodada, desde que fiquem pelo menos dois; se ele já respondeu e
 * só falta dizer que está pronto, conta como pronto.
 */
export function podeSeguirSem(p: PartidaStop, indice: number, presentes: readonly string[]): boolean {
  const r = atual(p);
  if (p.papel !== "criador" || p.fim || !r || r.pontos || indice === meuIndice(p) || !r.quem.includes(indice)) return false;
  if (presentes.includes(p.elenco[indice])) return false;
  if (!r.respostas[indice]) return r.quem.length > 2 && r.quem.some((i) => r.respostas[i]);
  return !r.prontos.includes(indice);
}

export function seguirSem(p: PartidaStop, indice: number, ctx: Contexto): PassoStop {
  const r = atual(p);
  if (!r || !podeSeguirSem(p, indice, ctx.presentes)) return nada(p);
  const nova = trocarAtual(
    p,
    r.respostas[indice] ? { ...r, prontos: [...r.prontos, indice] } : { ...r, quem: r.quem.filter((i) => i !== indice) },
  );
  return fecharSePuder(nova, [msgSala(nova)], ctx);
}

const limpar = (respostas: Respostas, categorias: readonly IdCategoria[]): Respostas => {
  const limpas: Respostas = {};
  for (const c of categorias) limpas[c] = (respostas[c] ?? "").slice(0, 40).trim();
  return limpas;
};

const limparVotos = (votos: readonly string[], categorias: readonly IdCategoria[]): string[] =>
  [...new Set(votos)].filter((v) => {
    const [c, ...resto] = v.split(":");
    const w = resto.join(":");
    return categorias.includes(c as IdCategoria) && w.length > 0 && w === normalizar(w);
  });

/** O elenco só cresce: fica o mais longo, se o curto for o começo dele. */
function maiorElenco(meu: string[], dela: string[]): string[] {
  if (dela.length > meu.length && meu.every((id, i) => dela[i] === id)) return dela;
  return meu;
}

/** Recebe uma mensagem de outro aparelho da sala. */
export function receberStop(p: PartidaStop, msg: MsgStop, de: string, ctx: Contexto): PassoStop {
  if (de === p.meuId) return nada(p);
  return msg.t === "sala" ? receberSala(p, msg, ctx) : receberEu(p, msg, de, ctx);
}

/** Convidado: o que quem criou a sala diz (elenco, rodadas, quem joga cada uma, pontos, fim). */
function receberSala(p: PartidaStop, msg: MsgSala, ctx: Contexto): PassoStop {
  if (p.papel !== "convidado" || msg.p < p.p) return nada(p);
  const elenco = maiorElenco(p.elenco, msg.elenco);
  // no fim da partida, cada um decide se joga a próxima (botão); fica só sabendo que a sala seguiu
  if (msg.p > p.p && p.fim) return nada({ ...p, elenco, pSala: msg.p });
  let base: PartidaStop = { ...p, elenco, config: msg.config, pSala: Math.max(p.pSala, msg.p) };
  let mudou = false;
  if (msg.p > p.p) {
    // a sala está numa partida nova (eu não tinha começado, ou caí no meio da anterior): sigo a sala
    base = { ...base, p: msg.p, rodadas: [], fim: false };
    mudou = true;
  }
  const rodadas = [...base.rodadas];
  msg.rodadas.forEach((m, k) => {
    const local = rodadas[k];
    if (!local) {
      rodadas.push({ ...novaRodada(k + 1, m.letra, m.quem, ctx.agora), pontos: m.pontos });
      mudou = true;
    } else if (local.letra === m.letra && !local.pontos) {
      rodadas[k] = m.pontos ? { ...local, quem: m.quem, pontos: m.pontos } : { ...local, quem: local.quem.filter((x) => m.quem.includes(x)) };
    }
  });
  return { partida: { ...base, rodadas, fim: base.fim || msg.fim }, enviar: [], responder: mudou };
}

/** O estado de outro jogador na rodada. Quem criou a sala também anota quem está em que partida. */
function receberEu(p: PartidaStop, msg: MsgEu, de: string, ctx: Contexto): PassoStop {
  let nova = p;
  const enviar: MsgStop[] = [];
  let responder = false;
  if (p.papel === "criador") {
    nova = { ...nova, vistos: { ...nova.vistos, [de]: { p: msg.p, r: msg.r } } };
    if (!nova.elenco.includes(de)) {
      // chegou alguém: ganha o próximo bicho (ou fica sabendo que a sala está cheia)
      if (nova.elenco.length < MAX_ELENCO) nova = { ...nova, elenco: [...nova.elenco, de] };
      enviar.push(msgSala(nova));
    } else {
      // ficou para trás (não recebeu a rodada nova): conto como está a sala
      const r = atual(nova);
      if (r && msg.p === nova.p && msg.r < r.r && ctx.agora - r.inicio > A_CAMINHO_MS) responder = true;
    }
  }
  const i = nova.elenco.indexOf(de);
  const r = atual(nova);
  if (i < 0 || !r || r.pontos || msg.p !== nova.p || msg.r !== r.r || !r.quem.includes(i)) return { partida: nova, enviar, responder };

  let rodada = r;
  if (msg.respostas && !rodada.respostas[i]) rodada = { ...rodada, respostas: { ...rodada.respostas, [i]: limpar(msg.respostas, nova.config.categorias) } };
  // depois de pronto, os votos dele não mudam mais (mensagem velha, chegando atrasada, não desfaz nada)
  if (rodada.respostas[i] && !rodada.prontos.includes(i)) {
    rodada = { ...rodada, votos: { ...rodada.votos, [i]: limparVotos(msg.anuladas, nova.config.categorias) } };
    if (msg.pronto) rodada = { ...rodada, prontos: [...rodada.prontos, i] };
  }
  if (msg.parou && rodada.parou === null) rodada = { ...rodada, parou: i };

  const eu = meuIndice(nova);
  const jogo = rodada.quem.includes(eu);
  let fechei = false;
  if (jogo && !rodada.respostas[eu] && msg.respostas) {
    // alguém fechou as respostas (Stop ou tempo): as minhas fecham também, com o que eu já tinha escrito
    rodada = { ...rodada, respostas: { ...rodada.respostas, [eu]: limpar(ctx.rascunho ?? {}, nova.config.categorias) }, fecheiEm: ctx.agora };
    fechei = true;
  }
  // ele não tem as minhas respostas, e elas já deviam ter chegado: mando de novo
  if (jogo && !fechei && rodada.respostas[eu] && !(msg.tenho & (1 << eu)) && ctx.agora - (rodada.fecheiEm ?? 0) > A_CAMINHO_MS) responder = true;
  nova = trocarAtual(nova, rodada);
  if (fechei) enviar.push(msgEu(nova));
  const passo = fecharSePuder(nova, enviar, ctx);
  return { ...passo, responder };
}

/** O que mandar de tempos em tempos, ao (re)conectar e quando alguém pede. */
export function reenviarStop(p: PartidaStop): MsgStop[] {
  return p.papel === "criador" ? [msgSala(p), msgEu(p)] : [msgEu(p)];
}

/**
 * Jogar de novo na mesma sala. Quem criou a sala abre a partida seguinte e escolhe de novo as
 * categorias; quem foi convidado entra nela (mesmo que quem criou ainda não tenha aberto).
 */
export function revancheStop(p: PartidaStop): PassoStop {
  if (!p.fim) return nada(p);
  if (p.papel === "criador") {
    const nova: PartidaStop = { ...p, p: p.p + 1, rodadas: [], fim: false };
    return { partida: nova, enviar: [msgSala(nova), msgEu(nova)] };
  }
  const nova: PartidaStop = { ...p, p: p.pSala > p.p ? p.pSala : p.p + 1, rodadas: [], fim: false };
  return { partida: nova, enviar: [msgEu(nova)] };
}

// ------------------------------------------------------------------------------- pontos

/** Votos para uma palavra deixar de valer: mais da metade dos outros jogadores da rodada. */
export const votosParaAnular = (jogadores: number) => Math.floor((jogadores - 1) / 2) + 1;

export type Celula = {
  indice: number;
  palavra: string;
  pontos: number;
  /** Por que não vale sozinha (em branco, outra letra…), ou null. */
  problema: string | null;
  anulada: boolean;
  repetida: boolean;
  /** Quantos dos outros marcaram "não vale". */
  votos: number;
};

/** Como ficou cada jogador da rodada numa categoria (na ordem de `quem`). */
export function conferirCategoria(r: RodadaStop, c: IdCategoria): Celula[] {
  const precisa = votosParaAnular(r.quem.length);
  const palavras = r.quem.map((i) => r.respostas[i]?.[c] ?? "");
  const normais = palavras.map(normalizar);
  const base = r.quem.map((i, k) => {
    const prob = problema(palavras[k], r.letra);
    const chave = `${c}:${normais[k]}`;
    // quem escreveu a mesma palavra não vota nela
    const votos = prob ? 0 : r.quem.filter((j, kj) => normais[kj] !== normais[k] && (r.votos[j] ?? []).includes(chave)).length;
    const anulada = !prob && votos >= precisa;
    return { indice: i, palavra: palavras[k], problema: prob, anulada, votos, vale: !prob && !anulada };
  });
  return base.map((x, k) => {
    const repetida = x.vale && base.some((y, ky) => ky !== k && y.vale && normais[ky] === normais[k]);
    return { indice: x.indice, palavra: x.palavra, problema: x.problema, anulada: x.anulada, repetida, votos: x.votos, pontos: x.vale ? (repetida ? 5 : 10) : 0 };
  });
}

/** Pontos de cada jogador na rodada (na ordem de `quem`). */
export function pontosDaRodada(r: RodadaStop, categorias: readonly IdCategoria[]): number[] {
  const total = r.quem.map(() => 0);
  for (const c of categorias) conferirCategoria(r, c).forEach((x, k) => (total[k] += x.pontos));
  return total;
}

/**
 * Pontos de cada rodada (os que quem criou a sala fechou, ou a conta deste aparelho se a rodada está
 * em conferência) e o total de cada um, por posição no elenco. `jogou`: entrou em alguma rodada.
 */
export function placarStop(p: PartidaStop) {
  const total = p.elenco.map(() => 0);
  const jogou = p.elenco.map(() => false);
  const porRodada = p.rodadas.map((r) => {
    const pontos = r.pontos ?? (r.quem.every((i) => r.respostas[i]) ? pontosDaRodada(r, p.config.categorias) : null);
    r.quem.forEach((i, k) => {
      if (i < jogou.length) jogou[i] = true;
      if (pontos && i < total.length) total[i] += pontos[k];
    });
    return pontos;
  });
  return { porRodada, total, jogou };
}

// ------------------------------------------------------------------------------- mensagens

/** Uma rodada com todas as categorias e nenhuma palavra repetida. */
const MAX_PONTOS_RODADA = 10 * CATEGORIAS_STOP.length;
/** Um "não vale" para cada palavra de cada um dos outros, em todas as categorias. */
const MAX_VOTOS = CATEGORIAS_STOP.length * (MAX_JOGADORES - 1);
const inteiro = (n: unknown, min: number, max: number): n is number => Number.isInteger(n) && (n as number) >= min && (n as number) <= max;
const texto = (s: unknown, max: number): s is string => typeof s === "string" && s.length <= max;

/** Confere o que chega pela rede (nada de fora do formato, nem textos grandes). */
export function ehMsgStop(x: unknown): x is MsgStop {
  const m = x as Record<string, unknown> | null;
  if (!m || typeof m !== "object" || !inteiro(m.p, 1, 1_000_000)) return false;
  if (m.t === "sala") {
    const elenco = m.elenco;
    if (!Array.isArray(elenco) || elenco.length > MAX_ELENCO || !elenco.every((s) => texto(s, 64) && s.length > 0)) return false;
    if (new Set(elenco).size !== elenco.length || !configValida(m.config) || typeof m.fim !== "boolean") return false;
    const rodadas = m.rodadas;
    if (!Array.isArray(rodadas) || rodadas.length > m.config.total) return false;
    return rodadas.every((r: unknown) => {
      const x = r as Record<string, unknown> | null;
      if (!x || typeof x !== "object" || typeof x.letra !== "string" || !LETRAS_STOP.includes(x.letra)) return false;
      const quem = x.quem;
      if (!Array.isArray(quem) || quem.length < 1 || quem.length > MAX_JOGADORES || new Set(quem).size !== quem.length) return false;
      if (!quem.every((i) => inteiro(i, 0, elenco.length - 1))) return false;
      return x.pontos === null || (Array.isArray(x.pontos) && x.pontos.length === quem.length && x.pontos.every((n) => inteiro(n, 0, MAX_PONTOS_RODADA)));
    });
  }
  if (m.t === "eu") {
    if (!inteiro(m.r, 0, 7) || !inteiro(m.tenho, 0, 2 ** MAX_ELENCO - 1) || typeof m.pronto !== "boolean" || typeof m.parou !== "boolean") return false;
    const respostasOk =
      m.respostas === null ||
      (typeof m.respostas === "object" &&
        !Array.isArray(m.respostas) &&
        Object.entries(m.respostas as object).every(([k, v]) => ehCategoria(k) && texto(v, 40)));
    const anuladas = m.anuladas;
    return respostasOk && Array.isArray(anuladas) && anuladas.length <= MAX_VOTOS && anuladas.every((s) => texto(s, 52) && ehCategoria(String(s).split(":")[0]));
  }
  return false;
}
