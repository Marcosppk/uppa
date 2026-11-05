import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import logoUppa from './logo-uppa.webp';

// ---------------- Rotas por hash (#/socios/12) — funcionam igual no navegador e no app nativo ----------------
export function useRota() {
  const ler = () => window.location.hash.replace(/^#/, '') || '/';
  const [rota, setRota] = useState(ler);
  useEffect(() => {
    const f = () => {
      setRota(ler());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return rota;
}
export const ir = (r: string) => {
  window.location.hash = r;
};

// ---------------- Carregar dados ----------------
export function useDados<T>(carregar: () => Promise<T>, deps: unknown[] = []) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    setErro(null);
    carregar()
      .then((d) => vivo && setDados(d))
      .catch((e) => vivo && setErro(e.message));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  const recarregar = useCallback(() => setN((x) => x + 1), []);
  return { dados, erro, recarregar, setDados };
}

// ---------------- Avisos rápidos ----------------
const ToastCtx = createContext<(msg: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3200);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <ToastCtx.Provider value={setMsg}>
      {children}
      {/* A área "ao vivo" fica sempre na página, para o leitor de tela anunciar cada mensagem nova. */}
      <div role="status" aria-live="polite">
        {msg && <div className="toast">{msg}</div>}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Executa uma ação mostrando erro/sucesso. */
export function useAcao() {
  const toast = useToast();
  const [ocupado, setOcupado] = useState(false);
  const rodar = useCallback(
    async (fn: () => Promise<unknown>, sucesso?: string) => {
      setOcupado(true);
      try {
        await fn();
        if (sucesso) toast(sucesso);
        return true;
      } catch (e) {
        toast((e as Error).message);
        return false;
      } finally {
        setOcupado(false);
      }
    },
    [toast],
  );
  return { ocupado, rodar };
}

// ---------------- Componentes ----------------
export const Carregando = () => <div className="spinner" role="status" aria-label="Carregando" />;

export function Estado({ erro, children }: { erro?: string | null; children?: ReactNode }) {
  if (erro) return <div className="alert bad">{erro}</div>;
  return <>{children ?? <Carregando />}</>;
}

export function Campo({ rotulo, ajuda, children }: { rotulo: string; ajuda?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{rotulo}</span>
      {children}
      {ajuda && <small>{ajuda}</small>}
    </label>
  );
}

export function SimNao({ valor, onChange, rotuloSim = 'Sim', rotuloNao = 'Não' }: { valor: boolean | null | undefined; onChange: (v: boolean) => void; rotuloSim?: string; rotuloNao?: string }) {
  return (
    <div className="seg" role="group">
      <button type="button" aria-pressed={valor === true} onClick={() => onChange(true)}>
        {rotuloSim}
      </button>
      <button type="button" aria-pressed={valor === false} onClick={() => onChange(false)}>
        {rotuloNao}
      </button>
    </div>
  );
}

export function Modal({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [aoFechar]);
  // Acessibilidade: o foco entra no diálogo, o Tab não sai dele e, ao fechar, volta para onde estava.
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    const focaveis = () => [...(caixa.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])];
    (focaveis().find((el) => !el.closest('header')) ?? caixa.current)?.focus();
    const prender = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const l = focaveis();
      if (!l.length) return;
      if (e.shiftKey && document.activeElement === l[0]) {
        e.preventDefault();
        l[l.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === l[l.length - 1]) {
        e.preventDefault();
        l[0].focus();
      }
    };
    window.addEventListener('keydown', prender);
    return () => {
      window.removeEventListener('keydown', prender);
      antes?.focus?.();
    };
  }, []);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={idTitulo} ref={caixa} tabIndex={-1}>
        <header>
          <h2 id={idTitulo}>{titulo}</h2>
          <button className="btn ghost sm" onClick={aoFechar} aria-label="Fechar">
            <Icone nome="x" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

const STATUS_TAG: Record<string, [string, string]> = {
  pendente: ['warn', 'Em aberto'],
  informada: ['info', 'Pagamento informado'],
  paga: ['ok', 'Paga'],
  isenta: ['', 'Isenta'],
};
export const TagMensalidade = ({ status }: { status: string }) => {
  const [c, t] = STATUS_TAG[status] ?? ['', status];
  return <span className={`tag ${c}`}>{t}</span>;
};
const SOCIO_TAG: Record<string, [string, string]> = { pendente: ['warn', 'Aguardando aprovação'], ativo: ['ok', 'Ativo'], inativo: ['bad', 'Inativo'] };
export const TagSocio = ({ status }: { status: string }) => {
  const [c, t] = SOCIO_TAG[status] ?? ['', status];
  return <span className={`tag ${c}`}>{t}</span>;
};

export const Iniciais = ({ nome }: { nome: string }) => {
  const p = nome.trim().split(/\s+/);
  return <span className="avatar">{(p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()}</span>;
};

// Ícones de traço (24×24)
const ICONES: Record<string, string> = {
  inicio: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  socios: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22 19v-1a4 4 0 0 0-3-3.87M16 3.13a3.5 3.5 0 0 1 0 6.75',
  mensal: 'M4 5h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1M3 10h18M8 3v4M16 3v4M8 15h3',
  caixa: 'M3 7h18v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 7l2-3h14l2 3M16 13h2',
  avisos: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1M15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12',
  config: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1',
  cartao: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1M8 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4M5 16a3 3 0 0 1 6 0M14 9h5M14 13h4',
  perfil: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9M4 21a8 8 0 0 1 16 0',
  sair: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  mais: 'M12 5v14M5 12h14',
  busca: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M21 21l-4.3-4.3',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  voltar: 'M15 18l-6-6 6-6',
  seta: 'M9 18l6-6-6-6',
  pix: 'M12 2.5 21.5 12 12 21.5 2.5 12zM8 12h8',
  copiar: 'M9 9h11v11H9zM5 15H4V4h11v1',
  baixar: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  enviar: 'M12 21V9M7 14l5-5 5 5M5 3h14',
  agenda: 'M4 5h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1M3 10h18M8 3v4M16 3v4M7.5 14h1M11.5 14h1M15.5 14h1M7.5 17h1M11.5 17h1',
  mensagem: 'M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1M7 9h10M7 12.5h6',
  camera: 'M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  documento: 'M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1M14 3v5h5M8.5 13h7M8.5 16.5h7',
  coracao: 'M12 20s-7.5-4.6-9.3-9C1.4 7.7 3.4 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3.1 1.6-1.9 3.1-3.1 5.2-3.1 3.4 0 5.4 3.2 4.1 6.5C19.5 15.4 12 20 12 20z',
};
export function Icone({ nome, className = 'ico' }: { nome: keyof typeof ICONES | string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONES[nome] ?? ''} />
    </svg>
  );
}

/** Logo oficial da UPPA Roraima (mão colorida em quebra-cabeça), num quadro branco para ficar bem também no tema escuro. */
export function Logo({ tamanho = 44, prioridade = false }: { tamanho?: number; prioridade?: boolean }) {
  return <img className="logo-uppa" src={logoUppa} width={tamanho} height={tamanho} alt="UPPA Roraima — União de Pais e Pessoas Autistas" decoding="async" fetchPriority={prioridade ? 'high' : 'auto'} />;
}
