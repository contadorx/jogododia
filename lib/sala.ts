/**
 * A conexão da partida à distância: entrar numa sala, mandar e receber mensagens e saber quem está lá.
 * As regras do que fazer com cada mensagem ficam em lib/protocolo.ts (batalha naval), lib/jogos/turnos.ts
 * e lib/jogos/stop.ts.
 *
 * Usa o Realtime do Supabase (broadcast para as jogadas e presence para saber quem está na sala).
 * Nada é gravado em tabela. O código do Supabase só é baixado quando alguém abre uma sala.
 *
 * Quando a conexão cai (internet fraca, tela apagada, outro app na frente), a sala volta sozinha:
 * - um sinal de vida vai ao servidor a cada 10 segundos; sem resposta, a conexão é refeita;
 * - cada mensagem pede confirmação do servidor; duas seguidas sem confirmação, a conexão é refeita;
 * - quando a página volta a aparecer depois de uns segundos escondida, ou a internet volta, abre uma
 *   conexão nova na hora, sem esperar o sinal de vida falhar (no celular, a conexão antiga costuma
 *   ter morrido sem avisar);
 * - a tela da sala tem o botão "Tentar agora", que faz o mesmo.
 * Ao voltar, a sala conta ao outro como está, e quem estiver atrasado recebe o que falta.
 *
 * Para testar no computador sem o Supabase, existe um retransmissor local (scripts/relay-de-teste.mjs):
 * abra o site em localhost com ?relay=ws://localhost:8787. Fora do localhost isso é ignorado.
 */
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { SITE } from "@/config/site";

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

export function linkDaSala(codigo: string, jogo = "batalha-naval"): string {
  return `${window.location.origin}/jogos/${jogo}/jogar/?sala=${codigo}`;
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

export type Eventos<M> = {
  aoMensagem: (msg: M, de: string) => void;
  /** Quem está na sala agora (inclui você). */
  aoPresenca: (membros: Membro[]) => void;
  aoEstado: (estado: EstadoConexao, detalhe?: string) => void;
};

/** `reconectar`: abre uma conexão nova na hora (o botão "Tentar agora" da sala). */
export type Conexao<M> = { enviar: (msg: M) => void; reconectar: () => void; sair: () => void };

/** `canal`: um por jogo (a mesma sala nunca mistura jogos). `validar`: confere o que chega pela rede. */
export type Opcoes<M> = { canal: string; validar: (x: unknown) => x is M };

/** Escondida por mais que isso (tela apagada, outro app), a página abre uma conexão nova ao voltar. */
const ESCONDIDA_MS = 5_000;
/** Duas reconexões forçadas nunca ficam mais perto que isso. */
const ENTRE_RECONEXOES_MS = 3_000;

export async function entrar<M>(codigo: string, meuId: string, eventos: Eventos<M>, opcoes: Opcoes<M>): Promise<Conexao<M>> {
  const relay = relayDeTeste();
  return relay ? entrarNoRelay(relay, codigo, meuId, eventos, opcoes) : entrarNoSupabase(codigo, meuId, eventos, opcoes);
}

/**
 * Avisa quando vale conferir a conexão: a página voltou a aparecer (`longe` = ficou escondida tempo
 * bastante para a conexão ter morrido), a internet voltou ou a página saiu do cache do navegador.
 * Devolve a função que para de vigiar.
 */
function vigiarVolta(aoVoltar: (longe: boolean) => void): () => void {
  let escondidaDesde: number | null = document.visibilityState === "hidden" ? Date.now() : null;
  const aoMudar = () => {
    if (document.visibilityState === "hidden") {
      escondidaDesde ??= Date.now();
      return;
    }
    if (escondidaDesde === null) return;
    const tempo = Date.now() - escondidaDesde;
    escondidaDesde = null;
    aoVoltar(tempo >= ESCONDIDA_MS);
  };
  const aoOnline = () => aoVoltar(true);
  const aoMostrar = (e: PageTransitionEvent) => {
    if (e.persisted) aoVoltar(true);
  };
  document.addEventListener("visibilitychange", aoMudar);
  window.addEventListener("online", aoOnline);
  window.addEventListener("pageshow", aoMostrar);
  return () => {
    document.removeEventListener("visibilitychange", aoMudar);
    window.removeEventListener("online", aoOnline);
    window.removeEventListener("pageshow", aoMostrar);
  };
}

async function entrarNoSupabase<M>(codigo: string, meuId: string, eventos: Eventos<M>, opcoes: Opcoes<M>): Promise<Conexao<M>> {
  eventos.aoEstado("conectando");
  const { createClient } = await import("@supabase/supabase-js");
  const desde = Date.now();
  type Aberta = { cliente: SupabaseClient; canal: RealtimeChannel };
  let atual: Aberta | null = null;
  let geracao = 0;
  let abertaEm = 0;
  let semConfirmacao = 0;
  let saiu = false;

  const fechar = (velha: Aberta) => {
    // sai do canal (o outro vê na hora) e fecha a conexão; se ela já tinha morrido, só demora mais um pouco
    void velha.cliente
      .removeChannel(velha.canal)
      .catch(() => "error")
      .finally(() => void velha.cliente.realtime.disconnect());
  };

  // Cada (re)conexão forçada abre um cliente novo, com conexão nova. Mais simples e mais seguro do que
  // tentar reaproveitar uma conexão que pode ter morrido sem avisar. A antiga é fechada logo depois.
  const abrir = () => {
    const n = ++geracao;
    abertaEm = Date.now();
    semConfirmacao = 0;
    const cliente = createClient(SITE.tempoReal.url, SITE.tempoReal.chave, {
      // Sem login: a chave publicável é o próprio token (o mesmo que o Supabase usaria sem sessão).
      // Assim o cliente nem cria a parte de login, que guardaria coisas e deixaria ouvintes na página
      // a cada reconexão.
      accessToken: async () => SITE.tempoReal.chave,
      realtime: {
        // sinal de vida a cada 10 s (o padrão é 25 s): conexão morta é percebida em 10 a 20 s
        heartbeatIntervalMs: 10_000,
        reconnectAfterMs: (tentativas: number) => [500, 1000, 2000, 4000][tentativas - 1] ?? 5000,
      },
    });
    const canal = cliente.channel(`${opcoes.canal}-${codigo}`, {
      // ack: o servidor confirma cada mensagem, e assim dá para saber quando a conexão morreu
      config: { broadcast: { self: false, ack: true }, presence: { key: meuId } },
    });
    canal
      .on("broadcast", { event: "jogo" }, ({ payload }) => {
        if (saiu) return;
        const p = payload as { de?: unknown; msg?: unknown } | null;
        if (p && typeof p.de === "string" && p.de !== meuId && opcoes.validar(p.msg)) eventos.aoMensagem(p.msg, p.de);
      })
      .on("presence", { event: "sync" }, () => {
        // a lista de presença da conexão antiga pode estar velha: só vale a da atual
        if (saiu || n !== geracao) return;
        const estado = canal.presenceState<{ desde?: number }>();
        eventos.aoPresenca(
          Object.entries(estado).map(([id, presencas]) => ({ id, desde: Number(presencas[0]?.desde) || Date.now() })),
        );
      })
      .subscribe((status, erro) => {
        if (saiu || n !== geracao) return;
        if (status === "SUBSCRIBED") {
          semConfirmacao = 0;
          eventos.aoEstado("conectado");
          // a cada (re)conexão, avisa de novo que está na sala
          void canal.track({ desde });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          eventos.aoEstado("caiu", erro?.message);
        }
      });
    const velha = atual;
    atual = { cliente, canal };
    if (velha) fechar(velha);
  };

  const reconectar = () => {
    if (saiu || Date.now() - abertaEm < ENTRE_RECONEXOES_MS) return;
    eventos.aoEstado("conectando");
    abrir();
  };

  abrir();
  const pararDeVigiar = vigiarVolta((longe) => {
    const a = atual;
    if (a && (longe || !a.cliente.realtime.isConnected() || a.canal.state !== "joined")) reconectar();
  });

  return {
    enviar: (msg) => {
      const a = atual;
      // fora do canal não manda: quando a conexão volta, a sala repete o que o outro precisa saber
      if (saiu || !a || a.canal.state !== "joined") return;
      void a.canal.send({ type: "broadcast", event: "jogo", payload: { de: meuId, msg } }).then((resposta) => {
        if (saiu || a !== atual) return;
        if (resposta === "ok") semConfirmacao = 0;
        else if (++semConfirmacao >= 2) reconectar();
      });
    },
    reconectar,
    sair: () => {
      saiu = true;
      pararDeVigiar();
      if (atual) fechar(atual);
      atual = null;
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

/**
 * Mesmo comportamento do Supabase, no retransmissor local: sinal de vida (aqui, a cada 3 s, para os
 * testes andarem rápido), reconexão quando ele falha, quando a página volta e no "Tentar agora".
 */
async function entrarNoRelay<M>(url: string, codigo: string, meuId: string, eventos: Eventos<M>, opcoes: Opcoes<M>): Promise<Conexao<M>> {
  eventos.aoEstado("conectando");
  let ws: WebSocket | null = null;
  let saiu = false;
  let espera: ReturnType<typeof setTimeout> | null = null;
  let semResposta = false;

  const conectar = () => {
    if (espera) clearTimeout(espera);
    espera = null;
    semResposta = false;
    const meu = new WebSocket(`${url}/?sala=${opcoes.canal}-${codigo}&id=${encodeURIComponent(meuId)}`);
    ws = meu;
    meu.onopen = () => {
      if (ws === meu) eventos.aoEstado("conectado");
    };
    meu.onclose = () => {
      if (saiu || ws !== meu) return;
      eventos.aoEstado("caiu");
      espera = setTimeout(conectar, 1000);
    };
    meu.onmessage = (e) => {
      if (ws !== meu) return;
      const d = JSON.parse(String(e.data)) as { tipo: string; membros?: Membro[]; de?: string; msg?: unknown };
      if (d.tipo === "pong") semResposta = false;
      else if (d.tipo === "presenca" && d.membros) eventos.aoPresenca(d.membros);
      else if (d.tipo === "msg" && typeof d.de === "string" && d.de !== meuId && opcoes.validar(d.msg)) eventos.aoMensagem(d.msg, d.de);
    };
  };

  const reconectar = () => {
    if (saiu) return;
    const velho = ws;
    ws = null;
    if (velho) {
      velho.onclose = null;
      velho.close();
    }
    eventos.aoEstado("conectando");
    conectar();
  };

  const sinal = setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (semResposta) return reconectar();
    semResposta = true;
    ws.send(JSON.stringify({ tipo: "ping" }));
  }, 3000);
  conectar();
  const pararDeVigiar = vigiarVolta((longe) => {
    if (longe || !ws || ws.readyState !== WebSocket.OPEN) reconectar();
  });

  return {
    enviar: (msg) => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ tipo: "msg", de: meuId, msg }));
    },
    reconectar,
    sair: () => {
      saiu = true;
      clearInterval(sinal);
      pararDeVigiar();
      if (espera) clearTimeout(espera);
      ws?.close();
    },
  };
}
