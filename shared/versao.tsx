// Versão dos apps: o número vem do package.json na hora de compilar (__VERSAO__) e o servidor informa a dele em /api/saude.
// Quando o servidor já está numa versão mais nova do que a do app aberto, aparece o aviso para atualizar.
import { useEffect, useState } from 'react';
import historico from '../CHANGELOG.md?raw';
import { urlApi } from './api';

declare const __VERSAO__: string;
export const VERSAO = __VERSAO__;

/** As versões do CHANGELOG.md: "## 1.5.0 — 05/11/2026" seguido de linhas "- novidade". */
export const NOVIDADES = historico
  .split(/^## /m)
  .slice(1)
  .map((bloco) => {
    const [titulo, ...linhas] = bloco.trim().split('\n');
    const [versao, data] = titulo.split(' — ');
    return { versao: versao.trim(), data: data?.trim() ?? '', itens: linhas.filter((l) => l.startsWith('- ')).map((l) => l.slice(2)) };
  });

export function AvisoNovaVersao() {
  const [nova, setNova] = useState<string | null>(null);
  useEffect(() => {
    const conferir = () =>
      fetch(urlApi('/api/saude'), { cache: 'no-store' })
        .then((r) => r.json())
        .then((r: { versao?: string }) => r.versao && r.versao !== VERSAO && setNova(r.versao))
        .catch(() => {});
    conferir();
    const t = setInterval(conferir, 10 * 60e3);
    const voltou = () => document.visibilityState === 'visible' && conferir();
    document.addEventListener('visibilitychange', voltou);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', voltou);
    };
  }, []);
  if (!nova) return null;
  return (
    <div className="nova-versao" role="status">
      <span className="sp">
        Saiu a versão <b>{nova}</b> do app.
      </span>
      <button className="btn sm" onClick={() => location.reload()}>
        Atualizar agora
      </button>
    </div>
  );
}

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
