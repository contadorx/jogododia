/**
 * Regras da partida à distância: o que cada aparelho faz com cada mensagem. Funções puras, sem rede,
 * testadas em scripts/testar-distancia.mjs. A conexão em si fica em lib/sala.ts.
 *
 * Cada aparelho guarda só o seu lado: a sua frota, os tiros que deu e os que recebeu. Quem recebe um
 * tiro responde sozinho, a partir da própria frota, como no jogo falado. Mensagem pode chegar
 * repetida ou se perder: tiro e resposta levam um número (n), a resposta repetida é reenviada igual, e
 * o tiro que ficou sem resposta é mandado de novo até a resposta chegar.
 *
 * "p" é o número da partida dentro da sala (a revanche soma 1), para não misturar duas partidas.
 */
import { aguaEmVolta, grupoDeAcertos, responderTiro, type MarcaTiro, type Posicao, type Resposta } from "./batalha.ts";

export type Papel = "criador" | "convidado";
export type Fase = "montando" | "pronto" | "jogando" | "fim";
/** Combinado da sala, escolhido por quem cria: acertou, joga de novo? */
export type Regras = { deNovo: boolean };

export type Msg =
  | { t: "status"; p: number; fase: Fase; regras?: Regras }
  | { t: "comeca"; p: number; quem: string; regras: Regras }
  | { t: "tiro"; p: number; n: number; casa: number }
  | { t: "resposta"; p: number; n: number; casa: number; resposta: Resposta };

export type Evento = { tipo: "meu-tiro" | "tiro-dele"; casa: number; resposta: Resposta };

export type Partida = {
  v: 1;
  codigo: string;
  papel: Papel;
  meuId: string;
  p: number;
  fase: Fase;
  regras: Regras;
  frota: Posicao[];
  /** Meus tiros e as respostas que chegaram. */
  tiros: Record<number, MarcaTiro>;
  /** Casas dos meus tiros respondidos, na ordem (o tiro n é o índice n - 1), e as respostas que vieram. */
  ordemTiros: number[];
  respostasMeus: Resposta[];
  /** Tiro enviado esperando resposta. */
  pendente: { n: number; casa: number } | null;
  deduzidas: number[];
  afundadosDele: { navioId: string; casas: number[] }[];
  /** Tiros do outro na minha frota, na ordem, e o que respondi a cada um. */
  recebidos: number[];
  respostasDadas: Resposta[];
  /** Quem começou (id). A vez não fica guardada: sai do histórico de tiros (vezAtual). */
  quemComeca: string | null;
  resultado: "venci" | "perdi" | null;
  /** O que o outro aparelho contou da última vez. */
  outro: { id: string; p: number; fase: Fase } | null;
  ultimo: Evento | null;
};

export type Passo = { partida: Partida; enviar: Msg[] };

const nada = (partida: Partida): Passo => ({ partida, enviar: [] });

/** Partida zerada (montando), mantendo sala, papel, id e combinado. */
function zerada(base: Pick<Partida, "codigo" | "papel" | "meuId" | "regras" | "outro">, p: number): Partida {
  return {
    v: 1,
    codigo: base.codigo,
    papel: base.papel,
    meuId: base.meuId,
    p,
    fase: "montando",
    regras: base.regras,
    frota: [],
    tiros: {},
    ordemTiros: [],
    respostasMeus: [],
    pendente: null,
    deduzidas: [],
    afundadosDele: [],
    recebidos: [],
    respostasDadas: [],
    quemComeca: null,
    resultado: null,
    outro: base.outro,
    ultimo: null,
  };
}

export function novaSala(codigo: string, papel: Papel, meuId: string, regras: Regras = { deNovo: false }): Partida {
  return zerada({ codigo, papel, meuId, regras, outro: null }, 1);
}

export function statusDe(partida: Partida): Msg {
  return { t: "status", p: partida.p, fase: partida.fase, ...(partida.papel === "criador" ? { regras: partida.regras } : {}) };
}

function comecar(partida: Partida, quem: string): Passo {
  const nova: Partida = { ...partida, fase: "jogando", quemComeca: quem };
  return { partida: nova, enviar: [{ t: "comeca", p: nova.p, quem, regras: nova.regras }, statusDe(nova)] };
}

/**
 * De quem é a vez, calculada só a partir do histórico (os dois aparelhos chegam ao mesmo resultado,
 * mesmo que as mensagens cheguem fora de ordem). Cada tiro que passa a vez conta um: com o combinado
 * "acertou, joga de novo", só a água passa; sem ele, todo tiro passa.
 */
export function vezAtual(partida: Partida): "eu" | "outro" | null {
  if (partida.fase !== "jogando" || !partida.quemComeca) return null;
  const passa = (r: Resposta) => !partida.regras.deNovo || r.tipo === "agua" || r.tipo === "repetido";
  const viradas = partida.respostasMeus.filter(passa).length + partida.respostasDadas.filter(passa).length;
  const comecei = partida.quemComeca === partida.meuId;
  return (viradas % 2 === 0) === comecei ? "eu" : "outro";
}

/** Frota montada: avisa o outro. Se for quem criou e o outro já estiver pronto, sorteia quem começa. */
export function ficarPronto(partida: Partida, frota: Posicao[], sortear: () => number = Math.random): Passo {
  if (partida.fase !== "montando") return nada(partida);
  const nova: Partida = { ...partida, frota, fase: "pronto" };
  const o = nova.outro;
  if (nova.papel === "criador" && o && o.p === nova.p && o.fase === "pronto") {
    return comecar(nova, sortear() < 0.5 ? nova.meuId : o.id);
  }
  return { partida: nova, enviar: [statusDe(nova)] };
}

/** Atirar numa casa do mar do outro (só na minha vez e sem tiro esperando resposta). */
export function atirar(partida: Partida, casa: number): Passo {
  if (vezAtual(partida) !== "eu" || partida.pendente || partida.tiros[casa]) return nada(partida);
  const n = partida.ordemTiros.length + 1;
  return { partida: { ...partida, pendente: { n, casa } }, enviar: [{ t: "tiro", p: partida.p, n, casa }] };
}

/** O que mandar de novo depois de uma queda ou de um tempo sem resposta. */
export function reenviar(partida: Partida): Msg[] {
  const msgs: Msg[] = [statusDe(partida)];
  if (partida.pendente) msgs.push({ t: "tiro", p: partida.p, n: partida.pendente.n, casa: partida.pendente.casa });
  return msgs;
}

/** Jogar de novo na mesma sala. Se o outro já pediu revanche, entra na partida dele. */
export function revanche(partida: Partida): Passo {
  const p = partida.outro && partida.outro.p > partida.p ? partida.outro.p : partida.p + 1;
  const nova = zerada(partida, p);
  return { partida: nova, enviar: [statusDe(nova)] };
}

export function receber(partida: Partida, msg: Msg, de: string, sortear: () => number = Math.random): Passo {
  switch (msg.t) {
    case "status": {
      const anterior = partida.outro;
      let nova: Partida = { ...partida, outro: { id: de, p: msg.p, fase: msg.fase } };
      if (nova.papel === "convidado" && msg.regras) nova = { ...nova, regras: msg.regras };
      const enviar: Msg[] = [];
      const mudou = !anterior || anterior.id !== de || anterior.p !== msg.p || anterior.fase !== msg.fase;
      if (mudou) enviar.push(statusDe(nova));
      if (nova.papel === "criador" && msg.p === nova.p && msg.fase === "pronto") {
        if (nova.fase === "pronto") {
          const r = comecar(nova, sortear() < 0.5 ? nova.meuId : de);
          return { partida: r.partida, enviar: [...enviar.filter((m) => m.t !== "status"), ...r.enviar] };
        }
        // o outro não ficou sabendo quem começa: manda de novo
        if (nova.quemComeca && (nova.fase === "jogando" || nova.fase === "fim")) {
          enviar.push({ t: "comeca", p: nova.p, quem: nova.quemComeca, regras: nova.regras });
        }
      }
      if (nova.pendente && msg.p === nova.p) enviar.push({ t: "tiro", p: nova.p, n: nova.pendente.n, casa: nova.pendente.casa });
      return { partida: nova, enviar };
    }

    case "comeca": {
      if (msg.p !== partida.p || partida.fase !== "pronto") return nada(partida);
      const nova: Partida = { ...partida, fase: "jogando", quemComeca: msg.quem, regras: msg.regras ?? partida.regras };
      return { partida: nova, enviar: [statusDe(nova)] };
    }

    case "tiro": {
      if (msg.p !== partida.p) return nada(partida);
      const k = partida.recebidos.length;
      if (msg.n <= k) {
        // tiro repetido: a resposta se perdeu no caminho, então vai a mesma de novo
        const resposta = partida.respostasDadas[msg.n - 1];
        if (!resposta || partida.recebidos[msg.n - 1] !== msg.casa) return nada(partida);
        return { partida, enviar: [{ t: "resposta", p: partida.p, n: msg.n, casa: msg.casa, resposta }] };
      }
      if (msg.n !== k + 1 || partida.fase !== "jogando") return nada(partida);
      const resposta = responderTiro(partida.frota, partida.recebidos, msg.casa);
      if (resposta.tipo === "repetido") return nada(partida);
      const perdi = resposta.tipo === "afundou" && resposta.fimDeJogo;
      const nova: Partida = {
        ...partida,
        recebidos: [...partida.recebidos, msg.casa],
        respostasDadas: [...partida.respostasDadas, resposta],
        ...(perdi ? { fase: "fim" as const, resultado: "perdi" as const } : {}),
        ultimo: { tipo: "tiro-dele", casa: msg.casa, resposta },
      };
      return { partida: nova, enviar: [{ t: "resposta", p: nova.p, n: msg.n, casa: msg.casa, resposta }] };
    }

    case "resposta": {
      const pend = partida.pendente;
      if (msg.p !== partida.p || !pend || msg.n !== pend.n || msg.casa !== pend.casa) return nada(partida);
      const r = msg.resposta;
      let tiros: Record<number, MarcaTiro> = { ...partida.tiros };
      let deduzidas = partida.deduzidas.filter((d) => d !== msg.casa);
      let afundadosDele = partida.afundadosDele;
      if (r.tipo === "agua" || r.tipo === "repetido") tiros[msg.casa] = "agua";
      else if (r.tipo === "acertou") tiros[msg.casa] = "acerto";
      else {
        tiros[msg.casa] = "acerto";
        const grupo = grupoDeAcertos(tiros, msg.casa);
        tiros = { ...tiros };
        for (const c of grupo) tiros[c] = "afundou";
        const marcadas = new Set(Object.keys(tiros).map(Number));
        deduzidas = [...new Set([...deduzidas.filter((d) => !marcadas.has(d)), ...aguaEmVolta(grupo, marcadas)])];
        afundadosDele = [...afundadosDele, { navioId: r.navioId, casas: grupo }];
      }
      const venci = r.tipo === "afundou" && r.fimDeJogo;
      const nova: Partida = {
        ...partida,
        tiros,
        deduzidas,
        afundadosDele,
        ordemTiros: [...partida.ordemTiros, msg.casa],
        respostasMeus: [...partida.respostasMeus, r],
        pendente: null,
        ...(venci ? { fase: "fim" as const, resultado: "venci" as const } : {}),
        ultimo: { tipo: "meu-tiro", casa: msg.casa, resposta: r },
      };
      return { partida: nova, enviar: venci ? [statusDe(nova)] : [] };
    }
  }
}

/** Confere se o que veio pela rede tem o formato de uma mensagem do jogo (nunca confie no que chega). */
export function ehMensagem(x: unknown): x is Msg {
  const m = x as Record<string, unknown> | null;
  if (!m || typeof m !== "object" || typeof m.p !== "number") return false;
  const casaOk = (c: unknown) => typeof c === "number" && Number.isInteger(c) && c >= 0 && c < 100;
  switch (m.t) {
    case "status":
      return typeof m.fase === "string" && ["montando", "pronto", "jogando", "fim"].includes(m.fase);
    case "comeca":
      return typeof m.quem === "string" && typeof m.regras === "object" && m.regras !== null;
    case "tiro":
      return typeof m.n === "number" && casaOk(m.casa);
    case "resposta":
      return typeof m.n === "number" && casaOk(m.casa) && typeof m.resposta === "object" && m.resposta !== null;
    default:
      return false;
  }
}
