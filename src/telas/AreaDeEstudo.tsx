import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth, type UsuarioApp } from '../auth/AuthContext';
import {
  Contexto,
  carregarJson,
  dadosVazios,
  hojeLocal,
  type ComparacaoItem,
  type ContextoValor,
} from '../dados/armazenamento';
import { useProgresso, type EstadoSalvamento } from '../dados/useProgresso';
import type { Concurso, Dados, Edital, Perfil, Questao } from '../domain/regras';
import { Marca } from './MolduraDeAcesso';
import { Onboarding } from './Onboarding';
import { Trocador } from './Trocador';

interface Carregado {
  id: string;
  edital: Edital;
  questoes: Questao[];
}

// Só mostra o estudo depois de confirmar quem está logado.
export function AreaDeEstudo() {
  const { pronto, usuario } = useAuth();
  if (!pronto) return <p className="aviso">Carregando…</p>;
  if (!usuario) return <Navigate to="/entrar" replace />;
  return <EstudoDaConta key={usuario.uid} usuario={usuario} />;
}

function EstudoDaConta({ usuario }: { usuario: UsuarioApp }) {
  const { ehAdmin, sair } = useAuth();
  const progresso = useProgresso(usuario.uid);
  const { armazem, alterar } = progresso;
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [erroCatalogo, setErroCatalogo] = useState<string | null>(null);
  const [carregado, setCarregado] = useState<Carregado | null>(null);
  const [erroEdital, setErroEdital] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const hoje = hojeLocal();

  const ativo = armazem?.ativo ?? null;
  const dados: Dados | null = ativo && armazem ? armazem.concursos[ativo] ?? null : null;
  const adicionados = armazem ? Object.keys(armazem.concursos) : [];

  // Atualiza só o concurso em foco.
  const atualizar = useCallback(
    (fn: (d: Dados) => Dados) => {
      alterar((a) => {
        if (!a.ativo || !a.concursos[a.ativo]) return a;
        return { ...a, concursos: { ...a.concursos, [a.ativo]: fn(a.concursos[a.ativo]) } };
      });
    },
    [alterar],
  );

  useEffect(() => {
    carregarJson<Concurso[]>('concursos.json')
      .then(setConcursos)
      .catch((e) => setErroCatalogo(String(e)));
  }, []);

  // Carrega edital e questões só do concurso em foco.
  const pasta = concursos.find((c) => c.id === ativo)?.pasta;
  useEffect(() => {
    if (!ativo || !pasta) return;
    let cancelado = false;
    Promise.all([
      carregarJson<Edital>(`${pasta}/edital.json`),
      carregarJson<Questao[]>(`${pasta}/questoes.json`),
    ])
      .then(([edital, questoes]) => {
        if (!cancelado) setCarregado({ id: ativo, edital, questoes });
      })
      .catch((e) => {
        if (!cancelado) setErroEdital(String(e));
      });
    return () => {
      cancelado = true;
    };
  }, [ativo, pasta]);

  const comparativo = useMemo<ComparacaoItem[]>(
    () =>
      armazem
        ? Object.entries(armazem.concursos).map(([id, d]) => ({
            id,
            nome: concursos.find((c) => c.id === id)?.nome ?? id,
            simulados: d.simulados,
          }))
        : [],
    [armazem, concursos],
  );

  const valor = useMemo<ContextoValor | null>(
    () =>
      dados && carregado && carregado.id === ativo
        ? { dados, atualizar, edital: carregado.edital, questoes: carregado.questoes, hoje, comparativo }
        : null,
    [dados, atualizar, carregado, ativo, hoje, comparativo],
  );

  function adicionarConcurso(perfil: Perfil) {
    alterar((a) => ({
      ativo: perfil.concursoId,
      concursos: { ...a.concursos, [perfil.concursoId]: { ...dadosVazios(), perfil } },
    }));
    setAdicionando(false);
  }

  function trocar(id: string) {
    alterar((a) => ({ ...a, ativo: id }));
    setAdicionando(false);
  }

  async function sairDaConta() {
    progresso.enviarAgora(); // o que ainda estava na espera vai para a nuvem antes de a sessão acabar
    await sair();
  }

  if (progresso.erroCarga) {
    return (
      <main className="conteudo">
        <section className="painel">
          <p className="aviso">Não foi possível carregar o seu progresso. {progresso.erroCarga}</p>
          <div className="conta-acoes">
            <button type="button" className="botao" onClick={progresso.tentarDeNovo}>
              Tentar de novo
            </button>
            <button type="button" className="botao secundario" onClick={() => void sairDaConta()}>
              Sair
            </button>
          </div>
        </section>
      </main>
    );
  }
  if (erroCatalogo) return <p className="aviso">Erro ao carregar: {erroCatalogo}</p>;
  if (erroEdital) return <p className="aviso">Erro ao carregar: {erroEdital}</p>;
  if (!armazem || concursos.length === 0) return <p className="aviso">Carregando…</p>;

  const barra = (
    <BarraDaConta
      nome={usuario.nome}
      ehAdmin={ehAdmin}
      estado={progresso.estado}
      onSair={() => void sairDaConta()}
    />
  );

  if (!dados || adicionando) {
    return (
      <Onboarding
        topo={barra}
        concursos={concursos}
        jaAdicionados={adicionados}
        podeCancelar={adicionados.length > 0}
        onSalvar={adicionarConcurso}
        onCancelar={() => setAdicionando(false)}
      />
    );
  }
  if (!valor) return <p className="aviso">Carregando…</p>;

  return (
    <Contexto.Provider value={valor}>
      <main className="conteudo" key={ativo ?? ''}>
        {barra}
        <Trocador
          concursos={concursos}
          ativos={adicionados}
          ativo={ativo ?? ''}
          onTrocar={trocar}
          onAdicionar={() => setAdicionando(true)}
        />
        <Outlet />
      </main>
      <nav className="navegacao">
        <Marca />
        <NavLink to="/hoje">Hoje</NavLink>
        <NavLink to="/cronograma">Cronograma</NavLink>
        <NavLink to="/simulado">Simulado</NavLink>
        <NavLink to="/analise">Análise</NavLink>
        <NavLink to="/erros">Erros</NavLink>
      </nav>
    </Contexto.Provider>
  );
}

function BarraDaConta({
  nome,
  ehAdmin,
  estado,
  onSair,
}: {
  nome: string;
  ehAdmin: boolean;
  estado: EstadoSalvamento;
  onSair: () => void;
}) {
  const situacao =
    estado === 'erro'
      ? 'não foi possível salvar'
      : estado === 'salvando'
        ? navigator.onLine
          ? 'salvando…'
          : 'sem conexão: envia quando voltar'
        : 'progresso salvo';
  return (
    <div className="conta">
      <span>
        Olá, <strong>{nome}</strong> <span className="suave">· {situacao}</span>
      </span>
      <span className="conta-acoes">
        {ehAdmin && (
          <Link className="botao pequeno secundario" to="/admin">
            Usuários
          </Link>
        )}
        <button type="button" className="botao pequeno secundario" onClick={onSair}>
          Sair
        </button>
      </span>
    </div>
  );
}
