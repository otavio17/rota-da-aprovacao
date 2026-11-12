import { useCallback, useEffect, useMemo, useState } from 'react';
import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import {
  Contexto,
  carregarJson,
  dadosVazios,
  gravarArmazem,
  hojeLocal,
  lerArmazem,
  type Armazem,
  type ComparacaoItem,
  type ContextoValor,
} from './dados/armazenamento';
import type { Concurso, Dados, Edital, Perfil, Questao } from './domain/regras';
import { Onboarding } from './telas/Onboarding';
import { Trocador } from './telas/Trocador';
import { Hoje } from './telas/Hoje';
import { Cronograma } from './telas/Cronograma';
import { Simulado } from './telas/Simulado';
import { Analise } from './telas/Analise';
import { Erros } from './telas/Erros';

interface Carregado {
  id: string;
  edital: Edital;
  questoes: Questao[];
}

export default function App() {
  const [armazem, setArmazem] = useState<Armazem>(lerArmazem);
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [carregado, setCarregado] = useState<Carregado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const hoje = hojeLocal();

  const ativo = armazem.ativo;
  const dados: Dados | null = ativo ? armazem.concursos[ativo] ?? null : null;
  const adicionados = Object.keys(armazem.concursos);

  // Atualiza só o concurso em foco.
  const atualizar = useCallback((fn: (d: Dados) => Dados) => {
    setArmazem((a) => {
      if (!a.ativo || !a.concursos[a.ativo]) return a;
      return { ...a, concursos: { ...a.concursos, [a.ativo]: fn(a.concursos[a.ativo]) } };
    });
  }, []);

  useEffect(() => {
    gravarArmazem(armazem);
  }, [armazem]);

  useEffect(() => {
    carregarJson<Concurso[]>('concursos.json').then(setConcursos).catch((e) => setErro(String(e)));
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
        if (!cancelado) setErro(String(e));
      });
    return () => {
      cancelado = true;
    };
  }, [ativo, pasta]);

  const comparativo = useMemo<ComparacaoItem[]>(
    () =>
      Object.entries(armazem.concursos).map(([id, d]) => ({
        id,
        nome: concursos.find((c) => c.id === id)?.nome ?? id,
        simulados: d.simulados,
      })),
    [armazem.concursos, concursos],
  );

  const valor = useMemo<ContextoValor | null>(
    () =>
      dados && carregado && carregado.id === ativo
        ? { dados, atualizar, edital: carregado.edital, questoes: carregado.questoes, hoje, comparativo }
        : null,
    [dados, atualizar, carregado, ativo, hoje, comparativo],
  );

  function adicionarConcurso(perfil: Perfil) {
    setArmazem((a) => ({
      ativo: perfil.concursoId,
      concursos: { ...a.concursos, [perfil.concursoId]: { ...dadosVazios(), perfil } },
    }));
    setAdicionando(false);
  }

  function trocar(id: string) {
    setArmazem((a) => ({ ...a, ativo: id }));
    setAdicionando(false);
  }

  if (erro) return <p className="aviso">Erro ao carregar: {erro}</p>;
  if (concursos.length === 0) return <p className="aviso">Carregando…</p>;

  if (!dados || adicionando) {
    return (
      <Onboarding
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
      <HashRouter>
        {/* key: ao trocar de concurso, as telas são remontadas e nada de um concurso vaza para outro */}
        <main className="conteudo" key={ativo ?? ''}>
          <Trocador
            concursos={concursos}
            ativos={adicionados}
            ativo={ativo ?? ''}
            onTrocar={trocar}
            onAdicionar={() => setAdicionando(true)}
          />
          <Routes>
            <Route path="/hoje" element={<Hoje />} />
            <Route path="/cronograma" element={<Cronograma />} />
            <Route path="/simulado" element={<Simulado />} />
            <Route path="/analise" element={<Analise />} />
            <Route path="/erros" element={<Erros />} />
            <Route path="*" element={<Navigate to="/hoje" replace />} />
          </Routes>
        </main>
        <nav className="navegacao">
          <NavLink to="/hoje">Hoje</NavLink>
          <NavLink to="/cronograma">Cronograma</NavLink>
          <NavLink to="/simulado">Simulado</NavLink>
          <NavLink to="/analise">Análise</NavLink>
          <NavLink to="/erros">Erros</NavLink>
        </nav>
      </HashRouter>
    </Contexto.Provider>
  );
}
