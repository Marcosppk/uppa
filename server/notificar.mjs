// Aviso para a diretoria quando chega uma inscrição pelo app: por e-mail (Gmail com senha de app)
// e por WhatsApp (CallMeBot, gratuito: cada número ativa o seu e recebe uma chave).
// A mensagem leva só o nome, a categoria e quem convidou — nada de CPF, telefone ou dados de saúde.
import nodemailer from 'nodemailer';
import { db, lerConfig, agora } from './db.mjs';
import { erro } from './util.mjs';
import { CATEGORIAS, rotulo } from '../shared/opcoes.js';

const gravar = db.prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor');
const lista = (s) => String(s ?? '').split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
const soDigitos = (s) => String(s ?? '').replace(/\D/g, '');
const emailValido = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function whatsGuardados() {
  try {
    return JSON.parse(lerConfig().notif_whats || '[]');
  } catch {
    return [];
  }
}

/** Configuração para a tela de Ajustes: as senhas e chaves nunca voltam, só se estão guardadas. */
export function lerNotificacoes() {
  const c = lerConfig();
  return {
    emails: c.notif_emails ?? '',
    gmail: c.notif_gmail ?? '',
    tem_senha_gmail: !!c.notif_gmail_senha,
    whats: whatsGuardados().map((w) => ({ numero: w.numero, tem_chave: !!w.chave })),
    ultimo: c.notif_ultimo ? JSON.parse(c.notif_ultimo) : null,
  };
}

/** Grava a configuração. Senha ou chave em branco = manter a que já estava guardada. */
export function gravarNotificacoes(d) {
  const emails = lista(d.emails);
  const ruim = emails.find((e) => !emailValido(e));
  if (ruim) throw erro(400, `E-mail inválido: ${ruim}`);
  const gmail = String(d.gmail ?? '').trim().toLowerCase();
  if (gmail && !emailValido(gmail)) throw erro(400, 'Confira o e-mail do Gmail que envia os avisos.');
  const antigos = whatsGuardados();
  const whats = (Array.isArray(d.whats) ? d.whats : [])
    .map((w) => {
      let numero = soDigitos(w.numero);
      if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
      const chave = String(w.chave ?? '').trim() || antigos.find((a) => a.numero === numero)?.chave || '';
      return { numero, chave };
    })
    .filter((w) => w.numero);
  const semChave = whats.find((w) => w.numero.length < 12 || !w.chave);
  if (semChave) throw erro(400, `WhatsApp ${semChave.numero}: informe o número com DDD e a chave do CallMeBot.`);
  gravar.run('notif_emails', emails.join(', '));
  gravar.run('notif_gmail', gmail);
  if (d.senha_gmail) gravar.run('notif_gmail_senha', String(d.senha_gmail).replace(/\s/g, ''));
  if (!gmail) gravar.run('notif_gmail_senha', '');
  gravar.run('notif_whats', JSON.stringify(whats));
  return lerNotificacoes();
}

async function enviarEmail(assunto, texto) {
  const c = lerConfig();
  const para = lista(c.notif_emails);
  if (!para.length) return null;
  if (!c.notif_gmail || !c.notif_gmail_senha) return { canal: 'e-mail', ok: false, erro: 'Falta o Gmail que envia e a senha de app.' };
  try {
    const t = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: c.notif_gmail, pass: c.notif_gmail_senha } });
    await t.sendMail({ from: `"UPPA Financeiro" <${c.notif_gmail}>`, to: para.join(', '), subject: assunto, text: texto });
    return { canal: 'e-mail', ok: true, para: para.length };
  } catch (e) {
    return { canal: 'e-mail', ok: false, erro: e.responseCode === 535 ? 'O Gmail recusou o login. Confira o e-mail e a senha de app.' : e.message };
  }
}

async function enviarWhats(texto) {
  const destinos = whatsGuardados();
  if (!destinos.length) return [];
  return Promise.all(
    destinos.map(async (w) => {
      try {
        const url = `https://api.callmebot.com/whatsapp.php?phone=%2B${w.numero}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(w.chave)}`;
        const r = await fetch(url, { signal: AbortSignal.timeout(20e3) });
        const corpo = await r.text();
        const ok = r.ok && !/error|invalid|apikey is not valid/i.test(corpo.slice(0, 2000));
        return { canal: `WhatsApp ${w.numero.slice(-4).padStart(w.numero.length, '•')}`, ok, erro: ok ? undefined : 'O CallMeBot recusou (confira o número e a chave).' };
      } catch (e) {
        return { canal: `WhatsApp ${w.numero.slice(-4).padStart(w.numero.length, '•')}`, ok: false, erro: e.message };
      }
    }),
  );
}

async function enviar(assunto, texto, textoWhats) {
  const resultados = [await enviarEmail(assunto, texto), ...(await enviarWhats(textoWhats))].filter(Boolean);
  gravar.run('notif_ultimo', JSON.stringify({ em: agora(), assunto, resultados }));
  for (const r of resultados) if (!r.ok) console.error(`Aviso de inscrição (${r.canal}) falhou: ${r.erro}`);
  return resultados;
}

/** Chamado depois de uma inscrição pelo app (não atrasa a resposta para quem se inscreveu). */
export function avisarNovaInscricao(socioId, enderecoFinanceiro) {
  const s = db.prepare('SELECT nome, categoria, convidado_por FROM socios WHERE id = ?').get(socioId);
  if (!s) return;
  const categoria = s.categoria ? rotulo(CATEGORIAS, s.categoria) : 'categoria não informada';
  const convite = s.convidado_por ? `\nVeio pelo link de cadastro de ${s.convidado_por}.` : '';
  const texto = `Nova inscrição no app UPPA Associados.\n\n${s.nome} — ${categoria}.${convite}\n\nPara conferir e autorizar, abra o UPPA Financeiro (Sócios → Aguardando aprovação):\n${enderecoFinanceiro}`;
  const whats = `🧩 *UPPA* — nova inscrição pelo app: *${s.nome}* (${categoria}).${s.convidado_por ? ` Convite de ${s.convidado_por}.` : ''} Confira e autorize no UPPA Financeiro: ${enderecoFinanceiro}`;
  enviar(`Nova inscrição na UPPA: ${s.nome}`, texto, whats).catch((e) => console.error('Aviso de inscrição falhou:', e));
}

/** Botão "Enviar teste" em Ajustes. */
export async function testarNotificacoes(enderecoFinanceiro) {
  const c = lerConfig();
  if (!lista(c.notif_emails).length && !whatsGuardados().length) throw erro(400, 'Cadastre pelo menos um e-mail ou um WhatsApp para receber os avisos.');
  return enviar(
    'Teste: avisos de inscrição da UPPA',
    `Este é um teste dos avisos de nova inscrição do UPPA Financeiro.\nQuando alguém se inscrever pelo app, chega uma mensagem como esta.\n\n${enderecoFinanceiro}`,
    `🧩 *UPPA* — teste dos avisos de nova inscrição. Está funcionando! ${enderecoFinanceiro}`,
  );
}
