# Partida à distância

Todos os jogos têm o modo **à distância** (cada um na sua casa, numa sala com código). O outro modo é
**no mesmo aparelho**, ou, na batalha naval, **frente a frente** com dois celulares e as coordenadas
faladas, sem nenhuma conexão. Este documento é sobre o modo à distância.

- **Batalha naval:** protocolo próprio (`lib/protocolo.ts`), porque cada um esconde a sua frota.
- **Os outros 9 jogos:** um protocolo só (`lib/jogos/turnos.ts`). Os dois aparelhos guardam a mesma
  lista de lances; cada lance leva a sua posição na lista, o repetido é ignorado e o que faltar é pedido
  de novo. A cada 4 segundos os dois contam até onde têm, e quem estiver na frente reenvia. Cada jogo
  tem o seu canal (`<jogo>-<código>`), então um código de damas nunca cai numa sala de xadrez.
- **Descubra o código:** o código secreto fica só no aparelho de quem escolheu. O aparelho responde
  sozinho aos palpites do outro e só manda o código no fim, para o outro ver.
- **Stop:** protocolo próprio (`lib/jogos/stop.ts`), porque todos escrevem ao mesmo tempo e a sala
  aceita de 2 a 6 jogadores. Veja "Stop com mais gente", abaixo.

## Como funciona

- Um jogador cria a sala e recebe um código de 6 letras e números, sem os que se confundem (O e 0,
  I e 1). Manda o código ou o link pelo WhatsApp; o outro entra.
- Sem cadastro, sem nome e **sem chat**: só passam pela rede o código da sala, um número sorteado para
  cada aparelho e as jogadas (lances, coordenadas, palpites e respostas). No Stop, cada um aparece como um
  bicho, pela ordem de chegada.
- Quem recebe o tiro responde sozinho, a partir da própria frota, como no jogo falado. Cada aparelho
  guarda só o seu lado da partida (localStorage), então dá para fechar o navegador e voltar pelo código.
- A sala aceita dois jogadores; um terceiro que entrar com o código vê "sala cheia". No Stop, até 6; o
  sétimo vê "sala cheia".
- A vez não fica guardada: sai do histórico de tiros, e os dois aparelhos chegam sempre à mesma conta.
  Mensagem perdida ou repetida não atrapalha: o tiro sem resposta é reenviado a cada 4 segundos e a
  resposta repetida é ignorada.

## Stop com mais gente

De 2 a 6 jogadores, cada um no seu aparelho. Ninguém tem nome: cada um é um bicho (Arara, Onça, Tatu,
Capivara, Tucano, Boto…), pela ordem de chegada na sala, e fica com ele mesmo se sair e voltar.

- **Quem criou a sala é o juiz.** Guarda a lista de quem chegou (o "elenco", que só cresce), sorteia a
  letra, diz quem joga cada rodada e fecha os pontos. Manda tudo numa mensagem só, "sala", que os outros
  seguem. Se ele sair, a partida espera ele voltar.
- **Cada aparelho manda o seu estado** ("eu"): as respostas (só depois do Stop ou do fim do tempo), as
  palavras dos outros que não aceita, se está pronto e de quem já tem as respostas. Quem recebe as
  respostas de alguém fecha as suas na hora, com o que tinha escrito: é assim que o Stop de um para a
  rodada de todos.
- **"Não vale" pela maioria.** Uma palavra deixa de valer quando mais da metade dos outros jogadores da
  rodada marca (2 jogadores: 1 voto; 3: 2; 4: 2; 5 e 6: 3). Quem escreveu a mesma palavra não vota nela e
  conta como "vale".
- **Quem sai no meio.** Se faltam as respostas de quem saiu, quem criou a sala pode seguir sem ele: ele
  fica de fora daquela rodada (desde que fiquem pelo menos dois). Se ele já tinha respondido e só falta
  dizer "pronto", a rodada fecha com o que ele mandou. Quem chega depois de a partida começar, ou volta,
  entra na rodada seguinte. Os pontos de cada rodada são os que quem criou a sala fechou, então o placar
  é igual em todos os aparelhos.
- **Jogar de novo:** quem criou a sala abre a partida seguinte; cada um entra quando toca em "Jogar de
  novo". Quem não tocar fica vendo o resultado.

**Por que até 6.** Cada mensagem vai para todos os outros, e o plano gratuito do Supabase conta cada
mensagem que sai de um aparelho e cada uma que chega: o limite é de 100 por segundo no projeto inteiro
(passando disso, ele derruba as conexões por um instante, e elas voltam sozinhas). Com 6 jogadores, um
Stop gera umas 40 de uma vez (cada um manda as suas respostas para os outros 5). Para não somar mais, o
estado repetido de tempos em tempos sai a cada 4 segundos com até 2 na sala, 6 com até 4 e 8 com até 6;
e quando alguém precisa de algo (voltou da queda, por exemplo), os outros respondem uma vez só, juntando
os pedidos. Também há limite de 20 mensagens de
presença por segundo, e cada entrada ou saída de alguém avisa todos os que estão na sala.

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

## Quando a conexão cai

No celular, a conexão da sala cai sem avisar quando a tela apaga, quando a pessoa troca de app ou quando
a internet oscila. Do outro lado, parece que o jogador sumiu. O site faz quatro coisas (`lib/sala.ts` e
`components/jogos/useTelaAcesa.ts`):

1. **Tela acesa durante a partida.** Enquanto a partida não acaba, a sala pede ao navegador para não
   apagar a tela (Wake Lock). É a causa mais comum de queda. Se o navegador não deixar (bateria fraca,
   navegador antigo), a tela apaga como sempre.
2. **Conexão nova ao voltar.** Se a página ficou escondida mais de 5 segundos (tela apagada, outro app)
   ou a internet voltou, a sala abre uma conexão nova na hora, sem esperar a antiga dar sinal de morta.
3. **Conexão morta percebida sozinha.** Um sinal de vida vai ao servidor a cada 10 segundos (o padrão do
   Supabase é 25), e cada mensagem pede confirmação do servidor. Sem resposta, a conexão é refeita: com a
   página aberta, leva de 10 a 20 segundos.
4. **A tela explica.** "A internet deste aparelho caiu", com o botão "Tentar agora"; ou "O outro saiu da
   sala ou a conexão dele caiu", com o botão para chamar de volta pelo WhatsApp. A vez do outro diz que
   a partida continua quando ele voltar.

Ao voltar, a sala conta ao outro como está e quem estiver atrasado recebe o que falta (veja os protocolos
acima). Nada se perde: a partida fica guardada nos dois aparelhos.

Cada reconexão forçada cria um cliente novo do Supabase e fecha o antigo (sai do canal, e o outro vê na
hora). O cliente é criado com `accessToken` devolvendo a chave publicável, o mesmo token que ele usaria
sem login, para não criar a parte de login a cada reconexão.

## Se a sala não conectar

- A tela diz "A internet deste aparelho caiu": confira a internet daquele aparelho e toque em
  "Tentar agora".
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
anônimas (cada uma é um jogador; no Stop, abra três ou mais). Fora do localhost, o site ignora o `?relay`.

Para simular quedas, use o id do jogador (o `meuId` da sala, guardado no localStorage em
`jdd.sala.<código>`):

- `http://localhost:8787/congelar?id=...`: a conexão dele fica "morta sem avisar", como a do celular de
  tela apagada. O site percebe pelo sinal de vida (no retransmissor, a cada 3 segundos) e reconecta.
- `http://localhost:8787/derrubar?id=...`: fecha a conexão dele, como uma queda que o aparelho percebe.

As regras da partida (`lib/protocolo.ts`, `lib/jogos/turnos.ts` e `lib/jogos/stop.ts`) também têm testes
sem rede: `npm test` simula partidas inteiras, inclusive com 30% das mensagens perdidas e 20% repetidas;
no Stop, com 2 a 6 aparelhos, gente que cai e volta e gente que chega atrasada.
