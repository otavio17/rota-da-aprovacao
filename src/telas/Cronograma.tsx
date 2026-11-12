import { useContexto } from '../dados/armazenamento';
import { registroInicial, type Estado } from '../domain/regras';

const ROTULOS: Record<Estado, string> = {
  novo: 'Novo',
  estudado: 'Estudado',
  reforco: 'Reforço',
  consolidacao: 'Consolidação',
  liberado: 'Liberado',
};

export function Cronograma() {
  const { dados, edital } = useContexto();
  const semanas = [...new Set(edital.topicos.map((t) => t.semana))].sort((a, b) => a - b);

  return (
    <section>
      <header className="topo">
        <h1>Cronograma</h1>
        <p className="legenda">
          {(Object.keys(ROTULOS) as Estado[]).map((e) => (
            <span key={e} className={`chip estado-${e}`}>
              {ROTULOS[e]}
            </span>
          ))}
        </p>
      </header>
      {semanas.map((s) => (
        <div key={s} className="cartao">
          <h2>Semana {s}</h2>
          <ul className="lista">
            {edital.topicos
              .filter((t) => t.semana === s)
              .map((t) => {
                const r = dados.registros[t.id] ?? registroInicial();
                return (
                  <li key={t.id} className={`item estado-${r.estado}`}>
                    <div>
                      <strong>{t.titulo}</strong>
                      <div className="suave">
                        {t.disciplina}
                        {r.ultimaNota !== null && ` · última nota ${r.ultimaNota}%`}
                      </div>
                    </div>
                    <span className="chip">{ROTULOS[r.estado]}</span>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
      {edital.topicos.length === 0 && (
        <p className="aviso">
          Este concurso ainda não tem assuntos cadastrados. {edital.observacao}
        </p>
      )}
    </section>
  );
}
