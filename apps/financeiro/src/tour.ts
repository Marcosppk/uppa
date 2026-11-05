import type { Passo } from '@shared/Tour';

// No computador o menu fica na lateral; no celular, na barra de baixo (o tour usa o que estiver visível).
const menu = (rota: string) => `.side nav a[href="#${rota}"], .tabbar a[href="#${rota}"]`;

/** Passos do tour do primeiro acesso no UPPA Financeiro. */
export const passosFinanceiro = (nome: string, admin: boolean): Passo[] => [
  { titulo: `Boas-vindas, ${nome.trim().split(/\s+/)[0]}!`, texto: 'Este é o UPPA Financeiro, a tesouraria da UPPA. Vamos dar uma volta rápida pelas telas?' },
  { alvo: menu('/'), titulo: 'Painel', texto: 'O resumo do mês: saldo do caixa, mensalidades, aniversariantes e o que precisa da sua atenção.' },
  { alvo: menu('/socios'), titulo: 'Sócios', texto: 'Cadastro completo de cada sócio, com foto, documentos e mensagens. As inscrições novas chegam aqui para autorizar, e o botão "Link de cadastro" gera o convite.' },
  { alvo: menu('/mensalidades'), titulo: 'Mensalidades', texto: 'As mensalidades do mês, a baixa dos pagamentos e quem avisou que já pagou.' },
  { alvo: menu('/caixa'), titulo: 'Caixa', texto: 'Receitas e despesas da associação. As mensalidades pagas entram aqui sozinhas.' },
  { alvo: menu('/avisos'), titulo: 'Avisos', texto: 'O mural do app dos sócios: avisos com fotos, vídeos, documentos e links.' },
  { alvo: menu('/mensagens'), titulo: 'Mensagens', texto: 'Conversas privadas da diretoria com cada sócio.' },
  { alvo: menu('/agenda'), titulo: 'Agenda', texto: 'Reuniões, oficinas e eventos que aparecem no calendário do app dos sócios.' },
  {
    alvo: menu('/config'),
    titulo: 'Ajustes',
    texto: admin
      ? 'Dados da associação e do PIX, Pix do Sicredi, cartão, avisos de inscrição, cópias de segurança, usuários e acessibilidade.'
      : 'Sua senha, a acessibilidade e as informações da associação.',
  },
  { titulo: 'Tudo pronto!', texto: 'Para ver este tour de novo: Ajustes → Sobre o app. Sempre que o sistema for atualizado, as novidades aparecem aqui.' },
];
