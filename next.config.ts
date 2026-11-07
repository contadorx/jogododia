import type { NextConfig } from "next";

/**
 * Site 100% estático: `next build` gera a pasta `out/`, que pode ir para
 * qualquer hospedagem estática. Não há servidor nem banco de dados.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
