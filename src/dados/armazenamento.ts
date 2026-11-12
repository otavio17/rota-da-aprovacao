import { createContext, useContext } from 'react';
import type { Dados, Edital, Questao, Simulado } from '../domain/regras';

export interface ComparacaoItem {
  id: string;
  nome: string;
  simulados: Simulado[];
}

export interface ContextoValor {
  dados: Dados; // concurso em foco
  atualizar: (fn: (d: Dados) => Dados) => void;
  edital: Edital;
  questoes: Questao[];
  hoje: string;
  comparativo: ComparacaoItem[]; // todos os concursos adicionados (usado só na Análise)
}

export const Contexto = createContext<ContextoValor | null>(null);

export function useContexto(): ContextoValor {
  const c = useContext(Contexto);
  if (!c) throw new Error('useContexto fora do provedor');
  return c;
}

// Um bloco de dados por concurso adicionado, e qual deles está em foco.
export interface Armazem {
  ativo: string | null;
  concursos: Record<string, Dados>;
}

const CHAVE = 'rota-da-aprovacao:v2';
const CHAVE_ANTIGA = 'estudos-concurso:v1';

export const dadosVazios = (): Dados => ({
  perfil: null,
  registros: {},
  simulados: [],
  erros: [],
  vistas: {},
  sessoes: [],
});

export function lerArmazem(): Armazem {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) {
      const a = JSON.parse(bruto) as Partial<Armazem>;
      return { ativo: a.ativo ?? null, concursos: a.concursos ?? {} };
    }
    // Migração: a versão anterior guardava um único concurso.
    const antigo = localStorage.getItem(CHAVE_ANTIGA);
    if (antigo) {
      const d: Dados = { ...dadosVazios(), ...JSON.parse(antigo) };
      if (d.perfil) {
        return { ativo: d.perfil.concursoId, concursos: { [d.perfil.concursoId]: d } };
      }
    }
  } catch {
    // dados corrompidos: começa do zero
  }
  return { ativo: null, concursos: {} };
}

export function gravarArmazem(a: Armazem): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(a));
  } catch {
    // armazenamento cheio ou bloqueado: o app segue nesta sessão
  }
}

export function hojeLocal(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export async function carregarJson<T>(caminho: string): Promise<T> {
  const r = await fetch(`${import.meta.env.BASE_URL}data/${caminho}`);
  if (!r.ok) throw new Error(`Não foi possível carregar ${caminho}`);
  return (await r.json()) as T;
}
