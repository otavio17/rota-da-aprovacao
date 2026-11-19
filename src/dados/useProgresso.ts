import { useCallback, useEffect, useRef, useState } from 'react';
import { mensagemDeErro } from '../auth/erros';
import type { Armazem } from './armazenamento';
import { carregarProgresso, salvarProgresso } from './progresso';

export type EstadoSalvamento = 'salvo' | 'salvando' | 'erro';

// Junta cliques seguidos num único envio à nuvem.
const ESPERA_MS = 800;

// Carrega o progresso da conta e envia cada alteração para a nuvem.
export function useProgresso(uid: string) {
  const [armazem, setArmazem] = useState<Armazem | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoSalvamento>('salvo');
  const [tentativa, setTentativa] = useState(0);
  const ultimo = useRef<Armazem | null>(null); // última versão já conhecida (carregada ou enviada)
  const pendente = useRef<Armazem | null>(null); // alteração que ainda não foi enviada
  const esperando = useRef<number | undefined>(undefined);
  const sequencia = useRef(0);

  useEffect(() => {
    let cancelado = false;
    setArmazem(null);
    setErroCarga(null);
    carregarProgresso(uid).then(
      (a) => {
        if (cancelado) return;
        ultimo.current = a;
        setArmazem(a);
      },
      (erro) => {
        if (!cancelado) setErroCarga(mensagemDeErro(erro));
      },
    );
    return () => {
      cancelado = true;
    };
  }, [uid, tentativa]);

  const enviar = useCallback(() => {
    window.clearTimeout(esperando.current);
    const a = pendente.current;
    if (!a) return;
    pendente.current = null;
    const minha = ++sequencia.current;
    setEstado('salvando');
    salvarProgresso(uid, a).then(
      () => {
        if (minha === sequencia.current) setEstado('salvo');
      },
      () => {
        if (minha === sequencia.current) setEstado('erro');
      },
    );
  }, [uid]);

  // Toda alteração feita na tela vira um envio, com uma pequena espera.
  useEffect(() => {
    if (!armazem || armazem === ultimo.current) return;
    ultimo.current = armazem;
    pendente.current = armazem;
    setEstado('salvando');
    window.clearTimeout(esperando.current);
    esperando.current = window.setTimeout(enviar, ESPERA_MS);
  }, [armazem, enviar]);

  // Antes de fechar a página ou de sair da conta, envia o que ainda estava na espera.
  useEffect(() => {
    const aoOcultar = () => {
      if (document.visibilityState === 'hidden') enviar();
    };
    window.addEventListener('pagehide', enviar);
    document.addEventListener('visibilitychange', aoOcultar);
    return () => {
      window.removeEventListener('pagehide', enviar);
      document.removeEventListener('visibilitychange', aoOcultar);
      enviar();
    };
  }, [enviar]);

  const alterar = useCallback((fn: (a: Armazem) => Armazem) => {
    setArmazem((atual) => (atual ? fn(atual) : atual));
  }, []);

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), []);

  return { armazem, erroCarga, estado, alterar, tentarDeNovo, enviarAgora: enviar };
}
