// Recepção ao abrir o app: o tour no primeiro acesso, ou a janela "O que há de novo" depois de uma atualização.
// O que a pessoa já viu fica guardado no servidor (vale em qualquer aparelho). Carregado só quando há algo a mostrar.
import { useEffect, useState } from 'react';
import { Tour, type Passo } from './Tour';
import { ModalNovidades, novidadesDesde } from './Novidades';
import { VERSAO } from './versao';
import { ir } from './ui';

export interface Visto {
  tour?: boolean;
  versao?: string;
}

export default function Recepcao({
  tourVisto,
  versaoVista,
  refazerTour,
  passos,
  marcar,
  aoFim,
}: {
  tourVisto: boolean;
  versaoVista: string | null | undefined;
  /** Pedido em "Sobre o app": mostra o tour de novo. */
  refazerTour: boolean;
  passos: Passo[];
  marcar: (v: Visto) => Promise<unknown>;
  aoFim: () => void;
}) {
  const [etapa] = useState<'tour' | 'novidades' | null>(() => (refazerTour || !tourVisto ? 'tour' : novidadesDesde(versaoVista).length ? 'novidades' : null));
  const fim = (v: Visto) => {
    marcar(v).catch(() => {});
    aoFim();
  };
  // Versão nova sem nada para este app: só registra que já está na versão atual.
  // O tour sempre começa no Início (alguns destaques, como o botão de mensagens, só existem lá).
  useEffect(() => {
    if (etapa === 'tour') ir('/');
    if (etapa === null) fim({ versao: VERSAO });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // O tour do primeiro acesso já apresenta tudo: marca também a versão como vista.
  if (etapa === 'tour') return <Tour passos={passos} aoTerminar={() => fim({ tour: true, versao: VERSAO })} />;
  if (etapa === 'novidades') return <ModalNovidades desde={versaoVista} aoFechar={() => fim({ versao: VERSAO })} />;
  return null;
}
