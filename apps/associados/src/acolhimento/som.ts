import { useEffect, useState } from 'react';

// Sons da sala de acolhimento: tons suaves gerados no aparelho (sem arquivos), desligados até alguém ligar.
const CHAVE = 'uppa-acolhimento-som';
let ctx: AudioContext | null = null;

export function somLigado() {
  try {
    return localStorage.getItem(CHAVE) === 'sim';
  } catch {
    return false;
  }
}

export function ligarSom(ligado: boolean) {
  try {
    localStorage.setItem(CHAVE, ligado ? 'sim' : 'nao');
  } catch {}
  window.dispatchEvent(new Event('uppa-som'));
}

export function useSom(): [boolean, (ligado: boolean) => void] {
  const [som, setSom] = useState(somLigado);
  useEffect(() => {
    const mudou = () => setSom(somLigado());
    window.addEventListener('uppa-som', mudou);
    return () => window.removeEventListener('uppa-som', mudou);
  }, []);
  return [som, ligarSom];
}

function audio() {
  if (!somLigado()) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface Tom {
  de: number;
  para?: number;
  dur: number;
  vol: number;
  tipo?: OscillatorType;
  atraso?: number;
}

function tom({ de, para = de, dur, vol, tipo = 'sine', atraso = 0 }: Tom) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + atraso;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(de, t);
  if (para !== de) o.frequency.exponentialRampToValueAtTime(para, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const pop = () => tom({ de: 650 + Math.random() * 300, para: 240, dur: 0.15, vol: 0.08, tipo: 'triangle' });
export const nota = (freq: number) => tom({ de: freq, dur: 1.2, vol: 0.16 });
export const sininho = (freq = 660) => tom({ de: freq, dur: 1.6, vol: 0.06 });
export const acerto = () => {
  tom({ de: 523.25, dur: 0.35, vol: 0.09 });
  tom({ de: 783.99, dur: 0.5, vol: 0.09, atraso: 0.12 });
};
export const quase = () => tom({ de: 330, para: 294, dur: 0.3, vol: 0.06 });
