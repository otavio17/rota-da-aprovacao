import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { mensagemDeErro } from '../auth/erros';
import { validarLogin } from '../auth/validacao';

export function Entrar() {
  const { pronto, usuario, entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!pronto) return <p className="aviso">Carregando…</p>;
  if (usuario) return <Navigate to="/hoje" replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const problema = validarLogin(email, senha);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setEnviando(false);
    }
  }

  return (
    <main className="conteudo autenticacao">
      <h1>Entrar</h1>
      <form className="cartao" onSubmit={enviar} noValidate>
        <label>
          E-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>
        {erro && (
          <p className="erro-texto" role="alert">
            {erro}
          </p>
        )}
        <button type="submit" className="botao" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="suave">
          Ainda não tem conta? <Link to="/cadastro">Criar cadastro</Link>
        </p>
      </form>
    </main>
  );
}
