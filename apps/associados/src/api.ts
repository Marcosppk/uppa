import { criarApi } from '@shared/api';
import type { Mensalidade, Socio } from '@shared/tipos';

export const api = criarApi('uppa-associados-token', () => window.dispatchEvent(new Event('uppa-sair')));

export interface Eu {
  socio: Socio;
  carteirinha: string | null;
  mensalidades: Mensalidade[];
  associacao: { nome: string; email: string; pix_chave: string; pix_nome: string; campanhas: boolean };
  /** Mensagens da diretoria ainda não lidas. */
  nao_lidas: number;
  /** Aniversários da família e datas da causa autista que caem hoje. */
  comemoracoes: Comemoracao[];
}

export interface Comemoracao {
  tipo: 'aniversario' | 'aniversario_autista' | 'causa';
  emoji: string;
  titulo: string;
  texto: string;
}

/** Endereço público usado no QR da carteirinha (no app nativo a origem não é um site). */
export const URL_PUBLICA = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.replace(/\/$/, '') || `${location.origin}${location.pathname.replace(/index\.html$/, '')}`.replace(/\/$/, '');
