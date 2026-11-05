// Foto do sócio: avatar (foto ou iniciais) e o editor para tirar/escolher, recortar em quadrado e enviar.
import { useRef } from 'react';
import { urlApi } from './api';
import { Icone, Iniciais, useAcao } from './ui';

export function Avatar({ nome, foto, tamanho = 40 }: { nome: string; foto?: string | null; tamanho?: number }) {
  if (!foto) return <Iniciais nome={nome} />;
  return <img className="avatar-foto" src={urlApi(foto)} alt={`Foto de ${nome}`} width={tamanho} height={tamanho} style={{ width: tamanho, height: tamanho }} />;
}

/** Recorta o centro da imagem em quadrado, 600×600, JPEG — fica leve e serve para a carteirinha. */
export async function fotoQuadrada(f: File): Promise<Blob> {
  const img = await createImageBitmap(f);
  const lado = Math.min(img.width, img.height);
  const c = document.createElement('canvas');
  c.width = c.height = Math.min(600, lado);
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.88));
  if (!blob) throw new Error('Não consegui ler esta imagem. Tente outra foto.');
  return blob;
}

export function EditorFoto({
  nome,
  foto,
  enviar,
  remover,
  aoMudar,
  texto = 'A foto aparece no seu perfil e na carteirinha de sócio.',
}: {
  nome: string;
  foto?: string | null;
  enviar: (b: Blob) => Promise<unknown>;
  remover: () => Promise<unknown>;
  aoMudar: () => void;
  texto?: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const { ocupado, rodar } = useAcao();
  return (
    <div className="editor-foto">
      <div className="editor-foto-img">{foto ? <Avatar nome={nome} foto={foto} tamanho={96} /> : <span className="avatar grande" aria-hidden="true">{nome.trim().split(/\s+/).map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : '')).join('').toUpperCase()}</span>}</div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="muted small">{texto}</span>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn sm" disabled={ocupado} onClick={() => entrada.current?.click()}>
            <Icone nome="camera" /> {foto ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          {foto && (
            <button type="button" className="btn ghost sm" disabled={ocupado} onClick={() => confirm('Remover a foto?') && rodar(remover, 'Foto removida.').then((ok) => ok && aoMudar())}>
              Remover
            </button>
          )}
        </div>
        <input
          ref={entrada}
          type="file"
          accept="image/*"
          hidden
          aria-label="Escolher foto"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) rodar(async () => enviar(await fotoQuadrada(f)), 'Foto salva.').then((ok) => ok && aoMudar());
          }}
        />
      </div>
    </div>
  );
}
