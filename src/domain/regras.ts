// Regras de estudo como funções puras (seção 6 da especificação).
// Sem React e sem armazenamento: dá para testar direto com Vitest.

export const NOTA_REFORCO = 80;
export const NOTA_LIBERACAO = 85;
export const INTERVALOS_DIAS = [1, 7, 30];
export const DIAS_SEM_REPETIR = 30;
export const MINI_QUESTOES = 20;
export const REVISAO_QUESTOES = 5;
export const LIMIAR_REVISAO = 80;
export const DOMINGO = 0;
export const SEXTA = 5;
export const SABADO = 6;

export type Estado = 'novo' | 'estudado' | 'reforco' | 'consolidacao' | 'liberado';
export type TipoSimulado = 'mini' | 'geral' | 'revisao';

export interface Bloco { id: string; nome: string; questoes: number; minimoPct: number }
export interface Topico { id: string; bloco: string; disciplina: string; titulo: string; peso: number; semana: number }
export interface Edital {
  id: string;
  banca: string;
  dataProva: string;
  questoesProva: number;
  duracaoMin: number;
  blocos: Bloco[];
  topicos: Topico[];
  observacao?: string;
  inscricaoInicio?: string;
  inscricaoFim?: string;
}
export interface Questao {
  id: string;
  topico: string;
  disciplina: string;
  enunciado: string;
  alternativas: string[];
  correta: number;
  comentario: string;
  referencia?: string;
  fonte: string;
  dificuldade: number;
  video?: string;
}
export interface Concurso { id: string; nome: string; banca: string; dataProva: string; pasta: string; inscricoes: string }
export interface Perfil { nome: string; concursoId: string; pasta: string; dataProva: string; horasDia: number; criadoEm: string }
export interface RegistroTopico {
  estado: Estado;
  ultimaNota: number | null;
  etapaRevisao: number;
  proximaRevisao: string | null;
  tentativas: number;
}
export interface Resposta { questaoId: string; topicoId: string; blocoId: string; marcada: number | null; correta: boolean }
export interface Simulado {
  id: string;
  tipo: TipoSimulado;
  data: string;
  topicoId?: string;
  respostas: Resposta[];
  acertos: number;
  total: number;
  pct: number;
}
export interface ErroRegistro {
  id: string;
  questaoId: string;
  topicoId: string;
  simuladoId: string;
  motivo: string | null;
  data: string;
  resolvido: boolean;
}
export interface Dados {
  perfil: Perfil | null;
  registros: Record<string, RegistroTopico>;
  simulados: Simulado[];
  erros: ErroRegistro[];
  vistas: Record<string, string>;
  sessoes: { data: string; topicoId: string }[];
}

export type Rng = () => number;

// ---------- datas (strings AAAA-MM-DD, sem fuso) ----------

function paraUtc(data: string): number {
  const [y, m, d] = data.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function somarDias(data: string, dias: number): string {
  return new Date(paraUtc(data) + dias * 86400000).toISOString().slice(0, 10);
}

export function diasEntre(inicio: string, fim: string): number {
  return Math.round((paraUtc(fim) - paraUtc(inicio)) / 86400000);
}

export function diaDaSemana(data: string): number {
  return new Date(paraUtc(data)).getUTCDay();
}

export function semanaDoCronograma(inicio: string, hoje: string): number {
  return Math.max(1, Math.floor(diasEntre(inicio, hoje) / 7) + 1);
}

export function sequenciaDias(datas: string[], hoje: string): number {
  const dias = new Set(datas);
  let cursor = dias.has(hoje) ? hoje : somarDias(hoje, -1);
  let n = 0;
  while (dias.has(cursor)) {
    n++;
    cursor = somarDias(cursor, -1);
  }
  return n;
}

// ---------- estados e revisão espaçada ----------

export function estadoPorNota(nota: number): Estado {
  if (nota < NOTA_REFORCO) return 'reforco';
  if (nota >= NOTA_LIBERACAO) return 'liberado';
  return 'consolidacao';
}

export const registroInicial = (): RegistroTopico => ({
  estado: 'novo',
  ultimaNota: null,
  etapaRevisao: 0,
  proximaRevisao: null,
  tentativas: 0,
});

export function marcarEstudado(r: RegistroTopico, hoje: string): RegistroTopico {
  return {
    ...r,
    estado: r.estado === 'novo' ? 'estudado' : r.estado,
    etapaRevisao: 0,
    proximaRevisao: somarDias(hoje, INTERVALOS_DIAS[0]),
  };
}

export function aplicarNota(r: RegistroTopico, nota: number): RegistroTopico {
  return { ...r, estado: estadoPorNota(nota), ultimaNota: nota, tentativas: r.tentativas + 1 };
}

// "acertou" = pelo menos 80% nas questões da revisão
export function registrarRevisao(r: RegistroTopico, acertou: boolean, hoje: string): RegistroTopico {
  const etapa = acertou ? r.etapaRevisao + 1 : 0;
  const proxima = etapa >= INTERVALOS_DIAS.length ? null : somarDias(hoje, INTERVALOS_DIAS[etapa]);
  return { ...r, etapaRevisao: etapa, proximaRevisao: proxima };
}

// ---------- tela Hoje ----------

export interface ItemHoje {
  tipo: 'revisao' | 'reforco' | 'novo' | 'mini' | 'geral' | 'analise';
  topicoId?: string;
  titulo: string;
  minutos: number;
}

export function limitarPorTempo<T extends { minutos: number }>(fila: T[], limite: number): T[] {
  const saida: T[] = [];
  let total = 0;
  for (const item of fila) {
    if (saida.length > 0 && total + item.minutos > limite) break;
    saida.push(item);
    total += item.minutos;
  }
  return saida;
}

export function proximoPasso(params: {
  topicos: Topico[];
  registros: Record<string, RegistroTopico>;
  hoje: string;
  semana: number;
  horasDia: number;
}): ItemHoje[] {
  const { topicos, registros, hoje, semana, horasDia } = params;
  const dia = diaDaSemana(hoje);
  if (dia === SABADO) return [{ tipo: 'geral', titulo: 'Simulado geral', minutos: 0 }];
  if (dia === DOMINGO) return [{ tipo: 'analise', titulo: 'Análise da semana e prioridades', minutos: 0 }];

  const r = (id: string) => registros[id] ?? registroInicial();
  const revisoes = topicos
    .filter((t) => r(t.id).proximaRevisao !== null && (r(t.id).proximaRevisao as string) <= hoje)
    .sort((a, b) => (r(a.id).proximaRevisao as string).localeCompare(r(b.id).proximaRevisao as string));
  const idsRevisao = new Set(revisoes.map((t) => t.id));
  const reforco = topicos.filter((t) => r(t.id).estado === 'reforco' && !idsRevisao.has(t.id));
  const novos = topicos
    .filter((t) => r(t.id).estado === 'novo' && t.semana <= semana)
    .sort((a, b) => a.semana - b.semana);

  const fila: ItemHoje[] = [
    ...revisoes.map((t) => ({ tipo: 'revisao' as const, topicoId: t.id, titulo: t.titulo, minutos: 20 })),
    ...reforco.map((t) => ({ tipo: 'reforco' as const, topicoId: t.id, titulo: t.titulo, minutos: 60 })),
    ...novos.map((t) => ({ tipo: 'novo' as const, topicoId: t.id, titulo: t.titulo, minutos: 90 })),
  ];
  const cabe = limitarPorTempo(fila, horasDia * 60);
  if (dia === SEXTA) cabe.push({ tipo: 'mini', titulo: 'Mini-simulado da semana', minutos: 30 });
  return cabe;
}

// ---------- montagem dos simulados ----------

export function embaralhar<T>(lista: T[], rng: Rng): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function disponivel(questaoId: string, vistas: Record<string, string>, hoje: string): boolean {
  const ultima = vistas[questaoId];
  return !ultima || diasEntre(ultima, hoje) >= DIAS_SEM_REPETIR;
}

// Prioriza questões nunca vistas (depois embaralha dentro de cada grupo).
function priorizarNuncaVistas(lista: Questao[], vistas: Record<string, string>, rng: Rng): Questao[] {
  const e = embaralhar(lista, rng);
  return [...e.filter((q) => !vistas[q.id]), ...e.filter((q) => vistas[q.id])];
}

// Método do maior resto: divide um total proporcionalmente aos pesos, somando exatamente o total.
export function alocarProporcional(total: number, pesos: number[]): number[] {
  const soma = pesos.reduce((a, b) => a + b, 0);
  if (pesos.length === 0 || soma <= 0) return pesos.map(() => 0);
  const exatas = pesos.map((p) => (total * p) / soma);
  const base = exatas.map(Math.floor);
  const resto = total - base.reduce((a, b) => a + b, 0);
  const ordem = exatas
    .map((e, i) => ({ i, r: e - Math.floor(e) }))
    .sort((a, b) => b.r - a.r);
  for (let k = 0; k < resto; k++) base[ordem[k].i]++;
  return base;
}

export function montarMini(params: {
  questoes: Questao[];
  topicosSemana: string[];
  topicosReforco: string[];
  vistas: Record<string, string>;
  hoje: string;
  rng: Rng;
  n?: number;
}): { questoes: Questao[]; faltam: number } {
  const { questoes, topicosSemana, topicosReforco, vistas, hoje, rng } = params;
  const n = params.n ?? MINI_QUESTOES;
  const pool = (ids: string[]) =>
    questoes.filter((q) => ids.includes(q.topico) && disponivel(q.id, vistas, hoje));
  const nSemana = Math.round(n * 0.7);
  const semanaPool = priorizarNuncaVistas(pool(topicosSemana), vistas, rng);
  const reforcoPool = priorizarNuncaVistas(pool(topicosReforco), vistas, rng);

  const escolhidas: Questao[] = [];
  const usados = new Set<string>();
  const pegar = (lista: Questao[], max: number) => {
    for (const q of lista) {
      if (escolhidas.length >= n || max <= 0) break;
      if (usados.has(q.id)) continue;
      usados.add(q.id);
      escolhidas.push(q);
      max--;
    }
  };
  pegar(semanaPool, nSemana);
  pegar(reforcoPool, n);
  pegar(semanaPool, n);
  return { questoes: escolhidas, faltam: n - escolhidas.length };
}

export interface FaltaBloco { bloco: string; faltam: number }

export function montarGeral(params: {
  edital: Edital;
  questoes: Questao[];
  vistas: Record<string, string>;
  hoje: string;
  rng: Rng;
}): { questoes: Questao[]; faltas: FaltaBloco[] } {
  const { edital, questoes, vistas, hoje, rng } = params;
  const escolhidas: Questao[] = [];
  const faltas: FaltaBloco[] = [];

  for (const bloco of edital.blocos) {
    const topicos = edital.topicos.filter((t) => t.bloco === bloco.id);
    if (topicos.length === 0) {
      faltas.push({ bloco: bloco.id, faltam: bloco.questoes });
      continue;
    }
    const quotas = alocarProporcional(bloco.questoes, topicos.map((t) => t.peso));
    let faltaBloco = 0;
    topicos.forEach((t, i) => {
      const pool = priorizarNuncaVistas(
        questoes.filter((q) => q.topico === t.id && disponivel(q.id, vistas, hoje)),
        vistas,
        rng,
      );
      const pegas = pool.slice(0, quotas[i]);
      escolhidas.push(...pegas);
      faltaBloco += quotas[i] - pegas.length;
    });
    if (faltaBloco > 0) faltas.push({ bloco: bloco.id, faltam: faltaBloco });
  }
  return { questoes: escolhidas, faltas };
}

export function montarRevisao(params: {
  questoes: Questao[];
  topicoId: string;
  vistas: Record<string, string>;
  hoje: string;
  rng: Rng;
}): { questoes: Questao[]; faltam: number } {
  const { questoes, topicoId, vistas, hoje, rng } = params;
  const pool = priorizarNuncaVistas(
    questoes.filter((q) => q.topico === topicoId && disponivel(q.id, vistas, hoje)),
    vistas,
    rng,
  );
  const escolhidas = pool.slice(0, REVISAO_QUESTOES);
  return { questoes: escolhidas, faltam: REVISAO_QUESTOES - escolhidas.length };
}

// ---------- pontuação e análise ----------

export interface ResultadoBloco {
  bloco: string;
  nome: string;
  acertos: number;
  total: number;
  pct: number;
  minimo: number;
  ok: boolean;
}

export function pontuar(respostas: Resposta[], edital: Edital) {
  const porBloco: ResultadoBloco[] = edital.blocos.map((b) => {
    const rs = respostas.filter((r) => r.blocoId === b.id);
    const acertos = rs.filter((r) => r.correta).length;
    const total = rs.length;
    const pct = total ? Math.round((acertos / total) * 100) : 0;
    return {
      bloco: b.id,
      nome: b.nome,
      acertos,
      total,
      pct,
      minimo: b.minimoPct,
      ok: total === 0 || pct >= b.minimoPct,
    };
  });
  const acertos = respostas.filter((r) => r.correta).length;
  const total = respostas.length;
  return {
    porBloco,
    acertos,
    total,
    pctGeral: total ? Math.round((acertos / total) * 100) : 0,
    eliminado: porBloco.some((b) => !b.ok),
  };
}

// Prioridade = peso no edital × (1 − taxa de acerto). Quem chama filtra os últimos 30 dias.
export function prioridades(topicos: Topico[], respostas: Resposta[], n = 5) {
  return topicos
    .map((t) => {
      const rs = respostas.filter((r) => r.topicoId === t.id);
      const taxa = rs.length ? rs.filter((r) => r.correta).length / rs.length : 0;
      return { topicoId: t.id, titulo: t.titulo, peso: t.peso, taxa, prioridade: t.peso * (1 - taxa) };
    })
    .sort((a, b) => b.prioridade - a.prioridade)
    .slice(0, n);
}

// Aplica um simulado concluído: atualiza registros, vistas, erros e histórico. Função pura.
export function aplicarSimulado(d: Dados, sim: Simulado, hoje: string): Dados {
  const registros = { ...d.registros };
  const porTopico = new Map<string, Resposta[]>();
  for (const r of sim.respostas) {
    porTopico.set(r.topicoId, [...(porTopico.get(r.topicoId) ?? []), r]);
  }
  for (const [topicoId, rs] of porTopico) {
    const acertos = rs.filter((r) => r.correta).length;
    const pct = Math.round((acertos / rs.length) * 100);
    const atual = registros[topicoId] ?? registroInicial();
    if (sim.tipo === 'revisao') {
      registros[topicoId] = {
        ...registrarRevisao(atual, pct >= LIMIAR_REVISAO, hoje),
        ultimaNota: pct,
        tentativas: atual.tentativas + 1,
      };
    } else {
      registros[topicoId] = aplicarNota(atual, pct);
    }
  }

  const vistas = { ...d.vistas };
  for (const r of sim.respostas) vistas[r.questaoId] = hoje;

  const jaAberto = new Set(d.erros.filter((e) => !e.resolvido).map((e) => e.questaoId));
  const novosErros: ErroRegistro[] = sim.respostas
    .filter((r) => !r.correta && !jaAberto.has(r.questaoId))
    .map((r) => ({
      id: `${sim.id}-${r.questaoId}`,
      questaoId: r.questaoId,
      topicoId: r.topicoId,
      simuladoId: sim.id,
      motivo: null,
      data: hoje,
      resolvido: false,
    }));

  return {
    ...d,
    registros,
    vistas,
    erros: [...d.erros, ...novosErros],
    simulados: [...d.simulados, sim],
  };
}

// ---------- prazos (alerta colorido) ----------
// Critério: dias até a data-alvo.
//   passou   → data já ocorreu
//   urgente  → até 30 dias (vermelho)
//   atencao  → de 31 a 90 dias (amarelo)
//   tranquilo→ mais de 90 dias (verde)
export type NivelPrazo = 'passou' | 'urgente' | 'atencao' | 'tranquilo';

export function classificarPrazo(dataAlvo: string, hoje: string): { dias: number; nivel: NivelPrazo } {
  const dias = diasEntre(hoje, dataAlvo);
  if (dias < 0) return { dias, nivel: 'passou' };
  if (dias <= 30) return { dias, nivel: 'urgente' };
  if (dias <= 90) return { dias, nivel: 'atencao' };
  return { dias, nivel: 'tranquilo' };
}
