// Retransmissor local para testar a partida à distância sem o Supabase. Faz o mesmo papel do Realtime:
// salas por código, lista de quem está na sala (presença), repasse das mensagens para o outro e
// resposta ao sinal de vida (ping), que o site usa para perceber conexão morta.
//
//   npm i --no-save ws
//   node scripts/relay-de-teste.mjs            (porta 8787)
//   PERDA=0.3 node scripts/relay-de-teste.mjs  (perde 30% das mensagens, para testar o reenvio)
//
// Depois abra o site em localhost com ?relay=ws://localhost:8787 em dois navegadores (ou duas
// janelas anônimas). Fora do localhost o site ignora o ?relay.
//
// Para simular quedas, com o id do jogador (o meuId guardado na sala, no localStorage):
//   http://localhost:8787/congelar?id=...   a conexão atual dele fica "morta sem avisar": continua
//                                           aberta, mas não entrega nem recebe nada e não responde
//                                           ao ping (o que acontece com o celular de tela apagada)
//   http://localhost:8787/derrubar?id=...   fecha a conexão dele (queda que o aparelho percebe)
import http from "node:http";
import { createRequire } from "node:module";

let WebSocketServer;
try {
  ({ WebSocketServer } = createRequire(import.meta.url)("ws"));
} catch {
  console.error("Este script usa o pacote ws. Rode antes: npm i --no-save ws");
  process.exit(1);
}

const PORTA = Number(process.env.PORTA ?? 8787);
const PERDA = Number(process.env.PERDA ?? 0);
/** código da sala -> (id do jogador -> { ws, desde }) */
const salas = new Map();
/** conexões "mortas sem avisar" */
const congeladas = new WeakSet();

function presenca(codigo) {
  const sala = salas.get(codigo);
  if (!sala) return;
  const membros = [...sala].map(([id, m]) => ({ id, desde: m.desde }));
  for (const { ws } of sala.values()) if (!congeladas.has(ws)) ws.send(JSON.stringify({ tipo: "presenca", membros }));
}

function conexoesDe(id) {
  return [...salas.values()].flatMap((sala) => (sala.get(id) ? [sala.get(id).ws] : []));
}

const servidorHttp = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");
  const conexoes = id ? conexoesDe(id) : [];
  if (url.pathname === "/congelar") for (const ws of conexoes) congeladas.add(ws);
  else if (url.pathname === "/derrubar") for (const ws of conexoes) ws.terminate();
  else return res.writeHead(404).end("não encontrado");
  res.end(`${url.pathname.slice(1)}: ${conexoes.length} conexão(ões)`);
});

const servidor = new WebSocketServer({ server: servidorHttp });

servidor.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://localhost");
  const codigo = url.searchParams.get("sala");
  const id = url.searchParams.get("id");
  if (!codigo || !id) return ws.close();
  if (!salas.has(codigo)) salas.set(codigo, new Map());
  const sala = salas.get(codigo);
  sala.set(id, { ws, desde: sala.get(id)?.desde ?? Date.now() });
  presenca(codigo);

  ws.on("message", (dados) => {
    if (congeladas.has(ws)) return;
    const texto = String(dados);
    if (texto.includes('"tipo":"ping"')) return ws.send(JSON.stringify({ tipo: "pong" }));
    if (Math.random() < PERDA) return; // simula mensagem perdida
    for (const [outroId, m] of sala) if (outroId !== id && !congeladas.has(m.ws)) m.ws.send(texto);
  });
  ws.on("close", () => {
    if (sala.get(id)?.ws === ws) sala.delete(id);
    presenca(codigo);
  });
});

servidorHttp.listen(PORTA, () => {
  console.log(`Retransmissor de teste em ws://localhost:${PORTA} (perda de mensagens: ${Math.round(PERDA * 100)}%)`);
});
