// Pagamento da mensalidade com cartão pelo Mercado Pago (Checkout Pro: o cartão é digitado no site do
// Mercado Pago, nunca passa por este servidor). A taxa do cartão é repassada ao sócio: o total é calculado
// para que, descontada a taxa, a associação receba o valor da mensalidade.
// Confirmação: o aviso (webhook) do Mercado Pago e a conferência ao voltar para o app. Nos dois casos
// o pagamento é CONSULTADO na API com o token da associação — um aviso falso não dá baixa em nada.
import { db, lerConfig } from './db.mjs';
import { erro } from './util.mjs';

const API = process.env.UPPA_MP_URL || 'https://api.mercadopago.com';
const gravar = db.prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor');
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesExtenso = (comp) => `${MESES[Number(comp.slice(5, 7)) - 1]} de ${comp.slice(0, 4)}`;

function config() {
  const c = lerConfig();
  return {
    ativo: c.mp_ativo === '1' && !!c.mp_token,
    token: c.mp_token ?? '',
    pct: Number(c.mp_taxa_pct ?? 4.98),
    fixa: Number(c.mp_taxa_fixa ?? 0),
  };
}

/** Total no cartão para a associação receber `valor` limpo: (valor + fixa) / (1 − %), arredondado para cima. */
export function totalCartao(valor, { pct, fixa } = config()) {
  const bruto = (Number(valor) + fixa) / (1 - pct / 100);
  const total = Math.ceil(bruto * 100 - 1e-6) / 100;
  return { total, taxa: Math.round((total - valor) * 100) / 100 };
}

/** O que o app do sócio precisa saber para mostrar o botão do cartão. */
export function cartaoParaSocio(m) {
  const c = config();
  if (!c.ativo || m.status !== 'pendente' || !(m.valor > 0)) return null;
  return totalCartao(m.valor, c);
}

async function mp(caminho, { metodo = 'GET', corpo, token = config().token } = {}) {
  const r = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(20e3),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    const motivo = r.status === 401 || r.status === 403 ? 'o Mercado Pago recusou o token da associação' : dados.message || `código ${r.status}`;
    throw erro(502, `Mercado Pago: ${motivo}.`);
  }
  return dados;
}

/** Confere um pagamento no Mercado Pago e, se aprovado e com o valor certo, dá baixa na mensalidade. */
async function conferirPagamento(pagamentoId, darBaixa) {
  const p = await mp(`/v1/payments/${encodeURIComponent(pagamentoId)}`);
  const ref = /^mensalidade:(\d+)$/.exec(p.external_reference ?? '');
  if (!ref || p.status !== 'approved') return false;
  const m = db.prepare('SELECT * FROM mensalidades WHERE id = ?').get(Number(ref[1]));
  if (!m || m.status === 'paga' || m.status === 'isenta') return false;
  if (!(Number(p.transaction_amount) >= (m.cartao_total ?? m.valor) - 0.01)) return false;
  const data = String(p.date_approved ?? '').slice(0, 10) || undefined;
  try {
    darBaixa(m.id, { forma: 'cartao', data, usuario: 'Mercado Pago' });
  } catch (e) {
    if (e.status !== 409) throw e; // já estava paga
  }
  db.prepare('UPDATE mensalidades SET mp_pagamento = ? WHERE id = ?').run(String(p.id), m.id);
  return true;
}

export function rotasMercadoPago({ app, assoc, adm, soAdmin, rota, darBaixa }) {
  // Ajustes (só administradores): token nunca volta para a tela.
  adm.get('/cartao', soAdmin, rota(() => {
    const c = lerConfig();
    return { ativo: c.mp_ativo === '1', tem_token: !!c.mp_token, taxa_pct: Number(c.mp_taxa_pct ?? 4.98), taxa_fixa: Number(c.mp_taxa_fixa ?? 0) };
  }));
  adm.put('/cartao', soAdmin, rota(async (req) => {
    const d = req.body ?? {};
    const pct = Number(String(d.taxa_pct ?? '').replace(',', '.'));
    const fixa = Number(String(d.taxa_fixa ?? 0).replace(',', '.'));
    if (!(pct >= 0 && pct < 30)) throw erro(400, 'A taxa do cartão (%) precisa estar entre 0 e 30.');
    if (!(fixa >= 0 && fixa < 20)) throw erro(400, 'A taxa fixa precisa estar entre R$ 0 e R$ 20.');
    const token = String(d.token ?? '').trim();
    if (token) {
      if (!/^(APP_USR|TEST)-/.test(token)) throw erro(400, 'O Access Token do Mercado Pago começa com APP_USR- (ou TEST- para testes).');
      await mp('/users/me', { token }); // confere se o token funciona antes de guardar
      gravar.run('mp_token', token);
    }
    const ativo = !!d.ativo;
    if (ativo && !lerConfig().mp_token) throw erro(400, 'Informe o Access Token do Mercado Pago para ativar o cartão.');
    gravar.run('mp_ativo', ativo ? '1' : '0');
    gravar.run('mp_taxa_pct', String(pct));
    gravar.run('mp_taxa_fixa', String(fixa));
    return { ok: true };
  }));

  // Sócio: abre o pagamento no Mercado Pago.
  assoc.post('/mensalidades/:id/cartao', rota(async (req) => {
    const m = db.prepare('SELECT * FROM mensalidades WHERE id = ? AND socio_id = ?').get(req.params.id, req.socioId);
    if (!m) throw erro(404, 'Mensalidade não encontrada.');
    const c = cartaoParaSocio(m);
    if (!c) throw erro(409, m.status === 'pendente' ? 'O pagamento com cartão não está ativo.' : 'Esta mensalidade não está em aberto.');
    const base = `${req.protocol}://${req.get('host')}`;
    const pref = await mp('/checkout/preferences', {
      metodo: 'POST',
      corpo: {
        items: [{ id: `mensalidade-${m.id}`, title: `Mensalidade UPPA — ${mesExtenso(m.competencia)}`, quantity: 1, unit_price: c.total, currency_id: 'BRL' }],
        external_reference: `mensalidade:${m.id}`,
        payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'bank_transfer' }, { id: 'atm' }], installments: 1 },
        back_urls: { success: `${base}/associados/#/mensalidades`, failure: `${base}/associados/#/mensalidades`, pending: `${base}/associados/#/mensalidades` },
        auto_return: 'approved',
        statement_descriptor: 'UPPA RR',
        ...(base.startsWith('https://') ? { notification_url: `${base}/api/publico/mercadopago/aviso` } : {}),
      },
    });
    db.prepare('UPDATE mensalidades SET cartao_total = ?, mp_preferencia = ? WHERE id = ?').run(c.total, pref.id, m.id);
    return { url: pref.init_point, total: c.total, taxa: c.taxa };
  }));

  // Sócio voltou do Mercado Pago: confere as mensalidades dele que foram ao cartão.
  assoc.post('/mensalidades/conferir-cartao', rota(async (req) => {
    if (!config().token) return { pagas: 0 };
    const abertas = db.prepare("SELECT id FROM mensalidades WHERE socio_id = ? AND status = 'pendente' AND mp_preferencia IS NOT NULL").all(req.socioId);
    let pagas = 0;
    for (const m of abertas) {
      const busca = await mp(`/v1/payments/search?external_reference=${encodeURIComponent(`mensalidade:${m.id}`)}&sort=date_created&criteria=desc`);
      for (const p of busca.results ?? []) if (p.status === 'approved' && (await conferirPagamento(p.id, darBaixa))) { pagas++; break; }
    }
    return { pagas };
  }));

  // Aviso do Mercado Pago (webhook). Responde 200 sempre; a baixa só acontece se a consulta confirmar.
  app.post('/api/publico/mercadopago/aviso', rota(async (req) => {
    const tipo = req.body?.type ?? req.query.type ?? req.query.topic;
    const id = req.body?.data?.id ?? req.query['data.id'] ?? req.query.id;
    if (tipo === 'payment' && id && config().token) {
      try {
        await conferirPagamento(id, darBaixa);
      } catch (e) {
        console.error('Aviso do Mercado Pago:', e.message);
      }
    }
    return { ok: true };
  }));
}
