// Texto do aviso: endereços viram links clicáveis e vídeos do YouTube tocam ali mesmo, no mural.
import { Fragment } from 'react';

// http(s)://..., www.... ou e-mail. O ponto final ou o parêntese depois do link não fazem parte dele.
const PADRAO = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/gi;
const FINAL = /[.,;:!?)\]}'"]+$/;

function partes(texto: string) {
  const lista: { texto: string; href?: string }[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(PADRAO)) {
    let bruto = m[0];
    const sobra = bruto.match(FINAL)?.[0] ?? '';
    bruto = bruto.slice(0, bruto.length - sobra.length);
    const ini = m.index!;
    if (ini > ultimo) lista.push({ texto: texto.slice(ultimo, ini) });
    const href = bruto.includes('@') && !/^https?:|^www\./i.test(bruto) ? `mailto:${bruto}` : /^www\./i.test(bruto) ? `https://${bruto}` : bruto;
    lista.push({ texto: bruto, href });
    ultimo = ini + bruto.length;
  }
  if (ultimo < texto.length) lista.push({ texto: texto.slice(ultimo) });
  return lista;
}

/** Código do vídeo do YouTube num endereço (watch, youtu.be, shorts, live ou embed), ou null. */
export function idYoutube(url: string): string | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else {
        const m = u.pathname.match(/^\/(shorts|live|embed)\/([^/]+)/);
        if (m) id = m[2];
      }
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function TextoAviso({ texto }: { texto: string }) {
  const lista = partes(texto);
  const videos = [...new Set(lista.map((p) => (p.href ? idYoutube(p.href) : null)).filter((x): x is string => !!x))].slice(0, 3);
  return (
    <>
      <p className="texto-aviso">
        {lista.map((p, i) =>
          p.href ? (
            <a key={i} href={p.href} target="_blank" rel="noopener noreferrer">
              {p.texto}
            </a>
          ) : (
            <Fragment key={i}>{p.texto}</Fragment>
          ),
        )}
      </p>
      {videos.map((id) => (
        <div key={id} className="video-youtube">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
            title="Vídeo do YouTube"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ))}
    </>
  );
}
