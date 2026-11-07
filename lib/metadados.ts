import type { Metadata } from "next";
import { SITE } from "@/config/site";

/**
 * Endereço público das prévias de link. Na Vercel, vem sozinho do domínio de produção do projeto:
 * o .vercel.app enquanto o .com.br não estiver ligado, e o .com.br depois. Fora da Vercel, vale SITE.url.
 */
export const URL_PUBLICA = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : SITE.url;

/** Imagem da prévia de links (1200 x 630). */
export const IMAGEM_PREVIA = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: `${SITE.nome}: jogos clássicos e educativos para jogar junto com seu filho.`,
};

/** Open Graph completo de uma página (no Next, o da página substitui o do layout inteiro). */
export function previa({ titulo, descricao, caminho }: { titulo: string; descricao: string; caminho?: string }): NonNullable<Metadata["openGraph"]> {
  return {
    title: titulo,
    description: descricao,
    ...(caminho ? { url: caminho } : {}),
    siteName: SITE.nome,
    locale: "pt_BR",
    type: "website",
    images: [IMAGEM_PREVIA],
  };
}
