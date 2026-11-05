import { useEffect, useRef, useState } from 'react';

const CORES = ['#12283b', '#e5484d', '#f76b15', '#f5c400', '#30a46c', '#12a594', '#3e7bfa', '#8e4ec6', '#d6409f', '#8d5a3b', '#9aa5b1'];
const TAMANHOS = [6, 14, 28];
const CARIMBOS = ['⭐', '❤️', '🌸', '🐶', '🌈', '☀️', '🦋', '🐠'];
const BORRACHA = 'borracha';

export function Pintar() {
  const tela = useRef<HTMLCanvasElement>(null);
  const ultimo = useRef<{ x: number; y: number } | null>(null);
  const historico = useRef<ImageData[]>([]);
  const [cor, setCor] = useState(CORES[1]);
  const [tam, setTam] = useState(TAMANHOS[1]);
  const [ferramenta, setFerramenta] = useState('pincel'); // pincel, borracha ou um carimbo
  const [podeDesfazer, setPodeDesfazer] = useState(false);

  const ctx = () => tela.current!.getContext('2d')!;

  const pintarFundo = () => {
    const c = tela.current!;
    const g = ctx();
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    g.restore();
  };

  useEffect(() => {
    const c = tela.current!;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    ctx().scale(dpr, dpr);
    pintarFundo();
  }, []);

  const guardar = () => {
    const c = tela.current!;
    historico.current.push(ctx().getImageData(0, 0, c.width, c.height));
    if (historico.current.length > 20) historico.current.shift();
    setPodeDesfazer(true);
  };

  const ponto = (e: React.PointerEvent) => {
    const r = tela.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const linha = (de: { x: number; y: number }, ate: { x: number; y: number }) => {
    const g = ctx();
    g.strokeStyle = ferramenta === BORRACHA ? '#ffffff' : cor;
    g.lineWidth = ferramenta === BORRACHA ? tam * 2 : tam;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(de.x, de.y);
    g.lineTo(ate.x, ate.y);
    g.stroke();
  };

  const comecar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    guardar();
    const p = ponto(e);
    if (ferramenta !== 'pincel' && ferramenta !== BORRACHA) {
      const g = ctx();
      g.font = `${tam * 3 + 20}px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(ferramenta, p.x, p.y);
      return;
    }
    ultimo.current = p;
    linha(p, p);
  };

  const mover = (e: React.PointerEvent) => {
    if (!ultimo.current) return;
    const p = ponto(e);
    linha(ultimo.current, p);
    ultimo.current = p;
  };

  const desfazer = () => {
    const img = historico.current.pop();
    if (img) ctx().putImageData(img, 0, 0);
    setPodeDesfazer(historico.current.length > 0);
  };

  const salvar = () => {
    const a = document.createElement('a');
    a.download = 'desenho-uppa.png';
    a.href = tela.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div className="pintar">
      <canvas ref={tela} className="pintar-tela" onPointerDown={comecar} onPointerMove={mover} onPointerUp={() => (ultimo.current = null)} onPointerCancel={() => (ultimo.current = null)} aria-label="Folha para desenhar" />

      <div className="pintar-barra" role="toolbar" aria-label="Cores">
        {CORES.map((c) => (
          <button key={c} className="pintar-cor" style={{ background: c }} aria-pressed={ferramenta === 'pincel' && cor === c} aria-label={`Cor ${c}`} onClick={() => (setCor(c), setFerramenta('pincel'))} />
        ))}
      </div>
      <div className="pintar-barra" role="toolbar" aria-label="Pincel e carimbos">
        {TAMANHOS.map((t) => (
          <button key={t} className="pintar-ferr" aria-pressed={tam === t} aria-label={`Pincel tamanho ${t}`} onClick={() => setTam(t)}>
            <span className="pintar-ponto" style={{ width: t, height: t }} />
          </button>
        ))}
        <button className="pintar-ferr" aria-pressed={ferramenta === BORRACHA} onClick={() => setFerramenta(BORRACHA)} title="Borracha">
          🧽
        </button>
        {CARIMBOS.map((c) => (
          <button key={c} className="pintar-ferr" aria-pressed={ferramenta === c} onClick={() => setFerramenta(c)} title="Carimbo">
            {c}
          </button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn sec sm" disabled={!podeDesfazer} onClick={desfazer}>
          ↩️ Desfazer
        </button>
        <button className="btn sec sm" onClick={() => (guardar(), pintarFundo())}>
          🗑️ Limpar
        </button>
        <button className="btn sec sm" onClick={salvar}>
          💾 Guardar desenho
        </button>
      </div>
    </div>
  );
}
