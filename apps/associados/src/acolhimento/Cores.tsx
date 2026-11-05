import { useState } from 'react';
import { acerto, quase } from './som';

const PALETA = [
  { n: 'vermelho', f: 'vermelha', c: '#e5484d' },
  { n: 'azul', f: 'azul', c: '#3e7bfa' },
  { n: 'amarelo', f: 'amarela', c: '#f5c400' },
  { n: 'verde', f: 'verde', c: '#30a46c' },
  { n: 'roxo', f: 'roxa', c: '#8e4ec6' },
];
const FORMAS = ['circulo', 'quadrado', 'triangulo', 'estrela', 'coracao'] as const;
type FormaNome = (typeof FORMAS)[number];
const NIVEIS = [
  { t: '2 cores', cores: 2 },
  { t: '3 cores', cores: 3 },
  { t: '5 cores', cores: 5 },
];

const CAMINHOS: Record<FormaNome, string> = {
  circulo: 'M50 8a42 42 0 1 0 0.01 0z',
  quadrado: 'M12 12h76v76H12z',
  triangulo: 'M50 8 92 88H8z',
  estrela: 'M50 6l12.4 27.6 30 3.2-22.5 20.2 6.5 29.6L50 71.3 23.6 86.6l6.5-29.6L7.6 36.8l30-3.2z',
  coracao: 'M50 88S8 62 8 34a20 20 0 0 1 42-10 20 20 0 0 1 42 10c0 28-42 54-42 54z',
};

export function Forma({ forma, cor, tam = 120 }: { forma: FormaNome; cor: string; tam?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={tam} height={tam} aria-hidden="true">
      <path d={CAMINHOS[forma]} fill={cor} stroke="rgb(0 0 0 / 15%)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

const sortear = (cores: number, antes?: { cor: number; forma: FormaNome }) => {
  let item;
  do item = { cor: Math.floor(Math.random() * cores), forma: FORMAS[Math.floor(Math.random() * FORMAS.length)] };
  while (antes && item.cor === antes.cor && item.forma === antes.forma);
  return item;
};

export function Cores() {
  const [nivel, setNivel] = useState(0);
  const [item, setItem] = useState(() => sortear(NIVEIS[0].cores));
  const [cestos, setCestos] = useState<number[]>(() => PALETA.map(() => 0));
  const [dica, setDica] = useState('');
  const [tremer, setTremer] = useState(0);
  const [festa, setFesta] = useState(0);
  const total = cestos.reduce((a, b) => a + b, 0);
  const qtd = NIVEIS[nivel].cores;

  const trocarNivel = (n: number) => {
    setNivel(n);
    setItem(sortear(NIVEIS[n].cores));
    setCestos(PALETA.map(() => 0));
    setDica('');
  };

  const escolher = (ci: number) => {
    if (ci === item.cor) {
      acerto();
      setCestos((cs) => cs.map((v, i) => (i === ci ? v + 1 : v)));
      setDica('');
      setTremer(0);
      setFesta(ci + 1);
      setTimeout(() => setFesta(0), 500);
      setItem(sortear(qtd, item));
    } else {
      quase();
      setTremer((t) => t + 1);
      setDica(`Quase! Essa forma é ${PALETA[item.cor].f}. Procure o cesto ${PALETA[item.cor].n}.`);
    }
  };

  return (
    <>
      <div className="row" style={{ justifyContent: 'center', marginBottom: 8 }}>
        <div className="seg">
          {NIVEIS.map((n, i) => (
            <button key={n.t} aria-pressed={nivel === i} onClick={() => trocarNivel(i)}>
              {n.t}
            </button>
          ))}
        </div>
      </div>

      <div className="cores-item">
        <div key={`${item.cor}-${item.forma}-${tremer}`} className={tremer ? 'cores-forma treme' : 'cores-forma'}>
          <Forma forma={item.forma} cor={PALETA[item.cor].c} tam={140} />
        </div>
        <p className="cores-dica" aria-live="polite">
          {dica || (total > 0 && total % 10 === 0 ? `🌟 ${total} formas no lugar certo! Muito bem!` : 'Em qual cesto vai esta forma?')}
        </p>
      </div>

      <div className="cores-cestos" style={{ gridTemplateColumns: `repeat(${Math.min(qtd, 3)}, 1fr)` }}>
        {PALETA.slice(0, qtd).map((p, i) => (
          <button key={p.n} className={festa === i + 1 ? 'cesto pulo' : 'cesto'} style={{ '--cor': p.c } as React.CSSProperties} onClick={() => escolher(i)}>
            <span className="cesto-corpo">{cestos[i] > 0 && <span className="cesto-qtd">{cestos[i]}</span>}</span>
            {p.n}
          </button>
        ))}
      </div>
    </>
  );
}
