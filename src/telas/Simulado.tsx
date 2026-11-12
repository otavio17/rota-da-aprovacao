import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useContexto } from '../dados/armazenamento';
import {
  MINI_QUESTOES,
  aplicarSimulado,
  montarGeral,
  montarMini,
  montarRevisao,
  pontuar,
  semanaDoCronograma,
  type Questao,
  type Resposta,
  type Simulado as SimuladoRegistro,
  type TipoSimulado,
} from '../domain/regras';

interface Preparado {
  tipo: TipoSimulado;
  topicoId?: string;
  questoes: Questao[];
  avisos: string[];
  inicio: number;
  limiteSeg: number | null;
}

interface Concluido {
  sim: SimuladoRegistro;
  questoes: Questao[];
}

const LETRAS = ['a', 'b', 'c', 'd', 'e'];

function formatar(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function Simulado() {
  const { dados, atualizar, edital, questoes, hoje } = useContexto();
  const [params] = useSearchParams();
  const revisaoId = params.get('revisao');
  const tipoParam = params.get('tipo');

  const [preparado, setPreparado] = useState<Preparado | null>(null);
  const [concluido, setConcluido] = useState<Concluido | null>(null);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  const [atual, setAtual] = useState(0);
  const [agora, setAgora] = useState(Date.now());
  const [mensagem, setMensagem] = useState<string | null>(null);

  const emAndamento = preparado !== null && concluido === null;

  useEffect(() => {
    if (!emAndamento) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [emAndamento]);

  // Links da tela Hoje e do Caderno de erros entram direto no simulado.
  useEffect(() => {
    if (revisaoId) iniciar('revisao', revisaoId);
    else if (tipoParam === 'mini' || tipoParam === 'geral') iniciar(tipoParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restanteSeg =
    preparado && preparado.limiteSeg !== null ? preparado.limiteSeg - (agora - preparado.inicio) / 1000 : null;

  // Tempo esgotado: finaliza sozinho.
  useEffect(() => {
    if (emAndamento && restanteSeg !== null && restanteSeg <= 0) finalizar();
  });

  const nomeBloco = (id: string) => edital.blocos.find((b) => b.id === id)?.nome ?? id;
  const titulo = (id: string) => edital.topicos.find((t) => t.id === id)?.titulo ?? id;
  const blocoDoTopico = (id: string) => edital.topicos.find((t) => t.id === id)?.bloco ?? '';

  function iniciar(tipo: TipoSimulado, topicoId?: string) {
    const rng = Math.random;
    const semana = semanaDoCronograma(dados.perfil!.criadoEm, hoje);
    const emReforco = edital.topicos
      .filter((t) => {
        const estado = dados.registros[t.id]?.estado;
        return estado === 'reforco' || estado === 'consolidacao';
      })
      .map((t) => t.id);

    let lista: Questao[] = [];
    const avisos: string[] = [];
    let limiteSeg: number | null = null;

    if (tipo === 'mini') {
      const r = montarMini({
        questoes,
        topicosSemana: edital.topicos.filter((t) => t.semana === semana).map((t) => t.id),
        topicosReforco: emReforco,
        vistas: dados.vistas,
        hoje,
        rng,
      });
      lista = r.questoes;
      if (r.faltam > 0) avisos.push(`Faltam ${r.faltam} de ${MINI_QUESTOES} questões: o banco ainda é pequeno.`);
      limiteSeg = lista.length * 90;
    } else if (tipo === 'geral') {
      if (edital.blocos.length === 0) {
        setMensagem('Este concurso ainda não tem blocos cadastrados no edital.');
        return;
      }
      const r = montarGeral({ edital, questoes, vistas: dados.vistas, hoje, rng });
      lista = r.questoes;
      for (const f of r.faltas) avisos.push(`Bloco ${nomeBloco(f.bloco)}: faltam ${f.faltam} questões.`);
      if (lista.length > 0 && edital.questoesProva > 0) {
        limiteSeg = (edital.duracaoMin * 60 * lista.length) / edital.questoesProva;
      }
    } else {
      const r = montarRevisao({ questoes, topicoId: topicoId!, vistas: dados.vistas, hoje, rng });
      lista = r.questoes;
      if (r.faltam > 0) avisos.push(`Faltam ${r.faltam} questões neste assunto.`);
    }

    if (lista.length === 0) {
      setMensagem('Não há questões disponíveis para montar este simulado. Veja os avisos do banco.');
      return;
    }
    setMensagem(null);
    setPreparado({ tipo, topicoId, questoes: lista, avisos, inicio: Date.now(), limiteSeg });
    setConcluido(null);
    setRespostas({});
    setMarcadas(new Set());
    setAtual(0);
    setAgora(Date.now());
  }

  function finalizar() {
    if (!preparado) return;
    const resp: Resposta[] = preparado.questoes.map((q, i) => {
      const marcada = respostas[i] ?? null;
      return {
        questaoId: q.id,
        topicoId: q.topico,
        blocoId: blocoDoTopico(q.topico),
        marcada,
        correta: marcada === q.correta,
      };
    });
    const acertos = resp.filter((r) => r.correta).length;
    const sim: SimuladoRegistro = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      tipo: preparado.tipo,
      data: hoje,
      topicoId: preparado.topicoId,
      respostas: resp,
      acertos,
      total: resp.length,
      pct: Math.round((acertos / resp.length) * 100),
    };
    atualizar((d) => aplicarSimulado(d, sim, hoje));
    setConcluido({ sim, questoes: preparado.questoes });
  }

  function sair() {
    setPreparado(null);
    setConcluido(null);
  }

  // ---------- resultado ----------
  if (concluido) {
    const p = pontuar(concluido.sim.respostas, edital);
    return (
      <section>
        <header className="topo">
          <h1>Resultado</h1>
          <p className="suave">
            {concluido.sim.tipo === 'revisao' ? 'Revisão' : concluido.sim.tipo === 'geral' ? 'Simulado geral' : 'Mini-simulado'}
            {concluido.sim.topicoId && ` · ${titulo(concluido.sim.topicoId)}`}
          </p>
        </header>
        <div className="cartao">
          <p className="grande">{p.pctGeral}%</p>
          <p>
            {p.acertos} de {p.total} questões
          </p>
          {edital.blocos.length > 0 && (
            <ul className="lista">
              {p.porBloco.map((b) => (
                <li key={b.bloco} className="item">
                  <span>{b.nome}</span>
                  <span>
                    {b.pct}% (mínimo {b.minimo}%) {b.ok ? '✓' : '✗'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {p.eliminado && (
            <p className="aviso">Abaixo do mínimo eliminatório em pelo menos um bloco.</p>
          )}
          <p className="suave">Os erros foram para o Caderno de erros, onde você marca o motivo.</p>
        </div>

        <h2>Correção comentada</h2>
        {concluido.questoes.map((q, i) => {
          const r = concluido.sim.respostas[i];
          return (
            <article key={q.id} className={`cartao ${r.correta ? 'acerto' : 'erro'}`}>
              <p className="suave">
                {r.correta ? 'Acertou' : r.marcada === null ? 'Não respondeu' : 'Errou'} · {titulo(q.topico)}
              </p>
              <p>{q.enunciado}</p>
              <ol type="a" className="alternativas-fixas">
                {q.alternativas.map((alt, k) => (
                  <li key={k} className={k === q.correta ? 'correta' : k === r.marcada ? 'errada' : ''}>
                    {alt}
                  </li>
                ))}
              </ol>
              <p>{q.comentario}</p>
              {q.referencia && <p className="suave">Referência: {q.referencia}</p>}
              {q.video ? (
                <a href={q.video} target="_blank" rel="noreferrer">
                  Vídeo sugerido
                </a>
              ) : (
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(titulo(q.topico) + ' resumo')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buscar vídeo sobre o assunto
                </a>
              )}
            </article>
          );
        })}
        <button className="botao" onClick={sair}>
          Voltar ao início
        </button>
      </section>
    );
  }

  // ---------- andamento ----------
  if (preparado) {
    const n = preparado.questoes.length;
    const q = preparado.questoes[atual];
    return (
      <section>
        <header className="topo">
          <span>
            Questão {atual + 1} de {n}
          </span>
          {restanteSeg !== null && <span className="cronometro">{formatar(restanteSeg)}</span>}
        </header>
        {preparado.avisos.map((a) => (
          <p key={a} className="aviso">
            {a}
          </p>
        ))}
        <article className="cartao">
          <p className="suave">
            {q.disciplina} · {titulo(q.topico)}
          </p>
          <p className="enunciado">{q.enunciado}</p>
          <div className="alternativas">
            {q.alternativas.map((alt, i) => (
              <button
                key={i}
                className={`alternativa ${respostas[atual] === i ? 'escolhida' : ''}`}
                onClick={() => setRespostas({ ...respostas, [atual]: i })}
              >
                <b>{LETRAS[i]})</b> {alt}
              </button>
            ))}
          </div>
          <label className="marcar">
            <input
              type="checkbox"
              checked={marcadas.has(atual)}
              onChange={(e) => {
                const novo = new Set(marcadas);
                if (e.target.checked) novo.add(atual);
                else novo.delete(atual);
                setMarcadas(novo);
              }}
            />{' '}
            Marcar para rever
          </label>
        </article>
        <div className="mapa">
          {preparado.questoes.map((_, i) => (
            <button
              key={i}
              className={`mapa-item ${respostas[i] !== undefined ? 'respondida' : ''} ${marcadas.has(i) ? 'marcada' : ''} ${i === atual ? 'atual' : ''}`}
              onClick={() => setAtual(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className="acoes">
          <button disabled={atual === 0} onClick={() => setAtual(atual - 1)}>
            Anterior
          </button>
          <button disabled={atual === n - 1} onClick={() => setAtual(atual + 1)}>
            Pular / próxima
          </button>
          <button
            className="botao"
            onClick={() => {
              if (window.confirm('Finalizar agora? Questões não respondidas contam como erro.')) finalizar();
            }}
          >
            Finalizar
          </button>
        </div>
      </section>
    );
  }

  // ---------- início ----------
  return (
    <section>
      <header className="topo">
        <h1>Simulado</h1>
      </header>
      {mensagem && <p className="aviso">{mensagem}</p>}
      <div className="cartao">
        <h2>Mini-simulado</h2>
        <p>
          {MINI_QUESTOES} questões: 70% do assunto da semana e 30% de reforço. Tempo de 1,5 min por questão.
        </p>
        <button className="botao" onClick={() => iniciar('mini')}>
          Começar mini-simulado
        </button>
      </div>
      <div className="cartao">
        <h2>Simulado geral</h2>
        <p>
          Todos os blocos do edital, na proporção da prova, incluindo assuntos ainda não estudados.
          {edital.questoesProva > 0 && ` Tempo de ${edital.duracaoMin} min para ${edital.questoesProva} questões.`}
        </p>
        <button className="botao" onClick={() => iniciar('geral')}>
          Começar simulado geral
        </button>
      </div>
      <p className="suave">
        Revisões por assunto começam pela tela Hoje. <Link to="/hoje">Ir para Hoje</Link>
      </p>
    </section>
  );
}
