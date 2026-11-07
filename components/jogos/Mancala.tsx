"use client";

import { useEffect, useRef, useState } from "react";
import { casasDo, casasJogaveis, motorMancala, type EstadoMancala, type JogadaMancala } from "@/lib/jogos/mancala";
import type { Lado } from "@/lib/jogos/motor";
import { COR, lado } from "./cores";
import { JogoPorTurnos, type ConfigJogo, type PropsTabuleiro } from "./JogoPorTurnos";

const CORES = [COR.azul, COR.vermelho] as const;
const NOMES = ["azul", "vermelho"] as const;
const MADEIRA = "#c98b4e";
const BURACO = "#7a4a22";
const SEMENTE = "#fbf0d4";
const PASSO_MS = 200;

/** Mostra a semeadura da última jogada semente por semente (e pula se a pessoa tocar no tabuleiro). */
function useSemeadura(estado: EstadoMancala) {
  const [passo, setPasso] = useState<number | null>(null);
  const visto = useRef(estado.feitas);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);
  const rastro = useRef(estado.rastro);
  rastro.current = estado.rastro;

  const parar = () => {
    if (relogio.current) clearInterval(relogio.current);
    relogio.current = null;
    setPasso(null);
  };

  useEffect(() => {
    const antes = visto.current;
    visto.current = estado.feitas;
    // só anima jogada nova (desfazer e partida nova não animam)
    const r = rastro.current;
    if (estado.feitas !== antes + 1 || !r || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let k = 0;
    setPasso(0);
    relogio.current = setInterval(() => {
      k += 1;
      if (k > r.caminho.length) parar();
      else setPasso(k);
    }, PASSO_MS);
    return () => {
      if (relogio.current) clearInterval(relogio.current);
      relogio.current = null;
    };
  }, [estado.feitas]);

  const r = estado.rastro;
  if (passo === null || !r) return { casas: estado.casas, animando: false, caiu: null as number | null, pular: parar };
  const casas = [...r.antes];
  casas[r.origem] = 0;
  for (const i of r.caminho.slice(0, passo)) casas[i] += 1;
  return { casas, animando: true, caiu: passo > 0 ? r.caminho[passo - 1] : null, pular: parar };
}

function Sementes({ n }: { n: number }) {
  const mostrar = Math.min(n, 12);
  return (
    <span aria-hidden="true" className="flex max-w-[78%] flex-wrap content-center justify-center gap-[3px]">
      {Array.from({ length: mostrar }, (_, i) => (
        <span key={i} className="block h-[7px] w-[7px] rounded-full" style={{ background: SEMENTE }} />
      ))}
    </span>
  );
}

function TabuleiroMancala({ estado, jogador, podeJogar, aoJogar }: PropsTabuleiro<EstadoMancala, JogadaMancala>) {
  const { casas, animando, caiu, pular } = useSemeadura(estado);
  const embaixo: Lado = jogador === 1 ? 1 : 0;
  const emCima: Lado = embaixo === 0 ? 1 : 0;
  // a fileira de cima é lida da direita para a esquerda, para o giro ficar anti-horário na tela
  const linhaDeBaixo = casasDo(embaixo);
  const linhaDeCima = [...casasDo(emCima)].reverse();
  const jogaveis = new Set(podeJogar && !animando ? casasJogaveis(estado) : []);
  const r = estado.rastro;
  const colhidas = new Set(!animando && r ? r.colhidas : []);

  const casa = (i: number, dono: Lado) => {
    const n = casas[i];
    const pode = jogaveis.has(i);
    const origem = r?.origem === i && !animando;
    const ultima = !animando && r?.caminho.at(-1) === i;
    const posicao = (dono === 0 ? i : i - 6) + 1;
    return (
      <div key={i} className="flex flex-col items-center gap-0.5">
        {dono === emCima ? <span className="font-display text-[15px] font-extrabold text-white">{n}</span> : null}
        <button
          type="button"
          disabled={!pode}
          onClick={() => aoJogar({ casa: i })}
          aria-label={`Casa ${posicao} do ${NOMES[dono]}, ${n} ${n === 1 ? "semente" : "sementes"}`}
          className={`relative flex aspect-square w-full items-center justify-center rounded-full transition-shadow ${
            pode ? "ring-[3px] ring-sol enabled:hover:brightness-110" : ""
          } ${caiu === i || colhidas.has(i) ? "pisca" : ""} ${origem ? "outline-2 outline-offset-2 outline-white/70 outline-dashed" : ""}`}
          style={{ background: BURACO, boxShadow: "inset 0 3px 6px rgba(0,0,0,.45)" }}
        >
          <Sementes n={n} />
          {n > 12 ? <span className="absolute bottom-[8%] text-[11px] font-bold text-white">+{n - 12}</span> : null}
          {ultima ? <span aria-hidden="true" className="absolute -top-1 right-0 h-3 w-3 rounded-full bg-sol ring-2 ring-white" /> : null}
        </button>
        {dono === embaixo ? <span className="font-display text-[15px] font-extrabold text-white">{n}</span> : null}
      </div>
    );
  };

  const deposito = (l: Lado) => (
    <p className="m-0 flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-[15px] font-bold" style={{ background: CORES[l].claro }}>
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: CORES[l].forte }} />
        Colheita do {NOMES[l]}
      </span>
      <span>
        <span className="font-display text-[20px] font-extrabold">{estado.colhidas[l]}</span>
        <span className="text-sm font-bold text-suave"> de 25</span>
      </span>
    </p>
  );

  return (
    <div className="flex flex-col gap-2" onClick={animando ? pular : undefined}>
      {deposito(emCima)}
      <div className="flex flex-col gap-2 rounded-[28px] p-2.5 shadow-inner" style={{ background: MADEIRA }}>
        <div className="flex items-center gap-1 rounded-2xl px-1 pt-1" style={{ boxShadow: `inset 0 -4px 0 ${CORES[emCima].forte}` }}>
          <div className="grid flex-1 grid-cols-6 gap-[clamp(4px,1.6vw,10px)] pb-2">{linhaDeCima.map((i) => casa(i, emCima))}</div>
        </div>
        <p aria-hidden="true" className="m-0 flex items-center justify-between px-1 text-xs font-bold text-white/90">
          <span className="text-[18px] leading-none">↓</span>
          <span>as sementes andam neste sentido</span>
          <span className="text-[18px] leading-none">↑</span>
        </p>
        <div className="flex items-center gap-1 rounded-2xl px-1 pb-1" style={{ boxShadow: `inset 0 4px 0 ${CORES[embaixo].forte}` }}>
          <div className="grid flex-1 grid-cols-6 gap-[clamp(4px,1.6vw,10px)] pt-2">{linhaDeBaixo.map((i) => casa(i, embaixo))}</div>
        </div>
      </div>
      {deposito(embaixo)}
      {r?.perdoou && !animando ? (
        <p className="m-0 text-sm text-suave">A última jogada levaria todas as sementes do outro lado, então não houve colheita.</p>
      ) : null}
    </div>
  );
}

const config: ConfigJogo<EstadoMancala, JogadaMancala> = {
  motor: motorMancala,
  nome: "Mancala",
  lados: [
    { ...lado("azul", "azul", "o"), voce: "Você joga com as casas azuis (as de baixo)." },
    { ...lado("vermelho", "vermelho", "o"), voce: "Você joga com as casas vermelhas (as de baixo)." },
  ],
  Tabuleiro: TabuleiroMancala,
  lembrete:
    "Toque numa casa sua: as sementes são soltas uma em cada casa, no sentido contrário ao do relógio. Se a última cair do outro lado e a casa ficar com 2 ou 3, você colhe.",
  aviso: (e) => {
    const outro = e.vez === 0 ? 1 : 0;
    const vazio = casasDo(outro).every((i) => e.casas[i] === 0);
    return vazio ? `O ${NOMES[outro]} está sem sementes: o ${NOMES[e.vez]} tem que jogar uma casa que chegue até o lado dele.` : null;
  },
};

export function JogarMancala({ conversa }: { conversa: readonly string[] }) {
  return <JogoPorTurnos config={config} conversa={conversa} />;
}
