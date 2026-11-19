import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { mensagemDeErro } from '../auth/erros';
import { validarCadastro } from '../auth/validacao';

export function Cadastro() {
  const { pronto, usuario, cadastrar } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!pronto) return <p className="aviso">Carregando…</p>;
  if (usuario) return <Navigate to="/hoje" replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const problema = validarCadastro(nome, email, senha);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await cadastrar(nome, email, senha);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setEnviando(false);
    }
  }

  return (
    <main className="conteudo autenticacao">
      <h1>Criar cadastro</h1>
      <form className="cartao" onSubmit={enviar} noValidate>
        <label>
          Nome
          <input autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label>
          E-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Senha (mínimo de 6 caracteres)
          <input
            type="password"
            autoComplete="new-password"
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
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </button>
        <p className="suave">
          Já tem conta? <Link to="/entrar">Entrar</Link>
        </p>
      </form>
    </main>
  );
}
