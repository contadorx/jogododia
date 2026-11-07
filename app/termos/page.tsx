import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/config/site";
import { Clausula, PaginaLegal } from "@/components/PaginaLegal";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: `Regras de uso do ${SITE.nome}: jogar junto com um adulto, limites de responsabilidade e apoio voluntário.`,
};

export default function Pagina() {
  const contato = <span className="font-bold select-all">{SITE.contato}</span>;

  return (
    <PaginaLegal
      titulo="Termos de Uso"
      resumo={
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
          <li>O site é gratuito e tem jogos para adultos jogarem junto com crianças de {SITE.idades}.</li>
          <li>
            <strong>A criança joga sempre com um adulto.</strong> O adulto aceita estes Termos antes da primeira partida em cada aparelho e
            decide quando e quanto jogar.
          </li>
          {SITE.tempoReal.url ? <li>Na partida à distância, o código da sala é só para quem vai jogar com a criança.</li> : null}
          <li>O site não é escola nem serviço de saúde e não promete nenhum resultado.</li>
          <li>O apoio por PIX é voluntário e não dá direito a nenhuma contrapartida.</li>
        </ul>
      }
    >
      <Clausula n="1" titulo="Quem somos e o que é o site">
        <p>
          O {SITE.nome} ({SITE.url.replace("https://", "")}) é mantido por {SITE.responsavel}, pessoa física, sem fins comerciais. O site oferece,
          de graça, jogos clássicos para adultos jogarem junto com crianças, com as regras, o que cada jogo treina e de onde veio a ideia. É o site
          irmão do {SITE.irmao.nome}.
        </p>
        <p>
          Ao usar o site, você concorda com estes Termos e com a <Link href="/privacidade/">Política de Privacidade</Link>.
        </p>
      </Clausula>

      <Clausula n="2" titulo="Para quem é">
        <p>
          O site é feito para pessoas maiores de 18 anos responsáveis por crianças. A criança pode usar o aparelho durante a partida, mas sempre
          jogando com um adulto. Antes da primeira partida em cada aparelho, inclusive no da criança, é o adulto quem confirma e aceita estes Termos.
        </p>
        {SITE.tempoReal.url ? (
          <p>
            Na partida à distância, cada um joga no seu aparelho, numa sala aberta por um código. O código é para mandar só para quem vai jogar com
            a criança: não publique em grupos ou redes sociais. A sala aceita dois jogadores (no Stop, até seis), e o adulto continua
            responsável por acompanhar a partida, mesmo de longe.
          </p>
        ) : null}
      </Clausula>

      <Clausula n="3" titulo="Tempo de tela e convivência">
        <p>
          As partidas são curtas e pensadas para jogar frente a frente. O adulto decide quando e quanto jogar, de acordo com a rotina e a idade da
          criança. Recomendamos combinar o tempo antes de começar e guardar o aparelho no fim da partida.
        </p>
      </Clausula>

      <Clausula n="4" titulo="O que o site não é">
        <p>
          Os jogos são conteúdo educativo e de lazer. O site não é escola, reforço escolar nem serviço de saúde, não avalia a criança e não garante
          nenhum resultado. As instituições citadas como fonte de inspiração não revisaram nem endossam o site.
        </p>
      </Clausula>

      <Clausula n="5" titulo="Responsabilidades">
        <p>
          Cuidamos para que os jogos sejam adequados à idade indicada e revisamos o conteúdo quando recebemos correções. Na extensão permitida pela
          lei, o responsável pelo site não responde por danos que decorram de uso sem acompanhamento de um adulto ou para finalidade diferente da
          prevista nestes Termos. Nada nestes Termos exclui direitos que a lei garante a você e que não possam ser afastados por contrato.
        </p>
        <p>
          O site pode ficar fora do ar, mudar ou deixar de existir sem aviso. A partida em andamento fica só no aparelho e se perde se os dados do
          navegador forem apagados.
        </p>
      </Clausula>

      <Clausula n="6" titulo="Apoio voluntário">
        <p>
          O site é e continuará gratuito. Quem quiser pode apoiar com um PIX de qualquer valor, pela página Sobre do {SITE.irmao.nome}, que mantém
          os dois sites. O apoio é uma doação voluntária: não é compra, não dá acesso a nenhum recurso extra e não gera contrapartida.
        </p>
      </Clausula>

      <Clausula n="7" titulo="Conteúdo e direitos autorais">
        <p>
          Os textos são próprios. As regras dos jogos clássicos são de domínio público, e os nomes usados aqui são os nomes populares dos jogos, sem
          relação com produtos de fabricantes. Links para sites de terceiros são oferecidos como referência; não respondemos pelo conteúdo deles.
        </p>
      </Clausula>

      <Clausula n="8" titulo="Mudanças nestes Termos">
        <p>
          Podemos atualizar estes Termos. A data e a versão ficam no topo desta página. Quando a mudança for relevante, o site pede um novo aceite
          antes da próxima partida.
        </p>
      </Clausula>

      <Clausula n="9" titulo="Lei aplicável e contato">
        <p>Estes Termos seguem as leis do Brasil. Dúvidas, sugestões, correções ou relatos de qualquer problema: {contato}.</p>
      </Clausula>
    </PaginaLegal>
  );
}
