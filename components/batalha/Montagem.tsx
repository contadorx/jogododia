"use client";

import { useState } from "react";
import {
  FROTA,
  ajustarNaBorda,
  colocar,
  encaixe,
  frotaCompleta,
  mapaDaFrota,
  navio,
  sortearFrota,
  type Motivo,
  type Orientacao,
  type Posicao,
} from "@/lib/batalha";
import { Dado, Girar, Seta } from "../Icones";
import { CORES, corDe, type CorId } from "./cores";
import { Tabuleiro, type AparenciaDaCasa } from "./Tabuleiro";

const MOTIVOS: Record<Motivo, string> = {
  fora: "Não cabe aí.",
  ocupada: "Já tem navio aí.",
  encosta: "Muito perto de outro navio: eles não podem se encostar, nem na diagonal.",
};

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const proximoNavio = (frota: readonly Posicao[]) => FROTA.find((n) => !frota.some((p) => p.navioId === n.id))?.id ?? null;

export const PRINCIPAL =
  "flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-azul px-5 font-bold text-white hover:bg-azul-escuro disabled:opacity-40";
export const SECUNDARIO =
  "flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-white px-5 font-bold text-tinta ring-1 ring-borda hover:ring-azul disabled:opacity-40";

/**
 * Montar a frota: escolher o navio na lista e tocar no mar; tocar num navio posto escolhe ele, e tocar
 * de novo gira. Usada nos dois modos (frente a frente e à distância).
 */
export function Montagem({
  frota,
  cor,
  aoMudarFrota,
  aoMudarCor,
  aoPronto,
  textoPronto = "Pronto",
  subtitulo = "Sem deixar o outro ver a tela. Os navios não podem se encostar, nem na diagonal.",
}: {
  frota: Posicao[];
  cor: CorId;
  aoMudarFrota: (frota: Posicao[]) => void;
  aoMudarCor: (cor: CorId) => void;
  aoPronto: () => void;
  textoPronto?: string;
  subtitulo?: string;
}) {
  const [selecionado, setSelecionado] = useState<string | null>(() => proximoNavio(frota));
  const [orientacao, setOrientacao] = useState<Orientacao>("h");
  const [aviso, setAviso] = useState<string | null>(null);
  const mapa = mapaDaFrota(frota);
  const pintura = corDe(cor);

  /** Põe ou move um navio. `manter`: continua com ele escolhido (ao girar); senão, passa para o próximo sem lugar. */
  const porNavio = (navioId: string, casa: number, ori: Orientacao, manter: boolean) => {
    const n = navio(navioId);
    const inicio = ajustarNaBorda(n.tamanho, casa, ori);
    const enc = encaixe(frota, navioId, inicio, ori);
    if (!enc.ok) {
      setAviso(MOTIVOS[enc.motivo]);
      return false;
    }
    const nova = colocar(frota, navioId, inicio, ori);
    aoMudarFrota(nova);
    setSelecionado(manter ? navioId : proximoNavio(nova));
    setOrientacao(ori);
    setAviso(null);
    return true;
  };

  const tocar = (casa: number) => {
    const idNaCasa = mapa.get(casa);
    if (idNaCasa && idNaCasa === selecionado) {
      const p = frota.find((x) => x.navioId === idNaCasa)!;
      porNavio(idNaCasa, p.casa, p.orientacao === "h" ? "v" : "h", true);
      return;
    }
    if (idNaCasa) {
      const p = frota.find((x) => x.navioId === idNaCasa)!;
      setSelecionado(idNaCasa);
      setOrientacao(p.orientacao);
      setAviso(null);
      return;
    }
    if (!selecionado) {
      setAviso("Toque num navio para mudar ele de lugar.");
      return;
    }
    porNavio(selecionado, casa, orientacao, false);
  };

  const girar = () => {
    const nova: Orientacao = orientacao === "h" ? "v" : "h";
    const p = selecionado ? frota.find((x) => x.navioId === selecionado) : undefined;
    if (p && selecionado) {
      porNavio(selecionado, p.casa, nova, true);
      return;
    }
    setOrientacao(nova);
    setAviso(null);
  };

  const escolhido = selecionado ? navio(selecionado) : null;
  const escolhidoPosto = selecionado ? frota.some((p) => p.navioId === selecionado) : false;
  const completa = frotaCompleta(frota);
  const instrucao =
    aviso ??
    (escolhido
      ? escolhidoPosto
        ? `Toque em outra casa para mudar o ${escolhido.nome} de lugar, ou toque nele de novo para girar.`
        : `Toque no mar para pôr o ${escolhido.nome} (${escolhido.tamanho} casas, ${orientacao === "h" ? "deitado" : "em pé"}).`
      : completa
        ? "Frota pronta! Toque num navio se quiser mudar ele de lugar."
        : "Escolha um navio na lista.");

  const aparencia = (c: number): AparenciaDaCasa => {
    const id = mapa.get(c);
    if (!id) return { descricao: "mar" };
    return { fundo: pintura, destaque: id === selecionado, descricao: navio(id).nome };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-[24px] font-extrabold">Monte a sua frota</h2>
        <p className="m-0 text-[15px] text-suave">{subtitulo}</p>
      </div>

      <ul aria-label="Navios" className="m-0 flex list-none flex-wrap gap-2 p-0">
        {FROTA.map((n) => {
          const posto = frota.some((p) => p.navioId === n.id);
          const ativo = n.id === selecionado;
          return (
            <li key={n.id}>
              <button
                type="button"
                aria-pressed={ativo}
                onClick={() => {
                  setSelecionado(n.id);
                  const p = frota.find((x) => x.navioId === n.id);
                  if (p) setOrientacao(p.orientacao);
                  setAviso(null);
                }}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-bold ring-1 ${
                  ativo ? "bg-tinta text-white ring-tinta" : posto ? "bg-folha-claro text-folha-escuro ring-folha-claro" : "bg-white text-tinta ring-borda"
                }`}
              >
                <span className="flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: n.tamanho }, (_, i) => (
                    <span key={i} className="block h-2.5 w-2.5 rounded-[3px]" style={{ background: ativo ? "#fff" : pintura }} />
                  ))}
                </span>
                {maiuscula(n.nome)}
                {posto ? <span className="sr-only">(no tabuleiro)</span> : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-2">
        <button type="button" onClick={girar} className={`${SECUNDARIO} min-h-11 flex-1 sm:flex-none`}>
          <Girar />
          {orientacao === "h" ? "Deitado" : "Em pé"}
        </button>
        <button
          type="button"
          onClick={() => {
            aoMudarFrota(sortearFrota());
            setSelecionado(null);
            setAviso(null);
          }}
          className={`${SECUNDARIO} min-h-11 flex-1 sm:flex-none`}
        >
          <Dado />
          Sortear
        </button>
      </div>

      <p role="status" className={`m-0 min-h-[3em] text-[15px] font-bold ${aviso ? "text-alerta" : "text-tinta"}`}>
        {instrucao}
      </p>

      <Tabuleiro titulo="Sua frota" casa={aparencia} aoTocar={tocar} />

      <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
        <legend className="mb-2 text-sm font-bold text-suave">Cor da frota</legend>
        {CORES.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={cor === c.id}
            aria-label={c.nome}
            onClick={() => aoMudarCor(c.id)}
            className={`h-10 w-10 rounded-full ring-offset-2 ${cor === c.id ? "ring-3 ring-tinta" : "ring-1 ring-borda"}`}
            style={{ background: c.cor }}
          />
        ))}
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" disabled={!completa} onClick={aoPronto} className={`${PRINCIPAL} sm:flex-1`}>
          {textoPronto}
          <Seta />
        </button>
        <button
          type="button"
          onClick={() => {
            aoMudarFrota([]);
            setSelecionado(FROTA[0].id);
            setOrientacao("h");
            setAviso(null);
          }}
          className={SECUNDARIO}
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
