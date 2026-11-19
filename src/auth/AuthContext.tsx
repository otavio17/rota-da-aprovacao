import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { autenticacao, banco } from './firebase';

export interface UsuarioApp {
  uid: string;
  email: string;
  nome: string;
}

interface ValorAuth {
  pronto: boolean; // false até o Firebase dizer se existe uma sessão salva
  usuario: UsuarioApp | null;
  ehAdmin: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
}

const ContextoAuth = createContext<ValorAuth | null>(null);

function nomeDe(user: User): string {
  return user.displayName?.trim() || user.email?.split('@')[0] || 'Usuário';
}

// Administrador = existe o documento admins/{uid}, criado no console do Firebase.
async function ehAdministrador(uid: string): Promise<boolean> {
  try {
    return (await getDoc(doc(banco(), 'admins', uid))).exists();
  } catch {
    return false;
  }
}

async function descrever(user: User | null): Promise<{ usuario: UsuarioApp | null; ehAdmin: boolean }> {
  if (!user) return { usuario: null, ehAdmin: false };
  return {
    usuario: { uid: user.uid, email: user.email ?? '', nome: nomeDe(user) },
    ehAdmin: await ehAdministrador(user.uid),
  };
}

// Grava o perfil da conta. Se falhar, o app segue funcionando; o perfil é gravado de novo no próximo login.
async function gravarPerfil(user: User, nome: string, novo: boolean): Promise<void> {
  try {
    await setDoc(
      doc(banco(), 'usuarios', user.uid),
      {
        nome,
        email: user.email ?? '',
        ultimoAcesso: serverTimestamp(),
        ...(novo ? { criadoEm: serverTimestamp() } : {}),
      },
      { merge: true },
    );
  } catch (erro) {
    console.warn('Não foi possível gravar o perfil da conta.', erro);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [usuario, setUsuario] = useState<UsuarioApp | null>(null);
  const [ehAdmin, setEhAdmin] = useState(false);
  // Durante entrar/cadastrar, o ouvinte não mexe no estado: essas funções aplicam o resultado no fim.
  const acaoEmCurso = useRef(false);
  const sequencia = useRef(0);

  const aplicar = useCallback(async (user: User | null) => {
    const minha = ++sequencia.current;
    const estado = await descrever(user);
    if (minha !== sequencia.current) return; // chegou um evento mais novo
    setUsuario(estado.usuario);
    setEhAdmin(estado.ehAdmin);
    setPronto(true);
  }, []);

  useEffect(
    () =>
      onAuthStateChanged(autenticacao(), (user) => {
        if (!acaoEmCurso.current) void aplicar(user);
      }),
    [aplicar],
  );

  const entrar = useCallback(
    async (email: string, senha: string) => {
      acaoEmCurso.current = true;
      try {
        const cred = await signInWithEmailAndPassword(autenticacao(), email.trim(), senha);
        void gravarPerfil(cred.user, nomeDe(cred.user), false);
        await aplicar(cred.user);
      } finally {
        acaoEmCurso.current = false;
      }
    },
    [aplicar],
  );

  const cadastrar = useCallback(
    async (nome: string, email: string, senha: string) => {
      acaoEmCurso.current = true;
      try {
        const cred = await createUserWithEmailAndPassword(autenticacao(), email.trim(), senha);
        const nomeLimpo = nome.trim();
        try {
          await updateProfile(cred.user, { displayName: nomeLimpo });
        } catch (erro) {
          console.warn('Não foi possível definir o nome da conta.', erro);
        }
        void gravarPerfil(cred.user, nomeLimpo, true);
        await aplicar(cred.user);
      } finally {
        acaoEmCurso.current = false;
      }
    },
    [aplicar],
  );

  const sair = useCallback(async () => {
    await signOut(autenticacao());
  }, []);

  const valor = useMemo<ValorAuth>(
    () => ({ pronto, usuario, ehAdmin, entrar, cadastrar, sair }),
    [pronto, usuario, ehAdmin, entrar, cadastrar, sair],
  );

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>;
}

export function useAuth(): ValorAuth {
  const valor = useContext(ContextoAuth);
  if (!valor) throw new Error('useAuth precisa estar dentro do AuthProvider');
  return valor;
}
