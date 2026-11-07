"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { coordenada, frotaCompleta, navio, situacaoDaFrota, type Posicao } from "@/lib/batalha";
import { CHAVES, chaveDaSala, gravar, jogoDaSalaGuardada, ler, salasGuardadas } from "@/lib/armazenamento";
import { evento } from "@/lib/metricas";
import { BarraDaSala, SalaDeOutroJogo } from "../jogos/PecasDaSala";
import { useTelaAcesa } from "../jogos/useTelaAcesa";
import {
  atirar,
  ehMensagem,
  ficarPronto,
  novaSala,
  receber,
  reenviar,
  revanche,
  vezAtual,
  type Evento,
  type Msg,
  type Partida,
  type Passo,
} from "@/lib/protocolo";
import { entrar, lerCodigo, linkDaSala, novoCodigo, novoId, servidorNoAr, type Conexao, type EstadoConexao, type Membro } from "@/lib/sala";
import { Seta } from "../Icones";
import { aparenciaDaDefesa, aparenciaDoAtaque } from "./aparencia";
import { ListaMinhaFrota, ListaNaviosDele } from "./BatalhaNaval";
import { corDe, ehCor, type CorId } from "./cores";
import { Fim } from "./Fim";
import { Montagem, PRINCIPAL, SECUNDARIO } from "./Montagem";
import { Tabuleiro } from "./Tabuleiro";
import { porExtenso } from "./textos";

/**
 * Batalha naval à distância: cada um na sua casa, numa sala com código. Sem cadastro, sem nome e sem
 * chat: só as jogadas passam pela internet (lib/sala.ts), e quem recebe o tiro responde sozinho.
 * A sala fica guardada neste aparelho pelo código, para continuar depois de fechar o navegador.
 */

type Salvo = { v: 1; partida: Partida; cor: CorId; rascunho: Posicao[]; atualizado: number };

function salvoValido(x: unknown, codigo: string): x is Salvo {
  const s = x as Salvo | null;
  return !!s && s.v === 1 && !!s.partida && s.partida.codigo === codigo && s.partida.v === 1 && ehCor(s.cor) && Array.isArray(s.rascunho);
}

const novoSalvo = (partida: Partida, cor: CorId = "azul"): Salvo => ({ v: 1, partida, cor, rascunho: [], atualizado: Date.now() });

// ------------------------------------------------------------------------------------------- entrada

/** Criar uma sala, entrar com um código ou voltar para uma sala guardada. */
export function EntradaDistancia({ aoEntrar }: { aoEntrar: (codigo: string) => void }) {
  const [noAr, setNoAr] = useState<"verificando" | "sim" | "nao">("verificando");
  const [deNovo, setDeNovo] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [guardadas, setGuardadas] = useState<{ codigo: string; fase: string; atualizado: number }[]>([]);

  const verificar = useCallback(() => {
    setNoAr("verificando");
    servidorNoAr().then((ok) => setNoAr(ok ? "sim" : "nao"));
  }, []);

  useEffect(() => {
    verificar();
    const lista = salasGuardadas()
      .map((codigo) => ({ codigo, salvo: ler<Salvo>(chaveDaSala(codigo)) }))
      .filter((x): x is { codigo: string; salvo: Salvo } => salvoValido(x.salvo, x.codigo))
      .map(({ codigo, salvo }) => ({ codigo, fase: salvo.partida.fase, atualizado: salvo.atualizado }))
      .sort((a, b) => b.atualizado - a.atualizado)
      .slice(0, 3);
    setGuardadas(lista);
  }, [verificar]);

  const criar = () => {
    const codigo = novoCodigo();
    gravar(chaveDaSala(codigo), novoSalvo(novaSala(codigo, "criador", novoId(), { deNovo })));
    evento("sala_criada", { jogo: "batalha-naval" });
    aoEntrar(codigo);
  };

  const entrarComCodigo = (e: React.FormEvent) => {
    e.preventDefault();
    const codigo = lerCodigo(texto);
    if (!codigo) {
      setErro("O código tem 6 letras e números, como K7P2QX.");
      return;
    }
    aoEntrar(codigo);
  };

  const FASES: Record<string, string> = { montando: "montando a frota", pronto: "esperando começar", jogando: "partida em andamento", fim: "partida terminada" };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-[24px] font-extrabold">Jogar à distância</h2>
        <p className="m-0 text-[15px] text-suave">
          Cada um no seu celular, em qualquer lugar. Um cria a sala e manda o código; o outro entra. Sem cadastro e sem chat: só as jogadas
          passam pela internet.
        </p>
      </div>

      {noAr === "verificando" ? (
        <p role="status" className="m-0 rounded-2xl bg-painel p-3.5 text-[15px]">
          Conferindo se o modo à distância está no ar…
        </p>
      ) : noAr === "nao" ? (
        <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-alerta-claro p-3.5 text-[15px] text-alerta">
          <p className="m-0 font-bold">O modo à distância não respondeu agora.</p>
          <p className="m-0">Pode ser a internet deste aparelho ou o servidor. Tente de novo em alguns minutos, ou joguem frente a frente.</p>
          <button type="button" onClick={verificar} className={`${SECUNDARIO} self-start`}>
            Tentar de novo
          </button>
        </div>
      ) : null}

      <section aria-labelledby="criar" className="flex flex-col gap-3 rounded-2xl border border-borda p-4">
        <h3 id="criar" className="m-0 font-display text-[19px] font-extrabold">
          Criar uma sala
        </h3>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-[15px] font-bold">Acertou, joga de novo?</legend>
          {[
            { valor: false, texto: "Não: a vez sempre passa" },
            { valor: true, texto: "Sim: quem acerta atira de novo" },
          ].map((o) => (
            <label key={String(o.valor)} className="flex min-h-11 items-center gap-3 rounded-xl bg-painel px-3">
              <input type="radio" name="denovo" checked={deNovo === o.valor} onChange={() => setDeNovo(o.valor)} className="h-5 w-5 accent-azul" />
              {o.texto}
            </label>
          ))}
        </fieldset>
        <button type="button" onClick={criar} disabled={noAr !== "sim"} className={PRINCIPAL}>
          Criar sala
          <Seta />
        </button>
      </section>

      <form onSubmit={entrarComCodigo} aria-labelledby="entrar" className="flex flex-col gap-3 rounded-2xl border border-borda p-4">
        <h3 id="entrar" className="m-0 font-display text-[19px] font-extrabold">
          Entrar numa sala
        </h3>
        <label htmlFor="codigo" className="text-[15px] font-bold">
          Código que o outro mandou
        </label>
        <div className="flex gap-2">
          <input
            id="codigo"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value.toUpperCase());
              setErro(null);
            }}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={9}
            placeholder="K7P2QX"
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "erro-codigo" : undefined}
            className="min-h-[50px] w-full min-w-0 flex-1 rounded-2xl border border-borda px-4 font-display text-[22px] font-extrabold tracking-[0.15em] uppercase placeholder:text-borda"
          />
          <button type="submit" disabled={noAr !== "sim"} className={PRINCIPAL}>
            Entrar
          </button>
        </div>
        {erro ? (
          <p id="erro-codigo" className="m-0 text-sm font-bold text-alerta">
            {erro}
          </p>
        ) : null}
      </form>

      {guardadas.length > 0 ? (
        <section aria-labelledby="guardadas" className="flex flex-col gap-2">
          <h3 id="guardadas" className="m-0 text-[15px] font-bold text-suave">
            Salas guardadas neste aparelho
          </h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {guardadas.map((g) => (
              <li key={g.codigo}>
                <button type="button" onClick={() => aoEntrar(g.codigo)} className={`${SECUNDARIO} w-full justify-between`}>
                  <span className="font-display tracking-[0.1em]">{g.codigo}</span>
                  <span className="text-sm font-normal text-suave">{FASES[g.fase] ?? g.fase}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------------------------------- sala

function textoDoEvento(e: Evento): string {
  const onde = coordenada(e.casa);
  const r = e.resposta;
  if (e.tipo === "meu-tiro") {
    if (r.tipo === "acertou") return `Seu tiro em ${onde}: acertou!`;
    if (r.tipo === "afundou") return `Seu tiro em ${onde} afundou o ${navio(r.navioId).nome}!`;
    return `Seu tiro em ${onde}: água.`;
  }
  if (r.tipo === "acertou") return `Ele atirou em ${onde} e acertou o seu ${navio(r.navioId).nome}.`;
  if (r.tipo === "afundou") return `Ele atirou em ${onde} e afundou o seu ${navio(r.navioId).nome}.`;
  return `Ele atirou em ${onde}: água.`;
}

export function SalaDistancia({ codigo, conversa, aoSair }: { codigo: string; conversa: readonly string[]; aoSair: () => void }) {
  const [salvo, setSalvo] = useState<Salvo | null>(null);
  const ref = useRef<Salvo | null>(null);
  const conexao = useRef<Conexao<Msg> | null>(null);
  const membrosRef = useRef<Membro[]>([]);
  const [conexaoEstado, setConexaoEstado] = useState<EstadoConexao>("conectando");
  const [membros, setMembros] = useState<Membro[]>([]);
  const [cheia, setCheia] = useState(false);
  const [outroJogo, setOutroJogo] = useState<string | null>(null);
  const [aba, setAba] = useState<"atacar" | "defender">("atacar");
  const [alvo, setAlvo] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);

  const guardar = useCallback(
    (s: Salvo) => {
      ref.current = s;
      setSalvo(s);
      gravar(chaveDaSala(codigo), s);
    },
    [codigo],
  );

  const enviar = useCallback((msgs: Msg[]) => {
    for (const m of msgs) conexao.current?.enviar(m);
  }, []);

  const aplicar = useCallback(
    (passo: Passo) => {
      const atual = ref.current;
      if (!atual) return;
      const antes = atual.partida;
      guardar({ ...atual, partida: passo.partida, atualizado: Date.now() });
      enviar(passo.enviar);
      const depois = passo.partida;
      if (antes.fase !== "jogando" && depois.fase === "jogando") evento("partida_iniciada", { jogo: "batalha-naval", modo: "distancia" });
      if (antes.fase !== "fim" && depois.fase === "fim" && depois.resultado) {
        evento("partida_terminada", { jogo: "batalha-naval", modo: "distancia", resultado: depois.resultado });
      }
    },
    [enviar, guardar],
  );

  // carrega a sala guardada (ou entra como convidado, quando veio pelo link)
  useEffect(() => {
    const dono = jogoDaSalaGuardada(codigo);
    if (dono && dono !== "batalha-naval") {
      setOutroJogo(dono);
      return;
    }
    const guardado = ler<Salvo>(chaveDaSala(codigo));
    const s = salvoValido(guardado, codigo) ? guardado : novoSalvo(novaSala(codigo, "convidado", novoId()));
    guardar(s);
    evento("sala_aberta", { jogo: "batalha-naval", papel: s.partida.papel });
  }, [codigo, guardar]);

  const carregado = salvo !== null;

  // conecta na sala
  useEffect(() => {
    if (!carregado || !ref.current) return;
    let ativo = true;
    const meuId = ref.current.partida.meuId;
    entrar(codigo, meuId, {
      aoMensagem: (msg, de) => {
        if (ativo && ref.current) aplicar(receber(ref.current.partida, msg, de));
      },
      aoPresenca: (lista) => {
        if (!ativo) return;
        membrosRef.current = lista;
        setMembros(lista);
        const primeiros = [...lista].sort((a, b) => a.desde - b.desde || a.id.localeCompare(b.id)).slice(0, 2);
        if (lista.length > 2 && !primeiros.some((m) => m.id === meuId)) {
          setCheia(true);
          conexao.current?.sair();
          return;
        }
        // o outro chegou ou voltou: conta como está e manda de novo o tiro que ficou sem resposta
        if (ref.current && lista.some((m) => m.id !== meuId)) enviar(reenviar(ref.current.partida));
      },
      aoEstado: (estado) => {
        if (!ativo) return;
        setConexaoEstado(estado);
        if (estado === "conectado" && ref.current) enviar(reenviar(ref.current.partida));
      },
    }, { canal: "batalha", validar: ehMensagem })
      .then((c) => {
        if (ativo) conexao.current = c;
        else c.sair();
      })
      .catch(() => {
        if (ativo) setConexaoEstado("caiu");
      });
    return () => {
      ativo = false;
      conexao.current?.sair();
      conexao.current = null;
    };
  }, [codigo, carregado, aplicar, enviar]);

  // tiro sem resposta, ou esperando o outro ficar pronto: manda de novo a cada 4 segundos
  useEffect(() => {
    const t = setInterval(() => {
      const p = ref.current?.partida;
      if (!p) return;
      const outroNaSala = membrosRef.current.some((m) => m.id !== p.meuId);
      if (p.pendente || p.fase === "pronto" || (outroNaSala && !p.outro)) enviar(reenviar(p));
    }, 4000);
    return () => clearInterval(t);
  }, [enviar]);

  // a aba acompanha a vez: na minha vez, o mar do outro; na vez dele, a minha frota
  const vez = salvo ? vezAtual(salvo.partida) : null;
  useEffect(() => {
    if (vez === "eu") setAba("atacar");
    if (vez === "outro") setAba("defender");
    setAlvo(null);
  }, [vez]);

  // tela acesa até a partida acabar: tela apagada derruba a conexão
  useTelaAcesa(!!salvo && salvo.partida.fase !== "fim" && !cheia && !outroJogo);

  if (outroJogo) return <SalaDeOutroJogo codigo={codigo} jogo={outroJogo} aoSair={aoSair} />;

  if (cheia) {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-alerta-claro p-4 text-alerta">
        <p className="m-0 font-bold">Esta sala já tem dois jogadores.</p>
        <p className="m-0">Confira o código com quem mandou, ou crie uma sala nova.</p>
        <button type="button" onClick={aoSair} className={`${SECUNDARIO} self-start`}>
          Voltar
        </button>
      </div>
    );
  }

  if (!salvo) return <div aria-busy="true" className="min-h-[60vh]" />;

  const p = salvo.partida;
  const cor = corDe(salvo.cor);
  const outroPresente = membros.some((m) => m.id !== p.meuId);
  const link = linkDaSala(codigo);

  const sair = () => {
    if (p.fase === "jogando" && !window.confirm("Sair da sala? A partida fica guardada neste aparelho e dá para voltar pelo código.")) return;
    aoSair();
  };

  const barra = (
    <BarraDaSala
      codigo={codigo}
      conexao={conexaoEstado}
      outroPresente={outroPresente}
      outroJaVeio={p.outro !== null}
      emPartida={p.fase !== "fim"}
      link={link}
      nomeDoJogo="Batalha naval"
      aoSair={sair}
      aoTentar={() => conexao.current?.reconectar()}
    />
  );

  const convite =
    p.papel === "criador" && !p.outro ? (
      <section aria-labelledby="convite" className="flex flex-col gap-2 rounded-2xl bg-sol-claro p-4">
        <h2 id="convite" className="m-0 font-display text-[19px] font-extrabold">
          Chame o outro jogador
        </h2>
        <p className="m-0">
          Código da sala: <strong className="font-display text-[30px] leading-none tracking-[0.15em]">{codigo}</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Vamos jogar batalha naval? Entre na sala ${codigo}: ${link}`)}`}
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
    ) : null;

  const combinado = (
    <p className="m-0 text-sm text-suave">
      Combinado da sala: {p.regras.deNovo ? "acertou, joga de novo." : "a vez sempre passa, acertando ou não."}
    </p>
  );

  // ----------------------------------------------------------------- montando
  if (p.fase === "montando") {
    const outroAtrasado = p.outro && p.outro.p < p.p;
    return (
      <div className="flex flex-col gap-4">
        {barra}
        {convite}
        {outroAtrasado ? (
          <p className="m-0 rounded-2xl bg-painel p-3.5 text-[15px]">O outro ainda está no fim da partida anterior. Monte a sua frota enquanto isso.</p>
        ) : null}
        <Montagem
          frota={salvo.rascunho}
          cor={salvo.cor}
          aoMudarFrota={(rascunho) => guardar({ ...salvo, rascunho, atualizado: Date.now() })}
          aoMudarCor={(c) => guardar({ ...salvo, cor: c, atualizado: Date.now() })}
          aoPronto={() => {
            if (frotaCompleta(salvo.rascunho)) aplicar(ficarPronto(p, salvo.rascunho));
          }}
          subtitulo="O outro não vê a sua tela. Os navios não podem se encostar, nem na diagonal."
        />
        {combinado}
      </div>
    );
  }

  const aparenciaAtaque = aparenciaDoAtaque(p.tiros, p.deduzidas, p.pendente?.casa ?? null);
  const aparenciaDefesa = aparenciaDaDefesa(p.frota, p.recebidos, cor);

  // ----------------------------------------------------------------- pronto, esperando o outro
  if (p.fase === "pronto") {
    const outroMontando = !p.outro || p.outro.p !== p.p || p.outro.fase === "montando";
    return (
      <div className="flex flex-col gap-4">
        {barra}
        {convite}
        <div role="status" className="flex flex-col gap-1 rounded-2xl bg-painel p-3.5">
          <p className="m-0 font-display text-[21px] font-extrabold">Frota pronta!</p>
          <p className="m-0">
            {!outroPresente
              ? "Esperando o outro jogador entrar na sala."
              : outroMontando
                ? "Esperando o outro terminar de montar a frota dele."
                : "Os dois estão prontos. Sorteando quem começa…"}
          </p>
        </div>
        <Tabuleiro titulo="Sua frota" casa={aparenciaDefesa} />
        {combinado}
      </div>
    );
  }

  // ----------------------------------------------------------------- fim
  if (p.fase === "fim") {
    const venci = p.resultado === "venci";
    const outroQuerDeNovo = p.outro && p.outro.p > p.p;
    return (
      <div className="flex flex-col gap-4">
        {barra}
        <Fim
          titulo={venci ? "Você afundou a frota inteira!" : "O outro afundou a sua frota."}
          texto={
            venci
              ? "Boa partida! Liguem um para o outro e comparem os tabuleiros."
              : `O último tiro dele foi em ${p.ultimo ? coordenada(p.ultimo.casa) : "—"}. Boa partida!`
          }
          tiros={p.tiros}
          conversa={conversa}
          ataque={aparenciaAtaque}
          defesa={aparenciaDefesa}
        >
          <button
            type="button"
            onClick={() => {
              aplicar(revanche(p));
              setAlvo(null);
            }}
            className={`${PRINCIPAL} sm:flex-1`}
          >
            {outroQuerDeNovo ? "O outro quer revanche: jogar de novo" : "Jogar de novo"}
          </button>
          <Link href="/" className={`${SECUNDARIO} no-underline`}>
            Ver outros jogos
          </Link>
        </Fim>
      </div>
    );
  }

  // ----------------------------------------------------------------- jogando
  const minhaVez = vez === "eu";
  const confirmarTiro = () => {
    if (alvo === null) return;
    aplicar(atirar(p, alvo));
    setAlvo(null);
  };

  let painel: React.ReactNode;
  if (p.pendente) {
    painel = (
      <p className="m-0">
        <strong>Tiro em {coordenada(p.pendente.casa)}…</strong> esperando a resposta do outro aparelho.
        {!outroPresente ? " O outro saiu da sala; o tiro vai assim que ele voltar." : ""}
      </p>
    );
  } else if (minhaVez && alvo !== null) {
    painel = (
      <div className="flex flex-col gap-2">
        <p className="m-0">
          Atirar em <strong className="font-display text-[26px] leading-none">{coordenada(alvo)}</strong>?{" "}
          <span className="text-sm text-suave">({porExtenso(alvo)})</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirmarTiro}
            className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-fogo px-5 font-bold text-white hover:brightness-95"
          >
            Atirar em {coordenada(alvo)}
          </button>
          <button type="button" onClick={() => setAlvo(null)} className={SECUNDARIO}>
            Cancelar
          </button>
        </div>
      </div>
    );
  } else {
    painel = (
      <div className="flex flex-col gap-1">
        {p.ultimo ? (
          <p className={`aparece m-0 font-display text-[21px] font-extrabold ${p.ultimo.resposta.tipo === "agua" ? "text-azul" : "text-fogo"}`}>
            {textoDoEvento(p.ultimo)}
          </p>
        ) : null}
        <p className="m-0">
          {minhaVez ? (
            <>
              <strong>Sua vez.</strong> Toque numa casa do mar do outro.
            </>
          ) : (
            <>
              <strong>Vez do outro.</strong>{" "}
              {conexaoEstado !== "conectado" ? "" : outroPresente ? "Ele está escolhendo onde atirar." : "A partida continua quando ele voltar."}
            </>
          )}
        </p>
      </div>
    );
  }

  const tocarAtaque = (c: number) => {
    if (!minhaVez || p.pendente || p.tiros[c]) return;
    setAlvo(c);
  };

  const botaoAba = (id: "atacar" | "defender", nome: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={aba === id}
      onClick={() => {
        setAba(id);
        setAlvo(null);
      }}
      className={`min-h-11 flex-1 rounded-xl text-[15px] font-bold ${aba === id ? "bg-white text-tinta shadow-sm" : "text-suave"}`}
    >
      {nome}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      {barra}
      <div role="tablist" aria-label="Tabuleiros" className="flex gap-1 rounded-2xl bg-painel p-1">
        {botaoAba("atacar", "Mar do outro")}
        {botaoAba("defender", "Sua frota")}
      </div>

      <div role="status" className={`min-h-[120px] rounded-2xl p-3.5 ${minhaVez ? "bg-sol-claro" : "bg-painel"}`}>
        {painel}
      </div>

      {aba === "atacar" ? (
        <Tabuleiro titulo="Seus tiros no mar do outro" casa={aparenciaAtaque} aoTocar={tocarAtaque} escolhida={alvo} />
      ) : (
        <Tabuleiro titulo="Sua frota" casa={aparenciaDefesa} />
      )}

      {aba === "atacar" ? (
        <ListaNaviosDele afundados={p.afundadosDele.map((a) => a.navioId)} />
      ) : (
        <ListaMinhaFrota situacao={situacaoDaFrota(p.frota, p.recebidos)} />
      )}
      {combinado}
    </div>
  );
}

/** Lembra o último modo escolhido neste aparelho. */
export function lerModo(): "frente" | "distancia" | null {
  const m = ler<string>(CHAVES.modo);
  return m === "frente" || m === "distancia" ? m : null;
}
