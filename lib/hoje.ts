/**
 * O jogo de hoje: os jogos disponíveis se revezam, um por dia, no fuso do aparelho.
 * Com um jogo só, é sempre ele. Roda no aparelho (o site é estático, então a data do build não serve).
 */
export function indiceDoDia(total: number, agora: Date = new Date()): number {
  if (total <= 0) return 0;
  const dias = Math.floor(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()) / 86_400_000);
  return dias % total;
}
