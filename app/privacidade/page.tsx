import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/config/site";
import { Clausula, PaginaLegal } from "@/components/PaginaLegal";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: `Como o ${SITE.nome} trata dados pessoais, de acordo com a LGPD: sem cadastro, sem chat e com as partidas guardadas no aparelho.`,
};

export default function Pagina() {
  const contato = <span className="font-bold select-all">{SITE.contato}</span>;
  // O texto acompanha a configuração: sem Umami, diz que não há métricas; sem tempo real, que não há
  // partida à distância.
  const metricas = Boolean(SITE.umami.scriptUrl && SITE.umami.websiteId);
  const distancia = Boolean(SITE.tempoReal.url && SITE.tempoReal.chave);

  return (
    <PaginaLegal
      titulo="Política de Privacidade"
      resumo={
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
          <li>Não tem cadastro, login, chat, cookies nem anúncios.</li>
          <li>Não pedimos nome, idade nem nenhum dado da criança.</li>
          <li>As partidas e o aceite dos Termos ficam guardados só no seu aparelho.</li>
          {distancia ? (
            <li>
              Na partida à distância, só as jogadas (lances, coordenadas, palpites, respostas e as palavras do Stop) passam por um servidor em
              São Paulo, e não ficam guardadas lá.
            </li>
          ) : null}
          <li>
            {metricas
              ? "Contamos visitas e partidas de forma anônima, para saber se o site está ajudando."
              : "Hoje o site não usa nenhuma ferramenta de estatística."}
          </li>
        </ul>
      }
    >
      <Clausula n="1" titulo="Quem é o controlador e como falar com ele">
        <p>
          O controlador dos dados pessoais tratados pelo {SITE.nome} é {SITE.responsavel}, pessoa física. O canal para qualquer assunto sobre
          privacidade e dados pessoais é {contato}.
        </p>
        <p>
          Por ser agente de tratamento de pequeno porte (Resolução CD/ANPD nº 2/2022) e não realizar tratamento de alto risco, o site não indica
          encarregado (DPO). Os pedidos são atendidos pelo canal acima.
        </p>
      </Clausula>

      <Clausula n="2" titulo="O que fica só no seu aparelho">
        <p>
          Para funcionar sem cadastro, o site guarda no armazenamento do navegador (localStorage), no próprio aparelho: o aceite dos Termos (versão
          e data), as partidas em andamento (na batalha naval frente a frente, a posição dos navios, os tiros e a cor escolhida; nos outros
          jogos, os lances), o código secreto e o rascunho do descubra o código
          {distancia ? ", as salas à distância em andamento (código da sala e os lances; na batalha naval, também a sua frota) e o último modo de jogo escolhido" : ""}.
        </p>
        <p>
          Nós não temos acesso a essas informações. Na batalha naval frente a frente, cada jogador usa o seu aparelho e as coordenadas são
          faladas em voz alta; nos jogos no mesmo aparelho, os dois jogam no mesmo celular ou tablet. Nos dois casos não existe conexão entre
          aparelhos. Para apagar tudo, use o botão Apagar meus dados deste aparelho, na{" "}
          <Link href="/sobre/">página Sobre</Link>, ou limpe os dados do site nas configurações do navegador.
        </p>
      </Clausula>

      <Clausula n="3" titulo="Dados que nós tratamos">
        {distancia ? (
          <p>
            <strong>Partidas à distância.</strong> Quando vocês jogam à distância, o site liga os dois aparelhos por meio do Supabase, com servidor
            em São Paulo. Passam por ele o código da sala, um número sorteado para cada aparelho (que não identifica ninguém) e as jogadas:
            lances, coordenadas, palpites e respostas. No descubra o código, o código secreto de cada um só é enviado no fim da partida, para o
            outro ver. No Stop, vão as palavras que cada um digitou em cada categoria (até 40 letras cada), no fim de cada rodada. Não há nome,
            chat nem cadastro. As jogadas não ficam guardadas: o servidor só repassa cada uma para o outro
            aparelho da sala. Como em qualquer conexão pela internet, o servidor vê o endereço IP do aparelho durante a partida e o provedor pode
            manter registros técnicos de conexão por pouco tempo. Antes de abrir uma sala, o site também pergunta a esse servidor se o modo à
            distância está no ar. Base legal: execução do serviço que você pediu e legítimo interesse (art. 7º, V e IX, da LGPD).
          </p>
        ) : null}
        {metricas ? (
          <p>
            <strong>Métricas de uso anônimas.</strong> Usamos uma ferramenta de estatística instalada em servidor próprio (Umami), sem cookies. Ela
            registra páginas visitadas, ações como &quot;partida iniciada&quot;, tipo de aparelho e navegador e região aproximada. Pela
            configuração da ferramenta, o endereço IP é usado apenas no momento da visita e não é guardado. Nunca enviamos dados da partida ou da
            criança. Base legal: legítimo interesse (art. 7º, IX, da LGPD). Guardamos as estatísticas, de forma agregada, por até 24 meses.
          </p>
        ) : (
          <p>
            <strong>Métricas.</strong> Hoje o site não usa ferramenta de estatística. Se passar a usar, esta Política será atualizada antes.
          </p>
        )}
        <p>
          <strong>Registros técnicos da hospedagem.</strong> O provedor que hospeda o site registra dados técnicos de acesso, como IP, data e hora,
          para segurança e funcionamento do serviço. Base legal: legítimo interesse e cumprimento de obrigação legal (art. 7º, II e IX).
        </p>
        <p>
          <strong>Contato por e-mail.</strong> Se você nos escrever, usamos seu e-mail e sua mensagem apenas para responder. Apagamos a conversa
          quando ela deixar de ser necessária, em até 12 meses. Base legal: legítimo interesse (art. 7º, IX).
        </p>
      </Clausula>

      <Clausula n="4" titulo="Dados de crianças">
        <p>
          O site não coleta dados de crianças: não pede nome, idade, foto nem contato, e não tem chat. Durante a partida, a criança pode usar o
          aparelho junto com o adulto.
          {distancia
            ? " Na partida à distância, a criança joga no aparelho dela, numa sala que só aceita dois jogadores e só pode ser aberta por quem tem o código. O adulto escolhe com quem compartilhar o código."
            : ""}
        </p>
      </Clausula>

      <Clausula n="5" titulo="Com quem os dados são compartilhados">
        <p>
          Não vendemos nem compartilhamos dados para publicidade. Os dados do item 3 passam pelos provedores que operam o serviço para nós:
          hospedagem do site em {SITE.provedores.hospedagem}
          {distancia ? `, partidas à distância no ${SITE.provedores.tempoReal}` : ""}
          {metricas ? ` e estatísticas em ${SITE.provedores.metricas}` : ""}. Por isso pode haver transferência internacional de dados, feita com
          provedores que assumem compromissos contratuais de proteção de dados.
        </p>
      </Clausula>

      <Clausula n="6" titulo="Cookies e armazenamento no navegador">
        <p>
          Não usamos cookies. O site usa o armazenamento do navegador apenas para as informações do item 2 e para guardar uma cópia das páginas, o
          que permite abrir o site sem internet.
        </p>
      </Clausula>

      <Clausula n="7" titulo="Segurança">
        <p>
          O site funciona com conexão segura (HTTPS) e, por não ter cadastro, não guarda senhas. O código da sala é sorteado entre mais de um
          bilhão de combinações e a sala não aceita um terceiro jogador.
        </p>
      </Clausula>

      <Clausula n="8" titulo="Seus direitos">
        <p>Pela LGPD (art. 18), você pode pedir, pelo canal do item 1:</p>
        <ul>
          <li>confirmação de que tratamos dados seus e acesso a eles;</li>
          <li>correção de dados incompletos ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;</li>
          <li>informação sobre com quem compartilhamos e eliminação dos dados, quando cabível;</li>
          <li>oposição a tratamentos baseados em legítimo interesse.</li>
        </ul>
        <p>
          Respondemos em até 15 dias. Os dados guardados no seu aparelho você mesmo pode apagar a qualquer momento. Você também pode apresentar
          reclamação à Autoridade Nacional de Proteção de Dados (ANPD), em gov.br/anpd.
        </p>
      </Clausula>

      <Clausula n="9" titulo="Mudanças nesta Política">
        <p>
          Podemos atualizar esta Política. A data e a versão ficam no topo da página. Quando a mudança for relevante, o site pede um novo aceite
          antes da próxima partida.
        </p>
      </Clausula>
    </PaginaLegal>
  );
}
