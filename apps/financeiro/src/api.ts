import { criarApi } from '@shared/api';

export const api = criarApi('uppa-financeiro-token', () => window.dispatchEvent(new Event('uppa-sair')));

export interface Usuario {
  id: number;
  nome: string;
  login: string;
  papel: 'admin' | 'tesoureiro';
  tour_visto: number;
  versao_vista: string | null;
}
