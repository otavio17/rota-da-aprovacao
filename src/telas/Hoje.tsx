import { Link } from 'react-router-dom';
import { useContexto } from '../dados/armazenamento';
import {
  diasEntre,
  marcarEstudado,
  proximoPasso,
  registroInicial,
  semanaDoCronograma,
  sequenciaDias,
  type ItemHoje,
} from '../domain/regras';

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
    <section>
      <header className="topo">
        <h1>Hoje</h1>
        <p className="suave">
          {diasAteProva} dias até a prova · semana {semana} · {sequencia} dia(s) seguido(s)
        </p>
      </header>

      {fila.length === 0 && (
        <div className="cartao">
          <p>Nada pendente para hoje.</p>
          {menorNota && (
            <Link className="botao" to={`/simulado?revisao=${menorNota.t.id}`}>
              Fazer questões de “{menorNota.t.titulo}” (nota {menorNota.nota}%)
            </Link>
          )}
        </div>
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
