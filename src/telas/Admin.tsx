import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { mensagemDeErro } from '../auth/erros';
import { listarUsuarios, type UsuarioCadastrado } from '../dados/usuarios';

function formatar(data: Date | null): string {
  return data ? data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

export function Admin() {
  const { pronto, usuario, ehAdmin, sair } = useAuth();
  const [lista, setLista] = useState<UsuarioCadastrado[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!ehAdmin) return;
    let cancelado = false;
    setLista(null);
    setErro(null);
    listarUsuarios().then(
      (l) => {
        if (!cancelado) setLista(l);
      },
      (falha) => {
        if (!cancelado) setErro(mensagemDeErro(falha));
      },
    );
    return () => {
      cancelado = true;
    };
  }, [ehAdmin, recarga]);

  if (!pronto) return <p className="aviso">Carregando…</p>;
  if (!usuario) return <Navigate to="/entrar" replace />;

  if (!ehAdmin) {
    return (
      <main className="conteudo">
        <section className="painel">
          <h1>Acesso restrito</h1>
          <p className="suave">Esta página é só para o administrador do site.</p>
          <p>
            <Link to="/hoje">Voltar ao estudo</Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="conteudo">
      <section className="painel">
        <h1>Usuários</h1>
        <div className="conta">
          <span className="suave">{lista ? `${lista.length} conta(s) cadastrada(s)` : 'Carregando…'}</span>
          <span className="conta-acoes">
            <button
              type="button"
              className="botao pequeno secundario"
              onClick={() => setRecarga((n) => n + 1)}
            >
              Atualizar
            </button>
            <Link className="botao pequeno secundario" to="/hoje">
              Estudo
            </Link>
            <button type="button" className="botao pequeno" onClick={() => void sair()}>
              Sair
            </button>
          </span>
        </div>
        {erro && (
          <p className="erro-texto" role="alert">
            {erro}
          </p>
        )}
        {lista && (
          <ul className="lista">
            {lista.map((u) => (
              <li key={u.uid} className="item">
                <div>
                  <strong>{u.nome || '(sem nome)'}</strong>
                  <div className="suave">{u.email}</div>
                </div>
                <div className="suave">
                  Último login: {formatar(u.ultimoAcesso)}
                  <br />
                  Cadastro: {formatar(u.criadoEm)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
