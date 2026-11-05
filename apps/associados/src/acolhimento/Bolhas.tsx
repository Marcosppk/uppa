import { useEffect, useRef, useState } from 'react';
import { pop } from './som';

const CORES = ['#8ecae6', '#bde0fe', '#cdb4db', '#ffc8dd', '#b9fbc0', '#fde68a', '#a0c4ff', '#ffd6a5'];

interface Bolha {
  id: number;
  x: number;
  tam: number;
  dur: number;
  cor: string;
  estourou?: boolean;
}

export function Bolhas() {
  const [bolhas, setBolhas] = useState<Bolha[]>([]);
  const [estouradas, setEstouradas] = useState(0);
  const prox = useRef(1);

  useEffect(() => {
    const nova = (): Bolha => ({
      id: prox.current++,
      x: 4 + Math.random() * 78,
      tam: 56 + Math.random() * 64,
      dur: 8 + Math.random() * 6,
      cor: CORES[Math.floor(Math.random() * CORES.length)],
    });
    setBolhas([nova(), nova(), nova()]);
    const t = setInterval(() => setBolhas((bs) => (bs.length >= 14 ? bs : [...bs, nova()])), 900);
    return () => clearInterval(t);
  }, []);

  const tirar = (id: number) => setBolhas((bs) => bs.filter((b) => b.id !== id));
  const estourar = (id: number) => {
    pop();
    setEstouradas((n) => n + 1);
    setBolhas((bs) => bs.map((b) => (b.id === id ? { ...b, estourou: true } : b)));
  };

  return (
    <>
      <div className="bolhas-area">
        {bolhas.map((b) => (
          <div
            key={b.id}
            className="bolha-sobe"
            style={{ left: `${b.x}%`, width: b.tam, height: b.tam, animationDuration: `${b.dur}s` }}
            onAnimationEnd={(e) => e.target === e.currentTarget && tirar(b.id)}
          >
            <button
              className={b.estourou ? 'bolha estourou' : 'bolha'}
              style={{ '--cor': b.cor } as React.CSSProperties}
              aria-label="Estourar bolha"
              disabled={b.estourou}
              onPointerDown={() => !b.estourou && estourar(b.id)}
              onAnimationEnd={(e) => {
                e.stopPropagation();
                if (b.estourou) tirar(b.id);
              }}
            />
          </div>
        ))}
      </div>
      <p className="muted" style={{ textAlign: 'center', margin: '10px 0 0' }}>
        {estouradas === 0 ? 'Toque nas bolhas.' : `Você estourou ${estouradas} ${estouradas === 1 ? 'bolha' : 'bolhas'}!`}
      </p>
    </>
  );
}
