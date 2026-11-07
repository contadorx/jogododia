import Link from "next/link";

export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5">
      <h1 className="m-0 font-display text-[30px] font-extrabold">Página não encontrada</h1>
      <p className="m-0 text-suave">Esse endereço não existe mais ou foi digitado errado.</p>
      <Link href="/" className="flex min-h-[54px] items-center justify-center rounded-2xl bg-azul font-bold text-white no-underline">
        Ver os jogos
      </Link>
    </main>
  );
}
