# Jogo do Dia

Site gratuito de jogos clássicos e educativos para pais e cuidadores jogarem **junto** com crianças de
7 a 12 anos, em `jogos.brincadeiradodia.com.br`. É o site irmão do
[Brincadeira do Dia](https://brincadeiradodia.com.br) (1 a 6 anos, sem tela para a criança), e os dois
se linkam.

> "Jogo do Dia" é o nome de trabalho. Para trocar, veja [Trocar o nome](#trocar-o-nome).

- **Jogar junto:** partidas curtas, com um adulto do começo ao fim, que aceita os Termos antes da
  primeira partida em cada aparelho.
- **Educativo, com fonte:** cada jogo diz o que treina ("Treina…") e de onde veio a ideia, com a mesma
  régua do Brincadeira do Dia (evidência A a D, fontes e revisão voluntária).
- **Batalha naval em dois modos:** frente a frente (cada um no seu celular, falando as coordenadas, sem
  conexão nenhuma) ou à distância (cada um na sua casa, numa sala com código, pelo Supabase).
- **Sem login, sem chat e sem guardar nada em servidor:** o aceite e as partidas ficam no aparelho.
- **Funciona sem internet** (o modo frente a frente) depois da primeira visita, e pode ser instalado como app.
- **Jogo de hoje:** os jogos disponíveis se revezam, um por dia, na página inicial.

## Stack

| Parte | Tecnologia |
|---|---|
| Site | Next.js 16 com export estático (`out/`), React 19, TypeScript |
| Estilo | Tailwind CSS 4, fontes Atkinson Hyperlegible e Bricolage Grotesque (as mesmas do irmão) |
| Conteúdo | Um JSON por jogo em `content/jogos/`, conferido com Zod no build |
| Regras da batalha naval | `lib/batalha.ts` (tabuleiro) e `lib/protocolo.ts` (partida à distância), funções puras com testes |
| Partida à distância | Supabase Realtime, plano gratuito, servidor em São Paulo (`lib/sala.ts`) |
| Dados no aparelho | `localStorage` (`lib/armazenamento.ts`) |
| Offline | `scripts/gerar-sw.mjs` gera `out/sw.js` depois do build |
| Métricas | Umami (opcional, o mesmo painel do irmão) |

## Rodar no computador

```bash
npm install
npm run dev          # http://localhost:3000 (sem service worker)
npm test             # regras do tabuleiro e partidas simuladas à distância, com mensagens perdidas
npm run build        # gera out/ e out/sw.js
npm run preview      # serve out/ em http://localhost:4173, igual ao site publicado
```

Requer Node 22.6 ou mais novo (os testes rodam o TypeScript direto no Node). Para testar a partida à
distância no computador sem o Supabase, veja `docs/tempo-real.md`.

## Publicar na Vercel

1. Crie um repositório no GitHub (por exemplo `contadorx/jogododia`) e suba esta pasta.
2. Na Vercel: Add New → Project → importe o repositório. O `vercel.json` já diz o comando de build
   (`npm run build`) e a pasta publicada (`out`); não precisa mexer em Build and Output Settings nem
   criar variável de ambiente.
3. Deploy. Depois, em Settings → Domains, adicione `jogos.brincadeiradodia.com.br`. A Vercel mostra o
   registro de DNS que falta (um CNAME para `jogos`); crie esse registro onde está o DNS do domínio
   (Registro.br, se o DNS for de lá).
4. No Brincadeira do Dia, `irmao.url` em `config/site.ts` já aponta para `https://jogos.brincadeiradodia.com.br`.
   Publique o Brincadeira do Dia **depois** deste, para o link do rodapé não cair numa página vazia.

O plano gratuito (Hobby) da Vercel serve: o site não vende nada nem tem anúncio.

## `config/site.ts`

É o único arquivo de configuração: nome, endereço, responsável e contato (obrigatórios pela LGPD), o
site irmão (`irmao`), os provedores (para a Política de Privacidade), o tempo real e o Umami.

- **`tempoReal`**: URL e chave publicável do projeto `jogododia` no Supabase. Vazio = o modo à distância
  some e o site funciona só frente a frente. A Política de Privacidade e os Termos se ajustam sozinhos.
- **`umami`**: vazio = nenhum script carregado, e a Política de Privacidade diz que não há métricas.
- **`VERSAO_TERMOS` e `DATA_TERMOS`**: mudou algo relevante nos Termos ou na Privacidade? Troque a data.
  Na próxima partida, o adulto aceita de novo.

### Trocar o nome

Mude `nome` em `config/site.ts`, o `name` e o `short_name` em `public/manifest.webmanifest`, o texto em
`scripts/gerar-og.mjs` (e rode `npm run og`) e este README. No Brincadeira do Dia, mude `irmao.nome`.

## Jogos: `content/jogos/`

Um arquivo por jogo. O nome do arquivo é igual ao `id`.

- **Todos:** `id`, `nome`, `status` (`disponivel` ou `em-breve`), `ordem` (posição no catálogo, sem
  repetir), `idade` (a partir de), `modo` (`cada-um-no-seu`, `mesmo-aparelho` ou `papel`), `treina`
  (começa sempre com "Treina", até 160 letras; nada de "melhora" ou "desenvolve") e `resumo`.
- **Só os disponíveis:** `jogadores`, `minutos` ("15 a 25"), `precisa`, `passos`, `combinados`,
  `conversa` (perguntas para depois do jogo), `base` (de onde veio a ideia, até 200 letras: inspiração,
  nunca aval), `evidencia` (A a D, as mesmas letras do Brincadeira do Dia), `fontes` (1 a 4, sempre
  `https://`) e `revisao` (`null` até alguém revisar; mesmo formato do irmão).
- Evidência `D` exige uma fonte com "BNCC" no título. O build para e diz o arquivo e o campo se algo
  estiver errado.

Um jogo `disponivel` ganha ficha em `/jogos/<id>/`. Para ter também a versão de jogar no site
(`/jogos/<id>/jogar/`), acrescente o `id` em `lib/jogaveis.ts` e o componente em
`app/jogos/[id]/jogar/page.tsx`. Sem isso, a ficha serve para jogar no papel ou no tabuleiro de casa.

Os critérios de escolha e a ordem sugerida dos próximos jogos estão em `docs/jogos.md`.

## Batalha naval

- Tabuleiro 10 x 10, coordenada falada como letra da coluna e número da linha (B5), na ordem do plano
  cartesiano. Frota: porta-aviões (5), encouraçado (4), cruzador (3), submarino (3) e destróier (2). Os
  navios não se encostam, nem na diagonal.
- **Frente a frente:** montar a frota → quem começa → abas Atacar e Defender. Quem defende confirma a
  coordenada e o jogo mostra o que dizer em voz alta. Tem botão de desfazer o último toque.
- **À distância:** um cria a sala (e escolhe o combinado "acertou, joga de novo?"), manda o código ou o
  link pelo WhatsApp, os dois montam a frota e o jogo sorteia quem começa. Os tiros são respondidos
  sozinhos. Detalhes, limites do plano gratuito e o que fazer se a sala não conectar: `docs/tempo-real.md`.
- Nos dois modos, quando um navio afunda, as casas em volta viram "água por dedução", e o fim mostra o
  aproveitamento dos tiros (com a conta da porcentagem) e as perguntas da ficha.

## Marca, ícones e prévia

A marca é um tabuleiro de quatro casas com uma peça, nas cores do catavento do irmão. O desenho fica só
em `lib/marca.ts`. Mudou? Gere de novo (nenhum dos dois entra no `package.json`):

```bash
npm i --no-save sharp && npm run icones      # public/icons/*
npm i --no-save playwright && npx playwright install chromium && npm run og   # public/og.png
```

## Termos, privacidade e segurança

- `/termos/` e `/privacidade/` ficam no rodapé e seguem o mesmo cuidado do Brincadeira do Dia.
- O site não pede nenhum dado da criança, não tem chat e não junta desconhecidos: a sala só abre com o
  código, que tem mais de um bilhão de combinações, e não aceita um terceiro jogador.
- Os textos foram escritos com cuidado, mas não substituem a revisão de um advogado.

## Estrutura

```
app/                  páginas (início, jogos/[id], jogos/[id]/jogar, sobre, termos, privacidade, sitemap, robots)
components/           telas e partes reutilizáveis; batalha/ tem o jogo nos dois modos
content/jogos/        um jogo por arquivo JSON
config/site.ts        nome, contato, site irmão, tempo real, métricas
lib/                  esquema do conteúdo, regras (batalha.ts, protocolo.ts), sala.ts, armazenamento, marca
public/               manifesto, ícones do app e og.png
scripts/              testes, gerar-sw.mjs, relay-de-teste.mjs, gerar-icones.mjs, gerar-og.mjs
docs/                 jogos.md (curadoria) e tempo-real.md (partida à distância)
.github/workflows/    manter-supabase.yml (evita a pausa do plano gratuito)
vercel.json           comando de build e pasta publicada
```
