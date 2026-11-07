"use client";

import Link from "next/link";
import { useState } from "react";
import type { EstadoConexao } from "@/lib/sala";
import { PRINCIPAL, SECUNDARIO } from "../batalha/Montagem";

/** Barra do topo da sala: código, situação da conexão e sair. */
export function BarraDaSala({
  codigo,
  conexao,
  outroPresente,
  aoSair,
}: {
  codigo: string;
  conexao: EstadoConexao;
  outroPresente: boolean;
  aoSair: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-display text-[17px] font-extrabold tracking-[0.08em]">Sala {codigo}</span>
      <span
        role="status"
        className={`rounded-full px-2.5 py-1 text-sm font-bold ${
          conexao === "caiu"
            ? "bg-alerta-claro text-alerta"
            : conexao === "conectando"
              ? "bg-painel text-suave"
              : outroPresente
                ? "bg-folha-claro text-folha-escuro"
                : "bg-sol-claro text-tinta"
        }`}
      >
        {conexao === "caiu"
          ? "Sem conexão, tentando de novo…"
          : conexao === "conectando"
            ? "Conectando…"
            : outroPresente
              ? "O outro está na sala"
              : "Esperando o outro entrar"}
      </span>
      <button type="button" onClick={aoSair} className="ml-auto min-h-11 px-1 text-[15px] font-bold text-suave underline underline-offset-2">
        Sair da sala
      </button>
    </div>
  );
}

/** Convite para o outro jogador: código grande, WhatsApp e copiar link. */
export function ConviteDaSala({ codigo, link, nomeDoJogo }: { codigo: string; link: string; nomeDoJogo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <section aria-labelledby="convite" className="flex flex-col gap-2 rounded-2xl bg-sol-claro p-4">
      <h2 id="convite" className="m-0 font-display text-[19px] font-extrabold">
        Chame o outro jogador
      </h2>
      <p className="m-0">
        Código da sala: <strong className="font-display text-[30px] leading-none tracking-[0.15em]">{codigo}</strong>
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Vamos jogar ${nomeDoJogo.toLowerCase()}? Entre na sala ${codigo}: ${link}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${PRINCIPAL} no-underline`}
        >
          Mandar pelo WhatsApp
        </a>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(link).then(
              () => setCopiado(true),
              () => setCopiado(false),
            );
          }}
          className={SECUNDARIO}
        >
          {copiado ? "Link copiado" : "Copiar link"}
        </button>
      </div>
      <p className="m-0 text-sm text-suave">Mande só para quem vai jogar com você. A sala aceita dois jogadores.</p>
    </section>
  );
}

/** Lista de perguntas para depois da partida (vem da ficha do jogo). */
export function Conversa({ perguntas }: { perguntas: readonly string[] }) {
  return (
    <section aria-labelledby="conversa" className="flex flex-col gap-2">
      <h2 id="conversa" className="m-0 font-display text-[19px] font-extrabold">
        Conversem sobre a partida
      </h2>
      <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
        {perguntas.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}

/** O código aberto é de uma sala de outro jogo, guardada neste aparelho. */
export function SalaDeOutroJogo({ codigo, jogo, aoSair }: { codigo: string; jogo: string; aoSair: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-alerta-claro p-4 text-alerta">
      <p className="m-0 font-bold">A sala {codigo} é de outro jogo.</p>
      <p className="m-0">Ela foi criada para outro jogo deste site. Dá para abrir no jogo certo, ou voltar e criar uma sala nova aqui.</p>
      <div className="flex flex-wrap gap-2">
        <Link href={`/jogos/${jogo}/jogar/?sala=${codigo}`} className={`${PRINCIPAL} no-underline`}>
          Abrir no jogo certo
        </Link>
        <button type="button" onClick={aoSair} className={SECUNDARIO}>
          Voltar
        </button>
      </div>
    </div>
  );
}
