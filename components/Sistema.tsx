"use client";

import { useEffect } from "react";
import { evento } from "@/lib/metricas";

/** Registra o service worker (só no site publicado, para funcionar sem internet) e avisa quando o app é instalado. */
export function Sistema() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const instalado = () => evento("app_instalado");
    window.addEventListener("appinstalled", instalado);
    return () => window.removeEventListener("appinstalled", instalado);
  }, []);
  return null;
}
