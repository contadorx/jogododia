import { aproveitamento, type MarcaTiro } from "@/lib/batalha";
import { Tabuleiro, type AparenciaDaCasa } from "./Tabuleiro";

/** Tela do fim da partida, igual nos dois modos: resultado, aproveitamento, conversa e os tabuleiros. */
export function Fim({
  titulo,
  texto,
  tiros,
  conversa,
  ataque,
  defesa,
  children,
}: {
  titulo: string;
  texto: string;
  tiros: Readonly<Record<number, MarcaTiro>>;
  conversa: readonly string[];
  ataque: (c: number) => AparenciaDaCasa;
  defesa: (c: number) => AparenciaDaCasa;
  children: React.ReactNode;
}) {
  const placar = aproveitamento(tiros);
  return (
    <div className="flex flex-col gap-5">
      <div role="status" className="aparece flex flex-col gap-2 rounded-3xl bg-azul p-5 text-white">
        <p className="m-0 font-display text-[28px] font-extrabold leading-tight">{titulo}</p>
        <p className="m-0">{texto}</p>
      </div>

      <section aria-labelledby="placar" className="flex flex-col gap-1 rounded-2xl bg-sol-claro p-4">
        <h2 id="placar" className="m-0 font-display text-[19px] font-extrabold">
          Seus tiros
        </h2>
        <p className="m-0 text-[17px]">
          {placar.tiros} tiros, {placar.acertos} em navio: aproveitamento de <strong>{placar.porcentagem}%</strong>.
        </p>
        {placar.tiros > 0 ? (
          <p className="m-0 text-sm text-suave">
            A conta: {placar.acertos} ÷ {placar.tiros} = {(placar.acertos / placar.tiros).toFixed(2).replace(".", ",")}, ou {placar.porcentagem} em
            cada 100 tiros.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="conversa" className="flex flex-col gap-2">
        <h2 id="conversa" className="m-0 font-display text-[19px] font-extrabold">
          Conversem sobre a partida
        </h2>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
          {conversa.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[15px] font-bold text-suave">Seus tiros no mar do outro</h2>
          <Tabuleiro titulo="Seus tiros" casa={ataque} />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[15px] font-bold text-suave">A sua frota</h2>
          <Tabuleiro titulo="Sua frota" casa={defesa} />
        </section>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">{children}</div>
    </div>
  );
}
