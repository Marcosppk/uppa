// Acessibilidade: tamanho da letra, alto contraste e menos animações (guardados no aparelho),
// link para pular direto ao conteúdo e leitura do texto em voz alta.
import { useEffect, useState } from 'react';

const CHAVE = 'uppa-acessibilidade';

export interface Preferencias {
  letra: 'normal' | 'grande' | 'maior';
  contraste: boolean;
  movimento: boolean; // true = menos animações
}
const PADRAO: Preferencias = { letra: 'normal', contraste: false, movimento: false };

function ler(): Preferencias {
  try {
    return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) ?? '{}') };
  } catch {
    return PADRAO;
  }
}

function aplicar(p: Preferencias) {
  const r = document.documentElement;
  r.dataset.letra = p.letra;
  if (p.contraste) r.dataset.contraste = 'alto';
  else delete r.dataset.contraste;
  if (p.movimento) r.dataset.movimento = 'reduzido';
  else delete r.dataset.movimento;
}

/** Chamar uma vez ao abrir o app. */
export const aplicarPreferencias = () => aplicar(ler());

/** Menos movimento: pedido no aparelho (sistema) ou nas preferências do app. */
export const menosMovimento = () => document.documentElement.dataset.movimento === 'reduzido' || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

export function PainelAcessibilidade() {
  const [p, setP] = useState(ler);
  // Parte sempre da escolha mais recente (dois toques seguidos não desfazem um ao outro).
  const mudar = (novo: Partial<Preferencias>) =>
    setP((antes) => {
      const v = { ...antes, ...novo };
      aplicar(v);
      try {
        localStorage.setItem(CHAVE, JSON.stringify(v));
      } catch {}
      return v;
    });
  return (
    <section className="card stack" aria-labelledby="titulo-acessibilidade">
      <h2 id="titulo-acessibilidade" style={{ margin: 0 }}>
        Acessibilidade
      </h2>
      <div className="stack" style={{ gap: 6 }}>
        <span id="rotulo-letra" style={{ fontWeight: 600 }}>
          Tamanho da letra
        </span>
        <div className="seg" role="group" aria-labelledby="rotulo-letra" style={{ justifySelf: 'start' }}>
          <button type="button" aria-pressed={p.letra === 'normal'} onClick={() => mudar({ letra: 'normal' })}>
            Normal
          </button>
          <button type="button" aria-pressed={p.letra === 'grande'} onClick={() => mudar({ letra: 'grande' })} style={{ fontSize: '1.1em' }}>
            Grande
          </button>
          <button type="button" aria-pressed={p.letra === 'maior'} onClick={() => mudar({ letra: 'maior' })} style={{ fontSize: '1.25em' }}>
            Maior
          </button>
        </div>
      </div>
      <label className="check">
        <input type="checkbox" checked={p.contraste} onChange={(e) => mudar({ contraste: e.target.checked })} />
        <span>
          <b>Alto contraste</b>
          <br />
          <span className="muted small">Cores mais fortes, bordas e links destacados.</span>
        </span>
      </label>
      <label className="check">
        <input type="checkbox" checked={p.movimento} onChange={(e) => mudar({ movimento: e.target.checked })} />
        <span>
          <b>Menos animações</b>
          <br />
          <span className="muted small">Desliga movimentos, fogos e confetes.</span>
        </span>
      </label>
      <p className="muted small" style={{ margin: 0 }}>
        Fica guardado neste aparelho. Os avisos têm o botão “Ouvir” para escutar o texto.
      </p>
    </section>
  );
}

/** Primeiro item da página para quem usa teclado ou leitor de tela: pula o menu e vai ao conteúdo. */
export function PularParaConteudo() {
  return (
    <a
      className="pular"
      href="#conteudo"
      onClick={(e) => {
        e.preventDefault();
        document.getElementById('conteudo')?.focus();
      }}
    >
      Pular para o conteúdo
    </a>
  );
}

/** Lê o texto em voz alta (voz do próprio aparelho, em português). Some se o aparelho não tiver voz. */
export function BotaoOuvir({ texto, rotulo = 'Ouvir' }: { texto: string; rotulo?: string }) {
  const [falando, setFalando] = useState(false);
  const temVoz = typeof window !== 'undefined' && 'speechSynthesis' in window;
  useEffect(() => () => {
    if (falando) speechSynthesis.cancel();
  }, [falando]);
  if (!temVoz) return null;
  const alternar = () => {
    speechSynthesis.cancel();
    if (falando) return setFalando(false);
    const f = new SpeechSynthesisUtterance(texto);
    f.lang = 'pt-BR';
    f.rate = 0.95;
    const voz = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('pt'));
    if (voz) f.voice = voz;
    f.onend = f.onerror = () => setFalando(false);
    setFalando(true);
    speechSynthesis.speak(f);
  };
  return (
    <button type="button" className="btn ghost sm" onClick={alternar} aria-pressed={falando}>
      {falando ? '⏹ Parar' : `🔊 ${rotulo}`}
    </button>
  );
}
