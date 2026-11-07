"use client";

import { LADO_RV, contar, jogadasDe, motorReversi, type EstadoReversi, type JogadaReversi } from "@/lib/jogos/reversi";
import { COR, lado } from "./cores";
import { JogoPorTurnos, type ConfigJogo, type PropsTabuleiro } from "./JogoPorTurnos";

const VERDE = "#2f7d4f";
const LETRAS = "abcdefgh";

function Disco({ l, virou }: { l: 0 | 1; virou?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-[9%] rounded-full ${virou ? "vira" : ""}`}
      style={{
        background: l === 0 ? COR.preto.forte : COR.branco.forte,
        boxShadow: l === 0 ? "inset 0 -3px 0 #000, 0 2px 3px rgba(0,0,0,.35)" : "inset 0 -3px 0 #d9d4c7, 0 2px 3px rgba(0,0,0,.35)",
      }}
    />
  );
}

function TabuleiroReversi({ estado, jogador, podeJogar, aoJogar }: PropsTabuleiro<EstadoReversi, JogadaReversi>) {
  const eu = jogador === "ambos" ? estado.vez : jogador;
  const possiveis = new Set(podeJogar ? jogadasDe(estado.casas, estado.vez) : []);
  const viradas = new Set(estado.viradas);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-8 gap-[2px] overflow-hidden rounded-xl border-4 p-[2px]" style={{ borderColor: "#1f4d35", background: "#1f4d35" }} role="grid" aria-label="Tabuleiro de reversi">
        {estado.casas.map((c, i) => {
          const r = Math.floor(i / LADO_RV);
          const col = i % LADO_RV;
          const pode = possiveis.has(i);
          return (
            <button
              key={i}
              type="button"
              disabled={!pode}
              onClick={() => aoJogar({ casa: i })}
              aria-label={`${LETRAS[col]}${LADO_RV - r}${c === null ? (pode ? ", jogada possível" : "") : c === 0 ? ", preta" : ", branca"}`}
              className="relative aspect-square"
              style={{ background: VERDE }}
            >
              {c !== null ? <Disco l={c} virou={viradas.has(i)} /> : null}
              {estado.ultima === i ? <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fogo" /> : null}
              {pode ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-[34%] rounded-full opacity-60"
                  style={{ background: eu === 0 ? COR.preto.forte : COR.branco.forte }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const config: ConfigJogo<EstadoReversi, JogadaReversi> = {
  motor: motorReversi,
  nome: "Reversi",
  lados: [lado("preto", "pretas", "as"), lado("branco", "brancas", "as")],
  Tabuleiro: TabuleiroReversi,
  lembrete: "Ponha a sua peça prendendo peças do outro em linha reta, entre ela e outra sua: as presas viram. Os pontinhos mostram onde dá para jogar.",
  aviso: (e) => (e.passou === null ? null : `As ${e.passou === 0 ? "pretas" : "brancas"} não tinham jogada e passaram a vez.`),
  placar: (e) => {
    const [p, b] = contar(e.casas);
    return `Peças: pretas ${p} × ${b} brancas`;
  },
};

export function JogarReversi({ conversa }: { conversa: readonly string[] }) {
  return <JogoPorTurnos config={config} conversa={conversa} />;
}
