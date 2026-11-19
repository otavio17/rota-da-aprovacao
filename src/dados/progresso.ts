import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { banco } from '../auth/firebase';
import { dadosVazios, type Armazem } from './armazenamento';
import type { Dados } from '../domain/regras';

// Onde este navegador guardava o progresso antes de existirem contas (versões anteriores do app).
const CHAVE_LEGADA_V2 = 'rota-da-aprovacao:v2';
const CHAVE_LEGADA_V1 = 'estudos-concurso:v1';

export function armazemVazio(): Armazem {
  return { ativo: null, concursos: {} };
}

// Completa os campos que faltarem, para que um registro antigo não quebre as telas.
function normalizarDados(bruto: unknown): Dados {
  const d = typeof bruto === 'object' && bruto !== null ? (bruto as Partial<Dados>) : {};
  return { ...dadosVazios(), ...d };
}

export function normalizarArmazem(bruto: unknown): Armazem {
  if (typeof bruto !== 'object' || bruto === null) return armazemVazio();
  const { ativo, concursos: brutos } = bruto as { ativo?: unknown; concursos?: unknown };
  const concursos: Record<string, Dados> = {};
  if (typeof brutos === 'object' && brutos !== null) {
    for (const [id, dados] of Object.entries(brutos)) concursos[id] = normalizarDados(dados);
  }
  return {
    ativo: typeof ativo === 'string' && Object.hasOwn(concursos, ativo) ? ativo : null,
    concursos,
  };
}

// Lê os dados antigos guardados no navegador (texto JSON). Devolve null se não houver nada a aproveitar.
export function lerLegadoDe(v2: string | null, v1: string | null): Armazem | null {
  try {
    if (v2) {
      const a = normalizarArmazem(JSON.parse(v2));
      if (Object.keys(a.concursos).length > 0) return a;
    }
    if (v1) {
      const d = normalizarDados(JSON.parse(v1));
      if (d.perfil) return { ativo: d.perfil.concursoId, concursos: { [d.perfil.concursoId]: d } };
    }
  } catch {
    // dados corrompidos: nada a aproveitar
  }
  return null;
}

function lerLegado(): Armazem | null {
  try {
    return lerLegadoDe(localStorage.getItem(CHAVE_LEGADA_V2), localStorage.getItem(CHAVE_LEGADA_V1));
  } catch {
    return null; // armazenamento bloqueado
  }
}

function apagarLegado(): void {
  try {
    localStorage.removeItem(CHAVE_LEGADA_V2);
    localStorage.removeItem(CHAVE_LEGADA_V1);
  } catch {
    // armazenamento bloqueado: nada a apagar
  }
}

// Um documento por conta (progresso/{uid}). O conteúdo vai como texto JSON.
export function salvarProgresso(uid: string, armazem: Armazem): Promise<void> {
  return setDoc(doc(banco(), 'progresso', uid), {
    armazem: JSON.stringify(armazem),
    atualizadoEm: serverTimestamp(),
  });
}

export async function carregarProgresso(uid: string): Promise<Armazem> {
  const snap = await getDoc(doc(banco(), 'progresso', uid));
  if (snap.exists()) {
    const texto = snap.data().armazem;
    return typeof texto === 'string' ? normalizarArmazem(JSON.parse(texto)) : armazemVazio();
  }
  if (snap.metadata.fromCache) {
    // Sem conexão e sem cópia no aparelho: não dá para saber se a conta já tem progresso.
    // Não criamos nada por cima, para não apagar o que existe na nuvem.
    throw Object.assign(new Error('sem conexão'), { code: 'unavailable' });
  }
  // A nuvem confirmou que a conta ainda não tem progresso. Se este navegador tiver dados antigos,
  // eles passam para esta conta. Só depois que a nuvem confirma o envio é que o antigo é apagado.
  const legado = lerLegado();
  if (legado) {
    void salvarProgresso(uid, legado).then(apagarLegado, () => undefined);
    return legado;
  }
  return armazemVazio();
}
