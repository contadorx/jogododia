"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHAVES, chaveDaSala, gravar, jogoDaSalaGuardada, ler, salasGuardadas } from "@/lib/armazenamento";
import {
  CATEGORIAS_STOP,
  CONFIG_PADRAO,
  RODADAS_OPCOES,
  TEMPOS_OPCOES,
  anular,
  atual,
  comecar,
  configValida,
  ehMsgStop,
  faseDe,
  ficarPronto,
  nomeDaCategoria,
  normalizar,
  novaPartidaStop,
  parar,
  placarStop,
  pontosDaCategoria,
  problema,
  receberStop,
  reenviarStop,
  revancheStop,
  sortearLetra,
  type Config,
  type IdCategoria,
  type MsgStop,
  type PartidaStop,
  type PassoStop,
  type Respostas,
} from "@/lib/jogos/stop";
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
import { Seta } from "../Icones";
import { PRINCIPAL, SECUNDARIO } from "../batalha/Montagem";
import { BarraDaSala, ConviteDaSala, Conversa, SalaDeOutroJogo } from "./PecasDaSala";

const ID = "stop";
type Modo = "mesmo" | "distancia";

// ------------------------------------------------------------------------------- peças comuns

/** A letra da rodada, grande. Na primeira vez, gira umas letras antes de parar (sorteio). */
function Letra({ letra, girar }: { letra: string; girar: boolean }) {
  const [mostrada, setMostrada] = useState(girar ? "?" : letra);
  useEffect(() => {
    if (!girar || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setMostrada(letra);
      return;
    }
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      if (n >= 14) {
        clearInterval(t);
        setMostrada(letra);
      } else setMostrada(sortearLetra([letra]));
    }, 70);
    return () => clearInterval(t);
  }, [letra, girar]);
  return (
    <div className="flex items-center justify-center gap-4 rounded-3xl bg-azul py-4 text-white" aria-live="polite">
      <span className="text-[15px] font-bold uppercase tracking-wider text-white/80">Letra</span>
      <span className="font-display text-[64px] font-extrabold leading-none" aria-label={`Letra ${letra}`}>
        {mostrada}
      </span>
    </div>
  );
}

/** Relógio da rodada: quanto falta, a partir do início. Chama `aoAcabar` uma vez quando zera. */
function Relogio({ inicio, segundos, aoAcabar, parado }: { inicio: number; segundos: number; aoAcabar: () => void; parado: boolean }) {
  const [agora, setAgora] = useState(() => Date.now());
  const avisou = useRef(false);
  const restante = Math.max(0, Math.ceil(segundos - (agora - inicio) / 1000));
  useEffect(() => {
    if (parado) return;
    const t = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(t);
  }, [parado]);
  useEffect(() => {
    if (!parado && restante === 0 && !avisou.current) {
      avisou.current = true;
      aoAcabar();
    }
  }, [restante, parado, aoAcabar]);
  const fracao = restante / segundos;
  return (
    <div className="flex flex-col gap-1" role="timer" aria-label={`Faltam ${restante} segundos`}>
      <div className="flex items-baseline justify-between text-sm font-bold">
        <span className="text-suave">Tempo</span>
        <span className={`font-display text-[22px] ${restante <= 10 ? "text-fogo" : ""}`}>
          {Math.floor(restante / 60)}:{String(restante % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-painel">
        <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${fracao * 100}%`, background: restante <= 10 ? "var(--color-fogo)" : "var(--color-sol)" }} />
      </div>
    </div>
  );
}

/** Escolha das categorias, do número de rodadas e do tempo. */
function EscolherConfig({ config, aoMudar }: { config: Config; aoMudar: (c: Config) => void }) {
  const alternar = (id: IdCategoria) => {
    const tem = config.categorias.includes(id);
    if (tem && config.categorias.length <= 3) return;
    const categorias = tem ? config.categorias.filter((c) => c !== id) : CATEGORIAS_STOP.map((c) => c.id).filter((c) => c === id || config.categorias.includes(c));
    aoMudar({ ...config, categorias });
  };
  const Botoes = <T extends number>({ valores, valor, rotulo, aoEscolher }: { valores: readonly T[]; valor: T; rotulo: (v: T) => string; aoEscolher: (v: T) => void }) => (
    <div className="flex gap-1 rounded-2xl bg-painel p-1">
      {valores.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === valor}
          onClick={() => aoEscolher(v)}
          className={`min-h-11 flex-1 rounded-xl text-[15px] font-bold ${v === valor ? "bg-white text-tinta shadow-sm" : "text-suave"}`}
        >
          {rotulo(v)}
        </button>
      ))}
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-[15px] font-bold">Categorias (de 3 a 10)</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS_STOP.map((c) => {
            const marcada = config.categorias.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={marcada}
                onClick={() => alternar(c.id)}
                className={`min-h-10 rounded-full px-3.5 text-[15px] font-bold ring-1 ${marcada ? "bg-azul text-white ring-azul" : "bg-white text-tinta ring-borda"}`}
              >
                {c.nome}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <span className="text-[15px] font-bold">Rodadas</span>
        <Botoes valores={RODADAS_OPCOES} valor={config.total as (typeof RODADAS_OPCOES)[number]} rotulo={(v) => String(v)} aoEscolher={(total) => aoMudar({ ...config, total })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[15px] font-bold">Tempo de cada rodada</span>
        <Botoes valores={TEMPOS_OPCOES} valor={config.tempo as (typeof TEMPOS_OPCOES)[number]} rotulo={(v) => `${v / 60} min`} aoEscolher={(tempo) => aoMudar({ ...config, tempo })} />
      </div>
    </div>
  );
}

const Placar = ({ rotulos, pontos, fim }: { rotulos: [string, string]; pontos: [number, number]; fim?: boolean }) => (
  <div className={`grid grid-cols-2 gap-2 ${fim ? "" : ""}`}>
    {[0, 1].map((i) => (
      <div key={i} className={`flex flex-col items-center rounded-2xl p-3 ${i === 0 ? "bg-azul-claro" : "bg-fogo-claro"}`}>
        <span className="text-sm font-bold">{rotulos[i]}</span>
        <span className="font-display text-[30px] font-extrabold leading-tight">{pontos[i]}</span>
      </div>
    ))}
  </div>
);

const REGRA = "Palavra que vale e é diferente da do outro: 10 pontos. Igual à do outro: 5. Em branco ou que não vale: 0.";

// ------------------------------------------------------------------------------- jogar (modos)

export function JogarStop({ conversa }: { conversa: readonly string[] }) {
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
    { id: "mesmo", nome: "No mesmo aparelho", explica: "Cada um escreve no seu papel. O celular sorteia a letra, marca o tempo e ajuda a somar os pontos." },
    { id: "distancia", nome: "À distância", explica: "Cada um na sua casa, digitando no próprio celular. O site compara as respostas." },
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
        <StopNoPapel conversa={conversa} />
      ) : sala ? (
        <SalaStop key={sala} codigo={sala} conversa={conversa} aoSair={() => irParaSala(null)} />
      ) : (
        <EntradaStop aoEntrar={irParaSala} />
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------- no papel

type Escolha = "diferentes" | "iguais" | "so1" | "so2" | "nenhum";
const ESCOLHAS: { id: Escolha; rotulo: string; pontos: [number, number] }[] = [
  { id: "diferentes", rotulo: "Os dois, diferentes", pontos: [10, 10] },
  { id: "iguais", rotulo: "Os dois, iguais", pontos: [5, 5] },
  { id: "so1", rotulo: "Só o jogador 1", pontos: [10, 0] },
  { id: "so2", rotulo: "Só o jogador 2", pontos: [0, 10] },
  { id: "nenhum", rotulo: "Nenhum", pontos: [0, 0] },
];

type RodadaPapel = { letra: string; inicio: number; parado: boolean; escolhas: Partial<Record<IdCategoria, Escolha>>; somada: boolean };
type JogoPapel = { v: 1; config: Config | null; rodadas: RodadaPapel[] };
const CHAVE_PAPEL = "jdd.local.stop";

function StopNoPapel({ conversa }: { conversa: readonly string[] }) {
  const [jogo, setJogo] = useState<JogoPapel>({ v: 1, config: null, rodadas: [] });
  const [rascunho, setRascunho] = useState<Config>(CONFIG_PADRAO);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    const salvo = ler<JogoPapel>(CHAVE_PAPEL);
    if (salvo?.v === 1 && Array.isArray(salvo.rodadas) && (salvo.config === null || configValida(salvo.config))) {
      setJogo(salvo);
      if (salvo.config) setRascunho(salvo.config);
    }
    setCarregado(true);
  }, []);
  const mudar = (j: JogoPapel) => {
    setJogo(j);
    gravar(CHAVE_PAPEL, j);
  };

  if (!carregado) return <div aria-busy="true" className="min-h-[50vh]" />;

  const { config, rodadas } = jogo;
  const r = rodadas[rodadas.length - 1];
  const pontosDa = (x: RodadaPapel): [number, number] =>
    (config?.categorias ?? []).reduce<[number, number]>(
      (s, c) => {
        const e = ESCOLHAS.find((o) => o.id === x.escolhas[c]);
        return e ? [s[0] + e.pontos[0], s[1] + e.pontos[1]] : s;
      },
      [0, 0],
    );
  const total = rodadas.filter((x) => x.somada).reduce<[number, number]>((s, x) => {
    const p = pontosDa(x);
    return [s[0] + p[0], s[1] + p[1]];
  }, [0, 0]);
  const terminou = !!config && rodadas.length === config.total && !!r?.somada;

  const novaRodada = (cfg: Config, anteriores: RodadaPapel[]) => {
    const letra = sortearLetra(anteriores.map((x) => x.letra));
    if (anteriores.length === 0) evento("partida_iniciada", { jogo: ID, modo: "mesmo-aparelho" });
    mudar({ v: 1, config: cfg, rodadas: [...anteriores, { letra, inicio: Date.now(), parado: false, escolhas: {}, somada: false }] });
  };
  const atualizar = (x: RodadaPapel) => mudar({ ...jogo, rodadas: [...rodadas.slice(0, -1), x] });

  // ---------------- antes de começar
  if (!config || !r) {
    return (
      <div className="flex flex-col gap-5">
        <EscolherConfig config={rascunho} aoMudar={setRascunho} />
        <p className="m-0 text-sm text-suave">Cada um precisa de papel e lápis. Escrevam as categorias em colunas, uma linha por rodada.</p>
        <button type="button" onClick={() => novaRodada(rascunho, [])} className={PRINCIPAL}>
          Sortear a primeira letra
          <Seta />
        </button>
      </div>
    );
  }

  // ---------------- fim
  if (terminou) {
    const vencedor = total[0] === total[1] ? null : total[0] > total[1] ? 1 : 2;
    return (
      <div className="flex flex-col gap-4">
        <div role="status" className="flex flex-col gap-1 rounded-2xl bg-azul p-4 text-white">
          <p className="aparece m-0 font-display text-[24px] font-extrabold">{vencedor ? `Vitória do jogador ${vencedor}!` : "Empate!"}</p>
          <p className="m-0 text-[15px] text-white/90">
            {total[0]} a {total[1]} pontos, em {config.total} rodadas.
          </p>
        </div>
        <Placar rotulos={["Jogador 1", "Jogador 2"]} pontos={total} fim />
        <Conversa perguntas={conversa} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              evento("partida_terminada", { jogo: ID, modo: "mesmo-aparelho" });
              mudar({ v: 1, config: null, rodadas: [] });
            }}
            className={`${PRINCIPAL} sm:flex-1`}
          >
            Jogar de novo
          </button>
          <Link href="/" className={`${SECUNDARIO} no-underline`}>
            Ver outros jogos
          </Link>
        </div>
      </div>
    );
  }

  const cabecalho = (
    <p className="m-0 flex justify-between text-sm font-bold text-suave">
      <span>
        Rodada {rodadas.length} de {config.total}
      </span>
      <span>
        Jogador 1: {total[0]} · Jogador 2: {total[1]}
      </span>
    </p>
  );

  // ---------------- escrevendo
  if (!r.parado) {
    return (
      <div className="flex flex-col gap-4">
        {cabecalho}
        <Letra letra={r.letra} girar={Date.now() - r.inicio < 1500} />
        <Relogio inicio={r.inicio} segundos={config.tempo} parado={false} aoAcabar={() => atualizar({ ...r, parado: true })} />
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {config.categorias.map((c) => (
            <li key={c} className="rounded-full bg-painel px-3 py-1.5 text-[15px] font-bold">
              {nomeDaCategoria(c)}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => atualizar({ ...r, parado: true })}
          className="min-h-[72px] rounded-3xl font-display text-[34px] font-extrabold tracking-wide text-white shadow-md active:scale-[0.98]"
          style={{ background: "var(--color-fogo)" }}
        >
          STOP!
        </button>
        <p className="m-0 text-sm text-suave">Quem preencher todas as categorias toca em STOP. Aí todo mundo para de escrever.</p>
      </div>
    );
  }

  // ---------------- conferindo
  const todas = config.categorias.every((c) => r.escolhas[c]);
  const pontosRodada = pontosDa(r);
  return (
    <div className="flex flex-col gap-4">
      {cabecalho}
      <div className="flex items-center gap-3 rounded-2xl bg-sol-claro p-3.5">
        <span className="font-display text-[40px] font-extrabold leading-none">{r.letra}</span>
        <p className="m-0 text-[15px]">
          <strong>Hora de conferir.</strong> Leiam as respostas em voz alta. Para cada categoria, toquem em quem marcou ponto.
        </p>
      </div>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {config.categorias.map((c) => (
          <li key={c} className="flex flex-col gap-1.5">
            <span className="text-[15px] font-bold">{nomeDaCategoria(c)}</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Pontos em ${nomeDaCategoria(c)}`}>
              {ESCOLHAS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={r.escolhas[c] === o.id}
                  onClick={() => atualizar({ ...r, escolhas: { ...r.escolhas, [c]: o.id } })}
                  className={`min-h-10 rounded-full px-3 text-sm font-bold ring-1 ${r.escolhas[c] === o.id ? "bg-azul text-white ring-azul" : "bg-white ring-borda"}`}
                >
                  {o.rotulo}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <p className="m-0 text-sm text-suave">{REGRA} Em dúvida se uma palavra vale? Vocês combinam, e o adulto dá a palavra final.</p>
      <Placar rotulos={["Jogador 1 nesta rodada", "Jogador 2 nesta rodada"]} pontos={pontosRodada} />
      <button
        type="button"
        disabled={!todas}
        onClick={() => {
          const somada = { ...r, somada: true };
          const lista = [...rodadas.slice(0, -1), somada];
          if (lista.length < config.total) novaRodada(config, lista);
          else mudar({ ...jogo, rodadas: lista });
        }}
        className={PRINCIPAL}
      >
        {rodadas.length < config.total ? "Somar e sortear a próxima letra" : "Somar e ver quem ganhou"}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------------------- à distância

type SalvoStop = { v: 1; jogo: "stop"; partida: PartidaStop; rascunho: Respostas; atualizado: number };

function salvoValido(x: unknown, codigo: string): x is SalvoStop {
  const s = x as SalvoStop | null;
  return !!s && s.v === 1 && s.jogo === "stop" && !!s.partida && s.partida.codigo === codigo && Array.isArray(s.partida.rodadas);
}

function EntradaStop({ aoEntrar }: { aoEntrar: (codigo: string) => void }) {
  const [noAr, setNoAr] = useState<"verificando" | "sim" | "nao">("verificando");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [guardadas, setGuardadas] = useState<{ codigo: string; atualizado: number }[]>([]);
  const verificar = useCallback(() => {
    setNoAr("verificando");
    servidorNoAr().then((ok) => setNoAr(ok ? "sim" : "nao"));
  }, []);
  useEffect(() => {
    verificar();
    setGuardadas(
      salasGuardadas()
        .filter((codigo) => jogoDaSalaGuardada(codigo) === ID)
        .map((codigo) => ({ codigo, atualizado: ler<SalvoStop>(chaveDaSala(codigo))?.atualizado ?? 0 }))
        .sort((a, b) => b.atualizado - a.atualizado)
        .slice(0, 3),
    );
  }, [verificar]);

  const criar = () => {
    const codigo = novoCodigo();
    gravar(chaveDaSala(codigo), { v: 1, jogo: ID, partida: novaPartidaStop(codigo, "criador", novoId()), rascunho: {}, atualizado: Date.now() });
    evento("sala_criada", { jogo: ID });
    aoEntrar(codigo);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] text-suave">Um cria a sala e manda o código; o outro entra. Sem cadastro e sem chat: só as palavras do jogo passam pela internet.</p>
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
            className="min-h-[50px] w-full min-w-0 flex-1 rounded-2xl border border-borda px-4 font-display text-[22px] font-extrabold tracking-[0.15em] uppercase placeholder:text-borda"
          />
          <button type="submit" disabled={noAr !== "sim"} className={PRINCIPAL}>
            Entrar
          </button>
        </div>
        {erro ? <p className="m-0 text-sm font-bold text-alerta">{erro}</p> : null}
      </form>
      {guardadas.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-[15px] font-bold text-suave">Salas guardadas neste aparelho</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {guardadas.map((g) => (
              <li key={g.codigo}>
                <button type="button" onClick={() => aoEntrar(g.codigo)} className={`${SECUNDARIO} w-full justify-between`}>
                  <span className="font-display tracking-[0.1em]">{g.codigo}</span>
                  <span className="text-sm font-normal text-suave">voltar à sala</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SalaStop({ codigo, conversa, aoSair }: { codigo: string; conversa: readonly string[]; aoSair: () => void }) {
  const [salvo, setSalvo] = useState<SalvoStop | null>(null);
  const [outroJogo, setOutroJogo] = useState<string | null>(null);
  const [cheia, setCheia] = useState(false);
  const [conexaoEstado, setConexaoEstado] = useState<EstadoConexao>("conectando");
  const [membros, setMembros] = useState<Membro[]>([]);
  const [config, setConfig] = useState<Config>(CONFIG_PADRAO);
  const ref = useRef<SalvoStop | null>(null);
  const conexao = useRef<Conexao<MsgStop> | null>(null);
  const membrosRef = useRef<Membro[]>([]);

  const guardar = useCallback(
    (s: SalvoStop) => {
      ref.current = s;
      setSalvo(s);
      gravar(chaveDaSala(codigo), s);
    },
    [codigo],
  );
  const enviar = useCallback((msgs: MsgStop[]) => {
    for (const m of msgs) conexao.current?.enviar(m);
  }, []);
  const aplicar = useCallback(
    (passo: PassoStop, rascunho?: Respostas) => {
      const s = ref.current;
      if (!s) return;
      const antes = s.partida;
      const proximo = { ...s, partida: passo.partida, rascunho: rascunho ?? s.rascunho, atualizado: Date.now() };
      // rodada nova: o rascunho começa vazio
      if ((atual(passo.partida)?.r ?? 0) !== (atual(antes)?.r ?? 0) || passo.partida.p !== antes.p) proximo.rascunho = {};
      guardar(proximo);
      enviar(passo.enviar);
      if (antes.rodadas.length === 0 && passo.partida.rodadas.length === 1) evento("partida_iniciada", { jogo: ID, modo: "distancia" });
      if (!antes.fim && passo.partida.fim) evento("partida_terminada", { jogo: ID, modo: "distancia" });
    },
    [enviar, guardar],
  );

  useEffect(() => {
    const dono = jogoDaSalaGuardada(codigo);
    if (dono && dono !== ID) {
      setOutroJogo(dono);
      return;
    }
    const guardado = ler<SalvoStop>(chaveDaSala(codigo));
    const s: SalvoStop = salvoValido(guardado, codigo)
      ? guardado
      : { v: 1, jogo: ID, partida: novaPartidaStop(codigo, "convidado", novoId()), rascunho: {}, atualizado: Date.now() };
    guardar(s);
    if (configValida(s.partida.config)) setConfig(s.partida.config);
    evento("sala_aberta", { jogo: ID, papel: s.partida.papel });
  }, [codigo, guardar]);

  const carregado = salvo !== null;

  useEffect(() => {
    if (!carregado || !ref.current) return;
    let ativo = true;
    const meuId = ref.current.partida.meuId;
    entrar<MsgStop>(
      codigo,
      meuId,
      {
        aoMensagem: (msg, de) => {
          const s = ref.current;
          if (ativo && s) aplicar(receberStop(s.partida, msg, de, s.rascunho, Date.now()));
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
          if (ref.current && lista.some((m) => m.id !== meuId)) enviar(reenviarStop(ref.current.partida));
        },
        aoEstado: (estado) => {
          if (!ativo) return;
          setConexaoEstado(estado);
          if (estado === "conectado" && ref.current) enviar(reenviarStop(ref.current.partida));
        },
      },
      { canal: ID, validar: ehMsgStop },
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
  }, [codigo, carregado, aplicar, enviar]);

  useEffect(() => {
    const t = setInterval(() => {
      const p = ref.current?.partida;
      if (p && membrosRef.current.some((m) => m.id !== p.meuId)) enviar(reenviarStop(p));
    }, 4000);
    return () => clearInterval(t);
  }, [enviar]);

  const pararAgora = useCallback(() => {
    const s = ref.current;
    if (s) aplicar(parar(s.partida, s.rascunho));
  }, [aplicar]);

  const placar = useMemo(() => (salvo ? placarStop(salvo.partida) : null), [salvo]);

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
  if (!salvo || !placar) return <div aria-busy="true" className="min-h-[60vh]" />;

  const p = salvo.partida;
  const fase = faseDe(p);
  const r = atual(p);
  const outroPresente = membros.some((m) => m.id !== p.meuId);
  const outroNaPartida = p.outro?.p === p.p;
  const sair = () => {
    if ((fase === "escrevendo" || fase === "conferindo") && !window.confirm("Sair da sala? A partida fica guardada neste aparelho e dá para voltar pelo código.")) return;
    aoSair();
  };
  const barra = <BarraDaSala codigo={codigo} conexao={conexaoEstado} outroPresente={outroPresente} aoSair={sair} />;
  const cabecalho =
    r && fase !== "fim" ? (
      <p className="m-0 flex justify-between text-sm font-bold text-suave">
        <span>
          Rodada {r.r} de {p.config.total}
        </span>
        <span>
          Você {placar.total[0]} · Outro {placar.total[1]}
        </span>
      </p>
    ) : null;

  // ---------------- esperando
  if (fase === "esperando") {
    if (p.papel === "criador") {
      const podeComecar = outroPresente && outroNaPartida;
      return (
        <div className="flex flex-col gap-4">
          {barra}
          {!p.outro ? <ConviteDaSala codigo={codigo} link={linkDaSala(codigo, ID)} nomeDoJogo="Stop" /> : null}
          <EscolherConfig config={config} aoMudar={setConfig} />
          <button type="button" disabled={!podeComecar} onClick={() => aplicar(comecar(p, config, Date.now()))} className={PRINCIPAL}>
            {podeComecar ? "Sortear a primeira letra" : p.outro && !outroNaPartida ? "Esperando o outro pedir para jogar de novo" : "Esperando o outro entrar"}
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        {barra}
        <p role="status" className="m-0 rounded-2xl bg-painel p-3.5 text-[17px]">
          {outroPresente ? "O outro está escolhendo as categorias. A letra aparece aqui quando ele começar." : "Esperando o outro jogador entrar na sala."}
        </p>
      </div>
    );
  }

  // ---------------- escrevendo
  if (fase === "escrevendo" && r) {
    const tudo = p.config.categorias.every((c) => (salvo.rascunho[c] ?? "").trim());
    return (
      <div className="flex flex-col gap-4">
        {barra}
        {cabecalho}
        <Letra letra={r.letra} girar={Date.now() - r.inicio < 1500} />
        <Relogio inicio={r.inicio} segundos={p.config.tempo} parado={false} aoAcabar={pararAgora} />
        <div className="flex flex-col gap-2.5">
          {p.config.categorias.map((c) => {
            const valor = salvo.rascunho[c] ?? "";
            const aviso = valor.trim() ? problema(valor, r.letra) : null;
            return (
              <label key={c} className="flex flex-col gap-1">
                <span className="text-[15px] font-bold">{nomeDaCategoria(c)}</span>
                <input
                  value={valor}
                  onChange={(e) => guardar({ ...salvo, rascunho: { ...salvo.rascunho, [c]: e.target.value.slice(0, 40) }, atualizado: Date.now() })}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  placeholder={`${r.letra}…`}
                  className="min-h-12 rounded-2xl border border-borda px-4 text-[18px]"
                />
                {aviso && aviso !== "em branco" ? <span className="text-sm font-bold text-alerta">{aviso}</span> : null}
              </label>
            );
          })}
        </div>
        <button
          type="button"
          disabled={!tudo}
          onClick={pararAgora}
          className="min-h-[72px] rounded-3xl font-display text-[34px] font-extrabold tracking-wide text-white shadow-md disabled:opacity-40"
          style={{ background: "var(--color-fogo)" }}
        >
          STOP!
        </button>
        <p className="m-0 text-sm text-suave">{tudo ? "Tudo preenchido: pode pedir Stop." : "O Stop libera quando todas as categorias tiverem palavra."}</p>
      </div>
    );
  }

  // ---------------- esperando as respostas do outro
  if (fase === "aguardando") {
    return (
      <div className="flex flex-col gap-4">
        {barra}
        {cabecalho}
        <p role="status" className="m-0 rounded-2xl bg-sol-claro p-3.5 text-[17px]">
          {r?.quemParou === "eu" ? "Você pediu Stop!" : "O tempo acabou."} Esperando as respostas do outro…
        </p>
      </div>
    );
  }

  // ---------------- conferindo
  if (fase === "conferindo" && r && r.minhas && r.dele) {
    const anuladas = [...r.anuladasPorMim, ...r.anuladasPeloOutro];
    const daRodada = placar.porRodada[r.r - 1] ?? [0, 0];
    const ultima = r.r >= p.config.total;
    return (
      <div className="flex flex-col gap-4">
        {barra}
        {cabecalho}
        <div className="flex items-center gap-3 rounded-2xl bg-sol-claro p-3.5">
          <span className="font-display text-[40px] font-extrabold leading-none">{r.letra}</span>
          <p className="m-0 text-[15px]">
            <strong>{r.quemParou === "eu" ? "Você pediu Stop." : r.quemParou === "ele" ? "O outro pediu Stop." : "Tempo!"}</strong> Conversem sobre as
            respostas. Não aceita uma palavra do outro? Toque em &quot;Não vale&quot;.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 text-sm font-bold text-suave">
            <span>Você</span>
            <span>O outro</span>
          </div>
          {p.config.categorias.map((c) => {
            const [pm, pe] = pontosDaCategoria(r.minhas?.[c], r.dele?.[c], r.letra, anuladas);
            const minha = r.minhas?.[c] ?? "";
            const dele = r.dele?.[c] ?? "";
            const probMinha = problema(minha, r.letra);
            const probDele = problema(dele, r.letra);
            const anuladaDele = r.anuladasPorMim.includes(normalizar(dele));
            const anuladaMinha = r.anuladasPeloOutro.includes(normalizar(minha)) || (anuladas.includes(normalizar(minha)) && !!minha);
            return (
              <section key={c} aria-label={nomeDaCategoria(c)} className="flex flex-col gap-1.5 rounded-2xl border border-borda p-3">
                <span className="text-sm font-bold">{nomeDaCategoria(c)}</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[17px] font-bold ${pm === 0 ? "text-suave line-through" : ""}`}>{minha || "—"}</span>
                    <span className="text-sm">
                      <strong>{pm}</strong> {probMinha ? `· ${probMinha}` : anuladaMinha ? "· não aceita" : ""}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[17px] font-bold ${pe === 0 ? "text-suave line-through" : ""}`}>{dele || "—"}</span>
                    <span className="text-sm">
                      <strong>{pe}</strong> {probDele ? `· ${probDele}` : ""}
                    </span>
                    {!probDele && !r.prontoEu ? (
                      <button
                        type="button"
                        aria-pressed={anuladaDele}
                        onClick={() => aplicar(anular(p, dele, !anuladaDele))}
                        className={`mt-0.5 self-start rounded-full px-2.5 py-1 text-sm font-bold ring-1 ${anuladaDele ? "bg-fogo text-white ring-fogo" : "bg-white text-alerta ring-borda"}`}
                      >
                        {anuladaDele ? "Não vale (desfazer)" : "Não vale"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
        <p className="m-0 text-sm text-suave">{REGRA}</p>
        <Placar rotulos={["Você nesta rodada", "O outro nesta rodada"]} pontos={daRodada} />
        {r.prontoEu ? (
          <p role="status" className="m-0 rounded-2xl bg-painel p-3.5 text-[15px]">
            Esperando o outro terminar de conferir…
          </p>
        ) : (
          <button type="button" onClick={() => aplicar(ficarPronto(p, Date.now()))} className={PRINCIPAL}>
            {ultima ? "Pronto: ver quem ganhou" : "Pronto para a próxima letra"}
          </button>
        )}
      </div>
    );
  }

  // ---------------- fim
  const [eu, ele] = placar.total;
  const outroQuerDeNovo = p.outro && p.outro.p > p.p;
  return (
    <div className="flex flex-col gap-4">
      {barra}
      <div role="status" className="flex flex-col gap-1 rounded-2xl bg-azul p-4 text-white">
        <p className="aparece m-0 font-display text-[24px] font-extrabold">{eu === ele ? "Empate!" : eu > ele ? "Você venceu!" : "O outro venceu."}</p>
        <p className="m-0 text-[15px] text-white/90">
          {eu} a {ele} pontos, em {p.config.total} rodadas.
        </p>
      </div>
      <Placar rotulos={["Você", "O outro"]} pontos={placar.total} fim />
      <Conversa perguntas={conversa} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => aplicar(revancheStop(p))} className={`${PRINCIPAL} sm:flex-1`}>
          {outroQuerDeNovo ? "O outro quer revanche: jogar de novo" : "Jogar de novo"}
        </button>
        <Link href="/" className={`${SECUNDARIO} no-underline`}>
          Ver outros jogos
        </Link>
      </div>
    </div>
  );
}
