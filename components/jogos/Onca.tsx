"use client";

import { useEffect, useMemo, useState } from "react";
import { LINHAS_ONCA, PARA_VENCER, PONTOS_ONCA, lancesOnca, motorOnca, type EstadoOnca, type JogadaOnca } from "@/lib/jogos/onca";
import { PRINCIPAL } from "../batalha/Montagem";
import { JogoPorTurnos, type ConfigJogo, type InfoLado, type PropsTabuleiro } from "./JogoPorTurnos";

const PASSO = 64;
const MARGEM = 30;
const ONCA = "#e8a33d";
const CACHORRO = "#8b5a2b";
const xy = (i: number) => ({ x: MARGEM + PONTOS_ONCA[i][0] * PASSO, y: MARGEM + (PONTOS_ONCA[i][1] + 2) * PASSO });
const LARGURA = 4 * PASSO + 2 * MARGEM;
const ALTURA = 6 * PASSO + 2 * MARGEM;

function PecaOnca({ x, y }: { x: number; y: number }) {
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y + 2} r={21} fill="rgba(0,0,0,.25)" />
      <circle cx={x} cy={y} r={21} fill={ONCA} stroke="#7a4a12" strokeWidth={2} />
      {[
        [-8, -6],
        [6, -9],
        [9, 5],
        [-5, 8],
        [0, -1],
      ].map(([dx, dy], k) => (
        <circle key={k} cx={x + dx} cy={y + dy} r={3.4} fill="#4a2c0a" />
      ))}
    </g>
  );
}

function PecaCachorro({ x, y }: { x: number; y: number }) {
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y + 2} r={17} fill="rgba(0,0,0,.25)" />
      <circle cx={x} cy={y} r={17} fill={CACHORRO} stroke="#3d2410" strokeWidth={2} />
      <circle cx={x} cy={y} r={9} fill="none" stroke="#d9b48a" strokeWidth={2} />
    </g>
  );
}

function TabuleiroOnca({ estado, podeJogar, aoJogar }: PropsTabuleiro<EstadoOnca, JogadaOnca>) {
  const [caminho, setCaminho] = useState<number[]>([]);
  useEffect(() => setCaminho([]), [estado]);
  const lances = useMemo(() => (podeJogar ? lancesOnca(estado) : []), [estado, podeJogar]);
  const comPrefixo = lances.filter((l) => caminho.every((c, k) => l[k] === c));
  const origens = new Set(lances.map((l) => l[0]));
  const proximas = new Set(caminho.length ? comPrefixo.map((l) => l[caminho.length]).filter((x) => x !== undefined) : []);
  const podeParar = caminho.length > 1 && lances.some((l) => l.length === caminho.length && l.every((c, k) => c === caminho[k]));
  const ultima = estado.ultima;

  const tocar = (p: number) => {
    if (!podeJogar) return;
    if (caminho.length <= 1 && origens.has(p)) return setCaminho(caminho[0] === p ? [] : [p]);
    if (!proximas.has(p)) return;
    const novo = [...caminho, p];
    const continua = lances.some((l) => l.length > novo.length && novo.every((c, k) => l[k] === c));
    if (continua) setCaminho(novo);
    else aoJogar({ caminho: novo });
  };

  // a peça que está se mexendo aparece na ponta do caminho
  const posOnca = estado.vez === 0 && caminho.length > 1 ? caminho[caminho.length - 1] : estado.onca;
  const cachorroMovendo = estado.vez === 1 && caminho.length > 1 ? caminho[0] : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl p-2" style={{ background: "#d8c49a" }}>
        <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="block h-auto max-h-[66vh] w-full touch-manipulation select-none" role="group" aria-label="Tabuleiro do jogo da onça">
          {/* a toca: o triângulo de cima */}
          <polygon points={[28, 30, 2].map((i) => `${xy(i).x},${xy(i).y}`).join(" ")} fill="#c9ad78" />
          {LINHAS_ONCA.map(([a, b]) => {
            const p = xy(a);
            const q = xy(b);
            const naToca = a >= 25 || b >= 25;
            return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={naToca ? "#7a4a12" : "#5b3b1d"} strokeWidth={naToca ? 4 : 3} strokeLinecap="round" />;
          })}
          {PONTOS_ONCA.map((_, i) => {
            const { x, y } = xy(i);
            const temCachorro = estado.cachorros.includes(i) && i !== cachorroMovendo;
            const ativo = podeJogar && (origens.has(i) || proximas.has(i));
            const recente = !caminho.length && ultima && (ultima.caminho.includes(i) || ultima.pegos.includes(i));
            return (
              <g key={i}>
                {recente ? <circle cx={x} cy={y} r={24} fill="none" stroke="var(--color-sol)" strokeWidth={4} strokeDasharray={ultima?.pegos.includes(i) ? "4 5" : undefined} /> : null}
                <circle cx={x} cy={y} r={proximas.has(i) ? 10 : 5} fill={proximas.has(i) ? "var(--color-sol)" : "#5b3b1d"} />
                {temCachorro ? <PecaCachorro x={x} y={y} /> : null}
                {i === posOnca ? <PecaOnca x={x} y={y} /> : null}
                {cachorroMovendo !== null && caminho.length > 1 && i === caminho[caminho.length - 1] ? <PecaCachorro x={x} y={y} /> : null}
                {caminho[0] === i && caminho.length === 1 ? <circle cx={x} cy={y} r={25} fill="none" stroke="var(--color-azul)" strokeWidth={4} pointerEvents="none" /> : null}
                <circle
                  cx={x}
                  cy={y}
                  r={26}
                  fill="transparent"
                  role={ativo ? "button" : undefined}
                  tabIndex={ativo ? 0 : undefined}
                  aria-label={`Ponto ${i + 1}${i === estado.onca ? ", onça" : estado.cachorros.includes(i) ? ", cachorro" : ""}`}
                  className={ativo ? "cursor-pointer outline-none" : undefined}
                  onClick={ativo ? () => tocar(i) : undefined}
                  onKeyDown={
                    ativo
                      ? (ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            tocar(i);
                          }
                        }
                      : undefined
                  }
                />
              </g>
            );
          })}
          <text x={LARGURA / 2} y={MARGEM - 12} textAnchor="middle" fontSize="13" fontWeight="700" fill="#7a4a12">
            toca da onça
          </text>
        </svg>
      </div>
      {podeParar ? (
        <button type="button" onClick={() => aoJogar({ caminho })} className={PRINCIPAL}>
          Parar de pular aqui
        </button>
      ) : null}
      {podeJogar ? (
        <p role="note" className="m-0 rounded-2xl bg-sol-claro p-3 text-[15px] font-bold">
          {caminho.length > 1
            ? "Pulou! Dá para pular de novo (toque no ponto marcado) ou parar aqui."
            : estado.vez === 0
              ? caminho.length
                ? "Agora toque num ponto marcado: um passo, ou um pulo por cima de um cachorro."
                : "Toque na onça para ver para onde ela pode ir."
              : caminho.length
                ? "Agora toque no ponto livre para onde o cachorro vai."
                : "Toque num cachorro que pode andar."}
        </p>
      ) : null}
    </div>
  );
}

const LADOS: [InfoLado, InfoLado] = [
  { cor: ONCA, vez: "Vez da onça", vitoria: "Vitória da onça!", voce: "Você joga com a onça." },
  { cor: CACHORRO, vez: "Vez dos cachorros", vitoria: "Vitória dos cachorros!", voce: "Você joga com os cachorros." },
];

const config: ConfigJogo<EstadoOnca, JogadaOnca> = {
  motor: motorOnca,
  nome: "Jogo da onça",
  lados: LADOS,
  Tabuleiro: TabuleiroOnca,
  lembrete: `A onça captura pulando um cachorro e pode emendar pulos. Ela ganha com ${PARA_VENCER} capturas; os cachorros ganham se cercarem a onça.`,
  placar: (e) => `Cachorros capturados: ${e.capturados} de ${PARA_VENCER}`,
};

export function JogarOnca({ conversa }: { conversa: readonly string[] }) {
  return <JogoPorTurnos config={config} conversa={conversa} />;
}
