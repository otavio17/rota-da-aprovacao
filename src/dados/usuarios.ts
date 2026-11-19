import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { banco } from '../auth/firebase';

export interface UsuarioCadastrado {
  uid: string;
  nome: string;
  email: string;
  criadoEm: Date | null;
  ultimoAcesso: Date | null;
}

function comoData(valor: unknown): Date | null {
  const ts = valor as { toDate?: () => Date } | null | undefined;
  return ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
}

// Só o administrador consegue ler esta lista: quem decide é a regra do Firestore, não esta tela.
export async function listarUsuarios(): Promise<UsuarioCadastrado[]> {
  const snap = await getDocs(query(collection(banco(), 'usuarios'), orderBy('ultimoAcesso', 'desc')));
  return snap.docs.map((d) => {
    const dados = d.data();
    return {
      uid: d.id,
      nome: typeof dados.nome === 'string' ? dados.nome : '',
      email: typeof dados.email === 'string' ? dados.email : '',
      criadoEm: comoData(dados.criadoEm),
      ultimoAcesso: comoData(dados.ultimoAcesso),
    };
  });
}
