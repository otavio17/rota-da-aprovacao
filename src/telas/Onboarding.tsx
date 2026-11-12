import { useState } from 'react';
import type { Concurso, Dados } from '../domain/regras';
import { hojeLocal } from '../dados/armazenamento';

interface Props {
  concursos: Concurso[];
  atualizar: (fn: (d: Dados) => Dados) => void;
}

export function Onboarding({ concursos, atualizar }: Props) {
  // Os concursos chegam depois do primeiro render, então os valores padrão
  // são derivados na hora (e não copiados para o estado no mount).
  const [nome, setNome] = useState('');
  const [escolhido, setEscolhido] = useState('');
  const [dataEscolhida, setDataEscolhida] = useState<string | null>(null);
  const [horasDia, setHorasDia] = useState(4);

  const concursoId = escolhido || concursos[0]?.id || '';
  const concurso = concursos.find((c) => c.id === concursoId);
  const dataProva = dataEscolhida ?? concurso?.dataProva ?? '';

  function escolher(id: string) {
    setEscolhido(id);
    setDataEscolhida(null);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!concurso) return;
    atualizar((d) => ({
      ...d,
      perfil: {
        nome: nome.trim(),
        concursoId: concurso.id,
        pasta: concurso.pasta,
        dataProva,
        horasDia,
        criadoEm: hojeLocal(),
      },
    }));
  }

  return (
    <main className="conteudo">
      <h1>Pré-cadastro</h1>
      <form className="cartao" onSubmit={salvar}>
        <label>
          Seu nome (só para exibir)
          <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label>
          Concurso
          <select value={concursoId} onChange={(e) => escolher(e.target.value)}>
            {concursos.map((c) => (
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
      </form>
    </main>
  );
}
