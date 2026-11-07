"use client";

import Link from "next/link";
import { useState } from "react";
import type { EstadoConexao } from "@/lib/sala";
import { PRINCIPAL, SECUNDARIO } from "../batalha/Montagem";

/**
 * Barra do topo da sala: código, situação da conexão e sair. Embaixo dela, quando precisa, um aviso:
 * a conexão deste aparelho caiu (com "Tentar agora") ou o outro saiu no meio da partida (com o link
 * para chamar de volta). `outroJaVeio`: o outro já esteve na sala (para não dizer "saiu" de quem
 * nunca entrou). `emPartida`: falta terminar a partida. `grupo`: sala com mais de dois (o Stop), com
 * os textos prontos: o rótulo de quem está na sala, se tem mais alguém (`ok`) e quem saiu (ou null).
 */
export function BarraDaSala({
  codigo,
  conexao,
  outroPresente,
  outroJaVeio,
  emPartida,
  link,
  nomeDoJogo,
  aoSair,
  aoTentar,
  grupo,
}: {
  codigo: string;
  conexao: EstadoConexao;
  outroPresente: boolean;
  outroJaVeio: boolean;
  emPartida: boolean;
  link: string;
  nomeDoJogo: string;
  aoSair: () => void;
  aoTentar: () => void;
  grupo?: { rotulo: string; ok: boolean; saiu: string | null; detalhe?: string };
}) {
  const outroSaiu = conexao === "conectado" && (grupo ? !!grupo.saiu : !outroPresente && outroJaVeio);
  const ok = grupo ? grupo.ok : outroPresente;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-[17px] font-extrabold tracking-[0.08em]">Sala {codigo}</span>
        <span
          role="status"
          className={`rounded-full px-2.5 py-1 text-sm font-bold ${
            conexao === "caiu"
              ? "bg-alerta-claro text-alerta"
              : conexao === "conectando"
                ? "bg-painel text-suave"
                : ok
                  ? "bg-folha-claro text-folha-escuro"
                  : "bg-sol-claro text-tinta"
          }`}
        >
          {conexao === "caiu"
            ? "Sem conexão. Tentando de novo…"
            : conexao === "conectando"
              ? "Conectando…"
              : grupo
                ? grupo.rotulo
                : outroPresente
                  ? "O outro está na sala"
                  : outroSaiu
                    ? "O outro saiu da sala"
                    : "Esperando o outro entrar"}
        </span>
        <button type="button" onClick={aoSair} className="ml-auto min-h-11 px-1 text-[15px] font-bold text-suave underline underline-offset-2">
          Sair da sala
        </button>
      </div>
      {conexao === "caiu" ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-2xl bg-alerta-claro p-3 text-alerta">
          <p className="m-0 min-w-[12rem] flex-1 text-[15px]">
            <strong>A internet deste aparelho caiu.</strong> A partida está guardada e continua sozinha quando a conexão voltar.
          </p>
          <button type="button" onClick={aoTentar} className={SECUNDARIO}>
            Tentar agora
          </button>
        </div>
      ) : outroSaiu && emPartida ? (
        <div role="note" className="flex flex-col gap-2 rounded-2xl bg-sol-claro p-3">
          {grupo ? (
            <p className="m-0 text-[15px]">
              <strong>{grupo.saiu}</strong> {grupo.detalhe ?? "Às vezes é só a tela que apagou."}
            </p>
          ) : (
            <p className="m-0 text-[15px]">
              <strong>O outro saiu da sala ou a conexão dele caiu.</strong> A partida está guardada: quando ele voltar, continua de onde parou. Às
              vezes é só a tela dele que apagou.
            </p>
          )}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Vamos continuar a partida de ${nomeDoJogo.toLowerCase()}? Volte para a sala ${codigo}: ${link}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${SECUNDARIO} self-start no-underline`}
          >
            Chamar de volta pelo WhatsApp
          </a>
        </div>
      ) : null}
    </div>
  );
}

/** Convite para o outro jogador (ou os outros): código grande, WhatsApp e copiar link. */
export function ConviteDaSala({ codigo, link, nomeDoJogo, maxJogadores = 2 }: { codigo: string; link: string; nomeDoJogo: string; maxJogadores?: number }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <section aria-labelledby="convite" className="flex flex-col gap-2 rounded-2xl bg-sol-claro p-4">
      <h2 id="convite" className="m-0 font-display text-[19px] font-extrabold">
        {maxJogadores > 2 ? "Chame os outros jogadores" : "Chame o outro jogador"}
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
      <p className="m-0 text-sm text-suave">
        Mande só para quem vai jogar com você. A sala aceita {maxJogadores > 2 ? `até ${maxJogadores} jogadores` : "dois jogadores"}.
      </p>
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
