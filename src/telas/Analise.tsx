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

  const comDados: Topico[] = edital.topicos.filter((t) => recentes.some((r) => r.topicoId === t.id));
  const prio = prioridades(comDados, recentes, 5);

  return (
    <section>
      <header className="topo">
        <h1>Análise</h1>
      </header>

      <div className="cartao">
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
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis domain={[0, 100]} />
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
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="cartao">
        <h2>Desempenho por bloco (último simulado)</h2>
        {porBloco.length === 0 ? (
          <p className="suave">Ainda sem simulado com blocos cadastrados.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porBloco}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="pct" fill="#4f46e5" name="% de acertos" />
              </BarChart>
            </ResponsiveContainer>
            <p className="suave">
              Mínimos eliminatórios: {porBloco.map((b) => `${b.nome} ${b.minimo}%`).join(' · ')}
            </p>
          </>
        )}
      </div>

      <div className="cartao">
        <h2>Pontos fortes e fracos (30 dias)</h2>
        {forca.length === 0 ? (
          <p className="suave">Ainda sem questões respondidas.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, forca.length * 34)}>
            <BarChart data={forca} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="titulo" width={170} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="taxa" fill="#10b981" name="% de acertos" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="cartao">
        <h2>Prioridades da semana</h2>
        {dados.simulados.length < 2 ? (
          <p className="suave">As prioridades aparecem depois de dois simulados.</p>
        ) : (
          <ol>
            {prio.map((p) => (
              <li key={p.topicoId}>
                {p.titulo} · peso {p.peso} · acerto {Math.round(p.taxa * 100)}%
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
