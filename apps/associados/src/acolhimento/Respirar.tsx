import { useEffect, useState } from 'react';
import { sininho } from './som';

const RITMOS = {
  pausa: [
    { nome: 'Puxe o ar', dica: 'pelo nariz, devagar', seg: 4, escala: 1, freq: 523.25 },
    { nome: 'Segure', dica: 'só um pouquinho', seg: 4, escala: 1, freq: 0 },
    { nome: 'Solte o ar', dica: 'pela boca, bem devagar', seg: 6, escala: 0.6, freq: 392 },
  ],
  simples: [
    { nome: 'Puxe o ar', dica: 'pelo nariz, devagar', seg: 4, escala: 1, freq: 523.25 },
    { nome: 'Solte o ar', dica: 'pela boca, bem devagar', seg: 6, escala: 0.6, freq: 392 },
  ],
};

export function Respirar() {
  const [ritmo, setRitmo] = useState<keyof typeof RITMOS>('simples');
  const [rodando, setRodando] = useState(false);
  const [passo, setPasso] = useState(0); // segundos desde o começo

  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(() => setPasso((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, [rodando]);

  const fases = RITMOS[ritmo];
  const ciclo = fases.reduce((s, f) => s + f.seg, 0);
  const noCiclo = passo % ciclo;
  let inicio = 0;
  let i = 0;
  while (noCiclo >= inicio + fases[i].seg) inicio += fases[i++].seg;
  const fase = fases[i];
  const voltas = Math.floor(passo / ciclo);

  useEffect(() => {
    if (rodando && noCiclo === inicio && fase.freq) sininho(fase.freq);
  }, [rodando, noCiclo, inicio, fase.freq]);

  const parar = () => {
    setRodando(false);
    setPasso(0);
  };

  return (
    <div className="resp">
      <div className="seg">
        <button aria-pressed={ritmo === 'simples'} onClick={() => (parar(), setRitmo('simples'))}>
          Puxar e soltar
        </button>
        <button aria-pressed={ritmo === 'pausa'} onClick={() => (parar(), setRitmo('pausa'))}>
          Com pausa
        </button>
      </div>

      <div className="resp-palco">
        <div
          className="resp-bola"
          style={{ transform: `scale(${rodando ? fase.escala : 0.6})`, transitionDuration: `${rodando ? fase.seg : 0.8}s` }}
          aria-hidden="true"
        />
        <div className="resp-texto" aria-live="polite">
          {rodando ? (
            <>
              <b>{fase.nome}</b>
              <span>{fase.dica}</span>
              <span className="resp-num">{noCiclo - inicio + 1}</span>
            </>
          ) : (
            <b>Vamos respirar?</b>
          )}
        </div>
      </div>

      <p className="muted" style={{ textAlign: 'center', minHeight: '1.5em' }}>
        {voltas > 0 && `Você já respirou ${voltas} ${voltas === 1 ? 'vez' : 'vezes'}. Muito bem!`}
      </p>
      <button className="btn block" onClick={() => (rodando ? parar() : setRodando(true))}>
        {rodando ? 'Parar' : 'Começar'}
      </button>
    </div>
  );
}
