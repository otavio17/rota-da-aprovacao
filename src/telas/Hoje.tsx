import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useContexto } from '../dados/armazenamento';
import { Anel, Contador, SemanaDeEstudo, soltarConfete } from './Animados';
import {
  diasEntre,
  marcarEstudado,
  classificarPrazo,
  proximoPasso,
  registroInicial,
  semanaDoCronograma,
  sequenciaDias,
  somarDias,
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

  const pctLiberado = edital.topicos.length ? Math.round((liberados / edital.topicos.length) * 100) : 0;
  const datasDeEstudo = dados.sessoes.map((s) => s.data);
  const chamada =
    sequencia >= 2
      ? `${sequencia} dias seguidos de estudo. Continue a sequência.`
      : sequencia === 1
        ? 'Sequência começada. Um assunto por dia mantém o ritmo.'
        : 'Um assunto hoje já começa a sua sequência.';

  // Assuntos estudados por dia nos últimos 14 dias.
  const ritmo = Array.from({ length: 14 }, (_, i) => {
    const data = somarDias(hoje, i - 13);
    return { dia: data.slice(8, 10) + '/' + data.slice(5, 7), assuntos: datasDeEstudo.filter((d) => d === data).length };
  });
  const temRitmo = ritmo.some((r) => r.assuntos > 0);

  function marcar(topicoId: string, evento: MouseEvent<HTMLButtonElement>) {
    const caixa = evento.currentTarget.getBoundingClientRect();
    soltarConfete(caixa.left + caixa.width / 2, caixa.top);
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
      <header className="heroi">
        <div className="heroi-texto">
          <p className="saudacao">{perfil.nome ? `Oi, ${perfil.nome}` : 'Bom estudo'}</p>
          <h1>{chamada}</h1>
          <SemanaDeEstudo datas={datasDeEstudo} hoje={hoje} />
        </div>
        {edital.topicos.length > 0 && <Anel pct={pctLiberado} legenda="do edital liberado" />}
        <div className="heroi-numeros">
          <div>
            <strong><Contador valor={diasAteProva} /></strong>
            <span>dias até a prova</span>
          </div>
          <div>
            <strong><Contador valor={semana} /></strong>
            <span>semana do cronograma</span>
          </div>
          <div>
            <strong><Contador valor={sequencia} /></strong>
            <span>dia(s) seguidos</span>
          </div>
          <div>
            <strong>
              <Contador valor={liberados} />
              <small> de {edital.topicos.length}</small>
            </strong>
            <span>assuntos liberados</span>
          </div>
        </div>
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
        <div className="cartao ocupa-tudo">
          <h2>Seu ritmo nos últimos 14 dias</h2>
          {temRitmo ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={ritmo} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="ritmo-cor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#ececf6" />
                <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: 'rgba(79, 70, 229, 0.06)' }} />
                <Bar dataKey="assuntos" name="Assuntos estudados" fill="url(#ritmo-cor)" radius={[8, 8, 8, 8]} maxBarSize={26} animationDuration={1100} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="suave">Marque um assunto como estudado e o gráfico começa a subir.</p>
          )}
        </div>

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
                  <button className="botao pequeno" onClick={(e) => marcar(item.topicoId!, e)}>
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
