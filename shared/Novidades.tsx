// Novidades de cada versão (CHANGELOG.md): "Sobre o app" e a janela "O que há de novo" depois de uma atualização.
// No CHANGELOG, um item que começa com [Financeiro] ou [Associados] aparece só naquele app; sem marca, nos dois.
// Fica fora do carregamento inicial.
import { useEffect, useRef, useState } from 'react';
import historico from '../CHANGELOG.md?raw';
import { VERSAO } from './versao';
import { Modal } from './ui';
import { ORIGEM_SERVIDOR } from './api';

const APP = (document.documentElement.dataset.app ?? '').toLowerCase();

/** As versões do CHANGELOG.md: "## 1.5.0 — 05/11/2026" seguido de linhas "- novidade" (só as deste app). */
export const NOVIDADES = historico
  .split(/^## /m)
  .slice(1)
  .map((bloco) => {
    const [titulo, ...linhas] = bloco.trim().split('\n');
    const [versao, data] = titulo.split(' — ');
    const itens = linhas
      .filter((l) => l.startsWith('- '))
      .map((l) => l.slice(2).trim())
      .flatMap((l) => {
        const m = /^\[(Financeiro|Associados)\]\s*/i.exec(l);
        if (!m) return [l];
        return m[1].toLowerCase() === APP ? [l.slice(m[0].length)] : [];
      });
    return { versao: versao.trim(), data: data?.trim() ?? '', itens };
  })
  .filter((v) => v.itens.length > 0);

/** "1.10.0" é maior que "1.9.2"? */
export function versaoMaior(a: string, b: string) {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
}

/** Versões que a pessoa ainda não viu (só a atual, se não há registro de nenhuma). */
export const novidadesDesde = (vista: string | null | undefined) =>
  NOVIDADES.filter((v) => !versaoMaior(v.versao, VERSAO) && (vista ? versaoMaior(v.versao, vista) : v.versao === VERSAO)).slice(0, 6);

function ListaVersoes({ lista }: { lista: typeof NOVIDADES }) {
  return (
    <>
      {lista.map((v) => (
        <section key={v.versao} aria-label={`Novidades da versão ${v.versao}`}>
          <h3 style={{ margin: '0 0 4px' }}>
            Versão {v.versao} <span className="muted small">· {v.data}</span>
          </h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            {v.itens.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/** Janela "O que há de novo", mostrada uma vez depois de cada atualização. */
export function ModalNovidades({ desde, aoFechar }: { desde: string | null | undefined; aoFechar: () => void }) {
  const lista = novidadesDesde(desde);
  const inicio = useRef<HTMLDivElement>(null);
  // A janela põe o foco no botão "Entendi" (no fim); a leitura deve começar pelo título.
  useEffect(() => {
    const t = setTimeout(() => {
      for (let el = inicio.current?.parentElement; el; el = el.parentElement) el.scrollTop = 0;
    }, 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <Modal titulo="O que há de novo" aoFechar={aoFechar}>
      <div className="stack" ref={inicio}>
        <p className="muted" style={{ margin: 0 }}>
          O app foi atualizado para a <b>versão {VERSAO}</b>. Veja o que mudou{lista.length > 1 ? ' desde a última vez que você entrou' : ''}:
        </p>
        <ListaVersoes lista={lista} />
        <button className="btn block" onClick={aoFechar}>
          Entendi
        </button>
      </div>
    </Modal>
  );
}

/** Número da versão e as novidades (para Ajustes e Meus dados). */
export function SobreVersao({ aoRefazerTour }: { aoRefazerTour?: () => void }) {
  const [aberto, setAberto] = useState(false);
  const lista = aberto ? NOVIDADES : NOVIDADES.slice(0, 1);
  return (
    <div className="card stack">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Sobre o app</h2>
        <span className="tag">Versão {VERSAO}</span>
      </div>
      <ListaVersoes lista={lista} />
      <div className="row" style={{ gap: 8 }}>
        {NOVIDADES.length > 1 && (
          <button className="btn ghost sm" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
            {aberto ? 'Mostrar só a versão atual' : 'Ver as versões anteriores'}
          </button>
        )}
        {aoRefazerTour && (
          <button className="btn sec sm" onClick={aoRefazerTour}>
            Fazer o tour do app de novo
          </button>
        )}
        <a className="btn ghost sm" href={`${ORIGEM_SERVIDOR}/privacidade`} target="_blank" rel="noreferrer">
          Política de privacidade
        </a>
      </div>
    </div>
  );
}
