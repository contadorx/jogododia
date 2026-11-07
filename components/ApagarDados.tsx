"use client";

import { useState } from "react";
import { apagarTudo } from "@/lib/armazenamento";

/** Apaga o aceite dos Termos e a partida em andamento deste aparelho. */
export function ApagarDados() {
  const [feito, setFeito] = useState(false);
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => {
          if (!window.confirm("Apagar as partidas guardadas e o aceite dos Termos deste aparelho?")) return;
          apagarTudo();
          setFeito(true);
        }}
        className="min-h-11 rounded-xl px-4 font-bold text-alerta ring-1 ring-borda hover:ring-alerta"
      >
        Apagar meus dados deste aparelho
      </button>
      <p role="status" className="m-0 text-sm text-suave">
        {feito ? "Pronto: não sobrou nada do site neste aparelho." : "Só existe o que está neste aparelho: o site não guarda nada em servidor."}
      </p>
    </div>
  );
}
