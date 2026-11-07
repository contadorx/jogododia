"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHAVES, chaveDaSala, gravar, jogoDaSalaGuardada, ler, salasGuardadas } from "@/lib/armazenamento";
import {
  CATEGORIAS_STOP,
  CONFIG_PADRAO,
  MAX_JOGADORES,
  RODADAS_OPCOES,
  TEMPOS_OPCOES,
  abrirProxima,
  anular,
  atual,
  bicho,
  comecar,
  conferirCategoria,
  configValida,
  ehMsgStop,
  faseDe,
  ficarPronto,
  meuIndice,
  nomeDaCategoria,
  normalizar,
  novaPartidaStop,
  parar,
  placarStop,
  podeSeguirSem,
  problema,
  quemJoga,
  receberStop,
  reenviarStop,
  revancheStop,
  seguirSem,
  sortearLetra,
  votosParaAnular,
  type Config,
  type Contexto,
  type IdCategoria,
  type MsgStop,
  type PartidaStop,
  type PassoStop,
  type Respostas,
  type RodadaStop,
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
import { Desfazer, Seta } from "../Icones";
import { PRINCIPAL, SECUNDARIO } from "../batalha/Montagem";
import { BarraDaSala, ConviteDaSala, Conversa, SalaDeOutroJogo } from "./PecasDaSala";
import { useTelaAcesa } from "./useTelaAcesa";

const ID = "stop";
type Modo = "mesmo" | "distancia";

/** No papel, o site só guarda os pontos: dá para mais gente que à distância. */
const MAX_PAPEL = 8;

// ------------------------------------------------------------------------------- peças comuns

/** Cor de cada jogador (pela posição): um ponto ao lado do nome, para achar cada um nas listas. */
const CORES = ["#2f55c9", "#c8381f", "#23804f", "#d99a00", "#7a4cc2", "#c2417e", "#8a5a2b", "#1b8a9a"];
const Ponto = ({ i }: { i: number }) => (
  <span aria-hidden="true" className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: CORES[i % CORES.length] }} />
);

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** "a Onça, o Tatu e você" */
const juntar = (itens: string[]) => (itens.length <= 1 ? (itens[0] ?? "") : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`);

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

type Linha = { chave: number; nome: string; pontos: number; destaque?: boolean; nota?: string };

/** Placar de todos, do que tem mais pontos para o que tem menos (empatados ficam no mesmo lugar). */
function PlacarLista({ titulo, linhas }: { titulo: string; linhas: Linha[] }) {
  const ordem = [...linhas].sort((a, b) => b.pontos - a.pontos);
  return (
    <section aria-label={titulo} className="flex flex-col gap-1.5">
      <h2 className="m-0 text-[15px] font-bold">{titulo}</h2>
      <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
        {ordem.map((l) => (
          <li key={l.chave} className={`flex items-center gap-2.5 rounded-2xl px-3 py-2 ${l.destaque ? "bg-azul-claro" : "bg-painel"}`}>
            <span className="w-7 shrink-0 text-sm font-bold text-suave">{ordem.findIndex((x) => x.pontos === l.pontos) + 1}º</span>
            <Ponto i={l.chave} />
            <span className="min-w-0 flex-1 font-bold">
              {l.nome}
              {l.nota ? <span className="font-normal text-suave"> · {l.nota}</span> : null}
            </span>
            <span className="font-display text-[22px] font-extrabold leading-none">{l.pontos}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const REGRA = "Palavra que vale e que ninguém mais escreveu: 10 pontos. Igual à de alguém: 5. Em branco ou que não vale: 0.";

const BotaoStop = ({ habilitado, aoTocar }: { habilitado: boolean; aoTocar: () => void }) => (
  <button
    type="button"
    disabled={!habilitado}
    onClick={aoTocar}
    className="min-h-[72px] rounded-3xl font-display text-[34px] font-extrabold tracking-wide text-white shadow-md active:scale-[0.98] disabled:opacity-40"
    style={{ background: "var(--color-fogo)" }}
  >
    STOP!
  </button>
);

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
    { id: "mesmo", nome: "No mesmo aparelho", explica: `Cada um escreve no seu papel (até ${MAX_PAPEL} jogadores). O celular sorteia a letra, marca o tempo e soma os pontos.` },
    { id: "distancia", nome: "À distância", explica: `Cada um na sua casa, digitando no próprio celular (até ${MAX_JOGADORES} jogadores). O site compara as respostas.` },
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

/** `pontos[k]`: os toques de +10 e +5 do jogador k na rodada (um por palavra que valeu). */
type RodadaPapel = { letra: string; inicio: number; parado: boolean; pontos: number[][]; somada: boolean };
/** `nomes`: vazio é "Jogador 1", "Jogador 2"… Os nomes ficam só neste aparelho. */
type JogoPapel = { v: 2; config: Config | null; nomes: string[]; rodadas: RodadaPapel[] };
const CHAVE_PAPEL = "jdd.local.stop";
const NOVO_PAPEL: JogoPapel = { v: 2, config: null, nomes: ["", ""], rodadas: [] };

/** O jogo guardado neste aparelho. O formato de antes (dois jogadores, um toque por categoria) vira o novo. */
function lerPapel(): JogoPapel | null {
  const s = ler<Record<string, unknown>>(CHAVE_PAPEL);
  if (!s || !Array.isArray(s.rodadas) || !(s.config === null || configValida(s.config))) return null;
  if (s.v === 2) {
    const nomes = s.nomes;
    if (!Array.isArray(nomes) || nomes.length < 2 || nomes.length > MAX_PAPEL || !nomes.every((n) => typeof n === "string")) return null;
    const rodadasOk = (s.rodadas as RodadaPapel[]).every((r) => !!r && typeof r.letra === "string" && Array.isArray(r.pontos) && r.pontos.length === nomes.length);
    return rodadasOk ? (s as unknown as JogoPapel) : null;
  }
  if (s.v === 1) {
    const valor: Record<string, [number, number]> = { diferentes: [10, 10], iguais: [5, 5], so1: [10, 0], so2: [0, 10], nenhum: [0, 0] };
    const antigas = s.rodadas as { letra: string; inicio: number; parado: boolean; somada: boolean; escolhas?: Record<string, string> }[];
    return {
      v: 2,
      config: s.config as Config | null,
      nomes: ["", ""],
      rodadas: antigas.map((r) => ({
        letra: r.letra,
        inicio: r.inicio,
        parado: r.parado,
        somada: r.somada,
        pontos: [0, 1].map((k) => Object.values(r.escolhas ?? {}).flatMap((e) => (valor[e]?.[k] ? [valor[e][k]] : []))),
      })),
    };
  }
  return null;
}

function StopNoPapel({ conversa }: { conversa: readonly string[] }) {
  const [jogo, setJogo] = useState<JogoPapel>(NOVO_PAPEL);
  const [rascunho, setRascunho] = useState<Config>(CONFIG_PADRAO);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    const salvo = lerPapel();
    if (salvo) {
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

  const { config, rodadas, nomes } = jogo;
  const nomeDe = (k: number) => nomes[k]?.trim() || `Jogador ${k + 1}`;
  const somaDe = (toques: readonly number[] | undefined) => (toques ?? []).reduce((a, b) => a + b, 0);
  const r = rodadas[rodadas.length - 1];
  const total = nomes.map((_, k) => rodadas.filter((x) => x.somada).reduce((s, x) => s + somaDe(x.pontos[k]), 0));
  const terminou = !!config && rodadas.length === config.total && !!r?.somada;

  const novaRodada = (cfg: Config, anteriores: RodadaPapel[]) => {
    const letra = sortearLetra(anteriores.map((x) => x.letra));
    if (anteriores.length === 0) evento("partida_iniciada", { jogo: ID, modo: "mesmo-aparelho" });
    mudar({ ...jogo, config: cfg, rodadas: [...anteriores, { letra, inicio: Date.now(), parado: false, pontos: nomes.map(() => []), somada: false }] });
  };
  const atualizar = (x: RodadaPapel) => mudar({ ...jogo, rodadas: [...rodadas.slice(0, -1), x] });

  // ---------------- antes de começar
  if (!config || !r) {
    return (
      <div className="flex flex-col gap-5">
        <EscolherConfig config={rascunho} aoMudar={setRascunho} />
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-[15px] font-bold">Jogadores (de 2 a {MAX_PAPEL})</legend>
          {nomes.map((nome, k) => (
            <div key={k} className="flex items-center gap-2">
              <Ponto i={k} />
              <input
                value={nome}
                onChange={(e) => mudar({ ...jogo, nomes: nomes.map((n, j) => (j === k ? e.target.value.slice(0, 20) : n)) })}
                aria-label={`Nome do jogador ${k + 1}`}
                placeholder={`Jogador ${k + 1}`}
                autoComplete="off"
                maxLength={20}
                className="min-h-11 w-full min-w-0 flex-1 rounded-2xl border border-borda px-4 text-[17px]"
              />
              {nomes.length > 2 ? (
                <button
                  type="button"
                  onClick={() => mudar({ ...jogo, nomes: nomes.filter((_, j) => j !== k) })}
                  aria-label={`Tirar ${nomeDe(k)}`}
                  className="min-h-11 px-1 text-[15px] font-bold text-suave underline underline-offset-2"
                >
                  Tirar
                </button>
              ) : null}
            </div>
          ))}
          {nomes.length < MAX_PAPEL ? (
            <button type="button" onClick={() => mudar({ ...jogo, nomes: [...nomes, ""] })} className={`${SECUNDARIO} self-start`}>
              Mais um jogador
            </button>
          ) : null}
          <p className="m-0 text-sm text-suave">Os nomes são opcionais e ficam só neste aparelho.</p>
        </fieldset>
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
    const maior = Math.max(...total);
    const vencedores = nomes.map((_, k) => k).filter((k) => total[k] === maior);
    return (
      <div className="flex flex-col gap-4">
        <div role="status" className="flex flex-col gap-1 rounded-2xl bg-azul p-4 text-white">
          <p className="aparece m-0 font-display text-[24px] font-extrabold">
            {vencedores.length === 1 ? `${nomeDe(vencedores[0])} venceu!` : `Empate entre ${juntar(vencedores.map(nomeDe))}!`}
          </p>
          <p className="m-0 text-[15px] text-white/90">
            {maior} pontos{vencedores.length > 1 ? " cada" : ""}, em {config.total} rodadas.
          </p>
        </div>
        <PlacarLista titulo="Placar final" linhas={nomes.map((_, k) => ({ chave: k, nome: nomeDe(k), pontos: total[k] }))} />
        <Conversa perguntas={conversa} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => mudar({ ...jogo, config: null, rodadas: [] })} className={`${PRINCIPAL} sm:flex-1`}>
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
    <div className="flex flex-col gap-0.5 text-sm text-suave">
      <span className="font-bold">
        Rodada {rodadas.length} de {config.total}
      </span>
      {rodadas.some((x) => x.somada) ? <span>{nomes.map((_, k) => `${nomeDe(k)} ${total[k]}`).join(" · ")}</span> : null}
    </div>
  );

  // ---------------- escrevendo
  if (!r.parado) {
    return (
      <div className="flex flex-col gap-4">
        {cabecalho}
        <Letra letra={r.letra} girar={Date.now() - r.inicio < 1500} />
        <Relogio key={rodadas.length} inicio={r.inicio} segundos={config.tempo} parado={false} aoAcabar={() => atualizar({ ...r, parado: true })} />
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {config.categorias.map((c) => (
            <li key={c} className="rounded-full bg-painel px-3 py-1.5 text-[15px] font-bold">
              {nomeDaCategoria(c)}
            </li>
          ))}
        </ul>
        <BotaoStop habilitado aoTocar={() => atualizar({ ...r, parado: true })} />
        <p className="m-0 text-sm text-suave">Quem preencher todas as categorias toca em STOP. Aí todo mundo para de escrever.</p>
      </div>
    );
  }

  // ---------------- conferindo
  const max = config.categorias.length;
  const ultima = rodadas.length >= config.total;
  return (
    <div className="flex flex-col gap-4">
      {cabecalho}
      <div className="flex items-center gap-3 rounded-2xl bg-sol-claro p-3.5">
        <span className="font-display text-[40px] font-extrabold leading-none">{r.letra}</span>
        <p className="m-0 text-[15px]">
          <strong>Hora de conferir.</strong> Cada um lê as suas palavras em voz alta. Para cada palavra que vale, toque em +10 (ninguém mais escreveu
          igual) ou em +5 (alguém escreveu igual).
        </p>
      </div>
      <h2 className="m-0 text-[15px] font-bold">Pontos nesta rodada</h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {nomes.map((_, k) => {
          const toques = r.pontos[k] ?? [];
          const cheio = toques.length >= max;
          const tocar = (mudanca: (l: number[]) => number[]) => atualizar({ ...r, pontos: r.pontos.map((l, j) => (j === k ? mudanca(l) : l)) });
          return (
            <li key={k} className="flex flex-col gap-2 rounded-2xl border border-borda p-3">
              <div className="flex items-center gap-2">
                <Ponto i={k} />
                <span className="min-w-0 flex-1 font-bold">{nomeDe(k)}</span>
                <span className="font-display text-[26px] font-extrabold leading-none">{somaDe(toques)}</span>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={cheio} onClick={() => tocar((l) => [...l, 10])} aria-label={`Mais 10 para ${nomeDe(k)}`} className={`${SECUNDARIO} min-h-11 flex-1`}>
                  +10
                </button>
                <button type="button" disabled={cheio} onClick={() => tocar((l) => [...l, 5])} aria-label={`Mais 5 para ${nomeDe(k)}`} className={`${SECUNDARIO} min-h-11 flex-1`}>
                  +5
                </button>
                <button
                  type="button"
                  disabled={!toques.length}
                  onClick={() => tocar((l) => l.slice(0, -1))}
                  aria-label={`Desfazer o último ponto de ${nomeDe(k)}`}
                  className={`${SECUNDARIO} min-h-11 px-3.5`}
                >
                  <Desfazer tamanho={20} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="m-0 text-sm text-suave">{REGRA} Em dúvida se uma palavra vale? Vocês combinam, e o adulto dá a palavra final.</p>
      <button
        type="button"
        onClick={() => {
          const lista = [...rodadas.slice(0, -1), { ...r, somada: true }];
          if (!ultima) novaRodada(config, lista);
          else {
            evento("partida_terminada", { jogo: ID, modo: "mesmo-aparelho" });
            mudar({ ...jogo, rodadas: lista });
          }
        }}
        className={PRINCIPAL}
      >
        {ultima ? "Somar e ver quem ganhou" : "Somar e sortear a próxima letra"}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------------------- à distância

type SalvoStop = { v: 1; jogo: "stop"; partida: PartidaStop; rascunho: Respostas; atualizado: number };

/** A sala guardada neste aparelho. Uma sala do formato de antes (o Stop de dois) recomeça com o mesmo papel. */
function lerSala(x: unknown, codigo: string): SalvoStop | null {
  const s = x as { v?: unknown; jogo?: unknown; partida?: (Partial<PartidaStop> & { v?: unknown }) | null } | null;
  if (!s || s.v !== 1 || s.jogo !== ID || !s.partida || s.partida.codigo !== codigo || typeof s.partida.meuId !== "string") return null;
  if (s.partida.v === 2 && Array.isArray(s.partida.rodadas) && Array.isArray(s.partida.elenco)) return s as SalvoStop;
  return { v: 1, jogo: ID, partida: novaPartidaStop(codigo, s.partida.papel === "criador" ? "criador" : "convidado", s.partida.meuId), rascunho: {}, atualizado: Date.now() };
}

/** "a Onça", "da Onça": os textos de cada jogador à distância (o bicho de cada um). */
const oBicho = (i: number) => `${bicho(i).a} ${bicho(i).nome}`;
const doBicho = (i: number) => `${bicho(i).a === "a" ? "da" : "do"} ${bicho(i).nome}`;

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
    gravar(chaveDaSala(codigo), { v: 1, jogo: ID, partida: novaPartidaStop(codigo, "criador", novoId()), rascunho: {}, atualizado: Date.now() } satisfies SalvoStop);
    evento("sala_criada", { jogo: ID });
    aoEntrar(codigo);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] text-suave">
        Um cria a sala e manda o código; os outros entram (até {MAX_JOGADORES} jogadores). Sem cadastro e sem chat: só as palavras do jogo passam pela
        internet, e cada um aparece como um bicho.
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
          Entrar com o código que mandaram
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

function SalaCheia({ aoSair }: { aoSair: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-alerta-claro p-4 text-alerta">
      <p className="m-0 font-bold">Esta sala está cheia.</p>
      <p className="m-0">A sala do Stop aceita até {MAX_JOGADORES} jogadores ao mesmo tempo. Confira o código com quem mandou, ou crie uma sala nova.</p>
      <button type="button" onClick={aoSair} className={`${SECUNDARIO} self-start`}>
        Voltar
      </button>
    </div>
  );
}

/** De quanto em quanto tempo cada aparelho repete o seu estado: com mais gente, menos vezes (cada mensagem vai para todos). */
const intervaloDeRepeticao = (naSala: number) => (naSala <= 2 ? 4000 : naSala <= 4 ? 6000 : 8000);

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
  const resposta = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const contexto = useCallback(
    (): Contexto => ({ agora: Date.now(), presentes: membrosRef.current.map((m) => m.id), rascunho: ref.current?.rascunho ?? {} }),
    [],
  );
  const aplicar = useCallback(
    (passo: PassoStop) => {
      const s = ref.current;
      if (!s) return;
      const antes = s.partida;
      if (passo.partida !== antes) {
        const proximo: SalvoStop = { ...s, partida: passo.partida, atualizado: Date.now() };
        // rodada nova (ou partida nova): o rascunho começa vazio
        if ((atual(passo.partida)?.r ?? 0) !== (atual(antes)?.r ?? 0) || passo.partida.p !== antes.p) proximo.rascunho = {};
        guardar(proximo);
      }
      enviar(passo.enviar);
      if (passo.responder && !resposta.current) {
        // alguém precisa do que eu sei: mando o estado inteiro daqui a pouco, num envio só
        resposta.current = setTimeout(
          () => {
            resposta.current = null;
            if (ref.current) enviar(reenviarStop(ref.current.partida));
          },
          300 + Math.random() * 900,
        );
      }
      if (antes.rodadas.length === 0 && passo.partida.rodadas.length > 0) evento("partida_iniciada", { jogo: ID, modo: "distancia" });
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
    const s = lerSala(ler(chaveDaSala(codigo)), codigo) ?? {
      v: 1,
      jogo: ID,
      partida: novaPartidaStop(codigo, "convidado", novoId()),
      rascunho: {},
      atualizado: Date.now(),
    };
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
          if (ativo && s) aplicar(receberStop(s.partida, msg, de, contexto()));
        },
        aoPresenca: (lista) => {
          if (!ativo) return;
          membrosRef.current = lista;
          setMembros(lista);
          const primeiros = [...lista].sort((a, b) => a.desde - b.desde || a.id.localeCompare(b.id)).slice(0, MAX_JOGADORES);
          if (lista.length > MAX_JOGADORES && !primeiros.some((m) => m.id === meuId)) {
            setCheia(true);
            conexao.current?.sair();
            return;
          }
          // quem criou a sala: com a rodada fechada e gente de volta, abre a próxima
          const s = ref.current;
          if (s && s.partida.papel === "criador" && faseDe(s.partida) === "entre") aplicar(abrirProxima(s.partida, contexto()));
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
      if (resposta.current) clearTimeout(resposta.current);
      resposta.current = null;
    };
  }, [codigo, carregado, aplicar, enviar, contexto]);

  // de tempos em tempos, cada um repete o seu estado (assim, mensagem perdida não atrapalha)
  useEffect(() => {
    let ultimo = 0;
    const t = setInterval(() => {
      const p = ref.current?.partida;
      if (!p || !membrosRef.current.some((m) => m.id !== p.meuId)) return;
      if (Date.now() - ultimo < intervaloDeRepeticao(membrosRef.current.length)) return;
      ultimo = Date.now();
      enviar(reenviarStop(p));
    }, 1000);
    return () => clearInterval(t);
  }, [enviar]);

  const pararAgora = useCallback(
    (pediStop: boolean) => {
      const s = ref.current;
      if (s) aplicar(parar(s.partida, s.rascunho, pediStop, Date.now()));
    },
    [aplicar],
  );
  const acabouOTempo = useCallback(() => pararAgora(false), [pararAgora]);

  const placar = useMemo(() => (salvo ? placarStop(salvo.partida) : null), [salvo]);
  const fase = salvo ? faseDe(salvo.partida) : null;

  // a sala já recebeu todos os aparelhos que cabem: sai da conexão
  useEffect(() => {
    if (fase === "cheia") conexao.current?.sair();
  }, [fase]);

  // tela acesa até a partida acabar: tela apagada derruba a conexão
  useTelaAcesa(!!fase && fase !== "fim" && fase !== "cheia" && !cheia && !outroJogo);

  if (outroJogo) return <SalaDeOutroJogo codigo={codigo} jogo={outroJogo} aoSair={aoSair} />;
  if (cheia || fase === "cheia") return <SalaCheia aoSair={aoSair} />;
  if (!salvo || !placar || !fase) return <div aria-busy="true" className="min-h-[60vh]" />;

  const p = salvo.partida;
  const r = atual(p);
  const eu = meuIndice(p);
  const presentes = membros.map((m) => m.id);
  const estaNaSala = (i: number) => i === eu || presentes.includes(p.elenco[i]);
  const outrosNaSala = p.elenco.filter((id, i) => i !== eu && presentes.includes(id)).length;
  /** "você" ou "a Onça" */
  const o = (i: number) => (i === eu ? "você" : oBicho(i));
  const nomeComVoce = (i: number) => (i === eu ? `${bicho(i).nome} (você)` : bicho(i).nome);

  // quem joga esta partida e saiu da sala
  const ausentes = p.elenco.map((_, i) => i).filter((i) => i !== eu && (placar.jogou[i] || !!r?.quem.includes(i)) && !estaNaSala(i));
  const saiu = ausentes.length && fase !== "fim" ? `${maiuscula(juntar(ausentes.map(oBicho)))} ${ausentes.length > 1 ? "saíram" : "saiu"} da sala ou a conexão caiu.` : null;
  const detalhe =
    p.papel === "convidado" && ausentes.includes(0)
      ? `Às vezes é só a tela que apagou. A partida continua quando ${oBicho(0)}, que criou a sala, voltar.`
      : "Às vezes é só a tela que apagou.";

  const sair = () => {
    if ((fase === "escrevendo" || fase === "aguardando" || fase === "conferindo") && !window.confirm("Sair da sala? A partida fica guardada neste aparelho e dá para voltar pelo código.")) return;
    aoSair();
  };
  const barra = (
    <BarraDaSala
      codigo={codigo}
      conexao={conexaoEstado}
      outroPresente={outrosNaSala > 0}
      outroJaVeio={p.elenco.length > 1}
      emPartida={fase !== "fim" && fase !== "esperando"}
      link={linkDaSala(codigo, ID)}
      nomeDoJogo="Stop"
      aoSair={sair}
      aoTentar={() => conexao.current?.reconectar()}
      grupo={{
        rotulo: outrosNaSala > 0 ? `Você e mais ${outrosNaSala} na sala` : p.elenco.length > 1 ? "Só você na sala agora" : "Esperando os outros entrarem",
        ok: outrosNaSala > 0,
        saiu,
        detalhe,
      }}
    />
  );
  const cabecalho = r ? (
    <p className="m-0 flex flex-wrap justify-between gap-x-3 text-sm font-bold text-suave">
      <span>
        Rodada {r.r} de {p.config.total}
      </span>
      {eu >= 0 ? (
        <span>
          Você é {oBicho(eu)} · {placar.total[eu] ?? 0} pontos
        </span>
      ) : null}
    </p>
  ) : null;
  const linhasTotal: Linha[] = p.elenco
    .map((_, i) => i)
    .filter((i) => placar.jogou[i])
    .map((i) => ({ chave: i, nome: nomeComVoce(i), pontos: placar.total[i] ?? 0, destaque: i === eu, nota: estaNaSala(i) ? undefined : "saiu" }));
  const quemParou = (x: RodadaStop) => (x.parou === null ? "Tempo!" : x.parou === eu ? "Você pediu Stop!" : `${maiuscula(oBicho(x.parou))} pediu Stop!`);

  // quem criou a sala pode seguir sem quem saiu (quando a rodada está esperando por ele)
  const podeSeguir = r ? r.quem.filter((i) => podeSeguirSem(p, i, presentes)) : [];
  const seguirSemQuemSaiu = podeSeguir.length ? (
    <div className="flex flex-col gap-2 rounded-2xl border border-borda p-3.5">
      <p className="m-0 text-[15px]">
        {maiuscula(juntar(podeSeguir.map(oBicho)))} {podeSeguir.length > 1 ? "saíram" : "saiu"} da sala. Se demorar para voltar, dá para seguir sem
        esperar.{" "}
        {fase === "aguardando"
          ? "Quem não mandou as respostas fica de fora desta rodada e volta na próxima."
          : "As respostas que já foram mandadas continuam valendo."}
      </p>
      <div className="flex flex-wrap gap-2">
        {podeSeguir.map((i) => (
          <button key={i} type="button" onClick={() => aplicar(seguirSem(p, i, contexto()))} className={SECUNDARIO}>
            Seguir sem {oBicho(i)}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  // ---------------- esperando a partida começar
  if (fase === "esperando") {
    const naSala = p.elenco.map((_, i) => i).filter(estaNaSala);
    const lista = (
      <section aria-labelledby="na-sala" className="flex flex-col gap-2">
        <h2 id="na-sala" className="m-0 text-[15px] font-bold">
          Na sala
        </h2>
        {naSala.length ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {naSala.map((i) => (
              <li key={i} className="flex items-center gap-1.5 rounded-full bg-painel px-3 py-1.5 text-[15px] font-bold">
                <Ponto i={i} />
                {bicho(i).nome}
                {i === eu ? " (você)" : ""}
                <span className="font-normal text-suave">
                  {i === 0 && i !== eu ? " · criou a sala" : ""}
                  {p.papel === "criador" && i !== eu && p.vistos[p.elenco[i]]?.p !== p.p ? " · ainda no resultado" : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="m-0 text-sm text-suave">Cada um aparece como um bicho, pela ordem de chegada. Nomes não passam pela internet.</p>
      </section>
    );
    if (p.papel === "criador") {
      const jogadores = quemJoga(p, presentes).length;
      return (
        <div className="flex flex-col gap-4">
          {barra}
          <ConviteDaSala codigo={codigo} link={linkDaSala(codigo, ID)} nomeDoJogo="Stop" maxJogadores={MAX_JOGADORES} />
          {lista}
          <EscolherConfig config={config} aoMudar={setConfig} />
          <button type="button" disabled={jogadores < 2} onClick={() => aplicar(comecar(p, config, contexto()))} className={PRINCIPAL}>
            {jogadores >= 2 ? `Sortear a primeira letra (${jogadores} jogadores)` : "Esperando alguém entrar"}
          </button>
        </div>
      );
    }
    const alguemAqui = membros.some((m) => m.id !== p.meuId);
    return (
      <div className="flex flex-col gap-4">
        {barra}
        {lista}
        <p role="status" className="m-0 rounded-2xl bg-painel p-3.5 text-[17px]">
          {eu < 0
            ? alguemAqui
              ? "Entrando na sala…"
              : "Esperando quem criou a sala."
            : presentes.includes(p.elenco[0])
              ? `${maiuscula(oBicho(0))}, que criou a sala, está escolhendo as categorias. A letra aparece aqui quando começar.`
              : `Esperando ${oBicho(0)}, que criou a sala, voltar.`}
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
        <Relogio key={`${p.p}-${r.r}`} inicio={r.inicio} segundos={p.config.tempo} parado={false} aoAcabar={acabouOTempo} />
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
        <BotaoStop habilitado={tudo} aoTocar={() => pararAgora(true)} />
        <p className="m-0 text-sm text-suave">
          {tudo ? "Tudo preenchido: pode pedir Stop. A rodada acaba para todos." : "O Stop libera quando todas as categorias tiverem palavra."}
        </p>
      </div>
    );
  }

  // ---------------- esperando as respostas de alguém
  if (fase === "aguardando" && r) {
    const faltam = r.quem.filter((i) => !r.respostas[i]);
    return (
      <div className="flex flex-col gap-4">
        {barra}
        {cabecalho}
        <p role="status" className="m-0 rounded-2xl bg-sol-claro p-3.5 text-[17px]">
          {quemParou(r)} Esperando as respostas {juntar(faltam.map(doBicho))}…
        </p>
        {seguirSemQuemSaiu}
      </div>
    );
  }

  // ---------------- conferindo
  if (fase === "conferindo" && r) {
    const n = r.quem.length;
    const precisa = votosParaAnular(n);
    const prontoEu = r.prontos.includes(eu);
    const meusVotos = r.votos[eu] ?? [];
    const daRodada = placar.porRodada[r.r - 1];
    const ultima = r.r >= p.config.total;
    const faltamProntos = r.quem.filter((i) => i !== eu && !r.prontos.includes(i));
    return (
      <div className="flex flex-col gap-4">
        {barra}
        {cabecalho}
        <div className="flex items-center gap-3 rounded-2xl bg-sol-claro p-3.5">
          <span className="font-display text-[40px] font-extrabold leading-none">{r.letra}</span>
          <p className="m-0 text-[15px]">
            <strong>{quemParou(r)}</strong> Confiram as respostas. Não aceita a palavra de alguém? Toque em &quot;Não vale&quot;.
            {n === 3 ? " Ela só deixa de valer quando os outros dois marcam." : n > 3 ? ` Ela deixa de valer quando ${precisa} dos ${n - 1} outros marcam.` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {p.config.categorias.map((c) => {
            const minha = normalizar(r.respostas[eu]?.[c] ?? "");
            return (
              <section key={c} aria-label={nomeDaCategoria(c)} className="flex flex-col rounded-2xl border border-borda px-3 pt-2 pb-1">
                <span className="text-sm font-bold text-suave">{nomeDaCategoria(c)}</span>
                <ul className="m-0 flex list-none flex-col p-0">
                  {conferirCategoria(r, c).map((cel) => {
                    const w = normalizar(cel.palavra);
                    const podeVotar = cel.indice !== eu && !cel.problema && !prontoEu && w !== minha;
                    const votado = meusVotos.includes(`${c}:${w}`);
                    const motivo = cel.problema
                      ? cel.problema
                      : cel.anulada
                        ? n > 2
                          ? "a maioria não aceitou"
                          : `${o(r.quem.find((j) => j !== cel.indice) ?? eu)} não aceitou`
                        : cel.repetida
                          ? "repetida"
                          : cel.votos
                            ? `${cel.votos} de ${precisa} "não vale"`
                            : "";
                    return (
                      <li key={cel.indice} className="flex items-center gap-2.5 border-t border-linha py-2 first:border-t-0">
                        <Ponto i={cel.indice} />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className={`break-words text-[17px] font-bold ${cel.pontos === 0 ? "text-suave line-through" : ""}`}>{cel.palavra || "—"}</span>
                          <span className="text-sm">
                            {nomeComVoce(cel.indice)} · <strong>{cel.pontos}</strong>
                            {motivo ? ` · ${motivo}` : ""}
                          </span>
                        </div>
                        {podeVotar ? (
                          <button
                            type="button"
                            aria-pressed={votado}
                            aria-label={`${votado ? "Desfazer não vale" : "Não vale"}: ${cel.palavra}, ${nomeComVoce(cel.indice)}`}
                            onClick={() => aplicar(anular(p, c, cel.palavra, !votado))}
                            className={`shrink-0 rounded-full px-2.5 py-1.5 text-sm font-bold ring-1 ${votado ? "bg-fogo text-white ring-fogo" : "bg-white text-alerta ring-borda"}`}
                          >
                            {votado ? "Não vale (desfazer)" : "Não vale"}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
        <p className="m-0 text-sm text-suave">{REGRA}</p>
        {daRodada ? (
          <PlacarLista titulo="Pontos desta rodada" linhas={r.quem.map((i, k) => ({ chave: i, nome: nomeComVoce(i), pontos: daRodada[k], destaque: i === eu }))} />
        ) : null}
        {prontoEu ? (
          <>
            <p role="status" className="m-0 rounded-2xl bg-painel p-3.5 text-[15px]">
              {faltamProntos.length
                ? `Esperando ${juntar(faltamProntos.map(oBicho))} ${faltamProntos.length > 1 ? "terminarem" : "terminar"} de conferir…`
                : "Fechando a rodada…"}
            </p>
            {seguirSemQuemSaiu}
          </>
        ) : (
          <button type="button" onClick={() => aplicar(ficarPronto(p, contexto()))} className={PRINCIPAL}>
            {ultima ? "Pronto: ver quem ganhou" : "Pronto para a próxima letra"}
          </button>
        )}
      </div>
    );
  }

  // ---------------- a rodada começou sem mim
  if (fase === "fora") {
    return (
      <div className="flex flex-col gap-4">
        {barra}
        {cabecalho}
        <p role="status" className="m-0 rounded-2xl bg-painel p-3.5 text-[17px]">
          {eu < 0 ? "Entrando na sala…" : "Esta rodada começou sem você (você chegou depois, ou a sua conexão caiu). Você entra na próxima."}
        </p>
        {linhasTotal.length ? <PlacarLista titulo="Placar" linhas={linhasTotal} /> : null}
      </div>
    );
  }

  // ---------------- rodada fechada, a próxima ainda não abriu
  if (fase === "entre") {
    const jogadores = quemJoga(p, presentes).length;
    return (
      <div className="flex flex-col gap-4">
        {barra}
        {cabecalho}
        <p role="status" className="m-0 rounded-2xl bg-painel p-3.5 text-[17px]">
          {p.papel === "criador"
            ? jogadores >= 2
              ? "Rodada fechada."
              : "A rodada fechou, mas não tem mais ninguém na sala agora. A próxima letra sai quando alguém voltar."
            : "Rodada fechada. Esperando a próxima letra…"}
        </p>
        {p.papel === "criador" && jogadores >= 2 ? (
          <button type="button" onClick={() => aplicar(abrirProxima(p, contexto()))} className={PRINCIPAL}>
            Sortear a próxima letra
          </button>
        ) : null}
        <PlacarLista titulo="Placar" linhas={linhasTotal} />
      </div>
    );
  }

  // ---------------- fim
  const maior = Math.max(0, ...linhasTotal.map((l) => l.pontos));
  const vencedores = linhasTotal.filter((l) => l.pontos === maior).map((l) => l.chave);
  const titulo =
    vencedores.length === 1 ? (vencedores[0] === eu ? "Você venceu!" : `${maiuscula(oBicho(vencedores[0]))} venceu!`) : `Empate entre ${juntar(vencedores.map(o))}!`;
  const querem = p.papel === "criador" ? p.elenco.map((_, i) => i).filter((i) => i !== eu && (p.vistos[p.elenco[i]]?.p ?? 0) > p.p) : [];
  const salaSeguiu = p.papel === "convidado" && p.pSala > p.p;
  return (
    <div className="flex flex-col gap-4">
      {barra}
      <div role="status" className="flex flex-col gap-1 rounded-2xl bg-azul p-4 text-white">
        <p className="aparece m-0 font-display text-[24px] font-extrabold">{titulo}</p>
        <p className="m-0 text-[15px] text-white/90">
          {maior} pontos{vencedores.length > 1 ? " cada" : ""}, em {p.config.total} rodadas.
        </p>
      </div>
      <PlacarLista titulo="Placar final" linhas={linhasTotal} />
      <Conversa perguntas={conversa} />
      {querem.length ? (
        <p role="status" className="m-0 text-[15px] font-bold">
          {maiuscula(juntar(querem.map(oBicho)))} {querem.length > 1 ? "querem" : "quer"} jogar de novo.
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => aplicar(revancheStop(p))} className={`${PRINCIPAL} sm:flex-1`}>
          {salaSeguiu ? `${maiuscula(oBicho(0))} quer jogar de novo: entrar` : "Jogar de novo"}
        </button>
        <Link href="/" className={`${SECUNDARIO} no-underline`}>
          Ver outros jogos
        </Link>
      </div>
    </div>
  );
}
