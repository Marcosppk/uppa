import { useEffect, useRef, useState } from 'react';
import { nota, useSom } from './som';

const NOTAS = [
  { n: 'Dó', f: 261.63, c: '#e5484d' },
  { n: 'Ré', f: 293.66, c: '#f76b15' },
  { n: 'Mi', f: 329.63, c: '#f5c400' },
  { n: 'Fá', f: 349.23, c: '#30a46c' },
  { n: 'Sol', f: 392.0, c: '#12a594' },
  { n: 'Lá', f: 440.0, c: '#3e7bfa' },
  { n: 'Si', f: 493.88, c: '#8e4ec6' },
  { n: 'Dó', f: 523.25, c: '#d6409f' },
];

// Melodias tradicionais (domínio público), como posições das teclas.
const MUSICAS = [
  { t: 'Brilha, brilha, estrelinha', notas: [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0, 4, 4, 3, 3, 2, 2, 1, 4, 4, 3, 3, 2, 2, 1, 0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0] },
  { t: 'Escada que sobe e desce', notas: [0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1, 0] },
];

export function Piano() {
  const [som, setSom] = useSom();
  const [acesa, setAcesa] = useState<number | null>(null);
  const [musica, setMusica] = useState<number | null>(null); // null = tocar livre
  const [pos, setPos] = useState(0);
  const [ouvindo, setOuvindo] = useState(false);
  const timers = useRef<number[]>([]);

  const limpar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setOuvindo(false);
  };
  useEffect(() => limpar, []);

  const acender = (i: number) => {
    nota(NOTAS[i].f);
    setAcesa(i);
    timers.current.push(window.setTimeout(() => setAcesa((a) => (a === i ? null : a)), 250));
  };

  const tocar = (i: number) => {
    if (ouvindo) return;
    acender(i);
    if (musica === null) return;
    const lista = MUSICAS[musica].notas;
    if (pos < lista.length && lista[pos] === i) setPos(pos + 1);
  };

  const escolher = (m: number | null) => {
    limpar();
    setMusica(m);
    setPos(0);
  };

  const ouvir = () => {
    if (musica === null) return;
    limpar();
    setOuvindo(true);
    MUSICAS[musica].notas.forEach((n, k) => timers.current.push(window.setTimeout(() => acender(n), k * 450)));
    timers.current.push(window.setTimeout(() => setOuvindo(false), MUSICAS[musica].notas.length * 450));
  };

  const lista = musica === null ? [] : MUSICAS[musica].notas;
  const proxima = musica !== null && !ouvindo && pos < lista.length ? lista[pos] : null;
  const terminou = musica !== null && pos >= lista.length;

  return (
    <>
      {!som && (
        <div className="alert info row" style={{ marginBottom: 12 }}>
          <span className="sp">O som está desligado. O piano precisa de som.</span>
          <button className="btn sm" onClick={() => setSom(true)}>
            🔊 Ligar som
          </button>
        </div>
      )}

      <div className="row" style={{ justifyContent: 'center', marginBottom: 12 }}>
        <select className="input" style={{ maxWidth: 320 }} value={musica ?? ''} onChange={(e) => escolher(e.target.value === '' ? null : Number(e.target.value))} aria-label="Modo do piano">
          <option value="">Tocar livre</option>
          {MUSICAS.map((m, i) => (
            <option key={m.t} value={i}>
              Siga as cores: {m.t}
            </option>
          ))}
        </select>
        {musica !== null && (
          <button className="btn sec" disabled={ouvindo} onClick={ouvir}>
            👂 Ouvir
          </button>
        )}
      </div>

      <p className="muted" style={{ textAlign: 'center', minHeight: '1.5em' }} aria-live="polite">
        {musica === null
          ? 'Toque nas teclas coloridas.'
          : terminou
            ? '🎉 Você tocou a música toda!'
            : ouvindo
              ? 'Escute a música…'
              : `Toque a tecla que está piscando (${pos + 1} de ${lista.length}).`}
      </p>

      <div className="piano">
        {NOTAS.map((n, i) => (
          <button
            key={i}
            className={`tecla${acesa === i ? ' acesa' : ''}${proxima === i ? ' proxima' : ''}`}
            style={{ '--cor': n.c } as React.CSSProperties}
            onPointerDown={() => tocar(i)}
            aria-label={`Nota ${n.n}`}
          >
            <span>{n.n}</span>
          </button>
        ))}
      </div>

      {terminou && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="btn" onClick={() => setPos(0)}>
            Tocar de novo
          </button>
        </div>
      )}
    </>
  );
}
