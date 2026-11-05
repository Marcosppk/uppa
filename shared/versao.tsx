// Versão dos apps: o número vem do package.json na hora de compilar (__VERSAO__) e o servidor informa a dele em /api/saude.
// Quando o servidor já está numa versão mais nova do que a do app aberto, aparece o aviso para atualizar.
import { useEffect, useState } from 'react';
import { urlApi } from './api';

declare const __VERSAO__: string;
export const VERSAO = __VERSAO__;

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
