// Laudos e documentos do sócio: foto tirada na hora (ou da galeria) ou PDF.
// Usado pelo próprio sócio (Meus dados) e pela equipe (ficha do sócio no Financeiro).
import { useRef, useState } from 'react';
import { urlApi } from './api';
import { Campo, Estado, Icone, useAcao, useDados } from './ui';
import { dataBr } from './formato';
import { TIPOS_DOCUMENTO, rotulo } from './opcoes.js';
import { tamanhoArquivo } from './Anexos';
import type { Documento } from './tipos';

/** Fotos de documento: reduz para no máximo 2000 px (fica legível e leve). PDF vai como está. */
async function prepararDocumento(f: File): Promise<Blob> {
  if (f.type === 'application/pdf' || !f.type.startsWith('image/')) return f;
  try {
    const img = await createImageBitmap(f);
    const escala = Math.min(1, 2000 / Math.max(img.width, img.height));
    if (escala === 1 && f.size < 2.5e6) return f;
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * escala);
    c.height = Math.round(img.height * escala);
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    return (await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.85))) ?? f;
  } catch {
    return f;
  }
}

export function Documentos({
  carregar,
  enviar,
  remover,
  titulo = 'Laudos e documentos',
  explicacao,
}: {
  carregar: () => Promise<Documento[]>;
  enviar: (arquivo: Blob, nome: string, tipo: string, descricao: string) => Promise<unknown>;
  remover: (id: number) => Promise<unknown>;
  titulo?: string;
  explicacao?: string;
}) {
  const { dados, erro, recarregar } = useDados(carregar);
  const [tipo, setTipo] = useState('laudo');
  const [descricao, setDescricao] = useState('');
  const { ocupado, rodar } = useAcao();
  const camera = useRef<HTMLInputElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  const mandar = (f: File | undefined) => {
    if (!f) return;
    rodar(async () => {
      const b = await prepararDocumento(f);
      const nome = b === f ? f.name : f.name.replace(/\.\w+$/, '') + '.jpg';
      await enviar(b, nome, tipo, descricao);
    }, 'Documento enviado.').then((ok) => {
      if (ok) {
        setDescricao('');
        recarregar();
      }
    });
  };

  return (
    <section className="card stack" aria-labelledby="titulo-documentos">
      <h2 id="titulo-documentos" style={{ margin: 0 }}>
        {titulo}
      </h2>
      {explicacao && (
        <p className="muted small" style={{ margin: 0 }}>
          {explicacao}
        </p>
      )}
      <div className="grid2">
        <Campo rotulo="Tipo de documento">
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Descrição (opcional)">
          <input className="input" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={120} placeholder="Ex.: laudo do João, 2025" />
        </Campo>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn" disabled={ocupado} onClick={() => camera.current?.click()}>
          <Icone nome="camera" /> {ocupado ? 'Enviando…' : 'Tirar foto do documento'}
        </button>
        <button type="button" className="btn sec" disabled={ocupado} onClick={() => arquivo.current?.click()}>
          <Icone nome="documento" /> Escolher foto ou PDF
        </button>
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden aria-label="Tirar foto do documento" onChange={(e) => (mandar(e.target.files?.[0]), (e.target.value = ''))} />
        <input ref={arquivo} type="file" accept="image/*,application/pdf" hidden aria-label="Escolher foto ou PDF" onChange={(e) => (mandar(e.target.files?.[0]), (e.target.value = ''))} />
      </div>
      <span className="muted small">Foto (JPG, PNG) ou PDF, até 10 MB. Tire a foto de cima, com boa luz e o documento inteiro aparecendo.</span>

      {!dados ? (
        <Estado erro={erro} />
      ) : dados.length === 0 ? (
        <div className="empty">Nenhum documento enviado ainda.</div>
      ) : (
        <ul className="list">
          {dados.map((d) => (
            <li key={d.id}>
              <a href={urlApi(d.url)} target="_blank" rel="noreferrer" className="doc-miniatura" aria-label={`Abrir ${rotulo(TIPOS_DOCUMENTO, d.tipo)}${d.descricao ? `: ${d.descricao}` : ''}`}>
                {d.imagem ? <img src={urlApi(d.url)} alt="" loading="lazy" /> : <span aria-hidden="true">📕</span>}
              </a>
              <div className="sp">
                <b>{rotulo(TIPOS_DOCUMENTO, d.tipo)}</b>
                <div className="muted small">
                  {d.descricao ? `${d.descricao} · ` : ''}
                  {dataBr(d.criado_em)} · {tamanhoArquivo(d.tamanho)} · enviado por {d.enviado_por}
                </div>
              </div>
              <button type="button" className="btn ghost sm" disabled={ocupado} onClick={() => confirm('Remover este documento?') && rodar(() => remover(d.id), 'Documento removido.').then((ok) => ok && recarregar())} aria-label={`Remover ${rotulo(TIPOS_DOCUMENTO, d.tipo)}`}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
