import Link from "next/link";
import { MODOS, type Jogo } from "@/lib/esquema";

/** Um jogo no catálogo. Os que ainda não saíram aparecem apagados, com "Em breve". */
export function CartaoJogo({ jogo }: { jogo: Jogo }) {
  const disponivel = jogo.status === "disponivel";
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="m-0 font-display text-[19px] font-extrabold leading-tight">{jogo.nome}</h3>
        {disponivel ? (
          <span className="shrink-0 rounded-full bg-folha-claro px-2.5 py-0.5 text-xs font-bold text-folha-escuro">Disponível</span>
        ) : (
          <span className="shrink-0 rounded-full bg-painel px-2.5 py-0.5 text-xs font-bold text-suave">Em breve</span>
        )}
      </div>
      <p className="m-0 text-[15px]">{jogo.treina}</p>
      <p className="m-0 text-sm text-suave">
        A partir de {jogo.idade} anos · {MODOS[jogo.modo]}
      </p>
    </>
  );

  if (!disponivel) {
    return <li className="flex flex-col gap-2 rounded-2xl border border-dashed border-borda p-4 opacity-80">{conteudo}</li>;
  }
  return (
    <li className="flex">
      <Link
        href={`/jogos/${jogo.id}/`}
        className="flex w-full flex-col gap-2 rounded-2xl border border-borda bg-white p-4 text-tinta no-underline transition-colors hover:border-azul hover:bg-azul-claro/40"
      >
        {conteudo}
      </Link>
    </li>
  );
}
