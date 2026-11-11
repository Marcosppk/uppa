// Salvar arquivos gerados pelo app (CSV, cópia do banco, convite de agenda, desenho).
// No navegador, o arquivo é baixado. No app de iPhone/Android, o "baixar" do navegador não funciona:
// o arquivo é gravado no aparelho e abre a folha de compartilhar (Salvar em Arquivos, WhatsApp, e-mail…).
import { Capacitor } from '@capacitor/core';

/** true quando roda dentro do app instalado (Capacitor), e não no navegador. */
export const appNativo = Capacitor.isNativePlatform();

function emBase64(blob: Blob): Promise<string> {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result).replace(/^data:[^,]*,/, ''));
    leitor.onerror = () => falha(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

export async function salvarArquivo(blob: Blob, nome: string): Promise<void> {
  if (appNativo) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
    const { uri } = await Filesystem.writeFile({ path: nome, data: await emBase64(blob), directory: Directory.Cache });
    try {
      await Share.share({ title: nome, files: [uri] });
    } catch (e) {
      // Fechar a folha de compartilhar sem escolher nada não é erro.
      if (!/cancel/i.test(String((e as Error)?.message ?? e))) throw e;
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
