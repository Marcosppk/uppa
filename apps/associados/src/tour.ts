import type { Passo } from '@shared/Tour';

/** Passos do tour do primeiro acesso no app dos sócios. */
export const passosAssociados = (nome: string): Passo[] => [
  { titulo: `Boas-vindas, ${nome.trim().split(/\s+/)[0]}!`, texto: 'Este é o app da UPPA para os sócios. Vamos conhecer as partes principais? Leva menos de um minuto.' },
  { alvo: '.tabbar a[href="#/"]', titulo: 'Início', texto: 'Aqui ficam os avisos da diretoria, os próximos eventos e a mensalidade do mês.' },
  { alvo: '.botao-mensagens', titulo: 'Mensagens da diretoria', texto: 'Conversa privada com a diretoria da UPPA. Quando chega mensagem nova, aparece um número aqui.' },
  { alvo: '.tabbar a[href="#/carteirinha"]', titulo: 'Carteirinha', texto: 'Sua carteirinha digital de sócio, com foto e QR Code para comprovar que você faz parte da UPPA.' },
  { alvo: '.tabbar a[href="#/mensalidades"]', titulo: 'Mensalidades', texto: 'Veja suas mensalidades e pague pelo Pix (ou com cartão, quando a associação oferecer).' },
  { alvo: '.tabbar a[href="#/acolhimento"]', titulo: 'Sala de acolhimento', texto: 'Jogos e brincadeiras calmas para as crianças: respirar, bolhas, memória, pintar, piano e mais.' },
  { alvo: '.tabbar a[href="#/dados"]', titulo: 'Meus dados', texto: 'Atualize seus dados, coloque sua foto, envie laudos e documentos e ajuste a acessibilidade (letra maior, alto contraste).' },
  { titulo: 'Tudo pronto!', texto: 'Para ver este tour de novo, vá em Meus dados → Sobre o app. Quando o app ganhar novidades, avisamos aqui mesmo.' },
];
