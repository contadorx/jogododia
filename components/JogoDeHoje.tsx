"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { indiceDoDia } from "@/lib/hoje";
import { Seta } from "./Icones";

export type ResumoDoJogo = {
  id: string;
  nome: string;
  treina: string;
  resumo: string;
  minutos: string;
  idade: number;
  jogavel: boolean;
};

/**
 * O destaque do dia. A escolha roda no aparelho (o site é estático): no build sai o primeiro jogo,
 * e assim que a página abre entra o do dia.
 */
export function JogoDeHoje({ jogos }: { jogos: ResumoDoJogo[] }) {
  const [indice, setIndice] = useState(0);
  useEffect(() => setIndice(indiceDoDia(jogos.length)), [jogos.length]);
  const jogo = jogos[indice];
  if (!jogo) return null;

  return (
    <section aria-labelledby="hoje" className="flex flex-col gap-3 rounded-3xl bg-azul p-5 text-white md:p-7">
      <p id="hoje" className="m-0 text-xs font-bold uppercase tracking-wider text-white/80">
        Jogo de hoje
      </p>
      <h2 className="m-0 font-display text-[30px] font-extrabold leading-tight md:text-[38px]">{jogo.nome}</h2>
      <p className="m-0 max-w-[60ch] text-[17px]">{jogo.resumo}</p>
      <p className="m-0 max-w-[60ch] text-[15px] text-white/90">
        <strong>{jogo.treina}</strong> A partir de {jogo.idade} anos, de {jogo.minutos} minutos.
      </p>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        {jogo.jogavel ? (
          <Link
            href={`/jogos/${jogo.id}/jogar/`}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-sol px-6 font-bold text-tinta no-underline hover:brightness-95"
          >
            Jogar agora
            <Seta />
          </Link>
        ) : null}
        <Link
          href={`/jogos/${jogo.id}/`}
          className="flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-white/70 px-6 font-bold text-white no-underline hover:bg-white/10"
        >
          Como jogar
        </Link>
      </div>
    </section>
  );
}
