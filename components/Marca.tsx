import Link from "next/link";
import { SITE } from "@/config/site";
import { MARCA_CORPO } from "@/lib/marca";

/** A marca (um tabuleiro com uma peça). Decorativa: o nome do site vem sempre ao lado ou no título. */
export function Selo({ tamanho = 36, className }: { tamanho?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={tamanho}
      height={tamanho}
      aria-hidden="true"
      focusable="false"
      className={className}
      dangerouslySetInnerHTML={{ __html: MARCA_CORPO }}
    />
  );
}

export function Marca() {
  return (
    <Link href="/" className="flex items-center gap-2 text-tinta no-underline">
      <Selo />
      <span className="whitespace-nowrap font-display text-[18px] font-extrabold tracking-tight">{SITE.nome}</span>
    </Link>
  );
}
