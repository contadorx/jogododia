import type { MetadataRoute } from "next";
import { jogosDisponiveis } from "@/lib/conteudo";
import { URL_PUBLICA } from "@/lib/metadados";

/** sitemap.xml: as páginas que valem para a busca (a página de jogar fica fora; a ficha tem as regras). */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const fixas = ["/", "/sobre/", "/termos/", "/privacidade/"].map((caminho) => ({ url: `${URL_PUBLICA}${caminho}` }));
  const fichas = jogosDisponiveis().map((j) => ({ url: `${URL_PUBLICA}/jogos/${j.id}/` }));
  return [...fixas, ...fichas];
}
