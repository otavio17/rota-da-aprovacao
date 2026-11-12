import type { Concurso } from '../domain/regras';

interface Props {
  concursos: Concurso[];
  ativos: string[]; // ids já adicionados
  ativo: string;
  onTrocar: (id: string) => void;
  onAdicionar: () => void;
}

// Seletor do concurso em foco: só os concursos já adicionados aparecem.
export function Trocador({ concursos, ativos, ativo, onTrocar, onAdicionar }: Props) {
  const podeAdicionar = concursos.some((c) => !ativos.includes(c.id));
  return (
    <div className="trocador" role="group" aria-label="Concurso em foco">
      {concursos
        .filter((c) => ativos.includes(c.id))
        .map((c) => (
          <button
            key={c.id}
            className={`pilula ${c.id === ativo ? 'ativa' : ''}`}
            aria-pressed={c.id === ativo}
            onClick={() => onTrocar(c.id)}
          >
            {c.nome.split(' — ')[0]}
          </button>
        ))}
      {podeAdicionar && (
        <button className="pilula mais" onClick={onAdicionar}>
          + concurso
        </button>
      )}
    </div>
  );
}
