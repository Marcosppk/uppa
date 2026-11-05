// Link que abre direto a ficha de inscrição do app UPPA Associados.
// Qualquer sócio ou usuário do Financeiro gera o seu; as inscrições feitas por ele aguardam autorização de um administrador.
import { useState } from 'react';
import { Icone, useToast, Carregando } from './ui';

export interface Convite {
  link: string;
  usos: number;
}

export function LinkCadastro({ carregar }: { carregar: () => Promise<Convite> }) {
  const [convite, setConvite] = useState<Convite | null>(null);
  const [carregando, setCarregando] = useState(false);
  const toast = useToast();

  const gerar = async () => {
    setCarregando(true);
    try {
      setConvite(await carregar());
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  const texto = (link: string) => `Faça sua inscrição na UPPA Roraima — União de Pais e Pessoas Autistas: ${link}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(convite!.link);
      toast('Link copiado.');
    } catch {
      toast('Não consegui copiar. Selecione o link e copie manualmente.');
    }
  };

  const compartilhar = async () => {
    try {
      await navigator.share({ title: 'Inscrição na UPPA', text: texto(convite!.link) });
    } catch {
      /* a pessoa cancelou */
    }
  };

  if (!convite)
    return carregando ? (
      <Carregando />
    ) : (
      <button className="btn sec block" onClick={gerar}>
        <Icone nome="enviar" /> Gerar link de cadastro
      </button>
    );

  return (
    <div className="stack">
      <div className="pix-code" style={{ userSelect: 'all' }}>
        {convite.link}
      </div>
      <div className="row">
        <button className="btn sec" onClick={copiar}>
          <Icone nome="copiar" /> Copiar link
        </button>
        <a className="btn sec" href={`https://wa.me/?text=${encodeURIComponent(texto(convite.link))}`} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        {typeof navigator.share === 'function' && (
          <button className="btn sec" onClick={compartilhar}>
            Compartilhar
          </button>
        )}
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Quem abrir o link vai direto para a ficha de inscrição. {convite.usos > 0 ? `${convite.usos} inscrição(ões) já feita(s) pelo seu link. ` : ''}Cada cadastro só entra na UPPA depois da
        autorização de um administrador.
      </p>
    </div>
  );
}
