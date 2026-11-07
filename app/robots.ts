import type { MetadataRoute } from "next";
import { URL_PUBLICA } from "@/lib/metadados";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${URL_PUBLICA}/sitemap.xml`,
  };
}
