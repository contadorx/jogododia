import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";
import { SITE } from "@/config/site";
import { URL_PUBLICA, previa } from "@/lib/metadados";
import { Sistema } from "@/components/Sistema";

export const metadata: Metadata = {
  metadataBase: new URL(URL_PUBLICA),
  title: { default: SITE.nome, template: `%s · ${SITE.nome}` },
  description: SITE.descricao,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: SITE.nome, statusBarStyle: "default" },
  openGraph: previa({ titulo: SITE.nome, descricao: SITE.descricao }),
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#2F55C9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const metricas = SITE.umami.scriptUrl && SITE.umami.websiteId;
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-white antialiased">
        {children}
        <Sistema />
        {metricas ? (
          <Script
            src={SITE.umami.scriptUrl}
            data-website-id={SITE.umami.websiteId}
            data-domains={SITE.umami.dominio}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
