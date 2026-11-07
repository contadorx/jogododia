"use client";

import { useEffect, useState } from "react";
import type { Lado } from "@/lib/jogos/motor";
import {
  PONTOS,
  POSICAO,
  destinos,
  faseDe,
  motorTrilha,
  tirarDepois,
  type EstadoTrilha,
  type JogadaTrilha,
} from "@/lib/jogos/trilha";
import { SECUNDARIO } from "../batalha/Montagem";
import { COR, lado } from "./cores";
import { JogoPorTurnos, type ConfigJogo, type PropsTabuleiro } from "./JogoPorTurnos";

const PASSO = 50;
const MARGEM = 30;
const TAMANHO = 6 * PASSO + 2 * MARGEM;
const xy = (p: number) => ({ x: MARGEM + POSICAO[p][0] * PASSO, y: MARGEM + POSICAO[p][1] * PASSO });
const NOMES = ["brancas", "pretas"] as const;

/** As linhas do tabuleiro: 3 quadrados e as 4 ligações entre eles. */
const LINHAS: [number, number][] = [
  [0, 2], [21, 23], [0, 21], [2, 23],
  [3, 5], [18, 20], [3, 18], [5, 20],
  [6, 8], [15, 17], [6, 15], [8, 17],
  [1, 7], [16, 22], [9, 11], [12, 14],
];

function Peca({ x, y, l, apagada }: { x: number; y: number; l: Lado; apagada?: boolean }) {
  const cor = l === 0 ? COR.branco : COR.preto;
  return (
    <g opacity={apagada ? 0.35 : 1} pointerEvents="none">
      <circle cx={x} cy={y + 2} r={17} fill="rgba(0,0,0,.18)" />
      <circle cx={x} cy={y} r={17} fill={cor.forte} stroke="var(--color-tinta)" strokeWidth={2} />
      <circle cx={x} cy={y} r={10} fill="none" stroke={l === 0 ? "var(--color-borda)" : "#3a4256"} strokeWidth={2} />
    </g>
  );
}

function TabuleiroTrilha({ estado, jogador, podeJogar, aoJogar, ultima }: PropsTabuleiro<EstadoTrilha, JogadaTrilha>) {
  const [sel, setSel] = useState<number | null>(null);
  const [pendente, setPendente] = useState<{ de: number | null; para: number } | null>(null);
  useEffect(() => {
    setSel(null);
    setPendente(null);
  }, [estado]);

  const eu: Lado = jogador === "ambos" ? estado.vez : jogador;
  const fase = faseDe(estado);
  const tirar = pendente ? tirarDepois(estado, pendente.de, pendente.para) : [];
  const alvos = new Set(podeJogar && !pendente ? (fase === "por" ? destinos(estado, null) : sel !== null ? destinos(estado, sel) : []) : []);

  // como o tabuleiro fica enquanto a pessoa escolhe a peça a tirar
  const casas = [...estado.casas];
  if (pendente) {
    if (pendente.de !== null) casas[pendente.de] = null;
    casas[pendente.para] = estado.vez;
  }

  const ir = (de: number | null, para: number) => {
    const t = tirarDepois(estado, de, para);
    if (t.length) setPendente({ de, para });
    else aoJogar({ de, para, tira: null });
  };

  const tocar = (p: number) => {
    if (!podeJogar) return;
    if (pendente) {
      if (tirar.includes(p)) aoJogar({ ...pendente, tira: p });
      return;
    }
    if (fase === "por") {
      if (estado.casas[p] === null) ir(null, p);
      return;
    }
    if (estado.casas[p] === estado.vez) setSel(sel === p ? null : p);
    else if (sel !== null && alvos.has(p)) ir(sel, p);
  };

  const pode = (p: number) =>
    podeJogar &&
    (pendente ? tirar.includes(p) : fase === "por" ? estado.casas[p] === null : estado.casas[p] === estado.vez || alvos.has(p));

  let dica: string;
  if (!podeJogar) dica = "";
  else if (pendente) dica = `Moinho! Toque numa peça ${estado.vez === 0 ? "preta" : "branca"} para tirar.`;
  else if (fase === "por") dica = `Toque num ponto livre para pôr uma peça (${estado.naMao[estado.vez]} na mão).`;
  else if (sel === null) dica = fase === "voar" ? "Você tem só 3 peças: pode voar. Escolha a peça que vai mover." : "Escolha a peça que vai mover.";
  else dica = fase === "voar" ? "Agora toque em qualquer ponto livre." : "Agora toque num ponto vizinho livre, seguindo a linha.";

  const placarLado = (l: Lado) => (
    <p className={`m-0 flex items-center gap-2 text-sm ${l === estado.vez ? "font-bold" : "text-suave"}`}>
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill={l === 0 ? COR.branco.forte : COR.preto.forte} stroke="var(--color-tinta)" strokeWidth="2" />
      </svg>
      {NOMES[l]}: {estado.naMao[l]} na mão, {estado.noTabuleiro[l]} no tabuleiro
    </p>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        {placarLado(eu === 0 ? 1 : 0)}
        {placarLado(eu)}
      </div>
      <div className="rounded-2xl p-2" style={{ background: "#ead9b9" }}>
        <svg viewBox={`0 0 ${TAMANHO} ${TAMANHO}`} className="block h-auto max-h-[64vh] w-full touch-manipulation select-none" role="group" aria-label="Tabuleiro de trilha">
          {LINHAS.map(([a, b]) => {
            const p = xy(a);
            const q = xy(b);
            return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#5b3b1d" strokeWidth={4} strokeLinecap="round" />;
          })}
          {Array.from({ length: PONTOS }, (_, p) => {
            const { x, y } = xy(p);
            const dono = casas[p];
            const ativo = pode(p);
            const recente = !pendente && ultima && (ultima.para === p || ultima.de === p);
            return (
              <g key={p}>
                {recente ? (
                  <circle cx={x} cy={y} r={23} fill="none" stroke="var(--color-sol)" strokeWidth={4} strokeDasharray={ultima?.de === p ? "5 5" : undefined} />
                ) : null}
                {dono === null ? <circle cx={x} cy={y} r={alvos.has(p) ? 9 : 6} fill={alvos.has(p) ? "var(--color-sol)" : "#5b3b1d"} /> : <Peca x={x} y={y} l={dono} />}
                {!pendente && ultima?.tira === p && dono === null ? (
                  <text x={x} y={y + 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--color-fogo)" pointerEvents="none">
                    ×
                  </text>
                ) : null}
                {sel === p ? <circle cx={x} cy={y} r={22} fill="none" stroke="var(--color-azul)" strokeWidth={4} pointerEvents="none" /> : null}
                {pendente && tirar.includes(p) ? <circle cx={x} cy={y} r={22} fill="none" stroke="var(--color-fogo)" strokeWidth={4} pointerEvents="none" /> : null}
                <circle
                  cx={x}
                  cy={y}
                  r={24}
                  fill="transparent"
                  role={ativo ? "button" : undefined}
                  tabIndex={ativo ? 0 : undefined}
                  aria-label={`Ponto ${p + 1}${dono === null ? ", livre" : `, peça ${dono === 0 ? "branca" : "preta"}`}`}
                  className={ativo ? "cursor-pointer outline-none" : undefined}
                  onClick={ativo ? () => tocar(p) : undefined}
                  onKeyDown={
                    ativo
                      ? (ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            tocar(p);
                          }
                        }
                      : undefined
                  }
                />
              </g>
            );
          })}
        </svg>
      </div>
      {dica ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="note" className={`m-0 flex-1 rounded-2xl p-3 text-[15px] font-bold ${pendente ? "bg-fogo-claro text-alerta" : "bg-sol-claro"}`}>
            {dica}
          </p>
          {pendente ? (
            <button type="button" onClick={() => setPendente(null)} className={SECUNDARIO}>
              Voltar
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const config: ConfigJogo<EstadoTrilha, JogadaTrilha> = {
  motor: motorTrilha,
  nome: "Trilha",
  lados: [lado("branco", "brancas", "as"), lado("preto", "pretas", "as")],
  Tabuleiro: TabuleiroTrilha,
  lembrete: "Três peças suas em linha formam um moinho e tiram uma peça do outro. Perde quem ficar com 2 peças ou sem jogada.",
};

export function JogarTrilha({ conversa }: { conversa: readonly string[] }) {
  return <JogoPorTurnos config={config} conversa={conversa} />;
}
