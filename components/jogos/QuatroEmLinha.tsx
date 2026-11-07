"use client";

import { COLUNAS, LINHAS, casaQ, motorQuatro, type EstadoQuatro, type JogadaQuatro } from "@/lib/jogos/quatro";
import { COR, lado } from "./cores";
import { JogoPorTurnos, type ConfigJogo, type PropsTabuleiro } from "./JogoPorTurnos";

const CORES = [COR.vermelho.forte, COR.amarelo.forte] as const;

/** Grade em pé: toque numa coluna para soltar a peça. */
function TabuleiroQuatro({ estado, podeJogar, aoJogar }: PropsTabuleiro<EstadoQuatro, JogadaQuatro>) {
  const vencedoras = new Set(estado.linha ?? []);
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-[3px] px-[6px]" aria-hidden="true">
        {Array.from({ length: COLUNAS }, (_, c) => (
          <span key={c} className="text-center text-sm font-bold text-suave">
            {c + 1}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[3px] overflow-hidden rounded-2xl p-[6px]" style={{ background: COR.azul.forte }}>
        {Array.from({ length: COLUNAS }, (_, c) => {
          const livres = LINHAS - estado.alturas[c];
          const pode = podeJogar && livres > 0;
          return (
            <button
              key={c}
              type="button"
              disabled={!pode}
              onClick={() => aoJogar({ coluna: c })}
              aria-label={`Coluna ${c + 1}${livres === 0 ? ", cheia" : `, ${livres} ${livres === 1 ? "casa livre" : "casas livres"}`}`}
              className="group flex flex-col-reverse gap-[3px] rounded-xl p-[2px] enabled:hover:bg-white/15 focus-visible:bg-white/15"
            >
              {Array.from({ length: LINHAS }, (_, l) => {
                const casa = casaQ(l, c);
                const peca = estado.grade[casa];
                const ultima = estado.ultima === casa;
                const proxima = pode && l === estado.alturas[c];
                return (
                  <span key={l} className="relative block aspect-square w-full rounded-full" style={{ background: "#e8eefc" }}>
                    {peca !== null ? (
                      <span
                        className={`absolute inset-0 rounded-full ${ultima ? "cai" : ""} ${vencedoras.has(casa) ? "ring-4 ring-white" : ""}`}
                        style={{ background: CORES[peca], ["--de" as string]: `-${(LINHAS - l) * 115}%` }}
                      >
                        {ultima && !vencedoras.size ? <span className="absolute inset-[34%] rounded-full bg-white/70" /> : null}
                      </span>
                    ) : proxima ? (
                      <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-40 group-focus-visible:opacity-40" style={{ background: CORES[estado.vez] }} />
                    ) : null}
                  </span>
                );
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const config: ConfigJogo<EstadoQuatro, JogadaQuatro> = {
  motor: motorQuatro,
  nome: "Quatro em linha",
  lados: [lado("vermelho", "vermelho", "o", "as vermelhas"), lado("amarelo", "amarelo", "o", "as amarelas")],
  Tabuleiro: TabuleiroQuatro,
  lembrete: "Toque numa coluna para soltar a peça. Ganha quem alinhar 4, deitado, em pé ou na diagonal.",
};

export function JogarQuatroEmLinha({ conversa }: { conversa: readonly string[] }) {
  return <JogoPorTurnos config={config} conversa={conversa} />;
}
