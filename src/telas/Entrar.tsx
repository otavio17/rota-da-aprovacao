import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { mensagemDeErro } from '../auth/erros';
import { validarLogin } from '../auth/validacao';
import { CampoSenha, MolduraDeAcesso } from './MolduraDeAcesso';

export function Entrar() {
  const { pronto, usuario, entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);

  if (!pronto) return <p className="carregando">Carregando…</p>;
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
    <MolduraDeAcesso titulo="Entrar na sua conta" subtitulo="Continue de onde você parou.">
      <form className="acesso-campos" onSubmit={enviar} noValidate>
        <label>
          E-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <CampoSenha
          rotulo="Senha"
          valor={senha}
          onMudar={setSenha}
          autoComplete="current-password"
          visivel={verSenha}
          onAlternar={() => setVerSenha((v) => !v)}
        />
        {erro && (
          <p className="erro-texto" role="alert">
            {erro}
          </p>
        )}
        <button type="submit" className="botao largo" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="acesso-troca">
          Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
        </p>
      </form>
    </MolduraDeAcesso>
  );
}
