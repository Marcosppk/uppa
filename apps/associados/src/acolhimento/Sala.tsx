import type { ReactNode } from 'react';
import { Icone } from '@shared/ui';
import { useSom } from './som';
import { Sentimentos } from './Sentimentos';
import { Respirar } from './Respirar';
import { Bolhas } from './Bolhas';
import { Memoria } from './Memoria';
import { Cores } from './Cores';
import { Pintar } from './Pintar';
import { Piano } from './Piano';
import './acolhimento.css';

export const ATIVIDADES = [
  { id: 'sentimentos', emoji: '😊', t: 'Como estou', d: 'Mostre como você se sente e do que precisa', cor: '#f5a524', Jogo: Sentimentos },
  { id: 'respirar', emoji: '🌬️', t: 'Respirar', d: 'Uma bola que cresce e diminui para respirar junto', cor: '#5aa7e6', Jogo: Respirar },
  { id: 'bolhas', emoji: '🔵', t: 'Bolhas', d: 'Toque nas bolhas para estourar, sem pressa', cor: '#7c8cf0', Jogo: Bolhas },
  { id: 'memoria', emoji: '🃏', t: 'Jogo da memória', d: 'Encontre os pares de figuras', cor: '#2a9d8f', Jogo: Memoria },
  { id: 'cores', emoji: '🧺', t: 'Separar cores', d: 'Coloque cada forma no cesto da mesma cor', cor: '#e5484d', Jogo: Cores },
  { id: 'pintar', emoji: '🎨', t: 'Pintar', d: 'Desenhe, pinte e use carimbos', cor: '#8e4ec6', Jogo: Pintar },
  { id: 'piano', emoji: '🎹', t: 'Piano de cores', d: 'Toque notas suaves ou siga a música', cor: '#30a46c', Jogo: Piano },
];

export function BotaoSom() {
  const [som, setSom] = useSom();
  return (
    <button className="btn sec sm" aria-pressed={som} onClick={() => setSom(!som)} title={som ? 'Desligar os sons' : 'Ligar os sons'}>
      {som ? '🔊 Som' : '🔇 Sem som'}
    </button>
  );
}

/** Moldura de cada atividade: sempre um botão grande para voltar à sala. */
export function Atividade({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="atividade">
      <div className="ativ-topo">
        <a className="btn sec" href="#/acolhimento">
          <Icone nome="voltar" /> Sala
        </a>
        <h1>{titulo}</h1>
        <BotaoSom />
      </div>
      {children}
    </div>
  );
}

export function Jogo({ id }: { id: string }) {
  const a = ATIVIDADES.find((x) => x.id === id);
  if (!a) return <Sala />;
  return (
    <Atividade titulo={a.t}>
      <a.Jogo />
    </Atividade>
  );
}

export function Sala() {
  return (
    <>
      <div className="sala-topo">
        <div>
          <h1>Sala de acolhimento</h1>
          <p className="muted">Um cantinho calmo para brincar, relaxar e dizer como você está. Sem pressa, sem tempo e sem jeito errado.</p>
        </div>
        <BotaoSom />
      </div>

      <div className="sala-grade">
        {ATIVIDADES.map((a) => (
          <a key={a.id} className="sala-card" href={`#/acolhimento/${a.id}`} style={{ '--cor': a.cor } as React.CSSProperties}>
            <span className="sala-emoji" aria-hidden="true">
              {a.emoji}
            </span>
            <b>{a.t}</b>
            <span className="small muted">{a.d}</span>
          </a>
        ))}
      </div>

      <details className="card" style={{ marginTop: 16 }}>
        <summary>
          <b>Dicas para a família</b>
        </summary>
        <ul className="small" style={{ marginBottom: 0 }}>
          <li>Deixe a criança escolher a atividade. Aqui não existe errar nem perder.</li>
          <li>
            Use <b>Como estou</b> para ajudar quem não fala a mostrar o que sente ou do que precisa: a figura aparece bem grande na tela.
          </li>
          <li>Os sons começam desligados. Ligue no botão de som se a criança gostar.</li>
          <li>Nos jogos não aparece nenhum dado do cadastro e nada do que é feito aqui é enviado.</li>
        </ul>
      </details>
    </>
  );
}
