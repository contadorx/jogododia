import { SITE } from "@/config/site";
import { Externo } from "./Icones";

/** Ponte para o site irmão, para crianças menores. */
export function CartaoIrmao() {
  return (
    <aside aria-label={`Site irmão: ${SITE.irmao.nome}`} className="flex flex-col gap-2 rounded-2xl bg-sol-claro p-4 md:flex-row md:items-center md:gap-6 md:p-5">
      <div className="flex flex-1 flex-col gap-1">
        <p className="m-0 font-display text-[18px] font-extrabold">Tem criança de 1 a 6 anos em casa?</p>
        <p className="m-0 text-[15px]">
          O {SITE.irmao.nome} é o nosso site irmão: {SITE.irmao.chamada}.
        </p>
      </div>
      <a
        href={SITE.irmao.url}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl bg-white px-4 font-bold text-tinta no-underline ring-1 ring-borda hover:ring-azul md:self-center"
      >
        Conhecer o {SITE.irmao.nome}
        <Externo tamanho={18} />
      </a>
    </aside>
  );
}
