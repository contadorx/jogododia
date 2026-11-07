"use client";

import { useState } from "react";
import { KOMI, N_GO, grupoDe, motorGo, type EstadoGo, type JogadaGo } from "@/lib/jogos/go";
import { SECUNDARIO } from "../batalha/Montagem";
import { COR, lado } from "./cores";
import { JogoPorTurnos, type ConfigJogo, type PropsTabuleiro } from "./JogoPorTurnos";

const PASSO = 40;
const MARGEM = 36;
const TAM = (N_GO - 1) * PASSO + 2 * MARGEM;
const xy = (i: number) => ({ x: MARGEM + (i % N_GO) * PASSO, y: MARGEM + Math.floor(i / N_GO) * PASSO });
const ESTRELAS = [20, 24, 40, 56, 60];
const LETRAS = "ABCDEFGHJ";

function TabuleiroGo({ estado, jogador, podeJogar, aoJogar }: PropsTabuleiro<EstadoGo, JogadaGo>) {
  const [foco, setFoco] = useState<number | null>(null);
  const eu = jogador === "ambos" ? estado.vez : jogador;
  // grupos com uma liberdade só (em atari) ganham um aviso vermelho: ajuda a enxergar o perigo
  const emAtari = new Set<number>();
  const vistos = new Set<number>();
  estado.casas.forEach((c, i) => {
    if (c === null || vistos.has(i)) return;
    const g = grupoDe(estado.casas, i);
    for (const p of g.pedras) vistos.add(p);
    if (g.liberdades === 1) for (const p of g.pedras) emAtari.add(p);
  });
  const territorio = estado.fim?.territorio;

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl p-1.5" style={{ background: "#dcb35c" }}>
        <svg viewBox={`0 0 ${TAM} ${TAM}`} className="block h-auto max-h-[68vh] w-full touch-manipulation select-none" role="group" aria-label="Tabuleiro de Go">
          {Array.from({ length: N_GO }, (_, k) => (
            <g key={k} stroke="#5b3b1d" strokeWidth={1.4}>
              <line x1={MARGEM} y1={MARGEM + k * PASSO} x2={TAM - MARGEM} y2={MARGEM + k * PASSO} />
              <line x1={MARGEM + k * PASSO} y1={MARGEM} x2={MARGEM + k * PASSO} y2={TAM - MARGEM} />
              <text x={MARGEM + k * PASSO} y={12} textAnchor="middle" fontSize="11" fontWeight="700" fill="#5b3b1d" stroke="none">
                {LETRAS[k]}
              </text>
              <text x={9} y={MARGEM + k * PASSO + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#5b3b1d" stroke="none">
                {N_GO - k}
              </text>
            </g>
          ))}
          {ESTRELAS.map((i) => (
            <circle key={i} cx={xy(i).x} cy={xy(i).y} r={3.5} fill="#5b3b1d" />
          ))}
          {estado.casas.map((c, i) => {
            const { x, y } = xy(i);
            const pode = podeJogar && c === null && motorGo.valida(estado, { casa: i });
            return (
              <g key={i}>
                {territorio?.[i] !== undefined && territorio[i] !== null && c === null ? (
                  <rect x={x - 6} y={y - 6} width={12} height={12} fill={territorio[i] === 0 ? COR.preto.forte : COR.branco.forte} stroke="#5b3b1d" strokeWidth={1} />
                ) : null}
                {c !== null ? (
                  <>
                    <circle cx={x} cy={y + 1.5} r={18} fill="rgba(0,0,0,.25)" />
                    <circle cx={x} cy={y} r={18} fill={c === 0 ? COR.preto.forte : COR.branco.forte} stroke={c === 0 ? "#000" : "#9e978a"} strokeWidth={1.2} />
                  </>
                ) : pode && foco === i ? (
                  <circle cx={x} cy={y} r={17} fill={eu === 0 ? COR.preto.forte : COR.branco.forte} opacity={0.45} />
                ) : null}
                {c !== null && emAtari.has(i) && !estado.fim ? <circle cx={x} cy={y} r={5} fill="var(--color-fogo)" /> : null}
                {estado.ultima === i ? <circle cx={x} cy={y} r={7} fill="none" stroke={c === 0 ? "#fff" : "#1c2333"} strokeWidth={2.5} /> : null}
                {pode ? (
                  <rect
                    x={x - PASSO / 2}
                    y={y - PASSO / 2}
                    width={PASSO}
                    height={PASSO}
                    fill="transparent"
                    role="button"
                    tabIndex={0}
                    aria-label={`${LETRAS[i % N_GO]}${N_GO - Math.floor(i / N_GO)}`}
                    className="cursor-pointer outline-none"
                    onPointerEnter={() => setFoco(i)}
                    onPointerLeave={() => setFoco((f) => (f === i ? null : f))}
                    onFocus={() => setFoco(i)}
                    onBlur={() => setFoco((f) => (f === i ? null : f))}
                    onClick={() => aoJogar({ casa: i })}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        aoJogar({ casa: i });
                      }
                    }}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      {podeJogar ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => aoJogar({ passa: true })} className={SECUNDARIO}>
            Passar a vez
          </button>
          <span className="text-sm text-suave">
            {estado.ultima === "passou" ? "O outro passou. Se você passar também, a partida acaba e o site conta os pontos." : "Os dois passando seguido, a partida acaba."}
          </span>
        </div>
      ) : null}
      {estado.fim ? (
        <p className="m-0 text-sm text-suave">Os quadradinhos mostram de quem é cada cruzamento vazio na contagem.</p>
      ) : (
        <p className="m-0 text-sm text-suave">Pedra com bolinha vermelha tem só uma liberdade: está em perigo (atari).</p>
      )}
    </div>
  );
}

const config: ConfigJogo<EstadoGo, JogadaGo> = {
  motor: motorGo,
  nome: "Go",
  lados: [lado("preto", "pretas", "as"), lado("branco", "brancas", "as")],
  Tabuleiro: TabuleiroGo,
  lembrete: `Cerque as pedras do outro para capturar e cerque espaços vazios para marcar pontos. As brancas ganham ${String(KOMI).replace(".", ",")} de compensação porque as pretas começam.`,
  placar: (e) => `Capturadas: pretas ${e.capturas[0]} · brancas ${e.capturas[1]}`,
};

export function JogarGo({ conversa }: { conversa: readonly string[] }) {
  return <JogoPorTurnos config={config} conversa={conversa} />;
}
