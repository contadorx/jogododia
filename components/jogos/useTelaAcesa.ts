"use client";

import { useEffect } from "react";

/**
 * Mantém a tela acesa enquanto `ativo` (partida à distância em andamento). Com a tela apagada, o
 * celular corta a conexão da sala, e o outro fica esperando: este é o motivo mais comum das quedas.
 * O navegador solta a trava quando a página some (outro app, tela bloqueada); ela é pedida de novo
 * quando a página volta. Sem suporte ou sem permissão (bateria fraca, por exemplo), segue sem a trava.
 */
export function useTelaAcesa(ativo: boolean) {
  useEffect(() => {
    if (!ativo || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let trava: WakeLockSentinel | null = null;
    let pedindo = false;
    let vivo = true;

    const pedir = async () => {
      if (!vivo || pedindo || trava || document.visibilityState !== "visible") return;
      pedindo = true;
      try {
        const nova = await navigator.wakeLock.request("screen");
        if (!vivo) {
          void nova.release();
          return;
        }
        trava = nova;
        nova.addEventListener("release", () => {
          if (trava === nova) trava = null;
        });
      } catch {
        // sem suporte, sem permissão ou bateria fraca: a tela apaga como sempre
      } finally {
        pedindo = false;
      }
    };
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void pedir();
    };

    void pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", aoVoltar);
      void trava?.release().catch(() => {});
      trava = null;
    };
  }, [ativo]);
}
