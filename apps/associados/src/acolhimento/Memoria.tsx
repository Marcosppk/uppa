import { useRef, useState } from 'react';
import { acerto } from './som';

const FIGURAS = ['🐶', '🐱', '🐢', '🦋', '🐠', '🌻', '🍎', '🚗', '⭐', '🐘', '🦁', '🌈'];
const NIVEIS = [
  { t: 'Fácil', pares: 3, colunas: 3 },
  { t: 'Médio', pares: 6, colunas: 4 },
  { t: 'Difícil', pares: 8, colunas: 4 },
];

interface Carta {
  id: number;
  fig: string;
  virada: boolean;
  achada: boolean;
}

function embaralhar<T>(lista: T[]) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function novoJogo(pares: number): Carta[] {
  const figs = embaralhar(FIGURAS).slice(0, pares);
  return embaralhar([...figs, ...figs]).map((fig, id) => ({ id, fig, virada: false, achada: false }));
}

export function Memoria() {
  const [nivel, setNivel] = useState(0);
  const [cartas, setCartas] = useState(() => novoJogo(NIVEIS[0].pares));
  const [tentativas, setTentativas] = useState(0);
  const espera = useRef(false);

  const recomecar = (n = nivel) => {
    setNivel(n);
    setCartas(novoJogo(NIVEIS[n].pares));
    setTentativas(0);
    espera.current = false;
  };

  const virar = (c: Carta) => {
    if (espera.current || c.virada || c.achada) return;
    const abertas = cartas.filter((x) => x.virada && !x.achada);
    const agora = cartas.map((x) => (x.id === c.id ? { ...x, virada: true } : x));
    setCartas(agora);
    if (abertas.length !== 1) return;
    setTentativas((t) => t + 1);
    const outra = abertas[0];
    if (outra.fig === c.fig) {
      acerto();
      setCartas(agora.map((x) => (x.fig === c.fig ? { ...x, achada: true } : x)));
    } else {
      espera.current = true;
      setTimeout(() => {
        setCartas((cs) => cs.map((x) => (x.id === c.id || x.id === outra.id ? { ...x, virada: false } : x)));
        espera.current = false;
      }, 1000);
    }
  };

  const fim = cartas.every((c) => c.achada);

  return (
    <>
      <div className="row" style={{ justifyContent: 'center', marginBottom: 12 }}>
        <div className="seg">
          {NIVEIS.map((n, i) => (
            <button key={n.t} aria-pressed={nivel === i} onClick={() => recomecar(i)}>
              {n.t}
            </button>
          ))}
        </div>
      </div>

      {fim ? (
        <div className="card festa">
          <div className="festa-emoji">🎉</div>
          <h2>Você encontrou todos os pares!</h2>
          <p className="muted">
            Foram {tentativas} {tentativas === 1 ? 'tentativa' : 'tentativas'}.
          </p>
          <button className="btn" onClick={() => recomecar()}>
            Jogar de novo
          </button>
        </div>
      ) : (
        <div className="mem-grade" style={{ gridTemplateColumns: `repeat(${NIVEIS[nivel].colunas}, 1fr)` }}>
          {cartas.map((c) => (
            <button key={c.id} className={`mem-carta${c.virada || c.achada ? ' aberta' : ''}${c.achada ? ' achada' : ''}`} onClick={() => virar(c)} aria-label={c.virada || c.achada ? c.fig : 'Carta virada'}>
              <span className="mem-frente" aria-hidden="true">
                {c.fig}
              </span>
              <span className="mem-verso" aria-hidden="true">
                ?
              </span>
            </button>
          ))}
        </div>
      )}
      {!fim && tentativas > 0 && (
        <p className="muted" style={{ textAlign: 'center' }}>
          {tentativas} {tentativas === 1 ? 'tentativa' : 'tentativas'}
        </p>
      )}
    </>
  );
}
