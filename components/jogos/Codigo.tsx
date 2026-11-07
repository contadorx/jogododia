"use client";

import { useEffect, useState } from "react";
import { gravar, ler } from "@/lib/armazenamento";
import { DIGITOS, PALPITES, codigoValido, comparar, motorCodigo, palpitesDe, type EstadoCodigo, type JogadaCodigo, type Resposta } from "@/lib/jogos/codigo";
import type { Lado } from "@/lib/jogos/motor";
import { PRINCIPAL, SECUNDARIO } from "../batalha/Montagem";
import { lado } from "./cores";
import { JogoPorTurnos, type ConfigJogo, type PropsTabuleiro } from "./JogoPorTurnos";

const NOMES = ["jogador 1", "jogador 2"] as const;
type Segredos = Partial<Record<"0" | "1", string>>;

/** O código secreto fica só neste aparelho, guardado junto com a partida. */
function useGuardado<T>(chave: string, inicial: T) {
  const [valor, setValor] = useState<T>(inicial);
  const [lido, setLido] = useState(false);
  useEffect(() => {
    setValor(ler<T>(chave) ?? inicial);
    setLido(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  const mudar = (v: T) => {
    setValor(v);
    gravar(chave, v);
  };
  return [valor, mudar, lido] as const;
}

function Digitos({ d, esconder }: { d: string; esconder?: boolean }) {
  return (
    <span className="inline-flex gap-1" aria-label={esconder ? "código escondido" : d.split("").join(" ")}>
      {Array.from({ length: DIGITOS }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="flex h-9 w-8 items-center justify-center rounded-lg border border-borda bg-white font-display text-[20px] font-extrabold"
        >
          {d[i] ? (esconder ? "●" : d[i]) : ""}
        </span>
      ))}
    </span>
  );
}

function Pinos({ r }: { r: Resposta | null }) {
  if (!r) return <span className="text-sm text-suave">esperando a resposta…</span>;
  const texto =
    r.certos === 0 && r.fora === 0
      ? "nenhum algarismo do código"
      : [r.certos ? `${r.certos} no lugar` : "", r.fora ? `${r.fora} fora do lugar` : ""].filter(Boolean).join(" e ");
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="flex gap-0.5">
        {Array.from({ length: r.certos }, (_, i) => (
          <span key={`c${i}`} className="h-3.5 w-3.5 rounded-full" style={{ background: "var(--color-folha)" }} />
        ))}
        {Array.from({ length: r.fora }, (_, i) => (
          <span key={`f${i}`} className="h-3.5 w-3.5 rounded-full border-2" style={{ borderColor: "var(--color-sol)", background: "var(--color-sol-claro)" }} />
        ))}
      </span>
      <span className="text-sm">{texto}</span>
    </span>
  );
}

/** Teclado de 0 a 9 que não deixa repetir algarismo. */
function Teclado({ valor, aoMudar, esconder }: { valor: string; aoMudar: (v: string) => void; esconder?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Digitos d={valor} esconder={esconder} />
      <div className="grid w-full max-w-[320px] grid-cols-5 gap-1.5">
        {"1234567890".split("").map((n) => (
          <button
            key={n}
            type="button"
            disabled={valor.includes(n) || valor.length >= DIGITOS}
            onClick={() => aoMudar(valor + n)}
            className="min-h-12 rounded-xl bg-white font-display text-[22px] font-extrabold ring-1 ring-borda enabled:hover:ring-azul disabled:opacity-30"
          >
            {n}
          </button>
        ))}
      </div>
      <button type="button" disabled={!valor} onClick={() => aoMudar(valor.slice(0, -1))} className="min-h-11 px-2 text-[15px] font-bold text-suave underline underline-offset-2 disabled:opacity-40">
        Apagar o último
      </button>
    </div>
  );
}

function Rascunho({ riscados, aoMudar }: { riscados: string; aoMudar: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0 text-sm font-bold text-suave">Rascunho: toque nos algarismos que você já descartou</p>
      <div className="grid grid-cols-10 gap-1">
        {"0123456789".split("").map((n) => {
          const riscado = riscados.includes(n);
          return (
            <button
              key={n}
              type="button"
              aria-pressed={riscado}
              onClick={() => aoMudar(riscado ? riscados.replace(n, "") : riscados + n)}
              className={`relative min-h-10 rounded-lg font-display text-[17px] font-extrabold ring-1 ${riscado ? "bg-painel text-suave ring-linha" : "bg-white ring-borda"}`}
            >
              {n}
              {riscado ? <span aria-hidden="true" className="absolute inset-x-1 top-1/2 h-[3px] -rotate-45 rounded bg-fogo" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Historico({ titulo, lista }: { titulo: string; lista: { d: string; resposta: Resposta | null }[] }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="m-0 text-[15px] font-bold">{titulo}</h3>
      {lista.length === 0 ? (
        <p className="m-0 text-sm text-suave">Nenhum palpite ainda.</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {lista.map((p, k) => (
            <li key={k} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-painel px-2.5 py-1.5">
              <span className="w-5 text-right text-sm font-bold text-suave">{k + 1}.</span>
              <span className="font-display text-[19px] font-extrabold tracking-[0.2em]">{p.d}</span>
              <Pinos r={p.resposta} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function TabuleiroCodigo({ estado, jogador, podeJogar, aoJogar, idPartida }: PropsTabuleiro<EstadoCodigo, JogadaCodigo>) {
  const [segredos, setSegredos, lido] = useGuardado<Segredos>(`jdd.segredo.${idPartida}`, {});
  const [notas, setNotas] = useGuardado<Partial<Record<"0" | "1", string>>>(`jdd.notas.${idPartida}`, {});
  const [entrada, setEntrada] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const mesmo = jogador === "ambos";
  const eu: Lado = mesmo ? estado.vez : jogador;
  const chaveEu = String(eu) as "0" | "1";
  const outro: Lado = eu === 0 ? 1 : 0;

  useEffect(() => setEntrada(""), [estado.fase, estado.vez]);

  // o aparelho joga sozinho o que não depende de escolha: avisar que está pronto, responder e revelar
  useEffect(() => {
    if (!podeJogar || !lido) return;
    const quem = String(mesmo ? estado.vez : jogador) as "0" | "1";
    const meu = segredos[quem];
    if (!meu) return;
    if (estado.fase === "escolher") aoJogar({ t: "pronto" });
    else if (estado.fase === "responder") aoJogar({ t: "resposta", ...comparar(estado.palpites[estado.palpites.length - 1].d, meu) });
    else if (estado.fase === "revelar") aoJogar({ t: "revela", d: meu });
  }, [estado, podeJogar, lido, segredos, mesmo, jogador, aoJogar]);

  if (!lido) return <div aria-busy="true" className="min-h-[40vh]" />;

  const guardarSegredo = () => {
    if (!codigoValido(entrada)) return;
    setSegredos({ ...segredos, [chaveEu]: entrada });
    setEntrada("");
    setMostrar(false);
  };

  // ---------------------------------------------------------------- escolher o código
  if (estado.fase === "escolher") {
    const precisaEscolher = !segredos[chaveEu] && (mesmo ? podeJogar : true);
    if (precisaEscolher) {
      return (
        <div className="flex flex-col gap-3 rounded-2xl bg-sol-claro p-4">
          <h2 className="m-0 font-display text-[21px] font-extrabold">
            {mesmo ? `${NOMES[eu].replace("j", "J")}, escolha o seu código secreto` : "Escolha o seu código secreto"}
          </h2>
          <p className="m-0 text-[15px]">
            4 algarismos diferentes, como 3 8 1 5. {mesmo ? "Não deixe o outro ver a tela." : "Ele fica só neste aparelho."}
          </p>
          <Teclado valor={entrada} aoMudar={setEntrada} esconder={mesmo && !mostrar} />
          {mesmo ? (
            <button type="button" onClick={() => setMostrar(!mostrar)} className="self-center text-[15px] font-bold text-suave underline underline-offset-2">
              {mostrar ? "Esconder os algarismos" : "Mostrar os algarismos"}
            </button>
          ) : null}
          <button type="button" disabled={!codigoValido(entrada)} onClick={guardarSegredo} className={PRINCIPAL}>
            Guardar meu código
          </button>
        </div>
      );
    }
    return (
      <p role="status" className="m-0 rounded-2xl bg-painel p-3.5 text-[17px]">
        {mesmo ? "Código guardado. Passe o aparelho para o outro jogador." : "Seu código está guardado. Esperando o outro escolher o dele."}
      </p>
    );
  }

  const meu = segredos[chaveEu];
  const fim = estado.fase === "fim";
  const minhaVezDeChutar = podeJogar && estado.fase === "chutar";
  const historicoDe = (l: Lado) => palpitesDe(estado, l).map((p) => ({ d: p.d, resposta: p.resposta }));
  const restam = PALPITES - palpitesDe(estado, eu).length;

  return (
    <div className="flex flex-col gap-4">
      {!mesmo ? (
        <p className="m-0 flex flex-wrap items-center gap-2 text-[15px]">
          Seu código: {meu ? <Digitos d={meu} /> : <span className="font-bold text-alerta">não está guardado neste aparelho</span>}
        </p>
      ) : null}
      {!mesmo && !meu && !fim ? (
        <p role="alert" className="m-0 rounded-2xl bg-alerta-claro p-3 text-[15px] text-alerta">
          Este aparelho não tem o seu código (talvez a partida tenha começado em outro aparelho ou os dados do site foram apagados). Sem ele, o jogo não consegue responder aos palpites do outro.
        </p>
      ) : null}

      {fim ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-painel p-3.5">
          {[0, 1].map((l) => (
            <p key={l} className="m-0 flex flex-wrap items-center gap-2 text-[15px]">
              {mesmo ? `Código do ${NOMES[l]}:` : l === eu ? "Seu código:" : "Código do outro:"}
              {estado.revelados[l] ? <Digitos d={estado.revelados[l] as string} /> : "—"}
            </p>
          ))}
        </div>
      ) : null}

      {minhaVezDeChutar ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-sol-claro p-4">
          <h2 className="m-0 font-display text-[19px] font-extrabold">
            {mesmo ? `${NOMES[eu].replace("j", "J")}: chute o código do ${NOMES[outro]}` : "Chute o código do outro"}
          </h2>
          <Teclado valor={entrada} aoMudar={setEntrada} />
          <button type="button" disabled={!codigoValido(entrada)} onClick={() => aoJogar({ t: "palpite", d: entrada })} className={PRINCIPAL}>
            Chutar {entrada.length === DIGITOS ? entrada : ""}
          </button>
          <p className="m-0 text-center text-sm text-suave">
            {restam === 1 ? "Último palpite!" : `Ainda tem ${restam} palpites.`}
          </p>
        </div>
      ) : null}

      {!fim ? <Rascunho riscados={notas[chaveEu] ?? ""} aoMudar={(v) => setNotas({ ...notas, [chaveEu]: v })} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Historico titulo={mesmo ? `Palpites do ${NOMES[eu]}` : "Seus palpites"} lista={historicoDe(eu)} />
        <Historico titulo={mesmo ? `Palpites do ${NOMES[outro]}` : "Palpites do outro no seu código"} lista={historicoDe(outro)} />
      </div>

      {mesmo && !fim ? (
        <button type="button" onClick={() => setNotas({})} className={`${SECUNDARIO} self-start`}>
          Limpar os rascunhos
        </button>
      ) : null}
    </div>
  );
}

const config: ConfigJogo<EstadoCodigo, JogadaCodigo> = {
  motor: motorCodigo,
  nome: "Descubra o código",
  lados: [
    { ...lado("azul", "jogador 1", "o"), voce: "Você é o jogador 1 (chuta primeiro)." },
    { ...lado("vermelho", "jogador 2", "o"), voce: "Você é o jogador 2." },
  ],
  Tabuleiro: TabuleiroCodigo,
  semDesfazer: true,
  lembrete: "A resposta diz quantos algarismos do palpite estão no lugar certo e quantos estão no código, mas em outro lugar. Ela não diz quais.",
};

export function JogarCodigo({ conversa }: { conversa: readonly string[] }) {
  return <JogoPorTurnos config={config} conversa={conversa} />;
}

