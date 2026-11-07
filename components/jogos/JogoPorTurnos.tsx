"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHAVES, chaveDaSala, gravar, jogoDaSalaGuardada, ler, salasGuardadas } from "@/lib/armazenamento";
import { reproduzir, type Lado, type Motor } from "@/lib/jogos/motor";
import {
  ehMsgT,
  jogarT,
  meuLado as ladoDe,
  novaSalaT,
  receberT,
  reenviarT,
  revancheT,
  type MsgT,
  type PartidaT,
  type PassoT,
} from "@/lib/jogos/turnos";
import { evento } from "@/lib/metricas";
import {
  TEMPO_REAL_ATIVO,
  entrar,
  lerCodigo,
  linkDaSala,
  novoCodigo,
  novoId,
  servidorNoAr,
  type Conexao,
  type EstadoConexao,
  type Membro,
} from "@/lib/sala";
import { Desfazer, Seta } from "../Icones";
import { PRINCIPAL, SECUNDARIO } from "../batalha/Montagem";
import { BarraDaSala, ConviteDaSala, Conversa, SalaDeOutroJogo } from "./PecasDaSala";

/** O que o tabuleiro de cada jogo recebe. */
export type PropsTabuleiro<E, J> = {
  estado: E;
  /** Quem joga neste aparelho: um lado (à distância) ou "ambos" (mesmo aparelho). */
  jogador: Lado | "ambos";
  /** Pode tocar para jogar agora. */
  podeJogar: boolean;
  aoJogar: (j: J) => void;
  /** Última jogada feita, para destacar. */
  ultima: J | null;
  /** Identifica a partida (muda a cada partida nova), para o tabuleiro guardar coisas só dele, como um código secreto. */
  idPartida: string;
};

/** Como cada lado aparece na tela. Os textos vêm prontos porque o português muda com a peça. */
export type InfoLado = {
  /** Cor da bolinha. */
  cor: string;
  /** "Vez do vermelho", "Vez das brancas". */
  vez: string;
  /** "Vitória do vermelho!" */
  vitoria: string;
  /** "Você joga com as vermelhas." */
  voce: string;
};

export type ConfigJogo<E, J> = {
  motor: Motor<E, J>;
  /** Nome do jogo (para o convite). */
  nome: string;
  lados: [InfoLado, InfoLado];
  Tabuleiro: React.ComponentType<PropsTabuleiro<E, J>>;
  /** Lembrete curto da regra principal, embaixo do tabuleiro. */
  lembrete?: string;
  /** Aviso que depende da partida (ex.: "o outro está sem sementes"), em destaque. */
  aviso?: (e: E) => string | null;
  /** Placar para mostrar durante e no fim (ex.: "Vermelho 25 x 23 Amarelo"). */
  placar?: (e: E) => string | null;
  /** Esconde o Desfazer (jogos em que o aparelho joga sozinho uma parte, como responder a um palpite). */
  semDesfazer?: boolean;
};

type Modo = "mesmo" | "distancia";

const Bolinha = ({ cor }: { cor: string }) => (
  <span aria-hidden="true" className="inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-tinta/30" style={{ background: cor }} />
);

/**
 * Página de jogar de um jogo por turnos: escolhe o modo e cuida do endereço (?sala=CODIGO) no modo à
 * distância. Cada jogo entra só com a sua configuração (regras + tabuleiro).
 */
export function JogoPorTurnos<E, J>({ config, conversa }: { config: ConfigJogo<E, J>; conversa: readonly string[] }) {
  const [pronto, setPronto] = useState(false);
  const [modo, setModo] = useState<Modo>("mesmo");
  const [sala, setSala] = useState<string | null>(null);

  useEffect(() => {
    const lerEndereco = () => {
      const codigo = lerCodigo(new URLSearchParams(window.location.search).get("sala") ?? "");
      setSala(codigo);
      if (codigo) setModo("distancia");
      return codigo;
    };
    const codigo = lerEndereco();
    if (!codigo && TEMPO_REAL_ATIVO) setModo(ler<string>(CHAVES.modo) === "distancia" ? "distancia" : "mesmo");
    setPronto(true);
    window.addEventListener("popstate", lerEndereco);
    return () => window.removeEventListener("popstate", lerEndereco);
  }, []);

  const irParaSala = (codigo: string | null) => {
    const url = new URL(window.location.href);
    if (codigo) url.searchParams.set("sala", codigo);
    else url.searchParams.delete("sala");
    window.history.pushState(null, "", url);
    setSala(codigo);
    window.scrollTo({ top: 0 });
  };

  if (!pronto) return <div aria-busy="true" className="min-h-[60vh]" />;

  const MODOS: { id: Modo; nome: string; explica: string }[] = [
    { id: "mesmo", nome: "No mesmo aparelho", explica: "Os dois no mesmo celular ou tablet, com a tela entre vocês." },
    { id: "distancia", nome: "À distância", explica: "Cada um na sua casa, com o código de uma sala." },
  ];

  return (
    <div className="flex flex-col gap-4">
      {TEMPO_REAL_ATIVO && !sala ? (
        <div className="flex flex-col gap-1.5">
          <div role="tablist" aria-label="Como vocês vão jogar" className="flex gap-1 rounded-2xl bg-painel p-1">
            {MODOS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={modo === m.id}
                onClick={() => {
                  setModo(m.id);
                  gravar(CHAVES.modo, m.id === "mesmo" ? "frente" : "distancia");
                }}
                className={`min-h-11 flex-1 rounded-xl text-[15px] font-bold ${modo === m.id ? "bg-white text-tinta shadow-sm" : "text-suave"}`}
              >
                {m.nome}
              </button>
            ))}
          </div>
          <p className="m-0 text-sm text-suave">{MODOS.find((m) => m.id === modo)?.explica}</p>
        </div>
      ) : null}

      {modo === "mesmo" || !TEMPO_REAL_ATIVO ? (
        <MesmoAparelho config={config} conversa={conversa} />
      ) : sala ? (
        <SalaPorTurnos key={sala} config={config} codigo={sala} conversa={conversa} aoSair={() => irParaSala(null)} />
      ) : (
        <EntradaPorTurnos config={config} aoEntrar={irParaSala} />
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------- mesmo aparelho

function MesmoAparelho<E, J>({ config, conversa }: { config: ConfigJogo<E, J>; conversa: readonly string[] }) {
  const { motor, lados, Tabuleiro } = config;
  const chave = `jdd.local.${motor.id}`;
  const [jogadas, setJogadas] = useState<J[]>([]);
  const [id, setId] = useState("");
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    const salvo = ler<{ v: 1; jogadas: unknown[]; id?: string }>(chave);
    setId(typeof salvo?.id === "string" ? salvo.id : novoId());
    if (salvo?.v === 1 && Array.isArray(salvo.jogadas) && salvo.jogadas.every((j) => motor.ehJogada(j))) {
      // confere de novo que a lista inteira vale (versões antigas, edição manual)
      try {
        let e = motor.inicial();
        for (const j of salvo.jogadas as J[]) {
          if (!motor.valida(e, j)) throw new Error("jogada inválida");
          e = motor.aplicar(e, j);
        }
        setJogadas(salvo.jogadas as J[]);
      } catch {
        /* começa do zero */
      }
    }
    setCarregado(true);
  }, [chave, motor]);

  useEffect(() => {
    if (carregado) gravar(chave, { v: 1, jogadas, id });
  }, [chave, jogadas, id, carregado]);

  const estado = useMemo(() => reproduzir(motor, jogadas), [motor, jogadas]);
  if (!carregado) return <div aria-busy="true" className="min-h-[50vh]" />;

  const resultado = motor.resultado(estado);
  const vez = motor.vez(estado);
  const placar = config.placar?.(estado) ?? null;
  const aviso = resultado ? null : (config.aviso?.(estado) ?? null);

  const jogar = (j: J) => {
    if (resultado || !motor.valida(estado, j)) return;
    if (jogadas.length === 0) evento("partida_iniciada", { jogo: motor.id, modo: "mesmo-aparelho" });
    const novas = [...jogadas, j];
    setJogadas(novas);
    const r = motor.resultado(motor.aplicar(estado, j));
    if (r) evento("partida_terminada", { jogo: motor.id, modo: "mesmo-aparelho", resultado: r.vencedor === null ? "empate" : `lado-${r.vencedor}` });
  };

  const nova = (perguntar: boolean) => {
    if (perguntar && jogadas.length > 0 && !resultado && !window.confirm("Começar uma partida nova? A atual será apagada.")) return;
    setJogadas([]);
    setId(novoId());
  };

  return (
    <div className="flex flex-col gap-3">
      <div role="status" className={`flex min-h-[64px] flex-col justify-center gap-0.5 rounded-2xl p-3.5 ${resultado ? "bg-azul text-white" : "bg-painel"}`}>
        {resultado ? (
          <>
            <p className="aparece m-0 font-display text-[24px] font-extrabold leading-tight">
              {resultado.vencedor === null ? "Empate!" : lados[resultado.vencedor].vitoria}
            </p>
            {resultado.motivo ? <p className="m-0 text-[15px] text-white/90">{maiusculaInicial(resultado.motivo)}.</p> : null}
          </>
        ) : (
          <p className="m-0 flex items-center gap-2 text-[17px]">
            <Bolinha cor={lados[vez].cor} />
            <strong>{lados[vez].vez}</strong>
          </p>
        )}
        {placar ? <p className={`m-0 text-sm ${resultado ? "text-white/90" : "text-suave"}`}>{placar}</p> : null}
      </div>

      <Tabuleiro estado={estado} jogador="ambos" podeJogar={!resultado} aoJogar={jogar} ultima={jogadas.at(-1) ?? null} idPartida={id} />

      {aviso ? (
        <p role="note" className="m-0 rounded-2xl bg-sol-claro p-3 text-[15px] font-bold">
          {aviso}
        </p>
      ) : null}
      {config.lembrete && !resultado ? <p className="m-0 text-sm text-suave">{config.lembrete}</p> : null}

      {resultado ? (
        <>
          <Conversa perguntas={conversa} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => nova(false)} className={`${PRINCIPAL} sm:flex-1`}>
              Jogar de novo
            </button>
            <Link href="/" className={`${SECUNDARIO} no-underline`}>
              Ver outros jogos
            </Link>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {config.semDesfazer ? null : (
            <button type="button" onClick={() => setJogadas(jogadas.slice(0, -1))} disabled={jogadas.length === 0} className={`${SECUNDARIO} min-h-11`}>
              <Desfazer />
              Desfazer
            </button>
          )}
          <button type="button" onClick={() => nova(true)} className="min-h-11 px-2 text-[15px] font-bold text-suave underline underline-offset-2">
            Nova partida
          </button>
        </div>
      )}
    </div>
  );
}

const maiusculaInicial = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// ------------------------------------------------------------------------------- entrada da sala

type SalvoT<J> = { v: 1; jogo: string; partida: PartidaT<J>; atualizado: number };

function salvoValido<J>(x: unknown, codigo: string): x is SalvoT<J> {
  const s = x as SalvoT<J> | null;
  return !!s && s.v === 1 && typeof s.jogo === "string" && !!s.partida && s.partida.codigo === codigo && Array.isArray(s.partida.jogadas);
}

function EntradaPorTurnos<E, J>({ config, aoEntrar }: { config: ConfigJogo<E, J>; aoEntrar: (codigo: string) => void }) {
  const { motor } = config;
  const [noAr, setNoAr] = useState<"verificando" | "sim" | "nao">("verificando");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [guardadas, setGuardadas] = useState<{ codigo: string; fase: string; atualizado: number }[]>([]);

  const verificar = useCallback(() => {
    setNoAr("verificando");
    servidorNoAr().then((ok) => setNoAr(ok ? "sim" : "nao"));
  }, []);

  useEffect(() => {
    verificar();
    setGuardadas(
      salasGuardadas()
        .map((codigo) => ({ codigo, salvo: ler<SalvoT<J>>(chaveDaSala(codigo)) }))
        .filter((x): x is { codigo: string; salvo: SalvoT<J> } => salvoValido<J>(x.salvo, x.codigo) && x.salvo.jogo === motor.id)
        .map(({ codigo, salvo }) => ({ codigo, fase: salvo.partida.fase, atualizado: salvo.atualizado }))
        .sort((a, b) => b.atualizado - a.atualizado)
        .slice(0, 3),
    );
  }, [verificar, motor.id]);

  const criar = () => {
    const codigo = novoCodigo();
    gravar(chaveDaSala(codigo), { v: 1, jogo: motor.id, partida: novaSalaT<J>(motor.id, codigo, "criador", novoId()), atualizado: Date.now() });
    evento("sala_criada", { jogo: motor.id });
    aoEntrar(codigo);
  };

  const FASES: Record<string, string> = { esperando: "esperando o outro", jogando: "partida em andamento", fim: "partida terminada" };

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] text-suave">
        Um cria a sala e manda o código; o outro entra. Sem cadastro e sem chat: só as jogadas passam pela internet.
      </p>

      {noAr === "verificando" ? (
        <p role="status" className="m-0 rounded-2xl bg-painel p-3.5 text-[15px]">
          Conferindo se o modo à distância está no ar…
        </p>
      ) : noAr === "nao" ? (
        <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-alerta-claro p-3.5 text-[15px] text-alerta">
          <p className="m-0 font-bold">O modo à distância não respondeu agora.</p>
          <p className="m-0">Pode ser a internet deste aparelho ou o servidor. Tente de novo em alguns minutos, ou joguem no mesmo aparelho.</p>
          <button type="button" onClick={verificar} className={`${SECUNDARIO} self-start`}>
            Tentar de novo
          </button>
        </div>
      ) : null}

      <button type="button" onClick={criar} disabled={noAr !== "sim"} className={PRINCIPAL}>
        Criar sala
        <Seta />
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const codigo = lerCodigo(texto);
          if (!codigo) setErro("O código tem 6 letras e números, como K7P2QX.");
          else aoEntrar(codigo);
        }}
        className="flex flex-col gap-2 rounded-2xl border border-borda p-4"
      >
        <label htmlFor="codigo" className="text-[15px] font-bold">
          Entrar com o código que o outro mandou
        </label>
        <div className="flex gap-2">
          <input
            id="codigo"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value.toUpperCase());
              setErro(null);
            }}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={9}
            placeholder="K7P2QX"
            aria-invalid={erro ? true : undefined}
            className="min-h-[50px] w-full min-w-0 flex-1 rounded-2xl border border-borda px-4 font-display text-[22px] font-extrabold tracking-[0.15em] uppercase placeholder:text-borda"
          />
          <button type="submit" disabled={noAr !== "sim"} className={PRINCIPAL}>
            Entrar
          </button>
        </div>
        {erro ? <p className="m-0 text-sm font-bold text-alerta">{erro}</p> : null}
      </form>

      {guardadas.length > 0 ? (
        <section aria-labelledby="guardadas" className="flex flex-col gap-2">
          <h3 id="guardadas" className="m-0 text-[15px] font-bold text-suave">
            Salas guardadas neste aparelho
          </h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {guardadas.map((g) => (
              <li key={g.codigo}>
                <button type="button" onClick={() => aoEntrar(g.codigo)} className={`${SECUNDARIO} w-full justify-between`}>
                  <span className="font-display tracking-[0.1em]">{g.codigo}</span>
                  <span className="text-sm font-normal text-suave">{FASES[g.fase] ?? g.fase}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------------------- sala

function SalaPorTurnos<E, J>({
  config,
  codigo,
  conversa,
  aoSair,
}: {
  config: ConfigJogo<E, J>;
  codigo: string;
  conversa: readonly string[];
  aoSair: () => void;
}) {
  const { motor, lados, Tabuleiro } = config;
  const [salvo, setSalvo] = useState<SalvoT<J> | null>(null);
  const [outroJogo, setOutroJogo] = useState<string | null>(null);
  const ref = useRef<SalvoT<J> | null>(null);
  const conexao = useRef<Conexao<MsgT<J>> | null>(null);
  const membrosRef = useRef<Membro[]>([]);
  const [conexaoEstado, setConexaoEstado] = useState<EstadoConexao>("conectando");
  const [membros, setMembros] = useState<Membro[]>([]);
  const [cheia, setCheia] = useState(false);

  const guardar = useCallback(
    (s: SalvoT<J>) => {
      ref.current = s;
      setSalvo(s);
      gravar(chaveDaSala(codigo), s);
    },
    [codigo],
  );

  const enviar = useCallback((msgs: MsgT<J>[]) => {
    for (const m of msgs) conexao.current?.enviar(m);
  }, []);

  const aplicar = useCallback(
    (passo: PassoT<J>) => {
      const atual = ref.current;
      if (!atual) return;
      const antes = atual.partida;
      guardar({ ...atual, partida: passo.partida, atualizado: Date.now() });
      enviar(passo.enviar);
      const depois = passo.partida;
      if (antes.fase !== "jogando" && depois.fase === "jogando") evento("partida_iniciada", { jogo: motor.id, modo: "distancia" });
      if (antes.fase !== "fim" && depois.fase === "fim") evento("partida_terminada", { jogo: motor.id, modo: "distancia" });
    },
    [enviar, guardar, motor.id],
  );

  useEffect(() => {
    const dono = jogoDaSalaGuardada(codigo);
    if (dono && dono !== motor.id) {
      setOutroJogo(dono);
      return;
    }
    const guardado = ler<SalvoT<J>>(chaveDaSala(codigo));
    const s: SalvoT<J> = salvoValido<J>(guardado, codigo)
      ? guardado
      : { v: 1, jogo: motor.id, partida: novaSalaT<J>(motor.id, codigo, "convidado", novoId()), atualizado: Date.now() };
    guardar(s);
    evento("sala_aberta", { jogo: motor.id, papel: s.partida.papel });
  }, [codigo, guardar, motor.id]);

  const carregado = salvo !== null;

  useEffect(() => {
    if (!carregado || !ref.current) return;
    let ativo = true;
    const meuId = ref.current.partida.meuId;
    entrar<MsgT<J>>(
      codigo,
      meuId,
      {
        aoMensagem: (msg, de) => {
          if (ativo && ref.current) aplicar(receberT(motor, ref.current.partida, msg, de));
        },
        aoPresenca: (lista) => {
          if (!ativo) return;
          membrosRef.current = lista;
          setMembros(lista);
          const primeiros = [...lista].sort((a, b) => a.desde - b.desde || a.id.localeCompare(b.id)).slice(0, 2);
          if (lista.length > 2 && !primeiros.some((m) => m.id === meuId)) {
            setCheia(true);
            conexao.current?.sair();
            return;
          }
          if (ref.current && lista.some((m) => m.id !== meuId)) enviar(reenviarT(ref.current.partida));
        },
        aoEstado: (estado) => {
          if (!ativo) return;
          setConexaoEstado(estado);
          if (estado === "conectado" && ref.current) enviar(reenviarT(ref.current.partida));
        },
      },
      { canal: motor.id, validar: (x): x is MsgT<J> => ehMsgT(x, motor.ehJogada) },
    )
      .then((c) => {
        if (ativo) conexao.current = c;
        else c.sair();
      })
      .catch(() => {
        if (ativo) setConexaoEstado("caiu");
      });
    return () => {
      ativo = false;
      conexao.current?.sair();
      conexao.current = null;
    };
  }, [codigo, carregado, aplicar, enviar, motor]);

  // de tempos em tempos, conta como está: quem estiver atrasado recebe o que falta
  useEffect(() => {
    const t = setInterval(() => {
      const p = ref.current?.partida;
      if (p && p.fase !== "fim" && membrosRef.current.some((m) => m.id !== p.meuId)) enviar(reenviarT(p));
    }, 4000);
    return () => clearInterval(t);
  }, [enviar]);

  // só refaz o estado quando a lista de jogadas muda (as mensagens de status trocam o objeto salvo, mas
  // não as jogadas; refazer à toa apagaria a peça que a pessoa acabou de selecionar no tabuleiro)
  const jogadas = salvo?.partida.jogadas;
  const estado = useMemo(() => (jogadas ? reproduzir(motor, jogadas) : null), [motor, jogadas]);

  if (outroJogo) return <SalaDeOutroJogo codigo={codigo} jogo={outroJogo} aoSair={aoSair} />;
  if (cheia) {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-alerta-claro p-4 text-alerta">
        <p className="m-0 font-bold">Esta sala já tem dois jogadores.</p>
        <p className="m-0">Confira o código com quem mandou, ou crie uma sala nova.</p>
        <button type="button" onClick={aoSair} className={`${SECUNDARIO} self-start`}>
          Voltar
        </button>
      </div>
    );
  }
  if (!salvo || !estado) return <div aria-busy="true" className="min-h-[60vh]" />;

  const p = salvo.partida;
  const lado = ladoDe(p);
  const outroPresente = membros.some((m) => m.id !== p.meuId);
  const resultado = motor.resultado(estado);
  const vez = motor.vez(estado);
  const minhaVez = p.fase === "jogando" && !resultado && lado !== null && vez === lado;
  const placar = config.placar?.(estado) ?? null;
  const aviso = resultado ? null : (config.aviso?.(estado) ?? null);

  const sair = () => {
    if (p.fase === "jogando" && !window.confirm("Sair da sala? A partida fica guardada neste aparelho e dá para voltar pelo código.")) return;
    aoSair();
  };

  const barra = <BarraDaSala codigo={codigo} conexao={conexaoEstado} outroPresente={outroPresente} aoSair={sair} />;
  const convite =
    p.papel === "criador" && !p.outro ? <ConviteDaSala codigo={codigo} link={linkDaSala(codigo, motor.id)} nomeDoJogo={config.nome} /> : null;

  if (p.fase === "esperando" || lado === null) {
    const outroAtrasado = p.outro && p.outro.p < p.p;
    return (
      <div className="flex flex-col gap-4">
        {barra}
        {convite}
        <p role="status" className="m-0 rounded-2xl bg-painel p-3.5 text-[17px]">
          {!outroPresente
            ? "Esperando o outro jogador entrar na sala."
            : outroAtrasado
              ? "O outro ainda está vendo o fim da partida anterior."
              : "Sorteando quem começa…"}
        </p>
      </div>
    );
  }

  const outroQuerDeNovo = p.outro && p.outro.p > p.p;

  return (
    <div className="flex flex-col gap-3">
      {barra}
      <div role="status" className={`flex min-h-[72px] flex-col justify-center gap-0.5 rounded-2xl p-3.5 ${resultado ? "bg-azul text-white" : minhaVez ? "bg-sol-claro" : "bg-painel"}`}>
        {resultado ? (
          <>
            <p className="aparece m-0 font-display text-[24px] font-extrabold leading-tight">
              {resultado.vencedor === null ? "Empate!" : resultado.vencedor === lado ? "Você venceu!" : "O outro venceu."}
            </p>
            {resultado.motivo ? <p className="m-0 text-[15px] text-white/90">{maiusculaInicial(resultado.motivo)}.</p> : null}
          </>
        ) : (
          <>
            <p className="m-0 flex items-center gap-2 text-[17px]">
              <Bolinha cor={lados[lado].cor} />
              <span>{lados[lado].voce}</span>
            </p>
            <p className="m-0 text-[15px]">{minhaVez ? <strong>Sua vez.</strong> : "Vez do outro. Ele está pensando…"}</p>
          </>
        )}
        {placar ? <p className={`m-0 text-sm ${resultado ? "text-white/90" : "text-suave"}`}>{placar}</p> : null}
      </div>

      <Tabuleiro
        estado={estado}
        jogador={lado}
        podeJogar={minhaVez}
        aoJogar={(j) => {
          // a partida mais nova (pode ter chegado mensagem depois do último desenho da tela)
          if (ref.current) aplicar(jogarT(motor, ref.current.partida, j));
        }}
        ultima={p.jogadas.at(-1) ?? null}
        idPartida={`${codigo}-${p.p}`}
      />

      {aviso ? (
        <p role="note" className="m-0 rounded-2xl bg-sol-claro p-3 text-[15px] font-bold">
          {aviso}
        </p>
      ) : null}
      {config.lembrete && !resultado ? <p className="m-0 text-sm text-suave">{config.lembrete}</p> : null}

      {resultado ? (
        <>
          <Conversa perguntas={conversa} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => aplicar(revancheT(p))} className={`${PRINCIPAL} sm:flex-1`}>
              {outroQuerDeNovo ? "O outro quer revanche: jogar de novo" : "Jogar de novo"}
            </button>
            <Link href="/" className={`${SECUNDARIO} no-underline`}>
              Ver outros jogos
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
