import { useCallback, useEffect, useMemo, useState } from 'react';
import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import {
  Contexto,
  carregarJson,
  gravarDados,
  hojeLocal,
  lerDados,
  type ContextoValor,
} from './dados/armazenamento';
import type { Concurso, Dados, Edital, Questao } from './domain/regras';
import { Onboarding } from './telas/Onboarding';
import { Hoje } from './telas/Hoje';
import { Cronograma } from './telas/Cronograma';
import { Simulado } from './telas/Simulado';
import { Analise } from './telas/Analise';
import { Erros } from './telas/Erros';

export default function App() {
  const [dados, setDados] = useState<Dados>(lerDados);
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [edital, setEdital] = useState<Edital | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const hoje = hojeLocal();

  const atualizar = useCallback((fn: (d: Dados) => Dados) => setDados((d) => fn(d)), []);

  useEffect(() => {
    gravarDados(dados);
  }, [dados]);

  useEffect(() => {
    carregarJson<Concurso[]>('concursos.json').then(setConcursos).catch((e) => setErro(String(e)));
  }, []);

  const pasta = dados.perfil?.pasta;
  useEffect(() => {
    if (!pasta) {
      setEdital(null);
      setQuestoes([]);
      return;
    }
    Promise.all([
      carregarJson<Edital>(`${pasta}/edital.json`),
      carregarJson<Questao[]>(`${pasta}/questoes.json`),
    ])
      .then(([e, q]) => {
        setEdital(e);
        setQuestoes(q);
      })
      .catch((e) => setErro(String(e)));
  }, [pasta]);

  const valor = useMemo<ContextoValor | null>(
    () => (edital ? { dados, atualizar, edital, questoes, hoje } : null),
    [dados, atualizar, edital, questoes, hoje],
  );

  if (erro) return <p className="aviso">Erro ao carregar: {erro}</p>;

  if (!dados.perfil) {
    return <Onboarding concursos={concursos} atualizar={atualizar} />;
  }
  if (!valor) return <p className="aviso">Carregando…</p>;

  return (
    <Contexto.Provider value={valor}>
      <HashRouter>
        <main className="conteudo">
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
