import { Link } from 'react-router-dom';
import { useContexto } from '../dados/armazenamento';

const MOTIVOS = ['Não sabia', 'Confundi', 'Li errado', 'Falta de tempo'];

export function Erros() {
  const { dados, atualizar, questoes, edital } = useContexto();
  const titulo = (id: string) => edital.topicos.find((t) => t.id === id)?.titulo ?? id;
  const enunciado = (id: string) => questoes.find((q) => q.id === id)?.enunciado ?? '(questão removida do banco)';

  const abertos = dados.erros.filter((e) => !e.resolvido);
  const resolvidos = dados.erros.length - abertos.length;
  const porAssunto = [...new Set(abertos.map((e) => e.topicoId))];

  function definirMotivo(id: string, motivo: string) {
    atualizar((d) => ({ ...d, erros: d.erros.map((e) => (e.id === id ? { ...e, motivo } : e)) }));
  }
  function resolver(id: string) {
    atualizar((d) => ({ ...d, erros: d.erros.map((e) => (e.id === id ? { ...e, resolvido: true } : e)) }));
  }

  return (
    <section>
      <header className="topo">
        <h1>Caderno de erros</h1>
        <p className="suave">
          {abertos.length} aberto(s) · {resolvidos} resolvido(s)
        </p>
      </header>

      {abertos.length === 0 && <p className="suave">Nenhum erro em aberto.</p>}

      {porAssunto.map((topicoId) => (
        <div key={topicoId} className="cartao">
          <h2>{titulo(topicoId)}</h2>
          <ul className="lista">
            {abertos
              .filter((e) => e.topicoId === topicoId)
              .map((e) => (
                <li key={e.id} className="item">
                  <div>
                    <p>{enunciado(e.questaoId)}</p>
                    <select value={e.motivo ?? ''} onChange={(ev) => definirMotivo(e.id, ev.target.value)}>
                      <option value="">Motivo do erro…</option>
                      {MOTIVOS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="botao pequeno" onClick={() => resolver(e.id)}>
                    Resolvido
                  </button>
                </li>
              ))}
          </ul>
          <Link className="botao pequeno" to={`/simulado?revisao=${topicoId}`}>
            Refazer questões do assunto
          </Link>
        </div>
      ))}
    </section>
  );
}
