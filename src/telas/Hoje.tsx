import { Link } from 'react-router-dom';
import { useContexto } from '../dados/armazenamento';
import {
  diasEntre,
  marcarEstudado,
  classificarPrazo,
  proximoPasso,
  registroInicial,
  semanaDoCronograma,
  sequenciaDias,
  type Estado,
  type ItemHoje,
} from '../domain/regras';

const ROTULOS_ESTADO: Record<Estado, string> = {
  novo: 'Novo',
  estudado: 'Estudado',
  reforco: 'Reforço',
  consolidacao: 'Consolidação',
  liberado: 'Liberado',
};

function Prazo({ rotulo, data, hoje }: { rotulo: string; data?: string; hoje: string }) {
  if (!data) return null;
  const { dias, nivel } = classificarPrazo(data, hoje);
  const texto = nivel === 'passou' ? 'encerrado' : dias === 0 ? 'é hoje' : `faltam ${dias} dias`;
  return (
    <div className={`prazo prazo-${nivel}`}>
      <span className="prazo-rotulo">{rotulo}</span>
      <strong>{texto}</strong>
      <small>{data.split('-').reverse().join('/')}</small>
    </div>
  );
}

export function Hoje() {
  const { dados, atualizar, edital, hoje } = useContexto();
  const perfil = dados.perfil!;
  const semana = semanaDoCronograma(perfil.criadoEm, hoje);
  const fila = proximoPasso({
    topicos: edital.topicos,
    registros: dados.registros,
    hoje,
    semana,
    horasDia: perfil.horasDia,
  });
  const diasAteProva = diasEntre(hoje, perfil.dataProva);
  const sequencia = sequenciaDias(dados.sessoes.map((s) => s.data), hoje);
  const liberados = edital.topicos.filter((t) => dados.registros[t.id]?.estado === 'liberado').length;
  const topicosDaSemana = edital.topicos.filter((t) => t.semana === semana);

  const titulo = (id?: string) => edital.topicos.find((t) => t.id === id)?.titulo ?? '';

  function marcar(topicoId: string) {
    atualizar((d) => ({
      ...d,
      registros: {
        ...d.registros,
        [topicoId]: marcarEstudado(d.registros[topicoId] ?? registroInicial(), hoje),
      },
      sessoes: [...d.sessoes, { data: hoje, topicoId }],
    }));
  }

  // "A tela Hoje nunca fica vazia": sugere o assunto com menor nota.
  const menorNota = edital.topicos
    .map((t) => ({ t, nota: dados.registros[t.id]?.ultimaNota }))
    .filter((x): x is { t: typeof x.t; nota: number } => typeof x.nota === 'number')
    .sort((a, b) => a.nota - b.nota)[0];

  return (
    <section className="painel">
      <header className="cabecalho">
        <p className="saudacao">{perfil.nome ? `Oi, ${perfil.nome}` : 'Bom estudo'}</p>
        <h1>Hoje</h1>
        <div className="estatisticas">
          <div><strong>{diasAteProva}</strong><span>dias até a prova</span></div>
          <div><strong>{semana}</strong><span>semana</span></div>
          <div><strong>{sequencia}</strong><span>dia(s) seguidos</span></div>
        </div>
        {edital.topicos.length > 0 && (
          <>
            <div className="progresso" aria-label="Assuntos liberados">
              <div style={{ width: `${Math.round((liberados / edital.topicos.length) * 100)}%` }} />
            </div>
            <p className="suave">
              {liberados} de {edital.topicos.length} assuntos liberados
            </p>
          </>
        )}
      </header>

      {edital.topicos.length === 0 && (
        <p className="aviso">
          Este concurso ainda não tem assuntos cadastrados. Quando o edital for preenchido, o cronograma aparece aqui.
        </p>
      )}

      <div className="grade-prazos">
        <Prazo rotulo="Inscrições terminam" data={edital.inscricaoFim} hoje={hoje} />
        <Prazo rotulo="Prova" data={perfil.dataProva} hoje={hoje} />
      </div>

      <div className="painel-grade">
        <div className="cartao">
          <h2>Próximos passos</h2>
          {fila.length === 0 && (
            <>
              <p className="suave">Nada pendente para hoje.</p>
              {menorNota && (
                <Link className="botao" to={`/simulado?revisao=${menorNota.t.id}`}>
                  Fazer questões de “{menorNota.t.titulo}” (nota {menorNota.nota}%)
                </Link>
              )}
            </>
          )}
          <ul className="lista">
            {fila.map((item: ItemHoje, i) => (
              <li key={`${item.tipo}-${item.topicoId ?? i}`} className={`item tipo-${item.tipo}`}>
                <div>
                  <strong>{rotulo(item.tipo)}</strong>
                  <div>{item.topicoId ? titulo(item.topicoId) : item.titulo}</div>
                  {item.minutos > 0 && <small className="suave">~{item.minutos} min</small>}
                </div>
                {item.tipo === 'revisao' && (
                  <Link className="botao pequeno" to={`/simulado?revisao=${item.topicoId}`}>
                    Revisar
                  </Link>
                )}
                {(item.tipo === 'novo' || item.tipo === 'reforco') && (
                  <button className="botao pequeno" onClick={() => marcar(item.topicoId!)}>
                    Marcar como estudado
                  </button>
                )}
                {item.tipo === 'mini' && (
                  <Link className="botao pequeno" to="/simulado?tipo=mini">
                    Começar
                  </Link>
                )}
                {item.tipo === 'geral' && (
                  <Link className="botao pequeno" to="/simulado?tipo=geral">
                    Começar
                  </Link>
                )}
                {item.tipo === 'analise' && (
                  <Link className="botao pequeno" to="/analise">
                    Abrir
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="cartao">
          <div className="topo">
            <h2>Cronograma · semana {semana}</h2>
            <Link className="botao pequeno" to="/cronograma">
              Ver tudo
            </Link>
          </div>
          {topicosDaSemana.length === 0 ? (
            <p className="suave">Nenhum assunto programado para a semana {semana}.</p>
          ) : (
            <ul className="lista">
              {topicosDaSemana.map((t) => {
                const estado = dados.registros[t.id]?.estado ?? 'novo';
                return (
                  <li key={t.id} className={`item estado-${estado}`}>
                    <div>
                      <strong>{t.titulo}</strong>
                      <div className="suave">{t.disciplina}</div>
                    </div>
                    <span className="chip">{ROTULOS_ESTADO[estado]}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function rotulo(tipo: ItemHoje['tipo']): string {
  return {
    revisao: 'Revisão',
    reforco: 'Reforço',
    novo: 'Assunto novo',
    mini: 'Mini-simulado',
    geral: 'Simulado geral',
    analise: 'Análise',
  }[tipo];
}
