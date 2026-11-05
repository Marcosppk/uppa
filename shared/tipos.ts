export interface Autista {
  id?: number;
  nome: string;
  nascimento: string | null;
  nascimento_texto?: string | null;
  idade_informada?: string | null;
}

export interface Socio {
  id: number;
  matricula: number | null;
  status: 'pendente' | 'ativo' | 'inativo';
  inscrito_em: string;
  email: string | null;
  nome: string;
  /** AAAA-MM-DD — usado para os parabéns no aniversário. */
  nascimento?: string | null;
  profissao: string | null;
  cpf: string | null;
  endereco: string | null;
  telefone: string | null;
  renda_familiar: string | null;
  categoria: string | null;
  dependente_nome: string | null;
  dependente_cpf: string | null;
  qtd_autistas: number | null;
  atividade_remunerada: string | null;
  participacao_economica: string | null;
  recebe_bpc: boolean | null;
  valor_mensal: number;
  isencao: string | null;
  autoriza_imagem: boolean | null;
  ciente_estatuto: boolean | null;
  ciente_documentos: boolean | null;
  documentos: string | null;
  controle_planilha: string | null;
  observacoes: string | null;
  tem_senha: boolean;
  /** Inscrição feita por link de cadastro: quem convidou. */
  convidado_por?: string | null;
  autistas?: Autista[];
  mensalidades?: Mensalidade[];
  n_autistas?: number;
  ultima_paga?: string | null;
  abertas?: number;
}

export interface Mensalidade {
  id: number;
  socio_id: number;
  competencia: string;
  valor: number;
  status: 'pendente' | 'informada' | 'paga' | 'isenta';
  pago_em: string | null;
  forma: string | null;
  informado_em: string | null;
  informado_obs: string | null;
  pix?: string | null;
  nome?: string;
  matricula?: number | null;
  telefone?: string | null;
}

export interface Lancamento {
  id: number;
  tipo: 'receita' | 'despesa';
  categoria: string;
  descricao: string | null;
  valor: number;
  data: string;
  socio_id: number | null;
  socio_nome?: string | null;
  mensalidade_id: number | null;
  criado_por: string | null;
}

export interface Aviso {
  id: number;
  titulo: string;
  texto: string;
  publicado?: number;
  criado_em: string;
  anexos?: Anexo[];
}

export interface Anexo {
  id: number;
  nome: string;
  tipo: string;
  tamanho: number;
  imagem: boolean;
  video?: boolean;
  /** Caminho assinado (/api/publico/anexo/...), abre sem login. */
  url: string;
}
