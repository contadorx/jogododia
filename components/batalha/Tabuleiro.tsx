import { LADO, LETRAS, coordenada } from "@/lib/batalha";

export type AparenciaDaCasa = {
  /** O que aparece dentro da casa (marca de tiro, X etc.). */
  conteudo?: React.ReactNode;
  /** Complemento do nome lido pelo leitor de tela, depois da coordenada: "navio", "água"... */
  descricao?: string;
  /** Cor de fundo (navio). Sem cor = mar. */
  fundo?: string;
  /** Contorno de destaque (navio escolhido na montagem). */
  destaque?: boolean;
};

/**
 * Tabuleiro de 10 x 10 com as letras das colunas em cima e os números das linhas ao lado.
 * Cada casa é um botão com o nome da coordenada, para dar para jogar também com leitor de tela.
 */
export function Tabuleiro({
  titulo,
  casa,
  aoTocar,
  escolhida,
}: {
  titulo: string;
  casa: (indice: number) => AparenciaDaCasa;
  aoTocar?: (indice: number) => void;
  escolhida?: number | null;
}) {
  return (
    <div role="group" aria-label={titulo} className="tabuleiro">
      <span aria-hidden="true" className="rotulo" />
      {Array.from(LETRAS).map((letra) => (
        <span key={letra} aria-hidden="true" className="rotulo">
          {letra}
        </span>
      ))}
      {Array.from({ length: LADO }, (_, linha) => (
        <Linha key={linha} linha={linha} casa={casa} aoTocar={aoTocar} escolhida={escolhida} />
      ))}
    </div>
  );
}

function Linha({
  linha,
  casa,
  aoTocar,
  escolhida,
}: {
  linha: number;
  casa: (indice: number) => AparenciaDaCasa;
  aoTocar?: (indice: number) => void;
  escolhida?: number | null;
}) {
  return (
    <>
      <span aria-hidden="true" className="rotulo">
        {linha + 1}
      </span>
      {Array.from({ length: LADO }, (_, coluna) => {
        const indice = linha * LADO + coluna;
        const a = casa(indice);
        const nome = a.descricao ? `${coordenada(indice)}, ${a.descricao}` : coordenada(indice);
        return (
          <button
            key={indice}
            type="button"
            aria-label={nome}
            disabled={!aoTocar}
            onClick={aoTocar ? () => aoTocar(indice) : undefined}
            className={`casa ${escolhida === indice ? "escolhida" : ""}`}
            style={{
              ...(a.fundo ? { background: a.fundo } : {}),
              ...(a.destaque ? { boxShadow: "inset 0 0 0 3px #1c2333" } : {}),
            }}
          >
            {a.conteudo}
          </button>
        );
      })}
    </>
  );
}

/** Marcas que vão dentro das casas. */
export const Marcas = {
  /** Tiro na água: um pingo. */
  agua: <span aria-hidden="true" className="block h-[26%] w-[26%] rounded-full bg-suave" />,
  /** Água por dedução (em volta de navio afundado): um anel claro. */
  deduzida: <span aria-hidden="true" className="block h-[26%] w-[26%] rounded-full border-2 border-mar-linha" />,
  /** Acerto no navio do outro: um círculo vermelho. */
  acerto: <span aria-hidden="true" className="block h-[56%] w-[56%] rounded-full bg-fogo" />,
  /** Tiro enviado, esperando a resposta do outro aparelho. */
  mira: <span aria-hidden="true" className="block h-[60%] w-[60%] animate-pulse rounded-full border-[3px] border-fogo" />,
  /** X branco, para casa de navio atingida ou afundada. */
  x: (
    <svg aria-hidden="true" viewBox="0 0 10 10" className="h-[62%] w-[62%]">
      <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  ),
};
