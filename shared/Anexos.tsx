// Anexos dos avisos: imagens em miniatura (tocar abre grande), vídeos que tocam ali mesmo e arquivos de texto para abrir ou baixar.
import { urlApi } from './api';
import type { Anexo } from './tipos';

export const ACEITOS =
  'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.m4v,.mov,.webm,.pdf,.txt,.doc,.docx,.odt,.rtf';
export const MAX_ARQUIVO = 10 * 1024 * 1024;
export const MAX_VIDEO = 60 * 1024 * 1024;
export const ehVideo = (f: File) => f.type.startsWith('video/') || /\.(mp4|m4v|mov|webm)$/i.test(f.name);

export const tamanhoArquivo = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`);

const iconeArquivo = (nome: string) => (/\.pdf$/i.test(nome) ? '📕' : /\.txt$/i.test(nome) ? '📄' : '📝');
const tipoArquivo = (nome: string) => (/\.pdf$/i.test(nome) ? 'PDF' : /\.txt$/i.test(nome) ? 'texto' : 'documento');

export function AnexosAviso({ anexos, aoRemover }: { anexos?: Anexo[]; aoRemover?: (a: Anexo) => void }) {
  if (!anexos?.length) return null;
  const imagens = anexos.filter((a) => a.imagem);
  const videos = anexos.filter((a) => a.video);
  const arquivos = anexos.filter((a) => !a.imagem && !a.video);
  return (
    <div className="anexos">
      {videos.map((a) => (
        <figure key={a.id} className="anexo-video">
          <video src={urlApi(a.url)} controls preload="metadata" playsInline aria-label={`Vídeo: ${a.nome}`} />
          <figcaption className="row">
            <span className="sp muted small">🎬 {a.nome}</span>
            {aoRemover && (
              <button type="button" className="btn ghost sm" onClick={() => aoRemover(a)} aria-label={`Remover o vídeo ${a.nome}`}>
                Remover
              </button>
            )}
          </figcaption>
        </figure>
      ))}
      {imagens.length > 0 && (
        <div className="anexos-imagens">
          {imagens.map((a) => (
            <div key={a.id} className="anexo-imagem">
              <a href={urlApi(a.url)} target="_blank" rel="noreferrer" aria-label={`Abrir a imagem ${a.nome} em tamanho grande`}>
                <img src={urlApi(a.url)} alt={a.nome} loading="lazy" />
              </a>
              {aoRemover && (
                <button type="button" className="anexo-remover" onClick={() => aoRemover(a)} aria-label={`Remover a imagem ${a.nome}`}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {arquivos.map((a) => (
        <div key={a.id} className="anexo-arquivo">
          <a href={urlApi(a.url)} target="_blank" rel="noreferrer" aria-label={`Abrir o ${tipoArquivo(a.nome)} ${a.nome}, ${tamanhoArquivo(a.tamanho)}`}>
            <span aria-hidden="true">{iconeArquivo(a.nome)}</span>
            <span className="sp">{a.nome}</span>
            <span className="muted small">{tamanhoArquivo(a.tamanho)}</span>
          </a>
          {aoRemover && (
            <button type="button" className="btn ghost sm" onClick={() => aoRemover(a)} aria-label={`Remover ${a.nome}`}>
              Remover
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Fotos grandes do celular são reduzidas (lado maior até 1600 px, JPEG) antes de enviar. GIF, vídeos e textos vão como estão. */
export async function prepararArquivo(f: File): Promise<{ arquivo: Blob; nome: string }> {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return { arquivo: f, nome: f.name };
  try {
    const img = await createImageBitmap(f);
    const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
    if (escala === 1 && f.size < 1.5e6) return { arquivo: f, nome: f.name };
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * escala);
    c.height = Math.round(img.height * escala);
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.85));
    return blob ? { arquivo: blob, nome: f.name.replace(/\.\w+$/, '') + '.jpg' } : { arquivo: f, nome: f.name };
  } catch {
    return { arquivo: f, nome: f.name };
  }
}
