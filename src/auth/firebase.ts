import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const opcoes: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Sem essas quatro variáveis o build não consegue falar com o Firebase: o app mostra um aviso em vez de quebrar.
export const firebaseConfigurado = Boolean(
  opcoes.apiKey && opcoes.authDomain && opcoes.projectId && opcoes.appId,
);

// Testes locais: aponta o app para os emuladores, sem tocar no projeto real.
const usarEmulador = import.meta.env.VITE_USAR_EMULADOR === 'sim';

interface Servicos {
  auth: Auth;
  db: Firestore;
}

let servicos: Servicos | null = null;

function iniciar(): Servicos {
  if (servicos) return servicos;
  const app = getApps().length ? getApp() : initializeApp(opcoes);
  const auth = getAuth(app);
  let db: Firestore;
  try {
    // Cache local em IndexedDB: o progresso aparece e as alterações ficam na fila quando a conexão cai.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    db = getFirestore(app); // já inicializado (recarga do módulo em desenvolvimento)
  }
  if (usarEmulador) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  servicos = { auth, db };
  return servicos;
}

export function autenticacao(): Auth {
  return iniciar().auth;
}

export function banco(): Firestore {
  return iniciar().db;
}
