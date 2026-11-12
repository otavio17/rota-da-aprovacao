import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useContexto } from '../dados/armazenamento';
import { diasEntre, pontuar, prioridades, type Resposta, type Topico } from '../domain/regras';

export function Analise() {
  const { dados, edital, hoje } = useContexto();

  const gerais = dados.simulados.filter((s) => s.tipo === 'geral');
  const evolucao = gerais.map((s, i) => ({ nome: `${i + 1}º ${s.data.slice(5)}`, pct: s.pct }));

  const ultimo = dados.simulados.at(-1);
  const porBloco = ultimo && edital.blocos.length > 0 ? pontuar(ultimo.respostas, edital).porBloco : [];

  // Pontos fortes e fracos: últimos 30 dias.
  const recentes: Resposta[] = dados.simulados
    .filter((s) => diasEntre(s.data, hoje) <= 30)
    .flatMap((s) => s.respostas);
  const forca = edital.topicos
    .map((t) => {
      const rs = recentes.filter((r) => r.topicoId === t.id);
      return { titulo: t.titulo, taxa: rs.length ? Math.round((rs.filter((r) => r.correta).length / rs.length) * 100) : 0, n: rs.length };
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
        <h2>Evolução nos simulados gerais</h2>
        {evolucao.length < 2 ? (
          <p className="suave">A evolução aparece depois de dois simulados gerais.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <ReferenceLine y={80} stroke="#c0392b" strokeDasharray="4 4" label="80%" />
              <Line type="monotone" dataKey="pct" stroke="#2980b9" name="% de acertos" />
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
                <Bar dataKey="pct" fill="#2980b9" name="% de acertos" />
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
              <Bar dataKey="taxa" fill="#27ae60" name="% de acertos" />
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
