"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { VERSAO_TERMOS } from "@/config/site";
import { CHAVES, gravar, ler } from "@/lib/armazenamento";
import { evento } from "@/lib/metricas";

type Registro = { versao: string; em: string };

/**
 * Antes da primeira partida em cada aparelho, um adulto confirma que vai jogar junto e aceita os
 * Termos. No celular da criança, quem marca é o adulto. O aceite (versão e data) fica só no aparelho.
 */
export function Aceite({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<"carregando" | "pendente" | "ok">("carregando");
  const [marcado, setMarcado] = useState(false);
  const id = useId();

  useEffect(() => {
    const registro = ler<Registro>(CHAVES.aceite);
    setEstado(registro?.versao === VERSAO_TERMOS ? "ok" : "pendente");
  }, []);

  if (estado === "carregando") return <div aria-busy="true" className="min-h-[50vh]" />;
  if (estado === "ok") return <>{children}</>;

  return (
    <section aria-labelledby={`${id}-t`} className="aparece flex flex-col gap-4 rounded-3xl bg-sol-claro p-5 md:max-w-[36rem] md:p-7">
      <h2 id={`${id}-t`} className="m-0 font-display text-[24px] font-extrabold leading-tight">
        Antes da primeira partida
      </h2>
      <p className="m-0">
        Os jogos daqui são para jogar <strong>junto</strong>: um adulto acompanha a criança do começo ao fim. Não tem cadastro, e nada do que
        acontece na partida sai deste aparelho.
      </p>
      <label htmlFor={id} className="flex items-start gap-3 rounded-2xl bg-white p-4">
        <input id={id} type="checkbox" checked={marcado} onChange={(e) => setMarcado(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-azul" />
        <span>
          Sou maior de idade, vou jogar junto com a criança e concordo com os <Link href="/termos/">Termos de Uso</Link> e a{" "}
          <Link href="/privacidade/">Política de Privacidade</Link>.
        </span>
      </label>
      <p className="m-0 text-sm text-suave">Cada um vai usar um aparelho? No da criança, quem marca é o adulto.</p>
      <button
        type="button"
        disabled={!marcado}
        onClick={() => {
          gravar(CHAVES.aceite, { versao: VERSAO_TERMOS, em: new Date().toISOString().slice(0, 10) } satisfies Registro);
          evento("aceite_concluido");
          setEstado("ok");
        }}
        className="min-h-[54px] rounded-2xl bg-azul px-6 text-[17px] font-bold text-white disabled:opacity-40"
      >
        Vamos jogar
      </button>
    </section>
  );
}
