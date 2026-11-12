import { createContext, useContext } from 'react';
import type { Concurso, Dados, Edital, Questao } from '../domain/regras';

export interface ContextoValor {
  dados: Dados;
  atualizar: (fn: (d: Dados) => Dados) => void;
  edital: Edital;
  questoes: Questao[];
  hoje: string;
}

export const Contexto = createContext<ContextoValor | null>(null);

export function useContexto(): ContextoValor {
  const c = useContext(Contexto);
  if (!c) throw new Error('useContexto fora do provedor');
  return c;
}

const CHAVE = 'estudos-concurso:v1';

export const dadosVazios = (): Dados => ({
  perfil: null,
  registros: {},
  simulados: [],
  erros: [],
  vistas: {},
  sessoes: [],
});

// Por enquanto os dados ficam no navegador (localStorage). A camada Firebase
// (seção 2 da especificação) entra depois, trocando estas duas funções.
export function lerDados(): Dados {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? { ...dadosVazios(), ...JSON.parse(bruto) } : dadosVazios();
  } catch {
    return dadosVazios();
  }
}

export function gravarDados(d: Dados): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(d));
  } catch {
    // armazenamento cheio ou bloqueado: o app segue funcionando nesta sessão
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

export type { Concurso };
