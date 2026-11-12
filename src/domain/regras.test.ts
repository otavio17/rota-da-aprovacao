import { describe, expect, it } from 'vitest';
import {
  aplicarNota,
  aplicarSimulado,
  alocarProporcional,
  diaDaSemana,
  estadoPorNota,
  limitarPorTempo,
  marcarEstudado,
  montarGeral,
  montarMini,
  montarRevisao,
  pontuar,
  prioridades,
  proximoPasso,
  registrarRevisao,
  registroInicial,
  sequenciaDias,
  type Dados,
  type Edital,
  type Questao,
  type Simulado,
} from './regras';

const semAleatorio = () => 0.5;

const edital: Edital = {
  id: 'teste',
  banca: 'X',
  dataProva: '2027-03-14',
  questoesProva: 4,
  duracaoMin: 300,
  blocos: [
    { id: 'a', nome: 'Bloco A', questoes: 2, minimoPct: 50 },
    { id: 'b', nome: 'Bloco B', questoes: 2, minimoPct: 50 },
  ],
  topicos: [
    { id: 't1', bloco: 'a', disciplina: 'D1', titulo: 'T1', peso: 3, semana: 1 },
    { id: 't2', bloco: 'b', disciplina: 'D2', titulo: 'T2', peso: 1, semana: 2 },
  ],
};

function q(id: string, topico: string, correta = 0): Questao {
  return {
    id,
    topico,
    disciplina: 'D',
    enunciado: `Enunciado ${id}`,
    alternativas: ['a', 'b', 'c', 'd', 'e'],
    correta,
    comentario: 'Comentário',
    fonte: 'inedita',
    dificuldade: 1,
  };
}

const dadosVazios = (): Dados => ({
  perfil: null,
  registros: {},
  simulados: [],
  erros: [],
  vistas: {},
  sessoes: [],
});

describe('estados por nota (80 e 85)', () => {
  it('abaixo de 80 vai para reforço', () => {
    expect(estadoPorNota(79)).toBe('reforco');
  });
  it('80 e 84 ficam em consolidação', () => {
    expect(estadoPorNota(80)).toBe('consolidacao');
    expect(estadoPorNota(84)).toBe('consolidacao');
  });
  it('85 ou mais é liberado', () => {
    expect(estadoPorNota(85)).toBe('liberado');
    expect(estadoPorNota(100)).toBe('liberado');
  });
  it('aplicarNota atualiza o estado e conta a tentativa', () => {
    const r = aplicarNota(registroInicial(), 90);
    expect(r.estado).toBe('liberado');
    expect(r.ultimaNota).toBe(90);
    expect(r.tentativas).toBe(1);
  });
});

describe('revisão espaçada (1, 7, 30)', () => {
  it('marcar como estudado agenda a primeira revisão para 1 dia', () => {
    const r = marcarEstudado(registroInicial(), '2026-11-12');
    expect(r.estado).toBe('estudado');
    expect(r.proximaRevisao).toBe('2026-11-13');
  });
  it('acertos seguidos passam por 1, 7 e 30 dias e depois saem da fila', () => {
    let r = marcarEstudado(registroInicial(), '2026-11-12');
    r = registrarRevisao(r, true, '2026-11-13');
    expect(r.proximaRevisao).toBe('2026-11-20');
    r = registrarRevisao(r, true, '2026-11-20');
    expect(r.proximaRevisao).toBe('2026-12-20');
    r = registrarRevisao(r, true, '2026-12-20');
    expect(r.proximaRevisao).toBeNull();
  });
  it('erro na revisão reinicia a contagem', () => {
    let r = marcarEstudado(registroInicial(), '2026-11-12');
    r = registrarRevisao(r, true, '2026-11-13');
    r = registrarRevisao(r, false, '2026-11-20');
    expect(r.etapaRevisao).toBe(0);
    expect(r.proximaRevisao).toBe('2026-11-21');
  });
});

describe('próximo passo (tela Hoje)', () => {
  // 2026-11-13 é uma sexta-feira; 2026-11-14 é sábado; 2026-11-15 é domingo.
  it('dia da semana está correto', () => {
    expect(diaDaSemana('2026-11-13')).toBe(5);
    expect(diaDaSemana('2026-11-14')).toBe(6);
    expect(diaDaSemana('2026-11-15')).toBe(0);
  });
  it('sábado é simulado geral e domingo é análise', () => {
    const base = { topicos: edital.topicos, registros: {}, semana: 1, horasDia: 4 };
    expect(proximoPasso({ ...base, hoje: '2026-11-14' })[0].tipo).toBe('geral');
    expect(proximoPasso({ ...base, hoje: '2026-11-15' })[0].tipo).toBe('analise');
  });
  it('sexta termina com o mini-simulado', () => {
    const fila = proximoPasso({ topicos: edital.topicos, registros: {}, hoje: '2026-11-13', semana: 1, horasDia: 4 });
    expect(fila[fila.length - 1].tipo).toBe('mini');
  });
  it('revisões vencidas vêm antes de reforço e de assunto novo', () => {
    const registros = {
      t1: { ...registroInicial(), estado: 'estudado' as const, proximaRevisao: '2026-11-10' },
      t2: { ...registroInicial(), estado: 'reforco' as const },
    };
    const fila = proximoPasso({ topicos: edital.topicos, registros, hoje: '2026-11-11', semana: 2, horasDia: 4 });
    expect(fila.map((i) => i.tipo)).toEqual(['revisao', 'reforco']);
  });
  it('respeita o tempo disponível por dia', () => {
    const itens = [{ minutos: 60 }, { minutos: 60 }, { minutos: 60 }];
    expect(limitarPorTempo(itens, 120)).toHaveLength(2);
    expect(limitarPorTempo(itens, 10)).toHaveLength(1); // sempre mantém o primeiro item
  });
});

describe('montagem dos simulados', () => {
  it('alocação proporcional soma exatamente o total', () => {
    expect(alocarProporcional(10, [1, 1, 1])).toHaveLength(3);
    expect(alocarProporcional(10, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(10);
    expect(alocarProporcional(40, [3, 1])).toEqual([30, 10]);
  });

  it('simulado geral avisa quantas questões faltam em vez de montar um menor em silêncio', () => {
    const questoes = [q('a1', 't1'), q('a2', 't1'), q('b1', 't2')];
    const r = montarGeral({ edital, questoes, vistas: {}, hoje: '2026-11-14', rng: semAleatorio });
    expect(r.questoes).toHaveLength(3);
    expect(r.faltas).toEqual([{ bloco: 'b', faltam: 1 }]);
  });

  it('não repete questão vista nos últimos 30 dias', () => {
    const questoes = [q('a1', 't1'), q('a2', 't1')];
    const vistas = { a1: '2026-11-10' };
    const r = montarRevisao({ questoes, topicoId: 't1', vistas, hoje: '2026-11-14', rng: semAleatorio });
    expect(r.questoes.map((x) => x.id)).toEqual(['a2']);
    expect(r.faltam).toBe(4);
  });

  it('mini-simulado mistura assunto da semana com reforço', () => {
    const questoes = [
      ...Array.from({ length: 20 }, (_, i) => q(`s${i}`, 't1')),
      ...Array.from({ length: 20 }, (_, i) => q(`r${i}`, 't2')),
    ];
    const r = montarMini({
      questoes,
      topicosSemana: ['t1'],
      topicosReforco: ['t2'],
      vistas: {},
      hoje: '2026-11-13',
      rng: semAleatorio,
      n: 20,
    });
    const nSemana = r.questoes.filter((x) => x.topico === 't1').length;
    expect(r.questoes).toHaveLength(20);
    expect(nSemana).toBe(14); // 70%
  });
});

describe('pontuação e análise', () => {
  it('bloco abaixo do mínimo elimina', () => {
    const respostas = [
      { questaoId: 'x', topicoId: 't1', blocoId: 'a', marcada: 1, correta: false },
      { questaoId: 'y', topicoId: 't1', blocoId: 'a', marcada: 1, correta: false },
      { questaoId: 'z', topicoId: 't2', blocoId: 'b', marcada: 0, correta: true },
    ];
    const p = pontuar(respostas, edital);
    expect(p.eliminado).toBe(true);
    expect(p.porBloco.find((b) => b.bloco === 'b')?.ok).toBe(true);
  });

  it('prioridade combina peso e taxa de acerto', () => {
    const respostas = [
      { questaoId: 'x', topicoId: 't1', blocoId: 'a', marcada: 0, correta: true },
      { questaoId: 'y', topicoId: 't2', blocoId: 'b', marcada: 1, correta: false },
    ];
    const p = prioridades(edital.topicos, respostas);
    expect(p[0].topicoId).toBe('t2'); // peso 1 × (1 − 0) = 1 ; t1: 3 × (1 − 1) = 0
  });

  it('sequência de dias conta dias seguidos até hoje ou ontem', () => {
    expect(sequenciaDias(['2026-11-10', '2026-11-11', '2026-11-12'], '2026-11-12')).toBe(3);
    expect(sequenciaDias(['2026-11-10', '2026-11-11'], '2026-11-12')).toBe(2);
    expect(sequenciaDias(['2026-11-08'], '2026-11-12')).toBe(0);
  });
});

describe('aplicarSimulado', () => {
  it('atualiza estado, vistas e erros a partir de um simulado concluído', () => {
    const respostas = [
      { questaoId: 'a1', topicoId: 't1', blocoId: 'a', marcada: 0, correta: true },
      { questaoId: 'a2', topicoId: 't1', blocoId: 'a', marcada: 1, correta: false },
    ];
    const sim: Simulado = { id: 's1', tipo: 'mini', data: '2026-11-13', respostas, acertos: 1, total: 2, pct: 50 };
    const d = aplicarSimulado(dadosVazios(), sim, '2026-11-13');
    expect(d.registros.t1.estado).toBe('reforco');
    expect(d.vistas).toEqual({ a1: '2026-11-13', a2: '2026-11-13' });
    expect(d.erros).toHaveLength(1);
    expect(d.erros[0].questaoId).toBe('a2');
    expect(d.simulados).toHaveLength(1);
  });
});
