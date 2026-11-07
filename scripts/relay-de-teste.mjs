// Retransmissor local para testar a partida à distância sem o Supabase. Faz o mesmo papel do Realtime:
// salas por código, lista de quem está na sala (presença) e repasse das mensagens para o outro.
//
//   npm i --no-save ws
//   node scripts/relay-de-teste.mjs            (porta 8787)
//   PERDA=0.3 node scripts/relay-de-teste.mjs  (perde 30% das mensagens, para testar o reenvio)
//
// Depois abra o site em localhost com ?relay=ws://localhost:8787 em dois navegadores (ou duas
// janelas anônimas). Fora do localhost o site ignora o ?relay.
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

const servidor = new WebSocketServer({ port: PORTA });

function presenca(codigo) {
  const sala = salas.get(codigo);
  if (!sala) return;
  const membros = [...sala].map(([id, m]) => ({ id, desde: m.desde }));
  for (const { ws } of sala.values()) ws.send(JSON.stringify({ tipo: "presenca", membros }));
}

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
    if (Math.random() < PERDA) return; // simula mensagem perdida
    for (const [outroId, m] of sala) if (outroId !== id) m.ws.send(String(dados));
  });
  ws.on("close", () => {
    if (sala.get(id)?.ws === ws) sala.delete(id);
    presenca(codigo);
  });
});

console.log(`Retransmissor de teste em ws://localhost:${PORTA} (perda de mensagens: ${Math.round(PERDA * 100)}%)`);
