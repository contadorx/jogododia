import Link from "next/link";
import { SITE } from "@/config/site";

export function Rodape() {
  return (
    <footer className="nao-imprimir mt-6 flex flex-col items-center gap-2 border-t border-linha pb-8 pt-5 text-center text-sm text-suave">
      <nav aria-label="Informações legais" className="flex flex-wrap justify-center gap-x-5 gap-y-1">
        <Link href="/sobre/" className="text-suave hover:text-tinta">
          Sobre
        </Link>
        <Link href="/termos/" className="text-suave hover:text-tinta">
          Termos de Uso
        </Link>
        <Link href="/privacidade/" className="text-suave hover:text-tinta">
          Política de Privacidade
        </Link>
      </nav>
      <p className="m-0">
        Criança de 1 a 6 anos? Conheça o{" "}
        <a href={SITE.irmao.url} className="font-bold">
          {SITE.irmao.nome}
        </a>
        , {SITE.irmao.chamada}.
      </p>
      <p className="m-0">Jogos para jogar junto, com um adulto do começo ao fim.</p>
    </footer>
  );
}
