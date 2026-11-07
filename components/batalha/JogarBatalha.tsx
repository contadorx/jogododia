"use client";

import { useEffect, useState } from "react";
import { CHAVES, gravar } from "@/lib/armazenamento";
import { TEMPO_REAL_ATIVO, lerCodigo } from "@/lib/sala";
import { EntradaDistancia, SalaDistancia, lerModo } from "./BatalhaDistancia";
import { BatalhaNaval } from "./BatalhaNaval";

type Modo = "frente" | "distancia";

const MODOS: { id: Modo; nome: string; explica: string }[] = [
  { id: "frente", nome: "Frente a frente", explica: "Cada um no seu celular, na mesma sala, falando as coordenadas." },
  { id: "distancia", nome: "À distância", explica: "Cada um na sua casa, com o código de uma sala." },
];

/**
 * A página de jogar a batalha naval: escolhe o modo e, no modo à distância, cuida do endereço
 * (?sala=CODIGO), que é o link mandado para o outro jogador.
 */
export function JogarBatalha({ conversa }: { conversa: readonly string[] }) {
  const [pronto, setPronto] = useState(false);
  const [modo, setModo] = useState<Modo>("frente");
  const [sala, setSala] = useState<string | null>(null);

  useEffect(() => {
    const lerEndereco = () => {
      const codigo = lerCodigo(new URLSearchParams(window.location.search).get("sala") ?? "");
      setSala(codigo);
      if (codigo) setModo("distancia");
      return codigo;
    };
    const codigo = lerEndereco();
    if (!codigo && TEMPO_REAL_ATIVO) setModo(lerModo() ?? "frente");
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

  const escolher = (m: Modo) => {
    setModo(m);
    gravar(CHAVES.modo, m);
  };

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
                onClick={() => escolher(m.id)}
                className={`min-h-11 flex-1 rounded-xl text-[15px] font-bold ${modo === m.id ? "bg-white text-tinta shadow-sm" : "text-suave"}`}
              >
                {m.nome}
              </button>
            ))}
          </div>
          <p className="m-0 text-sm text-suave">{MODOS.find((m) => m.id === modo)?.explica}</p>
        </div>
      ) : null}

      {modo === "frente" || !TEMPO_REAL_ATIVO ? (
        <BatalhaNaval conversa={conversa} />
      ) : sala ? (
        <SalaDistancia key={sala} codigo={sala} conversa={conversa} aoSair={() => irParaSala(null)} />
      ) : (
        <EntradaDistancia aoEntrar={(codigo) => irParaSala(codigo)} />
      )}
    </div>
  );
}
