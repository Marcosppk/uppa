// Tour do primeiro acesso: passo a passo, destacando cada parte do app (o resto da tela escurece).
// Teclado: → próximo, ← voltar, Esc pula. Quem pediu menos animações vê sem movimento.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { menosMovimento } from './acessibilidade';

export interface Passo {
  /** Seletor CSS do que destacar (usa o primeiro que estiver visível). Sem alvo: cartão no meio da tela. */
  alvo?: string;
  titulo: string;
  texto: string;
}

function achar(seletor?: string) {
  if (!seletor) return null;
  return [...document.querySelectorAll<HTMLElement>(seletor)].find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }) ?? null;
}

export function Tour({ passos, aoTerminar }: { passos: Passo[]; aoTerminar: (concluiu: boolean) => void }) {
  const [i, setI] = useState(0);
  const [area, setArea] = useState<DOMRect | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();
  const passo = passos[i];
  const ultimo = i === passos.length - 1;

  const medir = useCallback(() => setArea(achar(passo.alvo)?.getBoundingClientRect() ?? null), [passo.alvo]);

  // Leva o alvo para a tela e mede onde ele ficou.
  useEffect(() => {
    const el = achar(passo.alvo);
    if (el) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: menosMovimento() ? 'auto' : 'smooth' });
    medir();
    const t = setTimeout(medir, menosMovimento() ? 0 : 350);
    window.addEventListener('resize', medir);
    window.addEventListener('scroll', medir, true);
    botao.current?.focus();
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', medir);
      window.removeEventListener('scroll', medir, true);
    };
  }, [i, medir, passo.alvo]);

  const avancar = useCallback(() => (ultimo ? aoTerminar(true) : setI((x) => x + 1)), [ultimo, aoTerminar]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoTerminar(false);
      else if (e.key === 'ArrowRight') avancar();
      else if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [avancar, aoTerminar]);

  // Cartão perto do destaque: embaixo dele se o alvo está na metade de cima da tela; em cima, se está na de baixo.
  const largura = Math.min(360, window.innerWidth - 24);
  let posicao: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  if (area) {
    const left = Math.max(12, Math.min(area.left + area.width / 2 - largura / 2, window.innerWidth - largura - 12));
    // Menu lateral no computador: o cartão vai ao lado do item, sem cobrir os próximos itens do menu.
    const aoLado = window.innerWidth >= 900 && area.left < window.innerWidth / 3 && area.right + 16 + largura <= window.innerWidth - 12;
    if (aoLado) posicao = { left: area.right + 16, top: Math.max(12, Math.min(area.top - 8, window.innerHeight - 360)) };
    else posicao = area.top + area.height / 2 > window.innerHeight / 2 ? { left, bottom: window.innerHeight - area.top + 14 } : { left, top: area.bottom + 14 };
  }
  const folga = 6;

  return (
    <div className="tour" role="presentation">
      {/* Bloqueia cliques no app enquanto o tour está aberto. */}
      <div className="tour-bloqueio" onClick={(e) => e.stopPropagation()} />
      {area ? (
        <div className="tour-luz" style={{ top: area.top - folga, left: area.left - folga, width: area.width + folga * 2, height: area.height + folga * 2 }} />
      ) : (
        <div className="tour-escuro" />
      )}
      <div className="tour-cartao" role="dialog" aria-modal="true" aria-labelledby={idTitulo} style={{ ...posicao, width: largura }}>
        <span className="tour-contador">
          {i + 1} de {passos.length}
        </span>
        <h2 id={idTitulo}>{passo.titulo}</h2>
        <p>{passo.texto}</p>
        <div className="tour-pontos" aria-hidden="true">
          {passos.map((_, j) => (
            <i key={j} className={j === i ? 'ativo' : ''} />
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <button type="button" className="btn ghost sm" onClick={() => aoTerminar(false)}>
            {ultimo ? 'Fechar' : 'Pular o tour'}
          </button>
          <div className="row" style={{ gap: 8 }}>
            {i > 0 && (
              <button type="button" className="btn sec sm" onClick={() => setI(i - 1)}>
                Voltar
              </button>
            )}
            <button type="button" className="btn sm" ref={botao} onClick={avancar}>
              {ultimo ? 'Começar a usar' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
