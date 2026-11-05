// Novidades de cada versão (CHANGELOG.md), mostradas em "Sobre o app". Fica fora do carregamento inicial.
import { useState } from 'react';
import historico from '../CHANGELOG.md?raw';
import { VERSAO } from './versao';

/** As versões do CHANGELOG.md: "## 1.5.0 — 05/11/2026" seguido de linhas "- novidade". */
export const NOVIDADES = historico
  .split(/^## /m)
  .slice(1)
  .map((bloco) => {
    const [titulo, ...linhas] = bloco.trim().split('\n');
    const [versao, data] = titulo.split(' — ');
    return { versao: versao.trim(), data: data?.trim() ?? '', itens: linhas.filter((l) => l.startsWith('- ')).map((l) => l.slice(2)) };
  });

/** Número da versão e as novidades (para Ajustes e Meus dados). */
export function SobreVersao() {
  const [aberto, setAberto] = useState(false);
  const lista = aberto ? NOVIDADES : NOVIDADES.slice(0, 1);
  return (
    <div className="card stack">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Sobre o app</h2>
        <span className="tag">Versão {VERSAO}</span>
      </div>
      {lista.map((v) => (
        <section key={v.versao} aria-label={`Novidades da versão ${v.versao}`}>
          <h3 style={{ margin: '0 0 4px' }}>
            Versão {v.versao} <span className="muted small">· {v.data}</span>
          </h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {v.itens.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
      ))}
      {NOVIDADES.length > 1 && (
        <button className="btn ghost sm" style={{ justifySelf: 'start' }} aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
          {aberto ? 'Mostrar só a versão atual' : 'Ver as versões anteriores'}
        </button>
      )}
    </div>
  );
}
