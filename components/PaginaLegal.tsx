import Link from "next/link";
import { DATA_TERMOS, VERSAO_TERMOS } from "@/config/site";
import { Cabecalho, CONTEUDO } from "./Cabecalho";
import { Voltar } from "./Icones";
import { Rodape } from "./Rodape";

/** Moldura das páginas de Termos de Uso e Política de Privacidade. */
export function PaginaLegal({ titulo, resumo, children }: { titulo: string; resumo: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <Cabecalho />
      <main className={`flex flex-col gap-6 pt-4 md:pt-8 ${CONTEUDO}`}>
        <Link href="/sobre/" className="inline-flex min-h-11 items-center gap-1 self-start font-bold text-tinta no-underline">
          <Voltar tamanho={22} />
          Sobre
        </Link>
        <div className="flex max-w-[70ch] flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 font-display text-[30px] font-extrabold tracking-tight md:text-[40px]">{titulo}</h1>
            <p className="m-0 text-sm text-suave">
              Última atualização: {DATA_TERMOS} · versão {VERSAO_TERMOS}
            </p>
          </div>
          <div className="rounded-2xl bg-sol-claro p-4 md:p-5">
            <p className="m-0 mb-1 text-xs font-bold uppercase tracking-wider text-suave">Em poucas palavras</p>
            {resumo}
          </div>
          <div className="texto-legal flex flex-col gap-6">{children}</div>
        </div>
        <Rodape />
      </main>
    </>
  );
}

export function Clausula({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`c-${n}`} className="flex flex-col gap-2">
      <h2 id={`c-${n}`} className="m-0 font-display text-[19px] font-extrabold">
        {n}. {titulo}
      </h2>
      {children}
    </section>
  );
}
