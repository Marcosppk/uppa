import { useEffect, useState } from 'react';

/** Imagem (data URL) do QR Code do texto. A biblioteca só é baixada quando algum QR aparece na tela. */
export function useQr(texto: string | null) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    if (!texto) return setImg(null);
    import('qrcode').then((m) => m.default.toDataURL(texto, { margin: 1, width: 420, errorCorrectionLevel: 'M' })).then(setImg);
  }, [texto]);
  return img;
}
