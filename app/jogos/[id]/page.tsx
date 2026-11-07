import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho, CONTEUDO } from "@/components/Cabecalho";
import { Seta, Voltar } from "@/components/Icones";
import { Rodape } from "@/components/Rodape";
import { jogoDisponivel, jogosDisponiveis } from "@/lib/conteudo";
import { EVIDENCIAS, MODOS, type JogoDisponivel } from "@/lib/esquema";
import { temVersaoNoSite } from "@/lib/jogaveis";
import { previa } from "@/lib/metadados";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return jogosDisponiveis().map((j) => ({ id: j.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const jogo = jogoDisponivel(id);
  if (!jogo) return {};
  const descricao = `${jogo.treina} ${jogo.resumo}`;
  return {
    title: jogo.nome,
    description: descricao,
    alternates: { canonical: `/jogos/${jogo.id}/` },
    openGraph: previa({ titulo: jogo.nome, descricao, caminho: `/jogos/${jogo.id}/` }),
  };
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mesAno = (data: string) => `${MESES[Number(data.slice(5, 7)) - 1]}/${data.slice(0, 4)}`;

function Revisao({ jogo }: { jogo: JogoDisponivel }) {
  const r = jogo.revisao;
  if (!r) return <p className="m-0 text-sm text-suave">Ainda não revisado por professor ou outro profissional.</p>;
  const quem = r.mostrarNome ? `${r.nome}, ${r.profissao.toLowerCase()}` : r.profissao.toLowerCase();
  return (
    <p className="m-0 text-sm font-bold text-folha-escuro">
      Revisado por {quem}, em {mesAno(r.em)}.
    </p>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 font-display text-[21px] font-extrabold">{titulo}</h2>
      {children}
    </section>
  );
}

export default async function Ficha({ params }: Props) {
  const { id } = await params;
  const jogo = jogoDisponivel(id);
  if (!jogo) notFound();
  const jogavel = temVersaoNoSite(jogo.id);

  return (
    <>
      <Cabecalho atual="jogos" />
      <main className={`flex flex-col gap-6 pt-4 md:pt-8 ${CONTEUDO}`}>
        <Link href="/" className="inline-flex min-h-11 items-center gap-1 self-start font-bold text-tinta no-underline">
          <Voltar tamanho={22} />
          Todos os jogos
        </Link>

        <header className="flex max-w-[48rem] flex-col gap-3">
          <h1 className="m-0 font-display text-[34px] font-extrabold leading-tight tracking-tight md:text-[46px]">{jogo.nome}</h1>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-sm font-bold">
            {[`A partir de ${jogo.idade} anos`, `${jogo.jogadores} jogadores`, `${jogo.minutos} minutos`, MODOS[jogo.modo]].map((t) => (
              <li key={t} className="rounded-full bg-painel px-3 py-1">
                {t}
              </li>
            ))}
          </ul>
          <p className="m-0 text-[18px] font-bold">
            <span className="marca-texto">{jogo.treina}</span>
          </p>
          <p className="m-0 text-[17px]">{jogo.resumo}</p>
          {jogavel ? (
            <Link
              href={`/jogos/${jogo.id}/jogar/`}
              className="mt-1 flex min-h-[54px] items-center justify-center gap-2 self-stretch rounded-2xl bg-azul px-8 text-[17px] font-bold text-white no-underline hover:bg-azul-escuro sm:self-start"
            >
              Jogar agora
              <Seta />
            </Link>
          ) : null}
        </header>

        <div className="grid gap-8 md:grid-cols-[3fr_2fr] md:gap-10">
          <div className="flex flex-col gap-7">
            <Bloco titulo="Você vai precisar">
              <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
                {jogo.precisa.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </Bloco>
            <Bloco titulo="Como jogar">
              <ol className="m-0 flex list-decimal flex-col gap-2 pl-5 marker:font-bold">
                {jogo.passos.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </Bloco>
            <Bloco titulo="Combinados">
              <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
                {jogo.combinados.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </Bloco>
          </div>

          <div className="flex flex-col gap-7">
            <Bloco titulo="Depois do jogo, conversem">
              <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
                {jogo.conversa.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </Bloco>
            <section aria-labelledby="origem" className="flex flex-col gap-2 rounded-2xl bg-painel p-4">
              <h2 id="origem" className="m-0 font-display text-[19px] font-extrabold">
                De onde veio a ideia
              </h2>
              <p className="m-0 text-[15px]">{jogo.base}</p>
              <p className="m-0 text-sm text-suave">
                {EVIDENCIAS[jogo.evidencia]}. As fontes são citadas como inspiração, não como aval: as instituições não revisaram este site.
              </p>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[15px]">
                {jogo.fontes.map((f) => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      {f.titulo}
                    </a>
                  </li>
                ))}
              </ul>
              <Revisao jogo={jogo} />
            </section>
          </div>
        </div>

        <Rodape />
      </main>
    </>
  );
}
