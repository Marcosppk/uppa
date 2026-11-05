// Parabéns do dia como um presente: envelope com fita e laço que abre com fogos e confetes.
// Quem pede menos movimento no aparelho vê a mensagem direto, sem a animação.
import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import type { Comemoracao } from './api';
import { menosMovimento } from '@shared/acessibilidade';

/** O ♾️ do Dia do Orgulho Autista aparece como o infinito colorido da neurodiversidade; os outros símbolos ficam como emoji. */
export function Simbolo({ emoji }: { emoji: string }) {
  const id = useId();
  if (emoji !== '♾️') return <>{emoji}</>;
  return (
    <svg className="infinito" viewBox="4 26 92 48" width="1.6em" height="0.84em" role="img" aria-label="Símbolo do infinito">
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#e5484d" />
          <stop offset=".2" stopColor="#f76b15" />
          <stop offset=".4" stopColor="#f5c400" />
          <stop offset=".6" stopColor="#30a46c" />
          <stop offset=".8" stopColor="#3e7bfa" />
          <stop offset="1" stopColor="#8e4ec6" />
        </linearGradient>
      </defs>
      <path d="M50 50C60 32 88 32 88 50S60 68 50 50 12 32 12 50 40 68 50 50Z" fill="none" stroke={`url(#${id})`} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CORES = ['#e5484d', '#f5c400', '#30a46c', '#3e7bfa', '#8e4ec6', '#f76b15', '#d6409f'];
const sorteio = <T,>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)];
const poucoMovimento = menosMovimento;

function Fogos() {
  const [vivo, setVivo] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVivo(false), 5500);
    return () => clearTimeout(t);
  }, []);
  const { explosoes, confetes } = useMemo(
    () => ({
      explosoes: Array.from({ length: 7 }, (_, i) => ({ x: 12 + Math.random() * 76, y: 10 + Math.random() * 40, atraso: 0.2 + i * 0.4 + Math.random() * 0.2, cor: CORES[i % CORES.length], raio: 70 + Math.random() * 40 })),
      confetes: Array.from({ length: 90 }, () => ({
        x: Math.random() * 100,
        atraso: Math.random() * 1.5,
        dur: 2.6 + Math.random() * 2,
        cor: sorteio(CORES),
        giro: Math.random() * 1080 - 540,
        deriva: Math.random() * 120 - 60,
        tam: 7 + Math.random() * 7,
        redondo: Math.random() < 0.3,
      })),
    }),
    [],
  );
  if (!vivo) return null;
  return (
    <div className="festa-camada" aria-hidden="true">
      {explosoes.map((e, i) => (
        <div key={i} className="fogo" style={{ left: `${e.x}%`, top: `${e.y}%`, '--cor': e.cor } as CSSProperties}>
          <b className="fogo-subida" style={{ animationDelay: `${e.atraso - 0.45}s` }} />
          {Array.from({ length: 18 }, (_, j) => {
            const ang = (j / 18) * 2 * Math.PI;
            return <i key={j} style={{ '--dx': `${Math.cos(ang) * e.raio}px`, '--dy': `${Math.sin(ang) * e.raio}px`, animationDelay: `${e.atraso}s` } as CSSProperties} />;
          })}
        </div>
      ))}
      {confetes.map((c, i) => (
        <i
          key={i}
          className="confete"
          style={
            {
              left: `${c.x}%`,
              width: c.tam,
              height: c.redondo ? c.tam : c.tam * 0.45,
              borderRadius: c.redondo ? '50%' : 2,
              background: c.cor,
              animationDelay: `${c.atraso}s`,
              animationDuration: `${c.dur}s`,
              '--giro': `${c.giro}deg`,
              '--deriva': `${c.deriva}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function Presente({ comemoracoes, nome }: { comemoracoes: Comemoracao[]; nome: string }) {
  // Lembra no aparelho que o presente de hoje já foi aberto (na próxima visita a carta já aparece aberta).
  const chave = `uppa-presente-${new Date().toLocaleDateString('sv-SE')}-${comemoracoes.map((c) => c.titulo).join('|')}`;
  const [estado, setEstado] = useState<'fechado' | 'abrindo' | 'aberto'>(() => {
    try {
      return localStorage.getItem(chave) ? 'aberto' : 'fechado';
    } catch {
      return 'fechado';
    }
  });
  const [festa, setFesta] = useState(0);

  const abrir = () => {
    try {
      localStorage.setItem(chave, '1');
    } catch {}
    if (poucoMovimento()) return setEstado('aberto');
    setEstado('abrindo');
    setFesta((f) => f + 1);
    setTimeout(() => setEstado('aberto'), 1600);
  };

  const tipo = comemoracoes[0].tipo;
  const chamada =
    tipo === 'aniversario' ? `${nome}, chegou um presente para você!` : tipo === 'aniversario_autista' ? 'Chegou um presente para a sua família!' : 'Chegou uma mensagem especial da UPPA!';

  return (
    <>
      {festa > 0 && <Fogos key={festa} />}
      {estado === 'aberto' ? (
        <div className="carta-aberta">
          {comemoracoes.map((c) => (
            <section key={c.titulo} className={`card parabens ${c.tipo}`} aria-label={c.titulo}>
              <span className="parabens-emoji" aria-hidden="true">
                <Simbolo emoji={c.emoji} />
              </span>
              <div>
                <h2>{c.titulo}</h2>
                <p>{c.texto}</p>
                <span className="small">Com carinho, UPPA Roraima</span>
              </div>
            </section>
          ))}
          {!poucoMovimento() && (
            <button className="btn ghost sm de-novo" onClick={() => setFesta((f) => f + 1)}>
              🎆 Soltar os fogos de novo
            </button>
          )}
        </div>
      ) : (
        <div className="presente">
          <p className="presente-chamada">🎁 {chamada}</p>
          <button className={`envelope${estado === 'abrindo' ? ' abrindo' : ''}`} onClick={estado === 'fechado' ? abrir : undefined} aria-label="Abrir o presente da UPPA">
            <span className="env-fundo" />
            <span className="env-carta">
              <Simbolo emoji={comemoracoes[0].emoji} />
            </span>
            <span className="env-frente" />
            <span className="env-aba" />
            <span className="env-fita-v" />
            <span className="env-fita-h" />
            <span className="env-laco">🎀</span>
          </button>
          <p className="muted small presente-dica">Toque no envelope para abrir</p>
        </div>
      )}
    </>
  );
}
