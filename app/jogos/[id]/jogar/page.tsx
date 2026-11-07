import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aceite } from "@/components/Aceite";
import { JogarBatalha } from "@/components/batalha/JogarBatalha";
import { Cabecalho } from "@/components/Cabecalho";
import { Voltar } from "@/components/Icones";
import { Rodape } from "@/components/Rodape";
import { jogoDisponivel } from "@/lib/conteudo";
import { JOGAVEIS, temVersaoNoSite } from "@/lib/jogaveis";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return JOGAVEIS.filter((id) => jogoDisponivel(id)).map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const jogo = jogoDisponivel(id);
  if (!jogo) return {};
  return {
    title: `Jogar ${jogo.nome.toLowerCase()}`,
    description: jogo.resumo,
    alternates: { canonical: `/jogos/${jogo.id}/` },
    // quem chega pelo Google deve cair na ficha, com as regras
    robots: { index: false, follow: true },
  };
}

export default async function Jogar({ params }: Props) {
  const { id } = await params;
  const jogo = jogoDisponivel(id);
  if (!jogo || !temVersaoNoSite(id)) notFound();

  return (
    <>
      <Cabecalho atual="jogos" />
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-3 md:max-w-xl md:px-8 md:pt-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="m-0 font-display text-[26px] font-extrabold tracking-tight">{jogo.nome}</h1>
          <Link href={`/jogos/${jogo.id}/`} className="inline-flex min-h-11 items-center gap-1 text-[15px] font-bold no-underline">
            <Voltar tamanho={20} />
            Regras
          </Link>
        </div>
        <Aceite>{id === "batalha-naval" ? <JogarBatalha conversa={jogo.conversa} /> : null}</Aceite>
        <Rodape />
      </main>
    </>
  );
}
