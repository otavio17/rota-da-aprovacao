import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useContexto, type ComparacaoItem } from '../dados/armazenamento';
import { Contador } from './Animados';
import { diasEntre, pontuar, prioridades, type Resposta, type Topico } from '../domain/regras';

const CORES = ['#4f46e5', '#e11d48'];
const GRADE = '#ececf6';
const EIXO = { fontSize: 12, fill: '#64748b' };

// A nota de conteúdo entre parênteses deixa os nomes longos demais para os gráficos
function tituloCurto(titulo: string): string {
  return titulo.replace(/\s*\([^)]*\)/g, '').trim();
}

export function Analise() {
  const { dados, edital, hoje, comparativo } = useContexto();
  const idAtivo = dados.perfil!.concursoId;
  const [selecionados, setSelecionados] = useState<string[]>([idAtivo]);

  // Compara um ou dois concursos. Ao escolher um terceiro, sai o mais antigo da seleção.
  function alternar(id: string) {
    setSelecionados((s) => {
      if (s.includes(id)) return s.length > 1 ? s.filter((x) => x !== id) : s;
      return [...s, id].slice(-2);
    });
  }

  const series = selecionados
    .map((id) => comparativo.find((c) => c.id === id))
    .filter((s): s is ComparacaoItem => s !== undefined);
  const gerais = series.map((s) => s.simulados.filter((x) => x.tipo === 'geral'));
  const tamanho = Math.max(0, ...gerais.map((g) => g.length));
  const evolucao = Array.from({ length: tamanho }, (_, i) => {
    const linha: Record<string, string | number | null> = { nome: `${i + 1}º` };
    gerais.forEach((g, k) => {
      linha[`s${k}`] = g[i]?.pct ?? null;
    });
    return linha;
  });

  // Detalhes: sempre do concurso em foco.
  const ultimo = dados.simulados.at(-1);
  const porBloco = ultimo && edital.blocos.length > 0 ? pontuar(ultimo.respostas, edital).porBloco : [];

  const recentes: Resposta[] = dados.simulados
    .filter((s) => diasEntre(s.data, hoje) <= 30)
    .flatMap((s) => s.respostas);
  const forca = edital.topicos
    .map((t) => {
      const rs = recentes.filter((r) => r.topicoId === t.id);
      return {
        titulo: t.titulo,
        taxa: rs.length ? Math.round((rs.filter((r) => r.correta).length / rs.length) * 100) : 0,
        n: rs.length,
      };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => a.taxa - b.taxa);

  // Só os 8 assuntos com menor acerto. Cada barra recebe a cor da faixa do seu estado.
  const forcaGrafico = forca.slice(0, 8).map((f) => ({
    titulo: tituloCurto(f.titulo),
    reforco: f.taxa < 80 ? f.taxa : null,
    consolidacao: f.taxa >= 80 && f.taxa < 85 ? f.taxa : null,
    liberado: f.taxa >= 85 ? f.taxa : null,
  }));

  const comDados: Topico[] = edital.topicos.filter((t) => recentes.some((r) => r.topicoId === t.id));
  const prio = prioridades(comDados, recentes, 5);

  const geraisDoConcurso = dados.simulados.filter((s) => s.tipo === 'geral');
  const media = geraisDoConcurso.length
    ? Math.round(geraisDoConcurso.reduce((soma, s) => soma + s.pct, 0) / geraisDoConcurso.length)
    : null;

  return (
    <section className="painel">
      <header className="topo">
        <h1>Análise</h1>
        <p className="suave">Desempenho do concurso em foco</p>
      </header>

      <div className="kpis">
        <div className="kpi">
          <strong><Contador valor={dados.simulados.length} /></strong>
          <span>simulados feitos</span>
        </div>
        <div className="kpi">
          <strong>{media === null ? '—' : <Contador valor={media} sufixo="%" />}</strong>
          <span>média dos gerais</span>
        </div>
        <div className="kpi">
          <strong>{ultimo ? <Contador valor={ultimo.pct} sufixo="%" /> : '—'}</strong>
          <span>último simulado</span>
        </div>
        <div className="kpi">
          <strong><Contador valor={recentes.length} /></strong>
          <span>questões em 30 dias</span>
        </div>
      </div>

      <div className="cartao ocupa-tudo">
        <h2>Comparar concursos</h2>
        <p className="suave">Escolha um ou dois. Os gráficos de detalhe mostram só o concurso em foco.</p>
        <div className="trocador">
          {comparativo.map((c) => {
            const marcado = selecionados.includes(c.id);
            return (
              <button
                key={c.id}
                className={`pilula ${marcado ? 'ativa' : ''}`}
                aria-pressed={marcado}
                onClick={() => alternar(c.id)}
              >
                {c.nome.split(' — ')[0]}
              </button>
            );
          })}
        </div>
        {tamanho < 2 ? (
          <p className="suave">A evolução aparece depois de dois simulados gerais.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={evolucao} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
              <defs>
                {CORES.map((cor, k) => (
                  <linearGradient key={cor} id={`evolucao-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cor} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={cor} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke={GRADE} />
              <XAxis dataKey="nome" tickLine={false} axisLine={false} tick={EIXO} />
              <YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} tick={EIXO} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={80} stroke="#e11d48" strokeDasharray="4 4" label={{ value: 'meta 80%', position: 'insideTopLeft', fontSize: 12, fill: '#be123c' }} />
              {series.map((s, k) => (
                <Area
                  key={s.id}
                  type="monotone"
                  dataKey={`s${k}`}
                  name={s.nome.split(' — ')[0]}
                  stroke={CORES[k]}
                  strokeWidth={3}
                  fill={`url(#evolucao-${k})`}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                  animationDuration={1400}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="painel-grade">
        <div className="cartao">
          <h2>Desempenho por bloco</h2>
          <p className="suave">Último simulado com blocos cadastrados.</p>
          {porBloco.length === 0 ? (
            <p className="suave">Ainda sem simulado com blocos cadastrados.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porBloco}>
                  <CartesianGrid vertical={false} stroke={GRADE} />
                  <XAxis dataKey="nome" tickLine={false} axisLine={false} tick={EIXO} />
                  <YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} tick={EIXO} />
                  <Tooltip cursor={{ fill: 'rgba(79, 70, 229, 0.06)' }} />
                  <Bar dataKey="pct" fill="#4f46e5" name="% de acertos" radius={[10, 10, 0, 0]} maxBarSize={64} animationDuration={1100} />
                </BarChart>
              </ResponsiveContainer>
              <p className="suave">
                Mínimos eliminatórios: {porBloco.map((b) => `${b.nome} ${b.minimo}%`).join(' · ')}
              </p>
            </>
          )}
        </div>

        <div className="cartao">
          <h2>Assuntos mais fracos (30 dias)</h2>
          <p className="suave">
            Os 8 com menor acerto. Vermelho: abaixo de 80% · amarelo: de 80% a 84% · verde: 85% ou mais.
          </p>
          {forca.length === 0 ? (
            <p className="suave">Ainda sem questões respondidas.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, forcaGrafico.length * 44)}>
              <BarChart data={forcaGrafico} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid horizontal={false} stroke={GRADE} />
                <XAxis type="number" domain={[0, 100]} unit="%" tickLine={false} axisLine={false} tick={EIXO} />
                <YAxis type="category" dataKey="titulo" width={190} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#334155' }} />
                <Tooltip cursor={{ fill: 'rgba(79, 70, 229, 0.06)' }} />
                <Bar dataKey="reforco" name="Abaixo de 80%" stackId="forca" fill="#e11d48" radius={[0, 8, 8, 0]} maxBarSize={20} animationDuration={1100} />
                <Bar dataKey="consolidacao" name="De 80% a 84%" stackId="forca" fill="#f59e0b" radius={[0, 8, 8, 0]} maxBarSize={20} animationDuration={1100} />
                <Bar dataKey="liberado" name="85% ou mais" stackId="forca" fill="#10b981" radius={[0, 8, 8, 0]} maxBarSize={20} animationDuration={1100} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="cartao ocupa-tudo">
          <h2>Prioridades da semana</h2>
          {dados.simulados.length < 2 ? (
            <p className="suave">As prioridades aparecem depois de dois simulados.</p>
          ) : (
            <ol className="prioridades">
              {prio.map((p) => (
                <li key={p.topicoId}>
                  {tituloCurto(p.titulo)} · peso {p.peso} · acerto {Math.round(p.taxa * 100)}%
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
