/**
 * Configurações do site. É o único arquivo que você precisa editar para
 * publicar: nome, responsável, contato, site irmão e métricas.
 */
export const SITE = {
  /** Nome de trabalho. Trocou? Mude aqui, em public/manifest.webmanifest e no README. */
  nome: "Jogo do Dia",
  /** Subdomínio do domínio que já existe (o do Brincadeira do Dia): não precisa registrar outro. */
  url: "https://jogos.brincadeiradodia.com.br",
  descricao:
    "Jogos clássicos e educativos para pais jogarem junto com filhos de 7 a 12 anos. Cada jogo diz o que treina e de onde veio a ideia.",

  /** Faixa de idade do site (cada jogo tem a sua idade mínima). */
  idades: "7 a 12 anos",

  /**
   * Responsável pelo site (controlador dos dados, pela LGPD).
   * Aparece nos Termos de Uso e na Política de Privacidade.
   */
  responsavel: "Leandro Batista de Oliveira",

  /** E-mail de contato: canal para dúvidas, sugestões e pedidos sobre dados pessoais (LGPD). */
  contato: "leandropucsp@gmail.com",

  /**
   * O site irmão, para crianças menores. Aparece na página inicial, no rodapé e na página Sobre.
   * O apoio por PIX fica na página Sobre dele, para não ter duas chaves espalhadas.
   */
  irmao: {
    nome: "Brincadeira do Dia",
    url: "https://brincadeiradodia.com.br",
    chamada: "uma brincadeira por dia para crianças de 1 a 6 anos, sem tela para a criança",
  },

  /** Onde ficam os servidores (para a Política de Privacidade). */
  provedores: {
    hospedagem: "Vercel (Estados Unidos)",
    metricas: "servidor próprio contratado na Contabo (Alemanha)",
    tempoReal: "Supabase, com servidor em São Paulo (Brasil)",
  },

  /**
   * Partida à distância: projeto "jogododia" do Supabase (organização gratuita "Roadmap", região
   * São Paulo). Só o Realtime é usado: as jogadas passam por ele e não ficam guardadas.
   * A URL e a chave publicável são feitas para ficar no navegador (como a chave PIX do irmão).
   * Vazio = o modo à distância não aparece e o site funciona só frente a frente.
   */
  tempoReal: {
    url: "https://jmtnycyfwmjumrafbcfd.supabase.co",
    chave: "sb_publishable_zK4SpRm1NzvdogGpVUQK-A_pmzz-vW0",
  },

  /**
   * Métricas anônimas com Umami (sem cookies), o mesmo painel do Brincadeira do Dia.
   * Vazio = nenhum script é carregado, e a Política de Privacidade diz que não há métricas.
   */
  umami: {
    scriptUrl: "",
    websiteId: "",
    /** Endereços contados, separados por vírgula (com e sem www). */
    dominio: "jogos.brincadeiradodia.com.br",
  },
} as const;

/**
 * Versão dos Termos de Uso e da Política de Privacidade.
 * Mudou o texto de forma relevante? Troque a versão (a data; no mesmo dia, a data com ".2", ".3"…): na
 * próxima partida, o adulto aceita de novo.
 */
export const VERSAO_TERMOS = "2026-11-07.2";
export const DATA_TERMOS = "7 de novembro de 2026";
