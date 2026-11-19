import type { ReactNode } from 'react';
import { RotaAnimada } from './RotaAnimada';

export function Marca({ clara = false }: { clara?: boolean }) {
  return (
    <span className={clara ? 'marca clara' : 'marca'}>
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="9" className="marca-fundo" />
        <path d="M8 23 C 15 23 17 19 16 16 C 15 12 19 9 24 9" className="marca-rota" />
        <circle cx="24" cy="9" r="3" className="marca-chegada" />
      </svg>
      Rota da Aprovação
    </span>
  );
}

/** Moldura das telas de entrar e de cadastro: painel com a rota à esquerda, formulário à direita. */
export function MolduraDeAcesso({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <div className="acesso">
      <aside className="acesso-painel">
        <Marca clara />
        <p className="acesso-chamada">Do edital à aprovação, um dia de estudo por vez.</p>
        <RotaAnimada />
      </aside>
      <main className="acesso-form">
        <div className="acesso-caixa">
          <h1>{titulo}</h1>
          <p className="acesso-sub">{subtitulo}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

/** Campo de senha com botão para mostrar ou esconder o que foi digitado. */
export function CampoSenha({
  rotulo,
  valor,
  onMudar,
  autoComplete,
  visivel,
  onAlternar,
}: {
  rotulo: string;
  valor: string;
  onMudar: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  visivel: boolean;
  onAlternar: () => void;
}) {
  return (
    <div className="campo-senha">
      <label>
        {rotulo}
        <input
          type={visivel ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={valor}
          onChange={(e) => onMudar(e.target.value)}
        />
      </label>
      <button type="button" className="ver-senha" onClick={onAlternar} aria-pressed={visivel}>
        {visivel ? 'Esconder' : 'Mostrar'}
      </button>
    </div>
  );
}
