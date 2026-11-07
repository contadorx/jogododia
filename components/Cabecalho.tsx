import Link from "next/link";
import { Marca } from "./Marca";

type Aba = "jogos" | "sobre";

const ABAS: { id: Aba; href: string; nome: string }[] = [
  { id: "jogos", href: "/", nome: "Jogos" },
  { id: "sobre", href: "/sobre/", nome: "Sobre" },
];

/** Barra de cima, a mesma no celular e no computador (o site tem poucas páginas). */
export function Cabecalho({ atual }: { atual?: Aba }) {
  return (
    <header className="nao-imprimir border-b border-linha bg-white">
      <div className={`flex h-16 items-center gap-4 md:h-[72px] ${CONTEUDO}`}>
        <Marca />
        <nav aria-label="Navegação principal" className="ml-auto flex items-center gap-1">
          {ABAS.map((a) => {
            const ativa = a.id === atual;
            return (
              <Link
                key={a.id}
                href={a.href}
                aria-current={ativa ? "page" : undefined}
                className={`rounded-full px-3 py-2 text-[15px] font-bold no-underline transition-colors md:px-4 ${
                  ativa ? "bg-azul-claro text-azul" : "text-suave hover:bg-painel hover:text-tinta"
                }`}
              >
                {a.nome}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

/** Contêiner padrão: coluna estreita no celular, larga no computador. */
export const CONTEUDO = "mx-auto w-full max-w-md px-4 md:max-w-5xl md:px-8";
