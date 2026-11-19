import { describe, expect, it } from 'vitest';
import { dadosVazios } from './armazenamento';
import { lerLegadoDe, normalizarArmazem } from './progresso';

const perfil = {
  nome: 'Teste',
  concursoId: 'tjsp-oficial',
  pasta: 'tjsp-oficial',
  dataProva: '2027-03-14',
  horasDia: 4,
  criadoEm: '2026-11-01',
};

describe('normalizarArmazem', () => {
  it('devolve um armazém vazio para dados inválidos', () => {
    expect(normalizarArmazem(null)).toEqual({ ativo: null, concursos: {} });
    expect(normalizarArmazem('lixo')).toEqual({ ativo: null, concursos: {} });
  });

  it('completa os campos que faltam em cada concurso', () => {
    const a = normalizarArmazem({ ativo: 'x', concursos: { x: { perfil: null } } });
    expect(a.ativo).toBe('x');
    expect(a.concursos.x).toEqual(dadosVazios());
  });

  it('zera o concurso em foco quando ele não está na lista', () => {
    expect(normalizarArmazem({ ativo: 'nao-existe', concursos: { x: {} } }).ativo).toBeNull();
  });
});

describe('lerLegadoDe', () => {
  it('não há nada a aproveitar quando o navegador está limpo', () => {
    expect(lerLegadoDe(null, null)).toBeNull();
  });

  it('ignora a versão atual quando nenhum concurso foi adicionado', () => {
    expect(lerLegadoDe(JSON.stringify({ ativo: null, concursos: {} }), null)).toBeNull();
  });

  it('aproveita o armazém da versão atual', () => {
    const texto = JSON.stringify({
      ativo: 'tjsp-oficial',
      concursos: { 'tjsp-oficial': { ...dadosVazios(), perfil } },
    });
    const a = lerLegadoDe(texto, null);
    expect(a?.ativo).toBe('tjsp-oficial');
    expect(Object.keys(a?.concursos ?? {})).toEqual(['tjsp-oficial']);
  });

  it('converte a versão antiga, que tinha um único concurso', () => {
    const a = lerLegadoDe(null, JSON.stringify({ ...dadosVazios(), perfil }));
    expect(a?.ativo).toBe('tjsp-oficial');
    expect(a?.concursos['tjsp-oficial'].perfil?.nome).toBe('Teste');
  });

  it('ignora dados corrompidos', () => {
    expect(lerLegadoDe('{ruim', null)).toBeNull();
  });
});
