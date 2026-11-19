import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Paradas da rota, na ordem em que o caminho passa por elas (fração do comprimento). */
const PARADAS = [
  { em: 0.07, nome: 'Cronograma', detalhe: 'o que estudar hoje', lado: 'abaixo' },
  { em: 0.37, nome: 'Simulado', detalhe: 'treino no formato da prova', lado: 'direita' },
  { em: 0.67, nome: 'Erros revistos', detalhe: 'o que caiu e você errou', lado: 'esquerda' },
  { em: 1, nome: 'Aprovação', detalhe: 'seu nome na lista', lado: 'esquerda' },
] as const;

const CAMINHO = 'M 70 520 C 230 520 330 480 330 410 C 330 330 130 340 130 260 C 130 180 340 200 340 120 C 340 80 370 60 410 50';
const DURACAO_MS = 2800;

type Ponto = { x: number; y: number };

/**
 * Ilustração da tela de acesso: a rota se desenha do início até a aprovação
 * e cada parada acende quando o traço passa por ela. Só decorativa.
 */
export function RotaAnimada() {
  const tracoRef = useRef<SVGPathElement>(null);
  const pontaRef = useRef<SVGCircleElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [pontos, setPontos] = useState<Ponto[] | null>(null);

  // Mede o caminho uma vez para posicionar as paradas exatamente sobre ele.
  useLayoutEffect(() => {
    const traco = tracoRef.current;
    if (!traco) return;
    const total = traco.getTotalLength();
    setPontos(
      PARADAS.map((p) => {
        const { x, y } = traco.getPointAtLength(total * p.em);
        return { x, y };
      }),
    );
  }, []);

  useEffect(() => {
    const traco = tracoRef.current;
    const ponta = pontaRef.current;
    const svg = svgRef.current;
    if (!traco || !ponta || !svg || !pontos) return;

    const total = traco.getTotalLength();
    const paradas = Array.from(svg.querySelectorAll<SVGGElement>('.rota-parada'));
    traco.style.strokeDasharray = String(total);

    function desenhar(p: number) {
      traco!.style.strokeDashoffset = String(total * (1 - p));
      const { x, y } = traco!.getPointAtLength(total * p);
      ponta!.setAttribute('cx', String(x));
      ponta!.setAttribute('cy', String(y));
      ponta!.style.opacity = p >= 1 ? '0' : '1';
      paradas.forEach((g, i) => g.classList.toggle('acesa', p >= PARADAS[i].em - 0.005));
    }

    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (semMovimento) {
      desenhar(1);
      return;
    }

    let quadro = 0;
    let inicio = 0;
    desenhar(0);
    function passo(agora: number) {
      if (!inicio) inicio = agora;
      const t = Math.min(1, (agora - inicio) / DURACAO_MS);
      // acelera no começo e freia na chegada
      const p = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      desenhar(p);
      if (t < 1) quadro = requestAnimationFrame(passo);
    }
    const espera = window.setTimeout(() => {
      quadro = requestAnimationFrame(passo);
    }, 350);
    return () => {
      window.clearTimeout(espera);
      cancelAnimationFrame(quadro);
    };
  }, [pontos]);

  return (
    <svg ref={svgRef} className="rota" viewBox="-110 20 620 590" aria-hidden="true" focusable="false">
      <path className="rota-leito" d={CAMINHO} />
      <path ref={tracoRef} className="rota-traco" d={CAMINHO} />
      {pontos?.map((ponto, i) => {
        const parada = PARADAS[i];
        const chegada = i === PARADAS.length - 1;
        const abaixo = parada.lado === 'abaixo';
        const textoAEsquerda = parada.lado === 'esquerda';
        const dx = abaixo ? -10 : textoAEsquerda ? -26 : 26;
        const dy = abaixo ? 36 : 0;
        return (
          <g key={parada.nome} className={chegada ? 'rota-parada chegada' : 'rota-parada'}>
            {chegada && <circle className="rota-halo" cx={ponto.x} cy={ponto.y} r="22" />}
            <circle className="rota-marco" cx={ponto.x} cy={ponto.y} r={chegada ? 13 : 9} />
            {chegada && (
              <path
                className="rota-visto"
                d={`M ${ponto.x - 5.5} ${ponto.y + 0.5} l 4 4 l 7.5 -8.5`}
              />
            )}
            <text
              className="rota-nome"
              x={ponto.x + dx}
              y={ponto.y - 2 + dy}
              textAnchor={textoAEsquerda ? 'end' : 'start'}
            >
              {parada.nome}
            </text>
            <text
              className="rota-detalhe"
              x={ponto.x + dx}
              y={ponto.y + 16 + dy}
              textAnchor={textoAEsquerda ? 'end' : 'start'}
            >
              {parada.detalhe}
            </text>
          </g>
        );
      })}
      <circle ref={pontaRef} className="rota-ponta" r="6" cx="70" cy="520" />
    </svg>
  );
}
