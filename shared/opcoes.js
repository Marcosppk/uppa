// Opções do formulário de inscrição da UPPA (mesmas da planilha do Google Forms).
// Usado pelo servidor e pelos dois apps, para os nomes nunca ficarem diferentes.

export const CATEGORIAS = [
  { valor: 'pai_mae', rotulo: 'Pai ou Mãe de Pessoa Autista', tipo: 'Sócio Efetivo', planilha: 'Pai ou Mãe de Pessoa Autista' },
  { valor: 'autista', rotulo: 'Pessoa Autista', tipo: 'Sócio Efetivo', planilha: 'Pessoa Autista' },
  { valor: 'familiar', rotulo: 'Familiar de Autista', tipo: 'Sócio Correspondente', planilha: 'Familiar de Autista' },
  { valor: 'apoiador', rotulo: 'Apoiador da causa (sem vínculo familiar)', tipo: 'Sócio Honorário', planilha: 'Apoiadores' },
];

export const RENDAS = [
  { valor: 'menos_1', rotulo: 'Menos de 1 salário mínimo', planilha: 'Menos de 1' },
  { valor: '1_2', rotulo: 'De 1 a 2 salários mínimos', planilha: 'De 1 a 2' },
  { valor: '2_3', rotulo: 'De 2 a 3 salários mínimos', planilha: 'De 2 a 3' },
  { valor: '3_4', rotulo: 'De 3 a 4 salários mínimos', planilha: 'De 3 a 4' },
  { valor: '4_5', rotulo: 'De 4 a 5 salários mínimos', planilha: 'De 4 a 5' },
  { valor: 'acima_5', rotulo: 'Acima de 5 salários mínimos', planilha: 'Acima de 5' },
];

/** Renda até 2 salários mínimos paga a taxa menor. */
export const RENDA_ATE_2SM = ['menos_1', '1_2'];

export const ATIVIDADE_REMUNERADA = [
  'Não',
  'Sim',
  'Não, autista totalmente dependente (mais de um autista na família)',
  'Sim, autista independente financeiro (mais de um autista na família)',
];

export const PARTICIPACAO_ECONOMICA = [
  'Não trabalha e os gastos são custeados por familiares.',
  'Trabalha, mas o custo é compartilhado com a família.',
  'Trabalha e é responsável pelo sustento da família.',
  'Trabalha e é responsável pelo próprio sustento (independente financeiro).',
];

export const ISENCOES = [
  { valor: 'dependente', rotulo: 'Sócio dependente (mesma casa)' },
  { valor: 'diretoria', rotulo: 'Diretoria' },
  { valor: 'outro', rotulo: 'Outro motivo' },
];

export const STATUS_SOCIO = [
  { valor: 'pendente', rotulo: 'Aguardando aprovação' },
  { valor: 'ativo', rotulo: 'Ativo' },
  { valor: 'inativo', rotulo: 'Inativo' },
];

export const STATUS_MENSALIDADE = [
  { valor: 'pendente', rotulo: 'Em aberto' },
  { valor: 'informada', rotulo: 'Pagamento informado' },
  { valor: 'paga', rotulo: 'Paga' },
  { valor: 'isenta', rotulo: 'Isenta' },
];

export const FORMAS_PAGAMENTO = [
  { valor: 'pix', rotulo: 'PIX' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'transferencia', rotulo: 'Transferência' },
  { valor: 'outro', rotulo: 'Outro' },
];

export const CATEGORIAS_RECEITA = ['Mensalidade', 'Doação', 'Evento', 'Venda', 'Convênio/Projeto', 'Outra receita'];
export const CATEGORIAS_DESPESA = ['Aluguel', 'Água/Luz/Internet', 'Material', 'Evento', 'Transporte', 'Serviços', 'Tarifas bancárias', 'Outra despesa'];

export const rotulo = (lista, valor) => lista.find((o) => o.valor === valor)?.rotulo ?? valor ?? '';
