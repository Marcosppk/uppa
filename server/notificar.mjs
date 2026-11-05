// Aviso para a diretoria quando chega uma inscrição pelo app: por e-mail (Gmail com senha de app),
// por WhatsApp (CallMeBot, gratuito: cada número ativa o seu e recebe uma chave) e por SMS
// (pago, por mensagem: Zenvia, brasileira, ou Twilio).
// A mensagem leva só o nome, a categoria e quem convidou — nada de CPF, telefone ou dados de saúde.
import nodemailer from 'nodemailer';
import { db, lerConfig, agora } from './db.mjs';
import { erro } from './util.mjs';
import { CATEGORIAS, rotulo } from '../shared/opcoes.js';

const gravar = db.prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor');
const lista = (s) => String(s ?? '').split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
// Telefones vêm escritos com espaço ("95 99111-2222"): separa só por vírgula, ponto e vírgula ou linha.
const listaFones = (s) => String(s ?? '').split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
const soDigitos = (s) => String(s ?? '').replace(/\D/g, '');
const emailValido = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
/** Celular do Brasil com o 55 na frente (aceita com ou sem). */
const comPais = (s) => {
  const n = soDigitos(s);
  return n.length === 10 || n.length === 11 ? `55${n}` : n;
};
const final = (n) => n.slice(-4).padStart(n.length, '•');
// SMS sem acento cabe 160 letras por mensagem (com acento, só 70 — e cada pedaço é cobrado).
const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');

// Endereço dos serviços de SMS (os testes apontam para um servidor falso).
const SMS_URL = {
  zenvia: process.env.UPPA_SMS_ZENVIA_URL || 'https://api.zenvia.com',
  twilio: process.env.UPPA_SMS_TWILIO_URL || 'https://api.twilio.com',
};
const PROVEDORES_SMS = ['zenvia', 'twilio'];

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
    sms_provedor: c.notif_sms_provedor ?? '',
    sms_numeros: c.notif_sms_numeros ?? '',
    sms_conta: c.notif_sms_conta ?? '',
    sms_de: c.notif_sms_de ?? '',
    tem_token_sms: !!c.notif_sms_token,
    ultimo: c.notif_ultimo ? JSON.parse(c.notif_ultimo) : null,
  };
}

/** Grava a configuração. Senha, chave ou token em branco = manter o que já estava guardado. */
export function gravarNotificacoes(d) {
  const emails = lista(d.emails);
  const ruim = emails.find((e) => !emailValido(e));
  if (ruim) throw erro(400, `E-mail inválido: ${ruim}`);
  const gmail = String(d.gmail ?? '').trim().toLowerCase();
  if (gmail && !emailValido(gmail)) throw erro(400, 'Confira o e-mail do Gmail que envia os avisos.');
  const antigos = whatsGuardados();
  const whats = (Array.isArray(d.whats) ? d.whats : [])
    .map((w) => {
      const numero = comPais(w.numero);
      const chave = String(w.chave ?? '').trim() || antigos.find((a) => a.numero === numero)?.chave || '';
      return { numero, chave };
    })
    .filter((w) => w.numero);
  const semChave = whats.find((w) => w.numero.length < 12 || !w.chave);
  if (semChave) throw erro(400, `WhatsApp ${semChave.numero}: informe o número com DDD e a chave do CallMeBot.`);

  // SMS
  const provedor = PROVEDORES_SMS.includes(d.sms_provedor) ? d.sms_provedor : '';
  const numerosSms = listaFones(d.sms_numeros).map(comPais);
  const curto = numerosSms.find((n) => n.length < 12);
  if (curto) throw erro(400, `SMS: confira o número ${curto} (com DDD).`);
  const conta = String(d.sms_conta ?? '').trim();
  const de = String(d.sms_de ?? '').trim();
  const token = String(d.sms_token ?? '').trim() || (provedor ? lerConfig().notif_sms_token || '' : '');
  if (provedor && numerosSms.length) {
    if (!token) throw erro(400, 'SMS: informe o token (chave) da sua conta no serviço de SMS.');
    if (!de) throw erro(400, provedor === 'twilio' ? 'SMS: informe o número Twilio que envia (ex.: +15551234567).' : 'SMS: informe o remetente cadastrado na Zenvia.');
    if (provedor === 'twilio' && !/^AC\w{32}$/.test(conta)) throw erro(400, 'SMS: o "Account SID" da Twilio começa com AC e tem 34 caracteres.');
  }

  gravar.run('notif_emails', emails.join(', '));
  gravar.run('notif_gmail', gmail);
  if (d.senha_gmail) gravar.run('notif_gmail_senha', String(d.senha_gmail).replace(/\s/g, ''));
  if (!gmail) gravar.run('notif_gmail_senha', '');
  gravar.run('notif_whats', JSON.stringify(whats));
  gravar.run('notif_sms_provedor', provedor);
  gravar.run('notif_sms_numeros', numerosSms.join(', '));
  gravar.run('notif_sms_conta', provedor === 'twilio' ? conta : '');
  gravar.run('notif_sms_de', provedor ? de : '');
  gravar.run('notif_sms_token', provedor ? token : '');
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
        return { canal: `WhatsApp ${final(w.numero)}`, ok, erro: ok ? undefined : 'O CallMeBot recusou (confira o número e a chave).' };
      } catch (e) {
        return { canal: `WhatsApp ${final(w.numero)}`, ok: false, erro: e.message };
      }
    }),
  );
}

async function enviarSms(texto) {
  const c = lerConfig();
  const provedor = c.notif_sms_provedor;
  const numeros = listaFones(c.notif_sms_numeros);
  if (!provedor || !numeros.length) return [];
  if (!c.notif_sms_token || !c.notif_sms_de) return [{ canal: 'SMS', ok: false, erro: 'Falta configurar o serviço de SMS (token e remetente).' }];
  return Promise.all(
    numeros.map(async (n) => {
      const canal = `SMS ${final(n)}`;
      try {
        const r =
          provedor === 'twilio'
            ? await fetch(`${SMS_URL.twilio}/2010-04-01/Accounts/${encodeURIComponent(c.notif_sms_conta)}/Messages.json`, {
                method: 'POST',
                headers: { Authorization: `Basic ${Buffer.from(`${c.notif_sms_conta}:${c.notif_sms_token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ To: `+${n}`, From: c.notif_sms_de, Body: texto }),
                signal: AbortSignal.timeout(20e3),
              })
            : await fetch(`${SMS_URL.zenvia}/v2/channels/sms/messages`, {
                method: 'POST',
                headers: { 'X-API-TOKEN': c.notif_sms_token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: c.notif_sms_de, to: n, contents: [{ type: 'text', text: texto }] }),
                signal: AbortSignal.timeout(20e3),
              });
        if (r.ok) return { canal, ok: true };
        const corpo = await r.json().catch(() => ({}));
        const motivo = r.status === 401 || r.status === 403 ? 'o serviço recusou o token/conta' : corpo.message || `código ${r.status}`;
        return { canal, ok: false, erro: `SMS não enviado: ${motivo}.` };
      } catch (e) {
        return { canal, ok: false, erro: e.message };
      }
    }),
  );
}

async function enviar(assunto, texto, textoWhats, textoSms) {
  const [email, whats, sms] = await Promise.all([enviarEmail(assunto, texto), enviarWhats(textoWhats), enviarSms(textoSms)]);
  const resultados = [email, ...whats, ...sms].filter(Boolean);
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
  const sms = `UPPA: nova inscricao de ${semAcento(s.nome).slice(0, 40)} pelo app. Autorize no UPPA Financeiro: ${enderecoFinanceiro.split('#')[0]}`;
  enviar(`Nova inscrição na UPPA: ${s.nome}`, texto, whats, sms).catch((e) => console.error('Aviso de inscrição falhou:', e));
}

/** Botão "Enviar teste" em Ajustes. */
export async function testarNotificacoes(enderecoFinanceiro) {
  const c = lerConfig();
  if (!lista(c.notif_emails).length && !whatsGuardados().length && !(c.notif_sms_provedor && listaFones(c.notif_sms_numeros).length))
    throw erro(400, 'Cadastre pelo menos um e-mail, WhatsApp ou celular para SMS para receber os avisos.');
  return enviar(
    'Teste: avisos de inscrição da UPPA',
    `Este é um teste dos avisos de nova inscrição do UPPA Financeiro.\nQuando alguém se inscrever pelo app, chega uma mensagem como esta.\n\n${enderecoFinanceiro}`,
    `🧩 *UPPA* — teste dos avisos de nova inscrição. Está funcionando! ${enderecoFinanceiro}`,
    `UPPA: teste do aviso de nova inscricao por SMS. Esta funcionando!`,
  );
}
