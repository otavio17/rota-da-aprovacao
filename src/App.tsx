import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { firebaseConfigurado } from './auth/firebase';
import { Admin } from './telas/Admin';
import { Analise } from './telas/Analise';
import { AreaDeEstudo } from './telas/AreaDeEstudo';
import { Cadastro } from './telas/Cadastro';
import { Cronograma } from './telas/Cronograma';
import { Entrar } from './telas/Entrar';
import { Erros } from './telas/Erros';
import { Hoje } from './telas/Hoje';
import { Simulado } from './telas/Simulado';

export default function App() {
  if (!firebaseConfigurado) {
    return (
      <main className="conteudo autenticacao">
        <section className="cartao">
          <h1>Login não configurado</h1>
          <p className="aviso">
            Este build não tem a configuração do Firebase (variáveis VITE_FIREBASE_*). Veja docs/configurar-firebase.md.
          </p>
        </section>
      </main>
    );
  }

  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/admin" element={<Admin />} />
          <Route element={<AreaDeEstudo />}>
            <Route path="/hoje" element={<Hoje />} />
            <Route path="/cronograma" element={<Cronograma />} />
            <Route path="/simulado" element={<Simulado />} />
            <Route path="/analise" element={<Analise />} />
            <Route path="/erros" element={<Erros />} />
            <Route path="*" element={<Navigate to="/hoje" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
