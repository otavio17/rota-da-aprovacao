import { useEffect, useRef, useState } from 'react';
import { somarDias } from '../domain/regras';

function semMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Número que sobe do valor anterior até o novo. */
export function Contador({ valor, sufixo = '' }: { valor: number; sufixo?: string }) {
  const [mostrado, setMostrado] = useState(() => (semMovimento() ? valor : 0));
  const atual = useRef(mostrado);

  useEffect(() => {
    if (semMovimento()) {
      atual.current = valor;
      setMostrado(valor);
      return;
    }
    const de = atual.current;
    const duracao = 900;
    let quadro = 0;
    let inicio = 0;
    function passo(agora: number) {
      if (!inicio) inicio = agora;
      const t = Math.min(1, (agora - inicio) / duracao);
      const suave = 1 - Math.pow(1 - t, 3);
      const v = Math.round(de + (valor - de) * suave);
      atual.current = v;
      setMostrado(v);
      if (t < 1) quadro = requestAnimationFrame(passo);
    }
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor]);

  return (
    <span className="contador">
      {mostrado}
      {sufixo}
    </span>
  );
}

/** Anel de progresso que se preenche até a porcentagem. */
export function Anel({ pct, legenda }: { pct: number; legenda: string }) {
  const raio = 52;
  const volta = 2 * Math.PI * raio;
  const [cheio, setCheio] = useState(() => (semMovimento() ? pct : 0));

  useEffect(() => {
    const quadro = requestAnimationFrame(() => setCheio(pct));
    return () => cancelAnimationFrame(quadro);
  }, [pct]);

  return (
    <div className="anel" role="img" aria-label={`${pct}% ${legenda}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <circle className="anel-trilho" cx="60" cy="60" r={raio} />
        <circle
          className="anel-valor"
          cx="60"
          cy="60"
          r={raio}
          strokeDasharray={volta}
          strokeDashoffset={volta * (1 - Math.min(100, Math.max(0, cheio)) / 100)}
        />
      </svg>
      <div className="anel-centro" aria-hidden="true">
        <strong>
          <Contador valor={pct} sufixo="%" />
        </strong>
        <span>{legenda}</span>
      </div>
    </div>
  );
}

const INICIAIS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Os últimos 7 dias: aceso quando houve estudo no dia. */
export function SemanaDeEstudo({ datas, hoje }: { datas: string[]; hoje: string }) {
  const estudados = new Set(datas);
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(hoje, i - 6));
  const total = dias.filter((d) => estudados.has(d)).length;
  return (
    <div className="semana" role="img" aria-label={`Estudo em ${total} dos últimos 7 dias`}>
      {dias.map((d, i) => {
        const [a, m, dia] = d.split('-').map(Number);
        const inicial = INICIAIS[new Date(Date.UTC(a, m - 1, dia)).getUTCDay()];
        const classes = ['semana-dia', estudados.has(d) ? 'feito' : '', d === hoje ? 'hoje' : ''].join(' ');
        return (
          <span key={d} className={classes} style={{ animationDelay: `${300 + i * 70}ms` }} aria-hidden="true">
            {inicial}
          </span>
        );
      })}
    </div>
  );
}

const CORES_CONFETE = ['#4f46e5', '#7c3aed', '#ffb020', '#10b981', '#c7c5ff'];

/** Chuva curta de confete a partir de um ponto da tela (comemora um assunto concluído). */
export function soltarConfete(x: number, y: number) {
  if (semMovimento()) return;
  const tela = document.createElement('canvas');
  const escala = Math.min(2, window.devicePixelRatio || 1);
  tela.width = window.innerWidth * escala;
  tela.height = window.innerHeight * escala;
  tela.className = 'confete';
  tela.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tela);
  const ctx = tela.getContext('2d');
  if (!ctx) {
    tela.remove();
    return;
  }
  ctx.scale(escala, escala);

  const pecas = Array.from({ length: 90 }, () => {
    const angulo = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const forca = 5 + Math.random() * 9;
    return {
      x,
      y,
      vx: Math.cos(angulo) * forca,
      vy: Math.sin(angulo) * forca,
      giro: Math.random() * Math.PI,
      vGiro: (Math.random() - 0.5) * 0.4,
      lado: 5 + Math.random() * 6,
      cor: CORES_CONFETE[Math.floor(Math.random() * CORES_CONFETE.length)],
    };
  });

  const duracao = 1700;
  let inicio = 0;
  function passo(agora: number) {
    if (!inicio) inicio = agora;
    const t = (agora - inicio) / duracao;
    ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of pecas) {
      p.vy += 0.32;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.giro += p.vGiro;
      ctx!.save();
      ctx!.globalAlpha = Math.max(0, 1 - t * t);
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.giro);
      ctx!.fillStyle = p.cor;
      ctx!.fillRect(-p.lado / 2, -p.lado / 4, p.lado, p.lado / 2);
      ctx!.restore();
    }
    if (t < 1) requestAnimationFrame(passo);
    else tela.remove();
  }
  requestAnimationFrame(passo);
}
