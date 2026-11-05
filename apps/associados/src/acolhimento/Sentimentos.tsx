import { useState } from 'react';

const SENTIMENTOS = [
  { e: '😊', t: 'Feliz', eu: 'Eu estou feliz', frase: 'Que bom! Vamos aproveitar esse sorriso.', sug: ['memoria', 'piano'], cor: '#f5c400' },
  { e: '😌', t: 'Calmo(a)', eu: 'Eu estou calmo(a)', frase: 'Que gostoso estar tranquilo.', sug: ['pintar', 'piano'], cor: '#5aa7e6' },
  { e: '😢', t: 'Triste', eu: 'Eu estou triste', frase: 'Tudo bem ficar triste. Tem gente que cuida de você.', sug: ['pintar', 'respirar'], cor: '#7c8cf0' },
  { e: '😠', t: 'Com raiva', eu: 'Eu estou com raiva', frase: 'Tudo bem sentir raiva. Vamos soltar o ar bem devagar?', sug: ['respirar', 'bolhas'], cor: '#e5484d' },
  { e: '😨', t: 'Com medo', eu: 'Eu estou com medo', frase: 'Você está seguro. Vamos respirar juntos.', sug: ['respirar', 'piano'], cor: '#8e4ec6' },
  { e: '😴', t: 'Cansado(a)', eu: 'Eu estou cansado(a)', frase: 'Que tal uma pausa bem tranquila?', sug: ['respirar'], cor: '#6b7a8f' },
  { e: '😖', t: 'Agitado(a)', eu: 'Eu estou agitado(a)', frase: 'Muita coisa ao mesmo tempo? Vamos devagar.', sug: ['bolhas', 'respirar'], cor: '#f76b15' },
  { e: '😕', t: 'Confuso(a)', eu: 'Eu estou confuso(a)', frase: 'Tudo bem não entender. Peça ajuda a alguém de confiança.', sug: ['respirar', 'cores'], cor: '#2a9d8f' },
];

const PRECISO = [
  { e: '💧', t: 'Água', eu: 'Eu preciso de água' },
  { e: '🍽️', t: 'Comer', eu: 'Eu quero comer' },
  { e: '🚽', t: 'Banheiro', eu: 'Eu preciso ir ao banheiro' },
  { e: '🤫', t: 'Silêncio', eu: 'Eu preciso de silêncio' },
  { e: '🤗', t: 'Abraço', eu: 'Eu quero um abraço' },
  { e: '✋', t: 'Pausa', eu: 'Eu preciso de uma pausa' },
  { e: '🙋', t: 'Ajuda', eu: 'Eu preciso de ajuda' },
  { e: '🛏️', t: 'Descansar', eu: 'Eu quero descansar' },
];

const NOMES: Record<string, string> = { respirar: '🌬️ Respirar', bolhas: '🔵 Bolhas', memoria: '🃏 Memória', cores: '🧺 Separar cores', pintar: '🎨 Pintar', piano: '🎹 Piano' };

interface Tela {
  e: string;
  eu: string;
  frase?: string;
  sug?: string[];
  cor?: string;
}

export function Sentimentos() {
  const [tela, setTela] = useState<Tela | null>(null);

  return (
    <>
      <h2 className="sent-titulo">Como você está agora?</h2>
      <div className="sent-grade">
        {SENTIMENTOS.map((s) => (
          <button key={s.t} className="sent-btn" style={{ '--cor': s.cor } as React.CSSProperties} onClick={() => setTela(s)}>
            <span aria-hidden="true">{s.e}</span>
            {s.t}
          </button>
        ))}
      </div>

      <h2 className="sent-titulo">Do que você precisa?</h2>
      <div className="sent-grade">
        {PRECISO.map((p) => (
          <button key={p.t} className="sent-btn" onClick={() => setTela(p)}>
            <span aria-hidden="true">{p.e}</span>
            {p.t}
          </button>
        ))}
      </div>

      {tela && (
        <div className="tela-cheia" style={{ '--cor': tela.cor ?? '#5aa7e6' } as React.CSSProperties} role="dialog" aria-label={tela.eu}>
          <div className="tela-emoji" aria-hidden="true">
            {tela.e}
          </div>
          <p className="tela-eu">{tela.eu}</p>
          {tela.frase && <p className="tela-frase">{tela.frase}</p>}
          {tela.sug && (
            <div className="row" style={{ justifyContent: 'center' }}>
              {tela.sug.map((s) => (
                <a key={s} className="btn sec" href={`#/acolhimento/${s}`}>
                  {NOMES[s]}
                </a>
              ))}
            </div>
          )}
          <button className="btn" onClick={() => setTela(null)}>
            Fechar
          </button>
        </div>
      )}
    </>
  );
}
