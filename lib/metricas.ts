"use client";

/**
 * Eventos anônimos para o painel do Umami. Nunca envie nome, coordenada da frota ou qualquer dado
 * que identifique a família ou a criança. Se o Umami não estiver configurado, nada acontece.
 */
export type NomeEvento =
  | "aceite_concluido"
  | "partida_iniciada"
  | "partida_terminada"
  | "sala_criada"
  | "sala_aberta"
  | "app_instalado"
  | "irmao_aberto";

type Dados = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (nome: string, dados?: Dados) => void };
  }
}

export function evento(nome: NomeEvento, dados?: Dados) {
  try {
    window.umami?.track(nome, dados);
  } catch {
    /* métricas nunca podem quebrar o jogo */
  }
}
