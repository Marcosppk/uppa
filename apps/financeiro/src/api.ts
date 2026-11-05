import { criarApi } from '@shared/api';

export const api = criarApi('uppa-financeiro-token', () => window.dispatchEvent(new Event('uppa-sair')));

export interface Usuario {
  id: number;
  nome: string;
  login: string;
  papel: Papel;
  tour_visto: number;
  versao_vista: string | null;
}

/** Perfis de acesso ao Financeiro, do maior para o menor. */
export type Papel = 'admin' | 'presidente' | 'diretoria' | 'tesoureiro';
export const PAPEIS: { valor: Papel; nome: string; descricao: string }[] = [
  { valor: 'presidente', nome: 'Presidente', descricao: 'tudo, inclusive ajustes e acessos' },
  { valor: 'admin', nome: 'Administrador', descricao: 'tudo, inclusive ajustes e acessos' },
  { valor: 'diretoria', nome: 'Membro da Diretoria', descricao: 'sócios, mensalidades, caixa e autorizar inscrições' },
  { valor: 'tesoureiro', nome: 'Tesoureiro', descricao: 'sócios, mensalidades e caixa' },
];
export const nomePapel = (p: string) => PAPEIS.find((x) => x.valor === p)?.nome ?? p;
/** Presidente e Administrador: podem tudo (ajustes, acessos, excluir sócio). */
export const podeTudo = (u: Pick<Usuario, 'papel'>) => u.papel === 'admin' || u.papel === 'presidente';
/** Autorizar inscrições: diretoria para cima. */
export const podeAutorizar = (u: Pick<Usuario, 'papel'>) => podeTudo(u) || u.papel === 'diretoria';
