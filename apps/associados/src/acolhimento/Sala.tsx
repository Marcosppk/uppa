import type { MouseEvent, ReactNode } from 'react';
import { Icone } from '@shared/ui';
import { menosMovimento } from '@shared/acessibilidade';
import { useSom, sininho } from './som';
import { Sentimentos } from './Sentimentos';
import { Respirar } from './Respirar';
import { Bolhas } from './Bolhas';
import { Memoria } from './Memoria';
import { Cores } from './Cores';
import { Pintar } from './Pintar';
import { Piano } from './Piano';
import imgSentimentos from './img/sentimentos.jpg';
import imgRespirar from './img/respirar.jpg';
import imgBolhas from './img/bolhas.jpg';
import imgMemoria from './img/memoria.jpg';
import imgCores from './img/cores.jpg';
import imgPintar from './img/pintar.jpg';
import imgPiano from './img/piano.jpg';
import './acolhimento.css';

// `nota`: cada card toca sempre a mesma nota suave (escala pentatônica) ao ser tocado, só se o som estiver ligado.
export const ATIVIDADES = [
  { id: 'sentimentos', emoji: '😊', img: imgSentimentos, nota: 523.25, t: 'Como estou', d: 'Mostre como você se sente e do que precisa', cor: '#f5a524', Jogo: Sentimentos },
  { id: 'respirar', emoji: '🌬️', img: imgRespirar, nota: 587.33, t: 'Respirar', d: 'Uma bola que cresce e diminui para respirar junto', cor: '#5aa7e6', Jogo: Respirar },
  { id: 'bolhas', emoji: '🔵', img: imgBolhas, nota: 659.25, t: 'Bolhas', d: 'Toque nas bolhas para estourar, sem pressa', cor: '#7c8cf0', Jogo: Bolhas },
  { id: 'memoria', emoji: '🃏', img: imgMemoria, nota: 783.99, t: 'Jogo da memória', d: 'Encontre os pares de figuras', cor: '#2a9d8f', Jogo: Memoria },
  { id: 'cores', emoji: '🧺', img: imgCores, nota: 880, t: 'Separar cores', d: 'Coloque cada forma no cesto da mesma cor', cor: '#e5484d', Jogo: Cores },
  { id: 'pintar', emoji: '🎨', img: imgPintar, nota: 1046.5, t: 'Pintar', d: 'Desenhe, pinte e use carimbos', cor: '#8e4ec6', Jogo: Pintar },
  { id: 'piano', emoji: '🎹', img: imgPiano, nota: 1174.66, t: 'Piano de cores', d: 'Toque notas suaves ou siga a música', cor: '#30a46c', Jogo: Piano },
];

/** Ao tocar: o card "afunda" por um instante (para a criança ver que funcionou) e depois abre. Sem animação, abre na hora. */
function abrirCard(e: MouseEvent<HTMLAnchorElement>, nota: number) {
  sininho(nota);
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || menosMovimento()) return;
  e.preventDefault();
  const card = e.currentTarget;
  card.classList.add('tocado');
  const destino = card.getAttribute('href')!;
  setTimeout(() => {
    location.hash = destino;
  }, 170);
}

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
          <a
            key={a.id}
            className="sala-card"
            href={`#/acolhimento/${a.id}`}
            onClick={(e) => abrirCard(e, a.nota)}
            style={{ '--cor': a.cor } as React.CSSProperties}
          >
            <span className="sala-arte">
              <img src={a.img} width={512} height={512} alt="" decoding="async" draggable={false} />
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
