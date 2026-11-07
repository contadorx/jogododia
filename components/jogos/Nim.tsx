"use client";

import { useEffect, useState } from "react";
import { FILAS_NIM, motorNim, type EstadoNim, type JogadaNim } from "@/lib/jogos/nim";
import { PRINCIPAL } from "../batalha/Montagem";
import { COR, lado } from "./cores";
import { JogoPorTurnos, type ConfigJogo, type PropsTabuleiro } from "./JogoPorTurnos";

/** Fileiras de palitos de fósforo. Toque nos palitos que quer tirar (todos da mesma fileira). */
function TabuleiroNim({ estado, podeJogar, aoJogar, ultima }: PropsTabuleiro<EstadoNim, JogadaNim>) {
  const [escolha, setEscolha] = useState<{ fila: number; palitos: number[] } | null>(null);
  useEffect(() => setEscolha(null), [estado]);

  const tocar = (fila: number, palito: number) => {
    if (!podeJogar) return;
    if (!escolha || escolha.fila !== fila) return setEscolha({ fila, palitos: [palito] });
    const palitos = escolha.palitos.includes(palito) ? escolha.palitos.filter((p) => p !== palito) : [...escolha.palitos, palito];
    setEscolha(palitos.length ? { fila, palitos } : null);
  };

  const quantos = escolha?.palitos.length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-2xl bg-painel px-2 py-4">
        {FILAS_NIM.map((total, fila) => {
          const restam = estado.filas[fila];
          const sairam = ultima && ultima.fila === fila ? ultima.quantos : 0;
          return (
            <div key={fila} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-right text-xs font-bold text-suave">Fileira {fila + 1}</span>
              <div className="flex flex-1 justify-center gap-[clamp(4px,2vw,12px)]" role="group" aria-label={`Fileira ${fila + 1}: ${restam} de ${total} palitos`}>
                {Array.from({ length: total }, (_, i) => {
                  if (i >= restam) {
                    const recente = i < restam + sairam;
                    return (
                      <span
                        key={i}
                        aria-hidden="true"
                        className={`h-[64px] w-[14px] rounded-full border-2 border-dashed ${recente ? "border-sol" : "border-linha"}`}
                      />
                    );
                  }
                  const escolhido = escolha?.fila === fila && escolha.palitos.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => tocar(fila, i)}
                      disabled={!podeJogar}
                      aria-pressed={escolhido}
                      aria-label={`Palito ${i + 1} da fileira ${fila + 1}`}
                      className={`relative flex h-[76px] w-[clamp(26px,7vw,34px)] justify-center rounded-lg transition-transform ${
                        escolhido ? "-translate-y-2 bg-sol-claro ring-2 ring-sol" : ""
                      }`}
                    >
                      <span aria-hidden="true" className="absolute top-[6px] h-[64px] w-[12px] rounded-full" style={{ background: "#e3b679" }} />
                      <span aria-hidden="true" className="absolute top-[4px] h-[16px] w-[16px] rounded-full" style={{ background: COR.vermelho.forte }} />
                    </button>
                  );
                })}
              </div>
              <span className="w-8 shrink-0 text-center font-display text-[17px] font-extrabold" aria-hidden="true">
                {restam}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!podeJogar || !escolha}
          onClick={() => escolha && aoJogar({ fila: escolha.fila, quantos })}
          className={`${PRINCIPAL} flex-1`}
        >
          {quantos === 0 ? "Toque nos palitos que quer tirar" : `Tirar ${quantos} ${quantos === 1 ? "palito" : "palitos"} da fileira ${(escolha?.fila ?? 0) + 1}`}
        </button>
        {escolha ? (
          <button type="button" onClick={() => setEscolha(null)} className="min-h-11 px-2 text-[15px] font-bold text-suave underline underline-offset-2">
            Limpar
          </button>
        ) : null}
      </div>
    </div>
  );
}

const config: ConfigJogo<EstadoNim, JogadaNim> = {
  motor: motorNim,
  nome: "Nim",
  lados: [
    { ...lado("azul", "jogador 1", "o"), voce: "Você é o jogador 1 (começa)." },
    { ...lado("vermelho", "jogador 2", "o"), voce: "Você é o jogador 2." },
  ],
  Tabuleiro: TabuleiroNim,
  lembrete: "Na sua vez, tire quantos palitos quiser, mas de uma fileira só. Quem tirar o último ganha.",
};

export function JogarNim({ conversa }: { conversa: readonly string[] }) {
  return <JogoPorTurnos config={config} conversa={conversa} />;
}
