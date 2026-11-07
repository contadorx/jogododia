"use client";

import { useState } from "react";
import {
  HORIZONTAIS,
  LADO_P,
  TOTAL_LINHAS,
  motorPontinhos,
  pontasDaLinha,
  type EstadoPontinhos,
  type JogadaPontinhos,
} from "@/lib/jogos/pontinhos";
import { COR, lado } from "./cores";
import { JogoPorTurnos, type ConfigJogo, type PropsTabuleiro } from "./JogoPorTurnos";

const CORES = [COR.azul, COR.vermelho] as const;
const PASSO = 100;
const MARGEM = 24;
const TAMANHO = LADO_P * PASSO + 2 * MARGEM;
const ponto = (i: number) => MARGEM + i * PASSO;
const LETRAS = "ABCDE";

/** Nome falado da linha, para leitor de tela: "linha de A1 a A2". */
function nomeDaLinha(l: number) {
  const { f, c, horizontal } = pontasDaLinha(l);
  const de = `${LETRAS[c]}${f + 1}`;
  const ate = horizontal ? `${LETRAS[c + 1]}${f + 1}` : `${LETRAS[c]}${f + 2}`;
  return `Linha de ${de} a ${ate}`;
}

/** Grade de pontos em SVG. Cada linha possível tem uma área de toque larga em volta dela. */
function TabuleiroPontinhos({ estado, podeJogar, aoJogar, ultima }: PropsTabuleiro<EstadoPontinhos, JogadaPontinhos>) {
  const [foco, setFoco] = useState<number | null>(null);
  const vez = CORES[estado.vez];

  return (
    <div className="rounded-2xl bg-painel p-2">
      <svg viewBox={`0 0 ${TAMANHO} ${TAMANHO}`} className="block h-auto w-full touch-manipulation select-none" role="group" aria-label="Grade de pontos">
        {/* quadrados fechados */}
        {estado.quadrados.map((dono, q) => {
          if (dono === null) return null;
          const f = Math.floor(q / LADO_P);
          const c = q % LADO_P;
          return (
            <g key={`q${q}`}>
              <rect x={ponto(c) + 4} y={ponto(f) + 4} width={PASSO - 8} height={PASSO - 8} rx={8} fill={CORES[dono].claro} />
              <circle cx={ponto(c) + PASSO / 2} cy={ponto(f) + PASSO / 2} r={16} fill={CORES[dono].forte} />
            </g>
          );
        })}

        {/* linhas */}
        {Array.from({ length: TOTAL_LINHAS }, (_, l) => {
          const { f, c, horizontal } = pontasDaLinha(l);
          const x1 = ponto(c);
          const y1 = ponto(f);
          const x2 = horizontal ? ponto(c + 1) : x1;
          const y2 = horizontal ? y1 : ponto(f + 1);
          const dono = estado.linhas[l];
          const eUltima = ultima?.linha === l;
          if (dono !== null) {
            return (
              <g key={l}>
                {eUltima ? <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-sol)" strokeWidth={22} strokeLinecap="round" /> : null}
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={CORES[dono].forte} strokeWidth={9} strokeLinecap="round" />
              </g>
            );
          }
          const mostrar = podeJogar && foco === l;
          // área de toque: retângulo em volta da linha, sem cobrir os pontos
          const largura = horizontal ? PASSO - 22 : 44;
          const altura = horizontal ? 44 : PASSO - 22;
          const x = horizontal ? x1 + 11 : x1 - 22;
          const y = horizontal ? y1 - 22 : y1 + 11;
          return (
            <g key={l}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={mostrar ? vez.forte : "var(--color-borda)"} strokeOpacity={mostrar ? 0.55 : 1} strokeWidth={mostrar ? 9 : 2} strokeDasharray={mostrar ? undefined : "6 8"} strokeLinecap="round" />
              {podeJogar ? (
                <rect
                  x={x}
                  y={y}
                  width={largura}
                  height={altura}
                  fill="transparent"
                  role="button"
                  tabIndex={0}
                  aria-label={nomeDaLinha(l)}
                  className="cursor-pointer outline-none"
                  onPointerEnter={() => setFoco(l)}
                  onPointerLeave={() => setFoco((x) => (x === l ? null : x))}
                  onFocus={() => setFoco(l)}
                  onBlur={() => setFoco((x) => (x === l ? null : x))}
                  onClick={() => aoJogar({ linha: l })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      aoJogar({ linha: l });
                    }
                  }}
                />
              ) : null}
            </g>
          );
        })}

        {/* pontos por cima de tudo */}
        {Array.from({ length: (LADO_P + 1) * (LADO_P + 1) }, (_, i) => (
          <circle key={`p${i}`} cx={ponto(i % (LADO_P + 1))} cy={ponto(Math.floor(i / (LADO_P + 1)))} r={8} fill="var(--color-tinta)" pointerEvents="none" />
        ))}
      </svg>
      <p className="m-0 sr-only">{`${HORIZONTAIS * 2 - estado.feitas} linhas ainda livres.`}</p>
    </div>
  );
}

const config: ConfigJogo<EstadoPontinhos, JogadaPontinhos> = {
  motor: motorPontinhos,
  nome: "Pontinhos",
  lados: [lado("azul", "azul", "o"), lado("vermelho", "vermelho", "o")],
  Tabuleiro: TabuleiroPontinhos,
  lembrete: "Toque entre dois pontos vizinhos para fazer uma linha. Fechou um quadrado? Ele é seu e você joga de novo.",
  placar: (e) => `Quadrados: azul ${e.pontos[0]} × ${e.pontos[1]} vermelho`,
};

export function JogarPontinhos({ conversa }: { conversa: readonly string[] }) {
  return <JogoPorTurnos config={config} conversa={conversa} />;
}
