"use client";

import { useEffect, useMemo, useState } from "react";
import { LADO_D, escura, lancesDamas, motorDamas, type EstadoDamas, type JogadaDamas, type Peca } from "@/lib/jogos/damas";
import type { Lado } from "@/lib/jogos/motor";
import { COR, lado } from "./cores";
import { JogoPorTurnos, type ConfigJogo, type PropsTabuleiro } from "./JogoPorTurnos";

const CLARA = "#f0d9b5";
const ESCURA = "#a97a50";
const LETRAS = "abcdefgh";
const nomeDaCasa = (i: number) => `${LETRAS[i % LADO_D]}${LADO_D - Math.floor(i / LADO_D)}`;

function Coroa() {
  return (
    <svg viewBox="0 0 24 24" className="h-[55%] w-[55%]" aria-hidden="true">
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8z" fill="var(--color-sol)" stroke="var(--color-alerta)" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function DesenhoPeca({ peca, apagada }: { peca: Peca; apagada?: boolean }) {
  const cor = peca.l === 0 ? COR.branco : COR.preto;
  return (
    <span
      className="absolute inset-[11%] flex items-center justify-center rounded-full"
      style={{
        background: cor.forte,
        boxShadow: `inset 0 -3px 0 ${peca.l === 0 ? "#d9d4c7" : "#000"}, 0 2px 3px rgba(0,0,0,.35)`,
        border: `2px solid ${peca.l === 0 ? "#b9b2a2" : "#000"}`,
        opacity: apagada ? 0.35 : 1,
      }}
    >
      {peca.d ? <Coroa /> : null}
    </span>
  );
}

function TabuleiroDamas({ estado, jogador, podeJogar, aoJogar }: PropsTabuleiro<EstadoDamas, JogadaDamas>) {
  const [caminho, setCaminho] = useState<number[]>([]);
  useEffect(() => setCaminho([]), [estado]);

  const lances = useMemo(() => (podeJogar ? lancesDamas(estado) : []), [estado, podeJogar]);
  const comPrefixo = lances.filter((l) => caminho.every((c, k) => l.caminho[k] === c));
  const origens = new Set(lances.map((l) => l.caminho[0]));
  const proximas = new Set(caminho.length ? comPrefixo.map((l) => l.caminho[caminho.length]).filter((x) => x !== undefined) : []);
  // as peças que o caminho escolhido até aqui já pulou (ficam apagadas até o lance terminar)
  const puladas = new Set(caminho.length > 1 ? (comPrefixo[0]?.capturadas.slice(0, caminho.length - 1) ?? []) : []);
  const captura = lances.length > 0 && lances[0].capturadas.length > 0;
  const virado = jogador === 1;

  const tocar = (i: number) => {
    if (!podeJogar) return;
    if (origens.has(i) && (caminho.length <= 1 || !proximas.has(i))) {
      setCaminho(caminho[0] === i ? [] : [i]);
      return;
    }
    if (!proximas.has(i)) return;
    const novo = [...caminho, i];
    const completo = lances.find((l) => l.caminho.length === novo.length && l.caminho.every((c, k) => c === novo[k]));
    // termina quando não há lance mais longo com o mesmo começo
    const continua = lances.some((l) => l.caminho.length > novo.length && novo.every((c, k) => l.caminho[k] === c));
    if (completo && !continua) aoJogar({ caminho: completo.caminho });
    else setCaminho(novo);
  };

  const ultimo = estado.ultimo;
  const marcadas = new Set(ultimo ? [ultimo.caminho[0], ultimo.caminho[ultimo.caminho.length - 1]] : []);
  const ordem = Array.from({ length: LADO_D * LADO_D }, (_, k) => (virado ? LADO_D * LADO_D - 1 - k : k));
  const eu: Lado = jogador === "ambos" ? estado.vez : jogador;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-8 overflow-hidden rounded-xl border-4" style={{ borderColor: "#6b4526" }} role="grid" aria-label="Tabuleiro de damas">
        {ordem.map((i) => {
          const peca = estado.casas[i];
          const ativa = podeJogar && (origens.has(i) || proximas.has(i));
          const noCaminho = caminho.includes(i);
          const r = Math.floor(i / LADO_D);
          const c = i % LADO_D;
          const mostrarLetra = virado ? r === 0 : r === LADO_D - 1;
          const mostrarNumero = virado ? c === LADO_D - 1 : c === 0;
          // a peça que está andando aparece na ponta do caminho escolhido
          const andando = caminho.length > 1 && i === caminho[caminho.length - 1] ? estado.casas[caminho[0]] : null;
          const saiu = caminho.length > 1 && i === caminho[0];
          return (
            <button
              key={i}
              type="button"
              disabled={!ativa}
              onClick={() => tocar(i)}
              aria-label={`${nomeDaCasa(i)}${peca ? `, ${peca.l === 0 ? "branca" : "preta"}${peca.d ? " (dama)" : ""}` : ""}`}
              className="relative aspect-square"
              style={{
                background: escura(i) ? ESCURA : CLARA,
                boxShadow: noCaminho || marcadas.has(i) ? `inset 0 0 0 ${noCaminho ? 4 : 3}px ${noCaminho ? "var(--color-azul)" : "var(--color-sol)"}` : undefined,
              }}
            >
              {peca && !saiu ? <DesenhoPeca peca={peca} apagada={puladas.has(i)} /> : null}
              {andando ? <DesenhoPeca peca={andando} /> : null}
              {proximas.has(i) ? <span aria-hidden="true" className="absolute inset-[36%] rounded-full bg-sol ring-2 ring-white" /> : null}
              {podeJogar && caminho.length === 0 && origens.has(i) && captura ? (
                <span aria-hidden="true" className="absolute inset-[4%] rounded-full ring-[3px] ring-fogo" />
              ) : null}
              {mostrarLetra ? (
                <span aria-hidden="true" className="absolute bottom-0 right-[3px] text-[10px] font-bold" style={{ color: escura(i) ? CLARA : ESCURA }}>
                  {LETRAS[c]}
                </span>
              ) : null}
              {mostrarNumero ? (
                <span aria-hidden="true" className="absolute left-[3px] top-0 text-[10px] font-bold" style={{ color: escura(i) ? CLARA : ESCURA }}>
                  {LADO_D - r}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {podeJogar ? (
        <p role="note" className={`m-0 rounded-2xl p-3 text-[15px] font-bold ${captura ? "bg-fogo-claro text-alerta" : "bg-sol-claro"}`}>
          {caminho.length > 1
            ? "Continue capturando: toque na próxima casa marcada."
            : captura
              ? `Captura obrigatória${lances[0].capturadas.length > 1 ? `, de ${lances[0].capturadas.length} peças (a lei da maioria)` : ""}: toque na peça marcada em vermelho e depois para onde ela vai.`
              : caminho.length === 1
                ? "Agora toque numa casa marcada."
                : `Toque numa peça ${eu === 0 ? "branca" : "preta"} e depois para onde ela vai.`}
        </p>
      ) : null}
    </div>
  );
}

const config: ConfigJogo<EstadoDamas, JogadaDamas> = {
  motor: motorDamas,
  nome: "Damas",
  lados: [lado("branco", "brancas", "as"), lado("preto", "pretas", "as")],
  Tabuleiro: TabuleiroDamas,
  lembrete: "Regra brasileira: capturar é obrigatório (vale a jogada que pega mais peças), a pedra captura para trás e a dama anda e captura de longe.",
  placar: (e) => {
    const conta = (l: Lado) => e.casas.filter((p) => p && p.l === l).length;
    return `Peças: brancas ${conta(0)} × ${conta(1)} pretas`;
  },
};

export function JogarDamas({ conversa }: { conversa: readonly string[] }) {
  return <JogoPorTurnos config={config} conversa={conversa} />;
}
