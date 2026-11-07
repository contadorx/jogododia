# Partida à distância

A batalha naval tem dois modos: **frente a frente** (cada um no seu celular, falando as coordenadas,
sem nenhuma conexão) e **à distância** (cada um na sua casa, numa sala com código). Este documento é
sobre o segundo.

## Como funciona

- Um jogador cria a sala e recebe um código de 6 letras e números, sem os que se confundem (O e 0,
  I e 1). Manda o código ou o link pelo WhatsApp; o outro entra.
- Sem cadastro, sem nome e **sem chat**: só passam pela rede o código da sala, um número sorteado para
  cada aparelho e as jogadas (coordenadas e respostas).
- Quem recebe o tiro responde sozinho, a partir da própria frota, como no jogo falado. Cada aparelho
  guarda só o seu lado da partida (localStorage), então dá para fechar o navegador e voltar pelo código.
- A sala aceita dois jogadores; um terceiro que entrar com o código vê "sala cheia".
- A vez não fica guardada: sai do histórico de tiros, e os dois aparelhos chegam sempre à mesma conta.
  Mensagem perdida ou repetida não atrapalha: o tiro sem resposta é reenviado a cada 4 segundos e a
  resposta repetida é ignorada.

## Onde roda: Supabase, plano gratuito

- Projeto `jogododia` (ref `jmtnycyfwmjumrafbcfd`), organização gratuita "Roadmap", região São Paulo.
- Só o **Realtime** é usado: broadcast para as jogadas e presence para saber quem está na sala. As
  jogadas não ficam gravadas em tabela.
- Uma tabela só, `public.status`, com uma linha e leitura pública (RLS ligada, só `select`). O site lê
  essa linha antes de abrir uma sala, para saber se o modo à distância está no ar.
- A URL e a chave publicável ficam em `config/site.ts`: são feitas para ir no navegador. A chave
  secreta (service role) **nunca** vai para o site.
- Limites do plano gratuito: 200 conexões simultâneas e 2 milhões de mensagens por mês no Realtime,
  e no máximo 2 projetos ativos por organização gratuita (este é o segundo da "Roadmap").

## A pausa do plano gratuito

O Supabase pausa o projeto gratuito depois de uma semana com pouco uso, e manda um e-mail antes. Três
coisas ajudam a evitar:

1. Cada vez que alguém abre a tela de jogar à distância, o site lê a tabela de status (uso real).
2. O GitHub Actions faz a mesma leitura todo dia (`.github/workflows/manter-supabase.yml`). Em
   repositório público, o GitHub desliga esse agendamento depois de 60 dias sem commit; ele avisa por
   e-mail e é só reativar em Actions.
3. Se mesmo assim pausar, o modo frente a frente continua funcionando, a tela à distância avisa que não
   está no ar, e o projeto volta pelo painel do Supabase (botão de restaurar).

## Se a sala não conectar

- A tela diz "Sem conexão": confira a internet dos dois aparelhos.
- Abre, mas os dois nunca se veem: no painel do Supabase, em Project Settings → Realtime, a opção de
  permitir canais públicos ("Allow public access") precisa estar ligada.
- "O modo à distância não respondeu": o projeto pode estar pausado (veja acima).

## Testar no computador sem o Supabase

```bash
npm i --no-save ws
node scripts/relay-de-teste.mjs                 # retransmissor local em ws://localhost:8787
PERDA=0.3 node scripts/relay-de-teste.mjs       # o mesmo, perdendo 30% das mensagens
npm run build && npm run preview
```

Abra `http://localhost:4173/jogos/batalha-naval/jogar/?relay=ws://localhost:8787` em duas janelas
anônimas (cada uma é um jogador). Fora do localhost, o site ignora o `?relay`.

As regras da partida (`lib/protocolo.ts`) também têm testes sem rede: `npm test` simula partidas
inteiras entre dois aparelhos, inclusive com 30% das mensagens perdidas e 20% repetidas.
