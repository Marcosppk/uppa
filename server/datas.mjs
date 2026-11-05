// Parabéns da UPPA: aniversários (do sócio e das pessoas autistas da família) e as datas da causa autista.
// A rotina do dia publica sozinha um aviso para todos os associados em 2 de abril e 18 de junho.
import { db, hoje, agora, transacao } from './db.mjs';

export const DATAS_DA_CAUSA = [
  {
    dia: '04-02',
    titulo: 'Dia Mundial de Conscientização sobre o Autismo',
    emoji: '💙',
    texto:
      'Hoje, 2 de abril, é o Dia Mundial de Conscientização sobre o Autismo. A UPPA parabeniza cada pessoa autista e cada família que faz parte da nossa associação. Informação gera respeito, e respeito gera inclusão. Seguimos juntos!',
  },
  {
    dia: '06-18',
    titulo: 'Dia do Orgulho Autista',
    // Infinito: símbolo da neurodiversidade e do orgulho autista (no app vira um infinito colorido).
    emoji: '♾️',
    texto:
      'Hoje, 18 de junho, é o Dia do Orgulho Autista. Ser autista é parte de quem você é, e temos muito orgulho de caminhar ao lado de cada pessoa autista e de cada família da UPPA. Parabéns pela força, pela coragem e por tudo o que vocês ensinam ao mundo!',
  },
];

const ASSINATURA = 'UPPA – União de Pais e Pessoas Autistas';
const primeiroNome = (nome) => String(nome ?? '').trim().split(/\s+/)[0];
const normal = (nome) => String(nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const valida = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? '');
const bissexto = (ano) => (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
const diasEntre = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);
const anos = (n) => `${n} ${n === 1 ? 'ano' : 'anos'}`;

/** Aniversário no ano pedido; quem nasceu em 29/02 comemora em 28/02 nos anos não bissextos. */
function aniversarioNoAno(nascimento, ano) {
  const md = nascimento.slice(5) === '02-29' && !bissexto(ano) ? '02-28' : nascimento.slice(5);
  return `${ano}-${md}`;
}

function proximoAniversario(nascimento, base) {
  const ano = Number(base.slice(0, 4));
  const d = aniversarioNoAno(nascimento, ano);
  return d >= base ? d : aniversarioNoAno(nascimento, ano + 1);
}

/**
 * Quem a família comemora: o próprio sócio e as pessoas autistas cadastradas.
 * Quando o sócio também aparece na lista de pessoas autistas (mesmo nome), conta uma vez só, como o sócio.
 */
function pessoasDoSocio(socio, autistas) {
  const proprio = autistas.find((a) => normal(a.nome) === normal(socio.nome));
  const nascimento = valida(socio.nascimento) ? socio.nascimento : valida(proprio?.nascimento) ? proprio.nascimento : null;
  const lista = nascimento ? [{ tipo: 'socio', nome: socio.nome, nascimento }] : [];
  for (const a of autistas) if (a !== proprio && valida(a.nascimento)) lista.push({ tipo: 'autista', nome: a.nome, nascimento: a.nascimento });
  return lista;
}

function mensagem(p, socio, idade) {
  const nome = primeiroNome(p.nome);
  if (p.tipo === 'socio')
    return {
      titulo: `Feliz aniversário, ${nome}!`,
      texto: 'A UPPA deseja a você um dia muito feliz, com saúde, paz e muitas alegrias. Que bom ter você na nossa família!',
      whatsapp: `Olá, ${nome}! 🎂 Hoje é o seu dia! A ${ASSINATURA} deseja a você um feliz aniversário, com saúde, paz e muitas alegrias. Que bom ter você na nossa família! 💙`,
    };
  return {
    titulo: `Hoje é aniversário de ${nome}!`,
    texto: `${nome} completa ${anos(idade)} hoje. A UPPA deseja um dia cheio de carinho, alegria e respeito. Parabéns a toda a família!`,
    whatsapp: `Olá, ${primeiroNome(socio.nome)}! 🎉 Hoje é aniversário de ${nome}, que completa ${anos(idade)}! A ${ASSINATURA} deseja um dia cheio de carinho e alegria. Parabéns a toda a família! 💙`,
  };
}

/** Link do WhatsApp com a mensagem pronta (telefones do Brasil sem o 55 ganham o código do país). */
function linkWhatsapp(telefone, texto) {
  let n = String(telefone ?? '').replace(/\D/g, '');
  if (n.length === 10 || n.length === 11) n = `55${n}`;
  if (n.length < 12) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

export function datasDaCausa(data = hoje()) {
  const ano = data.slice(0, 4);
  return DATAS_DA_CAUSA.map((c) => {
    const proxima = `${ano}-${c.dia}` >= data ? `${ano}-${c.dia}` : `${Number(ano) + 1}-${c.dia}`;
    return { ...c, data: proxima, hoje: data.slice(5) === c.dia, aviso_publicado: !!db.prepare('SELECT 1 FROM rotinas_feitas WHERE chave = ?').get(`causa:${ano}-${c.dia}`) };
  });
}

/** O que aparece em destaque no app do sócio hoje: aniversários da família e datas da causa. */
export function comemoracoesDoSocio(socio, data = hoje()) {
  const lista = [];
  for (const p of pessoasDoSocio(socio, socio.autistas ?? [])) {
    if (p.nascimento >= data || aniversarioNoAno(p.nascimento, Number(data.slice(0, 4))) !== data) continue;
    const { titulo, texto } = mensagem(p, socio, Number(data.slice(0, 4)) - Number(p.nascimento.slice(0, 4)));
    lista.push({ tipo: p.tipo === 'socio' ? 'aniversario' : 'aniversario_autista', emoji: p.tipo === 'socio' ? '🎂' : '🎉', titulo, texto });
  }
  for (const c of DATAS_DA_CAUSA) if (data.slice(5) === c.dia) lista.push({ tipo: 'causa', emoji: c.emoji, titulo: c.titulo, texto: c.texto });
  return lista;
}

/** Aniversariantes entre os sócios ativos (e as pessoas autistas das famílias deles) de hoje até `dias` - 1 à frente. */
export function aniversariantes(dias = 7, data = hoje()) {
  const socios = db.prepare("SELECT id, nome, telefone, nascimento, matricula FROM socios WHERE status = 'ativo'").all();
  const porSocio = new Map();
  for (const a of db.prepare("SELECT a.socio_id, a.nome, a.nascimento FROM autistas a JOIN socios s ON s.id = a.socio_id WHERE s.status = 'ativo'").all()) {
    if (!porSocio.has(a.socio_id)) porSocio.set(a.socio_id, []);
    porSocio.get(a.socio_id).push(a);
  }
  const lista = [];
  for (const s of socios)
    for (const p of pessoasDoSocio(s, porSocio.get(s.id) ?? [])) {
      if (p.nascimento >= data) continue;
      const quando = proximoAniversario(p.nascimento, data);
      const faltam = diasEntre(data, quando);
      if (faltam >= dias) continue;
      const idade = Number(quando.slice(0, 4)) - Number(p.nascimento.slice(0, 4));
      const m = mensagem(p, s, idade);
      lista.push({ tipo: p.tipo, nome: p.nome, socio_id: s.id, socio_nome: s.nome, matricula: s.matricula, telefone: s.telefone, data: quando, faltam, idade, whatsapp: linkWhatsapp(s.telefone, m.whatsapp) });
    }
  return lista.sort((a, b) => a.faltam - b.faltam || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Publica o aviso das datas da causa autista uma vez por ano, no próprio dia. */
export function rodarRotinaDoDia(data = hoje()) {
  const feitas = [];
  for (const c of DATAS_DA_CAUSA) {
    if (data.slice(5) !== c.dia) continue;
    const chave = `causa:${data.slice(0, 4)}-${c.dia}`;
    transacao(() => {
      if (db.prepare('SELECT 1 FROM rotinas_feitas WHERE chave = ?').get(chave)) return;
      db.prepare('INSERT INTO avisos (titulo, texto, publicado, criado_em) VALUES (?, ?, 1, ?)').run(`${c.emoji} ${c.titulo}`, c.texto, agora());
      db.prepare('INSERT INTO rotinas_feitas (chave, feito_em) VALUES (?, ?)').run(chave, agora());
      feitas.push(chave);
    });
  }
  return feitas;
}

/** Roda ao ligar o servidor e a cada 15 minutos (pega a virada do dia mesmo com o servidor ligado direto). */
export function iniciarRotinaDoDia() {
  const rodar = () => {
    try {
      const feitas = rodarRotinaDoDia();
      if (feitas.length) console.log(`Rotina do dia: aviso publicado (${feitas.join(', ')})`);
    } catch (e) {
      console.error('Rotina do dia falhou:', e);
    }
  };
  rodar();
  setInterval(rodar, 15 * 60e3).unref();
}
