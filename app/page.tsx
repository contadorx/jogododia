import { SITE } from "@/config/site";
import { Cabecalho, CONTEUDO } from "@/components/Cabecalho";
import { CartaoIrmao } from "@/components/CartaoIrmao";
import { CartaoJogo } from "@/components/CartaoJogo";
import { JogoDeHoje } from "@/components/JogoDeHoje";
import { Rodape } from "@/components/Rodape";
import { jogosDisponiveis, todosOsJogos } from "@/lib/conteudo";
import { temVersaoNoSite } from "@/lib/jogaveis";

export default function Inicio() {
  const jogos = todosOsJogos();
  const disponiveis = jogosDisponiveis().map((j) => ({
    id: j.id,
    nome: j.nome,
    treina: j.treina,
    resumo: j.resumo,
    minutos: j.minutos,
    idade: j.idade,
    jogavel: temVersaoNoSite(j.id),
  }));

  return (
    <>
      <Cabecalho atual="jogos" />
      <main className={`flex flex-col gap-8 pt-6 md:gap-10 md:pt-10 ${CONTEUDO}`}>
        <div className="flex max-w-[44rem] flex-col gap-3">
          <h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.1] tracking-tight md:text-[46px]">
            Jogos clássicos para jogar <span className="marca-texto">junto</span> com seu filho.
          </h1>
          <p className="m-0 text-[17px] text-suave md:text-[19px]">
            De {SITE.idades}. Partidas curtas, frente a frente ou cada um na sua casa, e cada jogo diz o que treina e de onde veio a ideia.
          </p>
        </div>

        <JogoDeHoje jogos={disponiveis} />

        <section aria-labelledby="todos" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="todos" className="m-0 font-display text-[24px] font-extrabold">
              Todos os jogos
            </h2>
            <p className="m-0 text-[15px] text-suave">
              Escolhemos jogos de raciocínio, com pouca sorte, que cabem numa conversa entre adulto e criança.
            </p>
          </div>
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
            {jogos.map((j) => (
              <CartaoJogo key={j.id} jogo={j} />
            ))}
          </ul>
        </section>

        <CartaoIrmao />
        <Rodape />
      </main>
    </>
  );
}
