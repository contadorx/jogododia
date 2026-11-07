/**
 * A conexão da partida à distância: entrar numa sala, mandar e receber mensagens e saber quem está lá.
 * As regras do que fazer com cada mensagem ficam em lib/protocolo.ts.
 *
 * Usa o Realtime do Supabase (broadcast para as jogadas e presence para saber quem está na sala).
 * Nada é gravado em tabela. O código do Supabase só é baixado quando alguém abre uma sala.
 *
 * Para testar no computador sem o Supabase, existe um retransmissor local (scripts/relay-de-teste.mjs):
 * abra o site em localhost com ?relay=ws://localhost:8787. Fora do localhost isso é ignorado.
 */
import { SITE } from "@/config/site";
import { ehMensagem, type Msg } from "./protocolo";

/** Letras e números sem os que se confundem (O e 0, I e 1). */
export const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const TEMPO_REAL_ATIVO = Boolean(SITE.tempoReal.url && SITE.tempoReal.chave);

export function novoCodigo(): string {
  const n = new Uint32Array(6);
  crypto.getRandomValues(n);
  return Array.from(n, (x) => ALFABETO[x % ALFABETO.length]).join("");
}

/** Aceita "abc 234", "ABC-234" etc. Devolve o código limpo ou null. */
export function lerCodigo(texto: string): string | null {
  const t = texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-HJ-NP-Z2-9]{6}$/.test(t) ? t : null;
}

export function novoId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const n = new Uint32Array(4);
  crypto.getRandomValues(n);
  return Array.from(n, (x) => x.toString(16)).join("-");
}

export function linkDaSala(codigo: string): string {
  return `${window.location.origin}/jogos/batalha-naval/jogar/?sala=${codigo}`;
}

/**
 * Confere se o modo à distância está no ar, lendo a tabela de status. A leitura também conta como
 * uso do projeto, o que ajuda o plano gratuito do Supabase a não pausar.
 */
export async function servidorNoAr(): Promise<boolean> {
  if (relayDeTeste()) return true;
  try {
    const resposta = await fetch(`${SITE.tempoReal.url}/rest/v1/status?select=ok&id=eq.1`, {
      headers: { apikey: SITE.tempoReal.chave },
      cache: "no-store",
    });
    if (!resposta.ok) return false;
    const dados = (await resposta.json()) as { ok?: boolean }[];
    return Array.isArray(dados) && dados[0]?.ok === true;
  } catch {
    return false;
  }
}

export type EstadoConexao = "conectando" | "conectado" | "caiu";
export type Membro = { id: string; desde: number };

export type Eventos = {
  aoMensagem: (msg: Msg, de: string) => void;
  /** Quem está na sala agora (inclui você). */
  aoPresenca: (membros: Membro[]) => void;
  aoEstado: (estado: EstadoConexao, detalhe?: string) => void;
};

export type Conexao = { enviar: (msg: Msg) => void; sair: () => void };

export async function entrar(codigo: string, meuId: string, eventos: Eventos): Promise<Conexao> {
  const relay = relayDeTeste();
  return relay ? entrarNoRelay(relay, codigo, meuId, eventos) : entrarNoSupabase(codigo, meuId, eventos);
}

async function entrarNoSupabase(codigo: string, meuId: string, eventos: Eventos): Promise<Conexao> {
  eventos.aoEstado("conectando");
  const { createClient } = await import("@supabase/supabase-js");
  const cliente = createClient(SITE.tempoReal.url, SITE.tempoReal.chave, {
    // sem login: nada de sessão guardada no aparelho
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const desde = Date.now();
  const canal = cliente.channel(`batalha-${codigo}`, {
    config: { broadcast: { self: false }, presence: { key: meuId } },
  });

  canal
    .on("broadcast", { event: "jogo" }, ({ payload }) => {
      const p = payload as { de?: unknown; msg?: unknown } | null;
      if (p && typeof p.de === "string" && p.de !== meuId && ehMensagem(p.msg)) eventos.aoMensagem(p.msg, p.de);
    })
    .on("presence", { event: "sync" }, () => {
      const estado = canal.presenceState<{ desde?: number }>();
      eventos.aoPresenca(
        Object.entries(estado).map(([id, presencas]) => ({ id, desde: Number(presencas[0]?.desde) || Date.now() })),
      );
    })
    .subscribe((status, erro) => {
      if (status === "SUBSCRIBED") {
        eventos.aoEstado("conectado");
        // a cada (re)conexão, avisa de novo que está na sala
        void canal.track({ desde });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        eventos.aoEstado("caiu", erro?.message);
      }
    });

  return {
    enviar: (msg) => {
      void canal.send({ type: "broadcast", event: "jogo", payload: { de: meuId, msg } });
    },
    sair: () => {
      void cliente.removeChannel(canal);
    },
  };
}

/** Retransmissor local de teste: só vale em localhost, com ?relay=ws://localhost:PORTA. */
function relayDeTeste(): string | null {
  if (typeof window === "undefined") return null;
  if (!["localhost", "127.0.0.1"].includes(window.location.hostname)) return null;
  const relay = new URLSearchParams(window.location.search).get("relay");
  return relay && /^ws:\/\/(localhost|127\.0\.0\.1):\d+$/.test(relay) ? relay : null;
}

async function entrarNoRelay(url: string, codigo: string, meuId: string, eventos: Eventos): Promise<Conexao> {
  eventos.aoEstado("conectando");
  let ws: WebSocket | null = null;
  let saiu = false;
  const conectar = () => {
    ws = new WebSocket(`${url}/?sala=${codigo}&id=${encodeURIComponent(meuId)}`);
    ws.onopen = () => eventos.aoEstado("conectado");
    ws.onclose = () => {
      if (saiu) return;
      eventos.aoEstado("caiu");
      setTimeout(conectar, 1000);
    };
    ws.onmessage = (e) => {
      const d = JSON.parse(String(e.data)) as { tipo: string; membros?: Membro[]; de?: string; msg?: unknown };
      if (d.tipo === "presenca" && d.membros) eventos.aoPresenca(d.membros);
      else if (d.tipo === "msg" && typeof d.de === "string" && d.de !== meuId && ehMensagem(d.msg)) eventos.aoMensagem(d.msg, d.de);
    };
  };
  conectar();
  return {
    enviar: (msg) => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ tipo: "msg", de: meuId, msg }));
    },
    sair: () => {
      saiu = true;
      ws?.close();
    },
  };
}
