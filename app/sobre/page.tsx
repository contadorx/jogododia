import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/config/site";
import { ApagarDados } from "@/components/ApagarDados";
import { Cabecalho, CONTEUDO } from "@/components/Cabecalho";
import { CartaoIrmao } from "@/components/CartaoIrmao";
import { Rodape } from "@/components/Rodape";

export const metadata: Metadata = {
  title: "Sobre",
  description: `Por que o ${SITE.nome} existe, como os jogos são escolhidos e quem mantém o site.`,
};

const CRITERIOS = [
  ["Treinam raciocínio", "planejar, deduzir, calcular. Cada ficha diz o que o jogo treina, sem prometer nota melhor na escola."],
  ["Pouca sorte", "ganha quem pensa melhor, não quem tira o número maior no dado."],
  ["Clássicos", "regras tradicionais, de domínio público, com o nome popular de cada jogo."],
  ["Partida curta", "de 10 a 30 minutos, para caber num fim de tarde."],
  ["Frente a frente", "a conversa entre vocês faz parte do jogo, e cada ficha termina com perguntas para depois."],
  ["Com fonte", "cada ficha diz de onde veio a ideia, como no Brincadeira do Dia."],
] as const;

export default function Sobre() {
  return (
    <>
      <Cabecalho atual="sobre" />
      <main className={`flex flex-col gap-8 pt-6 md:pt-10 ${CONTEUDO}`}>
        <div className="flex max-w-[44rem] flex-col gap-3">
          <h1 className="m-0 font-display text-[32px] font-extrabold leading-tight tracking-tight md:text-[44px]">Sobre o {SITE.nome}</h1>
          <p className="m-0 text-[17px]">
            Um site gratuito, sem anúncios e sem cadastro, com jogos clássicos para pais e cuidadores jogarem <strong>junto</strong> com
            crianças de {SITE.idades}.
          </p>
        </div>

        <section className="flex max-w-[44rem] flex-col gap-2">
          <h2 className="m-0 font-display text-[22px] font-extrabold">Por que jogo na tela?</h2>
          <p className="m-0">
            Nessa idade a tela já faz parte do dia. A proposta daqui é usar a tela para jogar junto: partidas curtas, frente a frente, com uma
            conversa no fim. Para os menores, a regra é outra: no {SITE.irmao.nome}, a criança brinca longe da tela.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-[22px] font-extrabold">Como escolhemos os jogos</h2>
          <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
            {CRITERIOS.map(([titulo, texto]) => (
              <li key={titulo} className="rounded-2xl bg-painel p-4">
                <strong>{titulo}:</strong> {texto}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex max-w-[44rem] flex-col gap-2">
          <h2 className="m-0 font-display text-[22px] font-extrabold">Quem mantém</h2>
          <p className="m-0">
            O site é mantido por {SITE.responsavel}, pessoa física, sem fins comerciais. Dúvidas, sugestões de jogos e correções:{" "}
            <span className="font-bold select-all">{SITE.contato}</span>.
          </p>
          <p className="m-0">
            Quiser apoiar, o PIX fica na <a href={`${SITE.irmao.url}/sobre/`}>página Sobre do {SITE.irmao.nome}</a> e ajuda a manter os dois
            sites.
          </p>
        </section>

        <CartaoIrmao />

        <section className="flex max-w-[44rem] flex-col gap-2">
          <h2 className="m-0 font-display text-[22px] font-extrabold">Seus dados</h2>
          <p className="m-0">
            O site não tem cadastro e não guarda nada em servidor. O aceite dos Termos e a partida em andamento ficam só neste aparelho. Veja a{" "}
            <Link href="/privacidade/">Política de Privacidade</Link>.
          </p>
          <ApagarDados />
        </section>

        <Rodape />
      </main>
    </>
  );
}
