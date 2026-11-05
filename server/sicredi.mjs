// Pix do Sicredi com baixa automática (API Pix padrão Banco Central: mTLS + OAuth2 client_credentials).
// - Cada mensalidade ganha uma cobrança imediata (COB) com txid próprio; o app mostra o QR/copia-e-cola dela.
// - A baixa acontece quando a CONSULTA à cobrança no Sicredi diz CONCLUIDA com o valor certo:
//   a cada 2 minutos (rotina), a cada poucos segundos enquanto o sócio está na tela de pagamento,
//   e quando chega um aviso (webhook) — o aviso sozinho nunca dá baixa.
import crypto from 'node:crypto';
import https from 'node:https';
import http from 'node:http';
import { db, lerConfig } from './db.mjs';
import { erro, cpfValido, soDigitos } from './util.mjs';

const PRODUCAO = 'https://api-pix.sicredi.com.br';
const gravar = db.prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor');
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesExtenso = (comp) => `${MESES[Number(comp.slice(5, 7)) - 1]} de ${comp.slice(0, 4)}`;

function config() {
  const c = lerConfig();
  const base = process.env.UPPA_SICREDI_URL || (c.sicredi_ambiente === 'homologacao' ? c.sicredi_url_homologacao : PRODUCAO) || PRODUCAO;
  return {
    ativo: c.sicredi_ativo === '1',
    base: base.replace(/\/+$/, ''),
    clientId: c.sicredi_client_id ?? '',
    clientSecret: c.sicredi_client_secret ?? '',
    cert: c.sicredi_cert ?? '',
    key: c.sicredi_key ?? '',
    chave: c.sicredi_chave ?? '',
    horas: Number(c.sicredi_expiracao_horas ?? 72),
  };
}
export const pixSicrediAtivo = () => {
  const c = config();
  return c.ativo && !!(c.clientId && c.clientSecret && c.cert && c.key && c.chave);
};

/** Pedido HTTPS com o certificado do cliente (mTLS). Devolve { status, dados }. */
function pedido(cfg, metodo, caminho, { corpo, cabecalhos = {} } = {}) {
  const url = new URL(cfg.base + caminho);
  const mod = url.protocol === 'http:' ? http : https;
  const texto = corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo);
  return new Promise((ok, falha) => {
    const r = mod.request(
      url,
      {
        method: metodo,
        cert: cfg.cert || undefined,
        key: cfg.key || undefined,
        timeout: 20e3,
        headers: { Accept: 'application/json', ...(texto ? { 'Content-Length': Buffer.byteLength(texto) } : {}), ...cabecalhos },
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => {
          let dados = {};
          try {
            dados = b ? JSON.parse(b) : {};
          } catch {
            dados = { detail: b.slice(0, 300) };
          }
          ok({ status: res.statusCode, dados });
        });
      },
    );
    r.on('timeout', () => r.destroy(new Error('O Sicredi demorou a responder.')));
    r.on('error', (e) => falha(erro(502, `Sicredi: não consegui conectar (${e.code === 'ERR_OSSL_PEM_NO_START_LINE' || /PEM|key/i.test(e.message) ? 'confira o certificado e a chave privada em PEM' : e.message}).`)));
    if (texto) r.write(texto);
    r.end();
  });
}

// Token reaproveitado enquanto válido (o Sicredi bloqueia quem pede token a cada chamada).
let tokenGuardado = { valor: '', ate: 0, de: '' };
async function token(cfg, forcar = false) {
  const dono = `${cfg.base}|${cfg.clientId}`;
  if (!forcar && tokenGuardado.valor && tokenGuardado.de === dono && tokenGuardado.ate > Date.now() + 60e3) return tokenGuardado.valor;
  const { status, dados } = await pedido(cfg, 'POST', '/oauth/token', {
    corpo: new URLSearchParams({ grant_type: 'client_credentials', scope: 'cob.write cob.read' }).toString(),
    cabecalhos: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}` },
  });
  if (status !== 200 || !dados.access_token) {
    const motivo = status === 401 ? 'Client ID ou Client Secret recusados' : status === 403 ? 'certificado recusado (confira se o certificado e a chave são os do Portal)' : status === 400 ? 'escopo cob.write/cob.read não liberado para esta credencial' : dados.detail || dados.error_description || `código ${status}`;
    throw erro(502, `Sicredi: ${motivo}.`);
  }
  tokenGuardado = { valor: dados.access_token, ate: Date.now() + (Number(dados.expires_in) || 300) * 1000, de: dono };
  return dados.access_token;
}

async function api(cfg, metodo, caminho, corpo) {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const t = await token(cfg, tentativa > 0);
    const r = await pedido(cfg, metodo, `/api/v2${caminho}`, { corpo, cabecalhos: { Authorization: `Bearer ${t}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) } });
    if (r.status === 401 && tentativa === 0) continue; // token venceu: pega outro e tenta de novo
    if (r.status >= 400) throw erro(502, `Sicredi: ${r.dados.detail || r.dados.title || `código ${r.status}`}.`);
    return r.dados;
  }
}

const novoTxid = (mensalidadeId) => `UPPA${String(mensalidadeId).padStart(7, '0')}${crypto.randomBytes(12).toString('hex')}`.slice(0, 35);

/** Cobrança Pix da mensalidade: reaproveita a que ainda vale; senão cria uma nova no Sicredi. */
export async function cobrancaDaMensalidade(m, socio) {
  const cfg = config();
  if (!pixSicrediAtivo()) throw erro(409, 'O Pix automático do Sicredi não está ativo.');
  if (!['pendente', 'informada'].includes(m.status)) throw erro(409, 'Esta mensalidade não está em aberto.');
  if (m.pix_txid && m.pix_copia && m.pix_expira > new Date(Date.now() + 10 * 60e3).toISOString()) return { txid: m.pix_txid, copiaECola: m.pix_copia, expira: m.pix_expira };
  const txid = novoTxid(m.id);
  const cpf = soDigitos(socio.cpf);
  const corpo = {
    calendario: { expiracao: Math.round(cfg.horas * 3600) },
    ...(cpfValido(cpf) ? { devedor: { cpf, nome: String(socio.nome).slice(0, 200) } } : {}),
    valor: { original: Number(m.valor).toFixed(2), modalidadeAlteracao: 0 },
    chave: cfg.chave,
    solicitacaoPagador: `Mensalidade UPPA - ${mesExtenso(m.competencia)}`.slice(0, 140),
    infoAdicionais: [{ nome: 'Matricula', valor: String(socio.matricula ?? socio.id) }],
  };
  const r = await api(cfg, 'PUT', `/cob/${txid}`, corpo);
  if (!r.pixCopiaECola) throw erro(502, 'Sicredi: a cobrança foi criada sem o código Pix copia e cola.');
  const criacao = Date.parse(r.calendario?.criacao ?? '') || Date.now();
  const expira = new Date(criacao + (Number(r.calendario?.expiracao) || corpo.calendario.expiracao) * 1000).toISOString();
  db.prepare('UPDATE mensalidades SET pix_txid = ?, pix_copia = ?, pix_expira = ? WHERE id = ?').run(txid, r.pixCopiaECola, expira, m.id);
  return { txid, copiaECola: r.pixCopiaECola, expira };
}

/** Consulta a cobrança no Sicredi e, se paga com o valor certo, dá baixa. Devolve true quando baixou. */
export async function conferirCobranca(txid, darBaixa) {
  const m = db.prepare('SELECT * FROM mensalidades WHERE pix_txid = ?').get(txid);
  if (!m || m.status === 'paga' || m.status === 'isenta') return false;
  const cfg = config();
  const c = await api(cfg, 'GET', `/cob/${encodeURIComponent(txid)}`);
  if (c.status === 'REMOVIDA_PELO_USUARIO_RECEBEDOR' || c.status === 'REMOVIDA_PELO_PSP') {
    db.prepare('UPDATE mensalidades SET pix_txid = NULL, pix_copia = NULL, pix_expira = NULL WHERE id = ?').run(m.id);
    return false;
  }
  const recebido = (c.pix ?? []).find((p) => p.txid === txid || !p.txid);
  if (c.status !== 'CONCLUIDA' || !recebido || !(Number(recebido.valor) >= Number(m.valor) - 0.005)) return false;
  const data = new Date(recebido.horario ?? Date.now()).toLocaleDateString('sv-SE', { timeZone: 'America/Boa_Vista' });
  try {
    darBaixa(m.id, { forma: 'pix', data, usuario: 'Pix Sicredi (automático)' });
  } catch (e) {
    if (e.status !== 409) throw e;
  }
  db.prepare('UPDATE mensalidades SET pix_e2e = ? WHERE id = ?').run(recebido.endToEndId ?? null, m.id);
  return true;
}

/** Rotina: confere as cobranças em aberto a cada 2 minutos. */
export function iniciarConferenciaPix(darBaixa) {
  const rodar = async () => {
    if (!pixSicrediAtivo()) return;
    const abertas = db
      .prepare("SELECT pix_txid FROM mensalidades WHERE pix_txid IS NOT NULL AND status IN ('pendente','informada') AND pix_expira > ? ORDER BY pix_expira DESC LIMIT 60")
      .all(new Date(Date.now() - 24 * 3600e3).toISOString());
    for (const { pix_txid } of abertas) {
      try {
        if (await conferirCobranca(pix_txid, darBaixa)) console.log(`Pix Sicredi: mensalidade paga (txid ${pix_txid}).`);
      } catch (e) {
        console.error('Pix Sicredi (conferência):', e.message);
        break; // problema de conexão/credencial: tenta na próxima rodada
      }
    }
  };
  setInterval(rodar, 2 * 60e3).unref();
}

function lerCertificado(pem) {
  try {
    const x = new crypto.X509Certificate(pem);
    return { valido_ate: new Date(x.validTo).toISOString(), titular: x.subject.split('\n').find((l) => l.startsWith('CN='))?.slice(3) ?? x.subject.split('\n')[0] };
  } catch {
    return null;
  }
}

export function rotasSicredi({ app, assoc, adm, soAdmin, rota, darBaixa }) {
  // ---- Ajustes (só administradores). Segredo e chave privada nunca voltam para a tela. ----
  adm.get('/sicredi', soAdmin, rota(() => {
    const c = lerConfig();
    return {
      ativo: c.sicredi_ativo === '1',
      ambiente: c.sicredi_ambiente || 'producao',
      url_homologacao: c.sicredi_url_homologacao ?? '',
      client_id: c.sicredi_client_id ?? '',
      tem_secret: !!c.sicredi_client_secret,
      tem_chave_privada: !!c.sicredi_key,
      certificado: c.sicredi_cert ? lerCertificado(c.sicredi_cert) : null,
      chave: c.sicredi_chave ?? '',
      expiracao_horas: Number(c.sicredi_expiracao_horas ?? 72),
    };
  }));
  adm.put('/sicredi', soAdmin, rota(async (req) => {
    const d = req.body ?? {};
    const c = lerConfig();
    const novo = {
      ambiente: d.ambiente === 'homologacao' ? 'homologacao' : 'producao',
      url: String(d.url_homologacao ?? '').trim(),
      clientId: String(d.client_id ?? '').trim(),
      clientSecret: String(d.client_secret ?? '').trim() || c.sicredi_client_secret || '',
      cert: String(d.certificado ?? '').trim() || c.sicredi_cert || '',
      key: String(d.chave_privada ?? '').trim() || c.sicredi_key || '',
      chave: String(d.chave ?? '').trim(),
      horas: Number(d.expiracao_horas ?? 72),
    };
    if (novo.ambiente === 'homologacao' && !/^https:\/\//.test(novo.url) && !process.env.UPPA_SICREDI_URL) throw erro(400, 'Informe a URL de homologação que o Sicredi passou (começa com https://).');
    if (!(novo.horas >= 1 && novo.horas <= 720)) throw erro(400, 'A validade do QR precisa ficar entre 1 e 720 horas.');
    if (novo.cert && !/-----BEGIN CERTIFICATE-----/.test(novo.cert)) throw erro(400, 'O certificado precisa estar em formato PEM (texto com "BEGIN CERTIFICATE").');
    if (novo.key && !/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(novo.key)) throw erro(400, 'A chave privada precisa estar em formato PEM (texto com "BEGIN PRIVATE KEY").');
    if (novo.cert && novo.key) {
      try {
        if (!new crypto.X509Certificate(novo.cert).checkPrivateKey(crypto.createPrivateKey(novo.key))) throw new Error('par');
      } catch {
        throw erro(400, 'A chave privada não corresponde ao certificado. Use os dois arquivos baixados juntos no Portal do Sicredi.');
      }
    }
    const ativo = !!d.ativo;
    if (ativo) {
      if (!novo.clientId || !novo.clientSecret || !novo.cert || !novo.key || !novo.chave) throw erro(400, 'Para ativar, preencha Client ID, Client Secret, certificado, chave privada e a chave Pix.');
      // Confere tudo de verdade (mTLS + credenciais) antes de guardar.
      await token({ base: (process.env.UPPA_SICREDI_URL || (novo.ambiente === 'homologacao' ? novo.url : PRODUCAO)).replace(/\/+$/, ''), ...novo }, true);
    }
    gravar.run('sicredi_ativo', ativo ? '1' : '0');
    gravar.run('sicredi_ambiente', novo.ambiente);
    gravar.run('sicredi_url_homologacao', novo.url);
    gravar.run('sicredi_client_id', novo.clientId);
    gravar.run('sicredi_client_secret', novo.clientSecret);
    gravar.run('sicredi_cert', novo.cert);
    gravar.run('sicredi_key', novo.key);
    gravar.run('sicredi_chave', novo.chave);
    gravar.run('sicredi_expiracao_horas', String(novo.horas));
    tokenGuardado = { valor: '', ate: 0, de: '' };
    return { ok: true };
  }));

  // ---- Sócio: QR da cobrança e situação (a tela de pagamento pergunta enquanto está aberta) ----
  const daMensalidade = (req) => {
    const m = db.prepare('SELECT * FROM mensalidades WHERE id = ? AND socio_id = ?').get(req.params.id, req.socioId);
    if (!m) throw erro(404, 'Mensalidade não encontrada.');
    return m;
  };
  assoc.post('/mensalidades/:id/pix-sicredi', rota(async (req) => {
    const m = daMensalidade(req);
    const socio = db.prepare('SELECT id, nome, cpf, matricula FROM socios WHERE id = ?').get(req.socioId);
    return cobrancaDaMensalidade(m, socio);
  }));
  assoc.get('/mensalidades/:id/pix-sicredi', rota(async (req) => {
    let m = daMensalidade(req);
    if (m.status !== 'paga' && m.pix_txid && pixSicrediAtivo()) {
      try {
        await conferirCobranca(m.pix_txid, darBaixa);
      } catch (e) {
        console.error('Pix Sicredi (tela de pagamento):', e.message);
      }
      m = daMensalidade(req);
    }
    return { paga: m.status === 'paga' };
  }));

  // ---- Aviso (webhook) do Sicredi, se for configurado: só serve de "cutucão" para conferir. ----
  const aviso = rota(async (req) => {
    for (const p of (req.body?.pix ?? []).slice(0, 50)) {
      if (!p?.txid) continue;
      try {
        await conferirCobranca(String(p.txid), darBaixa);
      } catch (e) {
        console.error('Aviso Pix Sicredi:', e.message);
      }
    }
    return { ok: true };
  });
  app.post('/api/publico/sicredi/aviso', aviso);
  app.post('/api/publico/sicredi/aviso/pix', aviso); // o padrão do Banco Central acrescenta "/pix" ao endereço

  iniciarConferenciaPix(darBaixa);
}

