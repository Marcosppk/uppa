// Tema do mês: as campanhas de conscientização ("Abril Azul", "Outubro Rosa"...) mudam a cor dos apps.
// `tinta` é a cor de destaque no tema claro (contraste ≥ 4,5:1 com texto branco); `claro`, no tema escuro.
// O alto contraste (acessibilidade) sempre vence a cor da campanha.

export interface Campanha {
  mes: number;
  nome: string;
  tema: string;
  texto: string;
  cor: string;
  tinta: string;
  claro: string;
}

export const CAMPANHAS: Campanha[] = [
  { mes: 1, nome: 'Janeiro Branco', tema: 'saúde mental', texto: 'Mês de cuidar da saúde mental — de quem é cuidado e de quem cuida.', cor: '#e3e9ef', tinta: '#3f5568', claro: '#c9d6e2' },
  { mes: 2, nome: 'Fevereiro Roxo', tema: 'Alzheimer, lúpus e fibromialgia', texto: 'Conscientização sobre o Alzheimer, o lúpus e a fibromialgia.', cor: '#7e3fb0', tinta: '#6a2f99', claro: '#c9a3ec' },
  { mes: 3, nome: 'Março Lilás', tema: 'câncer do colo do útero', texto: 'Prevenção do câncer do colo do útero: faça o preventivo.', cor: '#b07cd8', tinta: '#7a3fa8', claro: '#d7b9f0' },
  { mes: 4, nome: 'Abril Azul', tema: 'conscientização sobre o autismo', texto: 'Mês da conscientização sobre o autismo. Informação gera respeito e inclusão.', cor: '#2e86de', tinta: '#1d5fa8', claro: '#8cc2f5' },
  { mes: 5, nome: 'Maio Laranja', tema: 'proteção de crianças e adolescentes', texto: 'Combate ao abuso e à exploração sexual de crianças e adolescentes. Denuncie: Disque 100.', cor: '#f08a24', tinta: '#a8520a', claro: '#f8bf86' },
  { mes: 6, nome: 'Junho Vermelho', tema: 'doação de sangue', texto: 'Doe sangue, doe vida. E em 18 de junho, o Dia do Orgulho Autista!', cor: '#d64545', tinta: '#a82a2a', claro: '#f2a0a0' },
  { mes: 7, nome: 'Julho Amarelo', tema: 'hepatites virais', texto: 'Prevenção das hepatites virais: teste, vacine-se e trate.', cor: '#f2c230', tinta: '#7a5c00', claro: '#f7da7a' },
  { mes: 8, nome: 'Agosto Dourado', tema: 'aleitamento materno', texto: 'Mês de incentivo ao aleitamento materno.', cor: '#d4a017', tinta: '#7d5c00', claro: '#ecc95f' },
  { mes: 9, nome: 'Setembro Verde', tema: 'inclusão da pessoa com deficiência', texto: 'Inclusão da pessoa com deficiência. 21 de setembro: Dia Nacional de Luta da Pessoa com Deficiência.', cor: '#2eaa5c', tinta: '#1d7a40', claro: '#8fdcaa' },
  { mes: 10, nome: 'Outubro Rosa', tema: 'câncer de mama', texto: 'Prevenção e diagnóstico precoce do câncer de mama.', cor: '#e85d9a', tinta: '#b02a68', claro: '#f5a8ca' },
  { mes: 11, nome: 'Novembro Azul', tema: 'saúde do homem', texto: 'Cuidado com a saúde do homem e prevenção do câncer de próstata.', cor: '#2f6fd1', tinta: '#1d4f9e', claro: '#94bdf2' },
  { mes: 12, nome: 'Dezembro Vermelho', tema: 'prevenção ao HIV/aids', texto: 'Prevenção ao HIV/aids e às infecções sexualmente transmissíveis.', cor: '#d43a3a', tinta: '#a52626', claro: '#f29c9c' },
];

export const campanhaDoMes = (d = new Date()) => CAMPANHAS[d.getMonth()];

/** Liga ou desliga a cor do mês no app inteiro. */
export function aplicarCampanha(ligada: boolean) {
  const r = document.documentElement;
  if (!ligada) {
    delete r.dataset.campanha;
    return null;
  }
  const c = campanhaDoMes();
  r.dataset.campanha = String(c.mes);
  r.style.setProperty('--campanha', c.cor);
  r.style.setProperty('--campanha-tinta', c.tinta);
  r.style.setProperty('--campanha-claro', c.claro);
  return c;
}

/** Laço de conscientização desenhado na cor da campanha (o emoji 🎗️ é sempre amarelo). */
export function Laco({ cor, tamanho = 32 }: { cor: string; tamanho?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={tamanho} height={tamanho} aria-hidden="true" style={{ flex: 'none' }}>
      <path
        d="M32 5c-8.5 0-14 6.2-14 13.6 0 6.2 3.8 12.4 7.6 18L13 55.5l8.6 3.4L32 43.6l10.4 15.3 8.6-3.4-12.6-18.9C42.2 31 46 24.8 46 18.6 46 11.2 40.5 5 32 5zm0 8.2c3.2 0 5.6 2.3 5.6 5.4 0 3.4-2.4 7.5-5.6 11.9-3.2-4.4-5.6-8.5-5.6-11.9 0-3.1 2.4-5.4 5.6-5.4z"
        fill={cor}
        stroke="rgb(0 0 0 / 28%)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Faixa com o laço da campanha (tela inicial do Associados). */
export function FaixaCampanha() {
  const c = campanhaDoMes();
  return (
    <section className="faixa-campanha" aria-label={`Campanha do mês: ${c.nome}`}>
      <Laco cor={c.cor} tamanho={40} />
      <div>
        <b>{c.nome}</b>
        <span className="small">{c.texto}</span>
      </div>
    </section>
  );
}
