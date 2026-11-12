import { useState, type FormEvent } from 'react';
import { hojeLocal } from '../dados/armazenamento';
import type { Concurso, Perfil } from '../domain/regras';

interface Props {
  concursos: Concurso[];
  jaAdicionados: string[];
  podeCancelar: boolean;
  onSalvar: (perfil: Perfil) => void;
  onCancelar: () => void;
}

export function Onboarding({ concursos, jaAdicionados, podeCancelar, onSalvar, onCancelar }: Props) {
  const disponiveis = concursos.filter((c) => !jaAdicionados.includes(c.id));
  const [nome, setNome] = useState('');
  const [escolhido, setEscolhido] = useState('');
  const [dataEscolhida, setDataEscolhida] = useState<string | null>(null);
  const [horasDia, setHorasDia] = useState(4);

  const concurso = disponiveis.find((c) => c.id === escolhido) ?? disponiveis[0];
  const dataProva = dataEscolhida ?? concurso?.dataProva ?? '';

  function escolher(id: string) {
    setEscolhido(id);
    setDataEscolhida(null);
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!concurso) return;
    onSalvar({
      nome: nome.trim(),
      concursoId: concurso.id,
      pasta: concurso.pasta,
      dataProva,
      horasDia,
      criadoEm: hojeLocal(),
    });
  }

  if (disponiveis.length === 0) {
    return (
      <main className="conteudo">
        <h1>Concursos</h1>
        <p className="aviso">Todos os concursos cadastrados já foram adicionados.</p>
        {podeCancelar && (
          <button className="botao" onClick={onCancelar}>
            Voltar
          </button>
        )}
      </main>
    );
  }

  return (
    <main className="conteudo">
      <h1>{podeCancelar ? 'Adicionar concurso' : 'Pré-cadastro'}</h1>
      <form className="cartao" onSubmit={salvar}>
        <label>
          Seu nome (só para exibir)
          <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label>
          Concurso
          <select value={concurso?.id ?? ''} onChange={(e) => escolher(e.target.value)}>
            {disponiveis.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} ({c.banca})
              </option>
            ))}
          </select>
        </label>
        {concurso && <p className="suave">Inscrições: {concurso.inscricoes}</p>}
        <label>
          Data da prova
          <input type="date" value={dataProva} onChange={(e) => setDataEscolhida(e.target.value)} />
        </label>
        <label>
          Horas de estudo por dia
          <input
            type="number"
            min={1}
            max={12}
            value={horasDia}
            onChange={(e) => setHorasDia(Number(e.target.value))}
          />
        </label>
        <button type="submit" className="botao" disabled={!concurso || !dataProva}>
          Salvar e gerar cronograma
        </button>
        {podeCancelar && (
          <button type="button" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </form>
    </main>
  );
}
