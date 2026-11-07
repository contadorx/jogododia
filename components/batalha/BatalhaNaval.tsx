"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FROTA,
  aguaEmVolta,
  coordenada,
  grupoDeAcertos,
  navio,
  responderTiro,
  situacaoDaFrota,
  type MarcaTiro,
  type Posicao,
  type Resposta,
} from "@/lib/batalha";
import { CHAVES, gravar, ler } from "@/lib/armazenamento";
import { evento } from "@/lib/metricas";
import { Desfazer, Seta } from "../Icones";
import { aparenciaDaDefesa, aparenciaDoAtaque } from "./aparencia";
import { corDe, ehCor, type CorId } from "./cores";
import { Fim } from "./Fim";
import { Montagem, PRINCIPAL, SECUNDARIO } from "./Montagem";
import { Tabuleiro } from "./Tabuleiro";
import { fala, maiuscula, porExtenso } from "./textos";

/**
 * Batalha naval "falada": cada jogador usa o seu aparelho, frente a frente, sem conexão entre eles.
 * Quem ataca diz a coordenada em voz alta e marca a resposta; quem defende toca na casa e fala o
 * que o jogo mostrar. A partida fica guardada só neste aparelho (lib/armazenamento.ts).
 */

type Fase = "montagem" | "quem-comeca" | "partida" | "fim";
type Aba = "atacar" | "defender";

type Estado = {
  v: 1;
  fase: Fase;
  cor: CorId;
  frota: Posicao[];
  /** Tiros do outro na minha frota, na ordem. */
  recebidos: number[];
  /** Meus tiros e o que o outro respondeu. */
  tiros: Record<number, MarcaTiro>;
  /** Água por dedução: em volta dos navios dele que afundaram. */
  deduzidas: number[];
  afundadosDele: { navioId: string; casas: number[] }[];
  aba: Aba;
  resultado: "venci" | "perdi" | null;
  ultimaResposta: { casa: number; resposta: Resposta } | null;
};

const novoEstado = (cor: CorId = "azul"): Estado => ({
  v: 1,
  fase: "montagem",
  cor,
  frota: [],
  recebidos: [],
  tiros: {},
  deduzidas: [],
  afundadosDele: [],
  aba: "atacar",
  resultado: null,
  ultimaResposta: null,
});

function valido(e: unknown): e is Estado {
  const x = e as Estado | null;
  return (
    !!x &&
    x.v === 1 &&
    ehCor(x.cor) &&
    Array.isArray(x.frota) &&
    Array.isArray(x.recebidos) &&
    typeof x.tiros === "object" &&
    x.tiros !== null &&
    Array.isArray(x.deduzidas) &&
    Array.isArray(x.afundadosDele)
  );
}

/** O que aparece no painel depois de uma jogada. */
type Recado =
  | { tipo: "resposta"; resposta: Resposta; casa: number }
  | { tipo: "tiro"; marca: MarcaTiro; casa: number; navioId?: string; conferir?: string }
  | { tipo: "ja-atirou"; casa: number };

const RESPOSTA = "flex min-h-[54px] flex-1 items-center justify-center rounded-2xl px-3 text-[17px] font-bold";

export function BatalhaNaval({ conversa }: { conversa: readonly string[] }) {
  const [estado, setEstado] = useState<Estado>(() => novoEstado());
  const [carregado, setCarregado] = useState(false);
  const [anterior, setAnterior] = useState<Estado | null>(null);

  const [alvo, setAlvo] = useState<number | null>(null);
  const [escolhendoNavio, setEscolhendoNavio] = useState(false);
  const [defesa, setDefesa] = useState<number | null>(null);
  const [recado, setRecado] = useState<Recado | null>(null);

  useEffect(() => {
    const salvo = ler<Estado>(CHAVES.batalha);
    if (valido(salvo)) setEstado(salvo);
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (carregado) gravar(CHAVES.batalha, estado);
  }, [estado, carregado]);

  const situacao = useMemo(() => situacaoDaFrota(estado.frota, estado.recebidos), [estado.frota, estado.recebidos]);
  const cor = corDe(estado.cor);

  /** Jogada da partida: guarda o estado de antes, para o "Desfazer". */
  const jogar = (novo: Estado) => {
    setAnterior(estado);
    setEstado(novo);
  };

  const limparSelecoes = () => {
    setAlvo(null);
    setDefesa(null);
    setEscolhendoNavio(false);
    setRecado(null);
  };

  const desfazer = () => {
    if (!anterior) return;
    setEstado(anterior);
    setAnterior(null);
    limparSelecoes();
  };

  const novaPartida = (perguntar: boolean) => {
    if (perguntar && !window.confirm("Começar uma partida nova? A atual será apagada deste aparelho.")) return;
    setEstado(novoEstado(estado.cor));
    setAnterior(null);
    limparSelecoes();
  };

  if (!carregado) return <div aria-busy="true" className="min-h-[60vh]" />;

  // ---------------------------------------------------------------- montagem
  if (estado.fase === "montagem") {
    return (
      <Montagem
        frota={estado.frota}
        cor={estado.cor}
        aoMudarFrota={(frota) => setEstado({ ...estado, frota })}
        aoMudarCor={(c) => setEstado({ ...estado, cor: c })}
        aoPronto={() => setEstado({ ...estado, fase: "quem-comeca" })}
      />
    );
  }

  // ---------------------------------------------------------------- quem começa
  if (estado.fase === "quem-comeca") {
    const comecar = (aba: Aba) => {
      setEstado({ ...estado, fase: "partida", aba });
      setAnterior(null);
      evento("partida_iniciada", { jogo: "batalha-naval", modo: "frente-a-frente" });
    };
    return (
      <div className="flex flex-col gap-4">
        <h2 className="m-0 font-display text-[24px] font-extrabold">Quem começa?</h2>
        <p className="m-0">Decidam no par ou ímpar. Quem começa ataca primeiro; o outro marca no aparelho dele que o outro começa.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => comecar("atacar")} className={`${PRINCIPAL} sm:flex-1`}>
            Eu começo
          </button>
          <button type="button" onClick={() => comecar("defender")} className={`${SECUNDARIO} sm:flex-1`}>
            O outro começa
          </button>
        </div>
        <button
          type="button"
          onClick={() => setEstado({ ...estado, fase: "montagem" })}
          className="self-start text-[15px] font-bold text-azul underline underline-offset-2"
        >
          Voltar e mexer na frota
        </button>
      </div>
    );
  }

  const aparenciaAtaque = aparenciaDoAtaque(estado.tiros, estado.deduzidas);
  const aparenciaDefesa = aparenciaDaDefesa(estado.frota, estado.recebidos, cor);

  // ---------------------------------------------------------------- fim
  if (estado.fase === "fim") {
    const ultima = estado.ultimaResposta;
    const venci = estado.resultado === "venci";
    return (
      <Fim
        titulo={venci ? "Você afundou a frota inteira!" : ultima ? `Diga: ${fala(ultima.resposta)}` : "Fim de jogo"}
        texto={
          venci
            ? "Boa partida. Agora mostrem os tabuleiros um para o outro."
            : "Era o seu último navio: o outro jogador venceu. Boa partida! Agora mostrem os tabuleiros um para o outro."
        }
        tiros={estado.tiros}
        conversa={conversa}
        ataque={aparenciaAtaque}
        defesa={aparenciaDefesa}
      >
        <button type="button" onClick={() => novaPartida(false)} className={`${PRINCIPAL} sm:flex-1`}>
          Jogar de novo
        </button>
        {anterior ? (
          <button type="button" onClick={desfazer} className={SECUNDARIO}>
            <Desfazer />
            Desfazer o último toque
          </button>
        ) : null}
        <Link href="/" className={`${SECUNDARIO} no-underline`}>
          Ver outros jogos
        </Link>
      </Fim>
    );
  }

  // ---------------------------------------------------------------- partida
  const recebidos = new Set(estado.recebidos);

  const trocarAba = (aba: Aba) => {
    if (aba === estado.aba) return;
    setEstado({ ...estado, aba });
    limparSelecoes();
  };

  const tocarAtaque = (c: number) => {
    setEscolhendoNavio(false);
    if (estado.tiros[c]) {
      setAlvo(null);
      setRecado({ tipo: "ja-atirou", casa: c });
      return;
    }
    setRecado(null);
    setAlvo(c);
  };

  const marcarTiro = (marca: "agua" | "acerto") => {
    if (alvo === null) return;
    jogar({
      ...estado,
      tiros: { ...estado.tiros, [alvo]: marca },
      deduzidas: estado.deduzidas.filter((d) => d !== alvo),
      aba: marca === "agua" ? "defender" : "atacar",
    });
    setRecado({ tipo: "tiro", marca, casa: alvo });
    setAlvo(null);
  };

  const marcarAfundou = (navioId: string) => {
    if (alvo === null) return;
    const comAcerto: Record<number, MarcaTiro> = { ...estado.tiros, [alvo]: "acerto" };
    const grupo = grupoDeAcertos(comAcerto, alvo);
    const tiros: Record<number, MarcaTiro> = { ...comAcerto };
    for (const c of grupo) tiros[c] = "afundou";
    const marcadas = new Set(Object.keys(tiros).map(Number));
    const deduzidasNovas = new Set([...estado.deduzidas.filter((d) => !marcadas.has(d)), ...aguaEmVolta(grupo, marcadas)]);
    const afundadosDele = [...estado.afundadosDele, { navioId, casas: grupo }];
    const n = navio(navioId);
    const venceu = afundadosDele.length === FROTA.length;
    jogar({
      ...estado,
      tiros,
      deduzidas: [...deduzidasNovas],
      afundadosDele,
      ...(venceu ? { fase: "fim" as const, resultado: "venci" as const } : {}),
    });
    if (venceu) evento("partida_terminada", { jogo: "batalha-naval", modo: "frente-a-frente", resultado: "venci" });
    setRecado({
      tipo: "tiro",
      marca: "afundou",
      casa: alvo,
      navioId,
      conferir:
        grupo.length !== n.tamanho
          ? `Conferiu? O ${n.nome} tem ${n.tamanho} casas, e aqui ficaram ${grupo.length} acertos juntos.`
          : undefined,
    });
    setAlvo(null);
    setEscolhendoNavio(false);
  };

  const tocarDefesa = (c: number) => {
    if (recebidos.has(c)) {
      setDefesa(null);
      setRecado({ tipo: "resposta", resposta: { tipo: "repetido" }, casa: c });
      return;
    }
    setRecado(null);
    setDefesa(c);
  };

  const confirmarDefesa = () => {
    if (defesa === null) return;
    const resposta = responderTiro(estado.frota, estado.recebidos, defesa);
    const perdeu = resposta.tipo === "afundou" && resposta.fimDeJogo;
    jogar({
      ...estado,
      recebidos: [...estado.recebidos, defesa],
      ultimaResposta: { casa: defesa, resposta },
      ...(perdeu ? { fase: "fim" as const, resultado: "perdi" as const } : {}),
    });
    if (perdeu) evento("partida_terminada", { jogo: "batalha-naval", modo: "frente-a-frente", resultado: "perdi" });
    setRecado({ tipo: "resposta", resposta, casa: defesa });
    setDefesa(null);
  };

  const vezDoOutro = () => {
    setEstado({ ...estado, aba: "defender" });
    setRecado(null);
  };
  const minhaVez = () => {
    setEstado({ ...estado, aba: "atacar" });
    setRecado(null);
  };

  const navioDelesRestantes = FROTA.filter((n) => !estado.afundadosDele.some((a) => a.navioId === n.id));

  let painel: React.ReactNode;
  if (estado.aba === "atacar") {
    if (alvo !== null && escolhendoNavio) {
      painel = (
        <div className="flex flex-col gap-2">
          <p className="m-0 font-bold">Afundou qual navio?</p>
          <div className="flex flex-wrap gap-2">
            {navioDelesRestantes.map((n) => (
              <button key={n.id} type="button" onClick={() => marcarAfundou(n.id)} className={`${SECUNDARIO} min-h-11 px-3`}>
                {maiuscula(n.nome)} ({n.tamanho})
              </button>
            ))}
            <button type="button" onClick={() => setEscolhendoNavio(false)} className="min-h-11 px-3 font-bold text-suave underline">
              Voltar
            </button>
          </div>
        </div>
      );
    } else if (alvo !== null) {
      painel = (
        <div className="flex flex-col gap-2">
          <p className="m-0">
            Diga em voz alta: <strong className="font-display text-[26px] leading-none">{coordenada(alvo)}</strong>{" "}
            <span className="text-sm text-suave">({porExtenso(alvo)})</span>
          </p>
          <p className="m-0 text-[15px] font-bold">O que o outro respondeu?</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => marcarTiro("agua")} className={`${RESPOSTA} bg-mar text-tinta ring-1 ring-mar-linha`}>
              Água
            </button>
            <button type="button" onClick={() => marcarTiro("acerto")} className={`${RESPOSTA} bg-fogo text-white`}>
              Acertou
            </button>
            <button type="button" onClick={() => setEscolhendoNavio(true)} className={`${RESPOSTA} bg-tinta text-white`}>
              Afundou
            </button>
          </div>
          <button type="button" onClick={() => setAlvo(null)} className="self-start text-sm font-bold text-suave underline">
            Escolhi errado, cancelar
          </button>
        </div>
      );
    } else if (recado?.tipo === "tiro" && recado.marca !== "agua") {
      painel = (
        <div className="aparece flex flex-col gap-2">
          <p className="m-0 font-display text-[22px] font-extrabold">
            {recado.marca === "afundou" && recado.navioId ? `Você afundou o ${navio(recado.navioId).nome}!` : `Acertou em ${coordenada(recado.casa)}!`}
          </p>
          {recado.conferir ? <p className="m-0 text-sm font-bold text-alerta">{recado.conferir}</p> : null}
          <p className="m-0 text-[15px] text-suave">Combinaram que acertou joga de novo? Então escolha outra casa. Senão:</p>
          <button type="button" onClick={vezDoOutro} className={`${SECUNDARIO} self-start`}>
            Vez do outro
            <Seta />
          </button>
        </div>
      );
    } else if (recado?.tipo === "ja-atirou") {
      painel = <p className="m-0 font-bold">Você já atirou em {coordenada(recado.casa)}. Escolha outra casa.</p>;
    } else {
      painel = (
        <p className="m-0">
          <strong>Sua vez de atacar.</strong> Escolha uma casa no mar do outro e toque nela.
        </p>
      );
    }
  } else {
    if (defesa !== null) {
      painel = (
        <div className="flex flex-col gap-2">
          <p className="m-0">
            O outro disse <strong className="font-display text-[26px] leading-none">{coordenada(defesa)}</strong>?{" "}
            <span className="text-sm text-suave">({porExtenso(defesa)})</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={confirmarDefesa} className={`${PRINCIPAL} flex-1`}>
              Sim, {coordenada(defesa)}
            </button>
            <button type="button" onClick={() => setDefesa(null)} className={SECUNDARIO}>
              Não
            </button>
          </div>
        </div>
      );
    } else if (recado?.tipo === "resposta") {
      const r = recado.resposta;
      painel = (
        <div className="aparece flex flex-col gap-2">
          <p className="m-0 text-sm font-bold uppercase tracking-wider text-suave">
            {r.tipo === "repetido" ? `Ele já atirou em ${coordenada(recado.casa)}` : `Tiro em ${coordenada(recado.casa)}`}
          </p>
          <p
            className={`m-0 font-display text-[32px] font-extrabold leading-tight ${
              r.tipo === "agua" ? "text-azul" : r.tipo === "repetido" ? "text-tinta" : "text-fogo"
            }`}
          >
            Diga: {fala(r)}
          </p>
          {r.tipo === "repetido" ? (
            <p className="m-0 text-[15px] text-suave">Ele escolhe outra casa.</p>
          ) : r.tipo === "agua" ? (
            <button type="button" onClick={minhaVez} className={`${PRINCIPAL} self-start`}>
              Agora é minha vez
              <Seta />
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={minhaVez} className={PRINCIPAL}>
                Agora é minha vez
                <Seta />
              </button>
              <span className="text-sm text-suave">ou espere, se acertou joga de novo.</span>
            </div>
          )}
        </div>
      );
    } else if (recado?.tipo === "tiro" && recado.marca === "agua") {
      painel = (
        <p className="aparece m-0">
          <strong>Água em {coordenada(recado.casa)}. Vez do outro.</strong> Quando ele disser a coordenada, toque na casa.
        </p>
      );
    } else {
      painel = (
        <p className="m-0">
          <strong>Vez do outro.</strong> Quando ele disser a coordenada, toque na casa.
        </p>
      );
    }
  }

  const aba = (id: Aba, nome: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={estado.aba === id}
      onClick={() => trocarAba(id)}
      className={`min-h-11 flex-1 rounded-xl text-[15px] font-bold ${estado.aba === id ? "bg-white text-tinta shadow-sm" : "text-suave"}`}
    >
      {nome}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Tabuleiros" className="flex flex-1 gap-1 rounded-2xl bg-painel p-1">
          {aba("atacar", "Atacar")}
          {aba("defender", "Defender")}
        </div>
        <button
          type="button"
          onClick={desfazer}
          disabled={!anterior}
          aria-label="Desfazer o último toque"
          title="Desfazer o último toque"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-tinta ring-1 ring-borda disabled:opacity-30"
        >
          <Desfazer />
        </button>
      </div>

      <div role="status" className="min-h-[148px] rounded-2xl bg-painel p-3.5">
        {painel}
      </div>

      {estado.aba === "atacar" ? (
        <Tabuleiro titulo="Seus tiros no mar do outro" casa={aparenciaAtaque} aoTocar={tocarAtaque} escolhida={alvo} />
      ) : (
        <Tabuleiro titulo="Sua frota" casa={aparenciaDefesa} aoTocar={tocarDefesa} escolhida={defesa} />
      )}

      {estado.aba === "atacar" ? (
        <ListaNaviosDele afundados={estado.afundadosDele.map((a) => a.navioId)} />
      ) : (
        <ListaMinhaFrota situacao={situacao} />
      )}

      <button type="button" onClick={() => novaPartida(true)} className="mt-2 self-start text-[15px] font-bold text-suave underline underline-offset-2">
        Nova partida
      </button>
    </div>
  );
}

/** Navios do outro, riscados quando afundam. */
export function ListaNaviosDele({ afundados }: { afundados: readonly string[] }) {
  return (
    <ul aria-label="Navios do outro" className="m-0 flex list-none flex-wrap gap-1.5 p-0 text-sm">
      {FROTA.map((n) => {
        const afundou = afundados.includes(n.id);
        return (
          <li key={n.id} className={`rounded-full px-2.5 py-1 font-bold ${afundou ? "bg-painel text-suave line-through" : "bg-fogo-claro text-tinta"}`}>
            {maiuscula(n.nome)} ({n.tamanho}){afundou ? <span className="sr-only">, afundado</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

/** A minha frota: quantas casas de cada navio já foram atingidas. */
export function ListaMinhaFrota({ situacao }: { situacao: ReturnType<typeof situacaoDaFrota> }) {
  return (
    <ul aria-label="Sua frota" className="m-0 flex list-none flex-wrap gap-1.5 p-0 text-sm">
      {situacao.map((s) => (
        <li key={s.navioId} className={`rounded-full px-2.5 py-1 font-bold ${s.afundou ? "bg-painel text-suave line-through" : "bg-azul-claro text-tinta"}`}>
          {maiuscula(s.nome)} {s.acertos}/{s.tamanho}
          {s.afundou ? <span className="sr-only">, afundado</span> : null}
        </li>
      ))}
    </ul>
  );
}
