import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useContexto, type ComparacaoItem } from '../dados/armazenamento';
import { diasEntre, pontuar, prioridades, type Resposta, type Topico } from '../domain/regras';

const CORES = ['#4f46e5', '#e11d48'];
const GRADE = '#e5e7eb';

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
          <strong>{dados.simulados.length}</strong>
          <span>simulados feitos</span>
        </div>
        <div className="kpi">
          <strong>{media === null ? '—' : `${media}%`}</strong>
          <span>média dos gerais</span>
        </div>
        <div className="kpi">
          <strong>{ultimo ? `${ultimo.pct}%` : '—'}</strong>
          <span>último simulado</span>
        </div>
        <div className="kpi">
          <strong>{recentes.length}</strong>
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
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRADE} />
              <XAxis dataKey="nome" />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip />
              <Legend />
              <ReferenceLine y={80} stroke="#e11d48" strokeDasharray="4 4" label="80%" />
              {series.map((s, k) => (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={`s${k}`}
                  name={s.nome.split(' — ')[0]}
                  stroke={CORES[k]}
                  strokeWidth={2.5}
                  connectNulls
                />
              ))}
            </LineChart>
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
                  <CartesianGrid strokeDasharray="3 3" stroke={GRADE} />
                  <XAxis dataKey="nome" />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip />
                  <Bar dataKey="pct" fill="#4f46e5" name="% de acertos" radius={[6, 6, 0, 0]} />
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
                <CartesianGrid strokeDasharray="3 3" stroke={GRADE} />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="titulo" width={190} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="reforco" name="Abaixo de 80%" stackId="forca" fill="#e11d48" />
                <Bar dataKey="consolidacao" name="De 80% a 84%" stackId="forca" fill="#f59e0b" />
                <Bar dataKey="liberado" name="85% ou mais" stackId="forca" fill="#10b981" />
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
