// Servidor da UPPA: uma API que integra o app UPPA Financeiro (tesouraria) e o app UPPA Associados (sócio).
// Em produção também entrega os dois apps já compilados em /financeiro/ e /associados/.
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { db, agora, hoje, competenciaAtual, lerConfig, transacao } from './db.mjs';
import { soDigitos, hashSenha, conferirSenha, novoToken, codigoCarteirinha, pixCopiaECola, erro, ErroHttp } from './util.mjs';
import { publicar, buscarSocio, criarSocio, atualizarSocio } from './socios.mjs';
import { importarCsv, importarDeLink } from './importar.mjs';
import { anexosDoAviso, salvarAnexo, enviarAnexo, MAX_VIDEO } from './anexos.mjs';
import { listarCopias, fazerCopia, caminhoCopia, iniciarCopias, PASTA as PASTA_COPIAS } from './backup.mjs';
import { lerNotificacoes, gravarNotificacoes, avisarNovaInscricao, testarNotificacoes } from './notificar.mjs';
import { rotasArquivos, fotoDe, fotosDe } from './arquivos.mjs';
import { rotasMercadoPago, cartaoParaSocio } from './mercadopago.mjs';
import { rotasSicredi, pixSicrediAtivo } from './sicredi.mjs';
import { rotasAgenda } from './agenda.mjs';
import { rotasMensagens, naoLidasDoSocio, naoLidasDaDiretoria } from './mensagens.mjs';
import { comemoracoesDoSocio, aniversariantes, datasDaCausa, iniciarRotinaDoDia } from './datas.mjs';
import { CATEGORIAS, RENDAS, rotulo } from '../shared/opcoes.js';

const PORTA = Number(process.env.PORT || 3333);
const DIAS_SESSAO = 30;

// Segredo da carteirinha: fica no banco para o QR continuar válido depois de reiniciar.
const segredo = (() => {
  const c = lerConfig();
  if (c.segredo) return c.segredo;
  const s = crypto.randomBytes(24).toString('hex');
  db.prepare("INSERT INTO config (chave, valor) VALUES ('segredo', ?)").run(s);
  return s;
})();

const comAnexos = (avisos) => avisos.map((a) => ({ ...a, anexos: anexosDoAviso(a.id, segredo) }));

const app = express();
app.disable('x-powered-by');
// Atrás do túnel (cloudflared na mesma máquina), o IP real do visitante vem no X-Forwarded-For.
app.set('trust proxy', 'loopback');
app.use(express.json({ limit: '10mb' }));

// Apps nativos (Capacitor) e os servidores de desenvolvimento chamam a API de outra origem.
app.use('/api', (req, res, next) => {
  const origem = req.headers.origin;
  if (origem) {
    res.setHeader('Access-Control-Allow-Origin', origem);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Nome-Arquivo, X-Tipo-Documento, X-Descricao');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const rota = (fn) => async (req, res, next) => {
  try {
    const r = await fn(req, res);
    if (!res.headersSent) res.json(r ?? { ok: true });
  } catch (e) {
    next(e);
  }
};

// ---------------- Sessões ----------------
function abrirSessao(tipo, refId, { provisoria = false, lembrar = true } = {}) {
  const token = novoToken();
  // A sessão da senha padrão dura pouco: é só para trocar a senha.
  // Sem "Lembrar de mim", a sessão vale só por 12 horas (e o app não guarda o acesso ao fechar).
  const duracao = provisoria ? 30 * 60e3 : lembrar ? DIAS_SESSAO * 864e5 : 12 * 3600e3;
  const expira = new Date(Date.now() + duracao).toISOString();
  db.prepare('INSERT INTO sessoes (token, tipo, ref_id, expira_em, provisoria) VALUES (?, ?, ?, ?, ?)').run(token, tipo, refId, expira, provisoria ? 1 : 0);
  return token;
}

/** Senha do primeiro acesso de todo associado (login com CPF + esta senha, depois troca obrigatória). */
const SENHA_PADRAO = '12345678';
function validarNovaSenha(senha) {
  if (String(senha ?? '').length < 6) throw erro(400, 'A senha precisa ter pelo menos 6 caracteres.');
  if (String(senha) === SENHA_PADRAO) throw erro(400, 'Escolha uma senha diferente da senha padrão.');
}

const exigir = (tipo) => (req, _res, next) => {
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const s = token && db.prepare('SELECT * FROM sessoes WHERE token = ? AND tipo = ? AND expira_em > ?').get(token, tipo, agora());
  if (!s) return next(erro(401, 'Sessão expirada. Entre novamente.'));
  req.token = token;
  if (tipo === 'admin') {
    req.usuario = db.prepare('SELECT id, nome, login, papel FROM usuarios WHERE id = ?').get(s.ref_id);
    if (!req.usuario) return next(erro(401, 'Usuário removido.'));
  } else {
    req.socioId = s.ref_id;
    req.provisoria = !!s.provisoria;
    const st = db.prepare('SELECT status FROM socios WHERE id = ?').get(s.ref_id)?.status;
    if (!st) return next(erro(401, 'Cadastro não encontrado.'));
    if (req.provisoria && !['/definir-senha', '/sair'].includes(req.path)) return next(erro(403, 'Crie sua nova senha para continuar.'));
  }
  next();
};
const soAdmin = (req, _res, next) => (req.usuario?.papel === 'admin' ? next() : next(erro(403, 'Somente administradores.')));

// Freio simples contra tentativa de adivinhar senha (por IP + login).
const tentativas = new Map();
function contarTentativa(chave) {
  const t = tentativas.get(chave) ?? { n: 0, ate: 0 };
  if (t.ate > Date.now()) throw erro(429, 'Muitas tentativas. Aguarde alguns minutos.');
  t.n++;
  if (t.n >= 8) { t.ate = Date.now() + 10 * 60e3; t.n = 0; }
  tentativas.set(chave, t);
}

// ---------------- Mensalidades ----------------
const pagamentoPix = (m, socio) => {
  const c = lerConfig();
  if (!c.pix_chave) return null;
  return pixCopiaECola({ chave: c.pix_chave, nome: c.pix_nome, cidade: c.pix_cidade, valor: m.valor, txid: `M${socio.matricula ?? socio.id}${m.competencia.replace('-', '')}` });
};

/** Garante as mensalidades do mês para todos os sócios ativos (isentos ficam "isenta"). */
function gerarMensalidades(competencia) {
  const ativos = db.prepare("SELECT id, valor_mensal, isencao FROM socios WHERE status = 'ativo'").all();
  const ins = db.prepare('INSERT INTO mensalidades (socio_id, competencia, valor, status) VALUES (?, ?, ?, ?) ON CONFLICT (socio_id, competencia) DO NOTHING');
  let n = 0;
  transacao(() => {
    for (const s of ativos) {
      const isento = s.isencao || !(s.valor_mensal > 0);
      n += Number(ins.run(s.id, competencia, isento ? 0 : s.valor_mensal, isento ? 'isenta' : 'pendente').changes);
    }
  });
  return n;
}

function darBaixa(mensalidadeId, { forma = 'pix', data = hoje(), usuario }) {
  return transacao(() => {
    const m = db.prepare('SELECT m.*, s.nome FROM mensalidades m JOIN socios s ON s.id = m.socio_id WHERE m.id = ?').get(mensalidadeId);
    if (!m) throw erro(404, 'Mensalidade não encontrada.');
    if (m.status === 'paga') throw erro(409, 'Esta mensalidade já está paga.');
    if (m.status === 'isenta') throw erro(409, 'Mensalidade isenta não recebe pagamento.');
    const l = db
      .prepare("INSERT INTO lancamentos (tipo, categoria, descricao, valor, data, socio_id, mensalidade_id, criado_por, criado_em) VALUES ('receita', 'Mensalidade', ?, ?, ?, ?, ?, ?, ?)")
      .run(`Mensalidade ${m.competencia.split('-').reverse().join('/')} — ${m.nome}`, m.valor, data, m.socio_id, m.id, usuario, agora());
    db.prepare("UPDATE mensalidades SET status = 'paga', pago_em = ?, forma = ?, lancamento_id = ? WHERE id = ?").run(data, forma, Number(l.lastInsertRowid), m.id);
  });
}

function estornar(mensalidadeId) {
  transacao(() => {
    const m = db.prepare('SELECT * FROM mensalidades WHERE id = ?').get(mensalidadeId);
    if (!m || m.status !== 'paga') throw erro(409, 'Só dá para estornar mensalidade paga.');
    if (m.lancamento_id) db.prepare('DELETE FROM lancamentos WHERE id = ?').run(m.lancamento_id);
    db.prepare("UPDATE mensalidades SET status = 'pendente', pago_em = NULL, forma = NULL, lancamento_id = NULL WHERE id = ?").run(m.id);
  });
}

// =====================================================================
// Público
// =====================================================================
// Versão do servidor (package.json): os apps comparam com a deles e oferecem atualizar.
const VERSAO = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8')).version;
app.get('/api/saude', (_req, res) => res.json({ ok: true, versao: VERSAO }));

app.get('/api/publico/config', rota(() => {
  const c = lerConfig();
  return { nome_associacao: c.nome_associacao, email_associacao: c.email_associacao, valor_ate_2sm: Number(c.valor_ate_2sm), valor_acima_2sm: Number(c.valor_acima_2sm), campanhas: c.campanhas !== '0' };
}));

app.post('/api/publico/inscricao', rota((req) => {
  const d = req.body ?? {};
  if (!d.ciente_estatuto) throw erro(400, 'É preciso declarar ciência do Estatuto.');
  if (d.senha) validarNovaSenha(d.senha);
  const id = criarSocio(d, { admin: false });
  if (d.senha) db.prepare('UPDATE socios SET senha_hash = ? WHERE id = ?').run(hashSenha(d.senha), id);
  // Veio por link de convite: guarda quem convidou para o administrador ver na hora de aprovar.
  const c = d.convite && quemConvidou(String(d.convite));
  if (c) {
    db.prepare('UPDATE socios SET convidado_por = ?, convite = ? WHERE id = ?').run(c.descricao, c.codigo, id);
    db.prepare('UPDATE convites SET usos = usos + 1 WHERE codigo = ?').run(c.codigo);
  }
  avisarNovaInscricao(id, enderecoFinanceiro(req));
  return { ok: true, token: d.senha ? abrirSessao('socio', id) : null };
}));

// ---------------- Links de cadastro (convites) ----------------
/** Código do link de cadastro de um sócio ou usuário do Financeiro (criado na primeira vez, depois reaproveitado). */
function codigoConvite(tipo, refId) {
  const atual = db.prepare('SELECT codigo FROM convites WHERE tipo = ? AND ref_id = ?').get(tipo, refId);
  if (atual) return atual.codigo;
  const codigo = crypto.randomBytes(6).toString('base64url');
  db.prepare('INSERT INTO convites (codigo, tipo, ref_id, criado_em) VALUES (?, ?, ?, ?)').run(codigo, tipo, refId, agora());
  return codigo;
}

function quemConvidou(codigo) {
  const c = db.prepare('SELECT * FROM convites WHERE codigo = ?').get(codigo);
  if (!c) return null;
  if (c.tipo === 'socio') {
    const s = db.prepare('SELECT nome, matricula FROM socios WHERE id = ?').get(c.ref_id);
    if (!s) return null;
    return { codigo, nome: s.nome, descricao: `${s.nome} (sócio${s.matricula ? `, matrícula ${s.matricula}` : ''})` };
  }
  const u = db.prepare('SELECT nome FROM usuarios WHERE id = ?').get(c.ref_id);
  return u ? { codigo, nome: u.nome, descricao: `${u.nome} (UPPA Financeiro)` } : null;
}

/** Link público que abre direto a ficha de inscrição do app Associados. */
const enderecoFinanceiro = (req) => `${req.protocol}://${req.get('host')}/financeiro/#/socios?status=pendente`;
const linkCadastro = (req, codigo) => `${req.protocol}://${req.get('host')}/associados/#/inscricao?convite=${codigo}`;

// Anexo de aviso: o código assinado no endereço substitui o login (para abrir em <img> e links).
app.get('/api/publico/anexo/:id/:codigo', rota((req, res) => enviarAnexo(req, res, segredo)));

app.get('/api/publico/convite/:codigo', rota((req) => {
  const c = quemConvidou(req.params.codigo);
  if (!c) throw erro(404, 'Link de cadastro inválido.');
  return { de: c.nome.trim().split(/\s+/)[0] };
}));

app.get('/api/publico/verificar/:codigo', rota((req) => {
  const ativos = db.prepare("SELECT id, nome, matricula, categoria, status FROM socios WHERE matricula IS NOT NULL").all();
  const s = ativos.find((x) => codigoCarteirinha(x, segredo) === req.params.codigo);
  if (!s) throw erro(404, 'Carteirinha não encontrada.');
  // A foto ajuda quem confere a carteirinha a ver que é a mesma pessoa.
  return { nome: s.nome, matricula: s.matricula, categoria: rotulo(CATEGORIAS, s.categoria), ativo: s.status === 'ativo', foto: fotoDe(s.id) };
}));

// =====================================================================
// App UPPA Associados
// =====================================================================
app.post('/api/associado/login', rota((req) => {
  const cpf = soDigitos(req.body?.cpf);
  contarTentativa(`socio:${req.ip}:${cpf}`);
  const s = db.prepare('SELECT id, senha_hash FROM socios WHERE cpf = ?').get(cpf);
  const senha = String(req.body?.senha ?? '');
  // Primeiro acesso: quem ainda não criou senha entra com CPF + senha padrão e é obrigado a trocar.
  const primeiro = s && !s.senha_hash && senha === SENHA_PADRAO;
  if (!s || (!primeiro && !conferirSenha(senha, s.senha_hash))) throw erro(401, 'CPF ou senha incorretos.');
  tentativas.delete(`socio:${req.ip}:${cpf}`);
  const lembrar = req.body?.lembrar !== false;
  return primeiro ? { token: abrirSessao('socio', s.id, { provisoria: true }), trocarSenha: true } : { token: abrirSessao('socio', s.id, { lembrar }) };
}));

const assoc = express.Router();
assoc.use(exigir('socio'));

assoc.get('/me', rota((req) => {
  const socio = buscarSocio(req.socioId);
  if (socio.status === 'ativo') gerarMensalidadesDoSocio(socio);
  const mensalidades = db.prepare('SELECT * FROM mensalidades WHERE socio_id = ? ORDER BY competencia DESC').all(socio.id);
  const c = lerConfig();
  socio.foto = fotoDe(socio.id);
  const pixAuto = pixSicrediAtivo();
  return {
    socio,
    carteirinha: socio.matricula ? codigoCarteirinha(socio, segredo) : null,
    mensalidades: mensalidades.map(({ pix_copia, pix_e2e, ...m }) => ({ ...m, pix: m.status === 'pendente' ? pagamentoPix(m, socio) : null, pix_auto: pixAuto && ['pendente', 'informada'].includes(m.status), cartao: cartaoParaSocio(m) })),
    associacao: { nome: c.nome_associacao, email: c.email_associacao, pix_chave: c.pix_chave, pix_nome: c.pix_nome, campanhas: c.campanhas !== '0' },
    comemoracoes: comemoracoesDoSocio(socio),
    nao_lidas: naoLidasDoSocio(socio.id),
  };
}));

/** O sócio vê a mensalidade do mês corrente mesmo antes de a tesouraria gerar o lote. */
function gerarMensalidadesDoSocio(s) {
  const isento = s.isencao || !(s.valor_mensal > 0);
  db.prepare('INSERT INTO mensalidades (socio_id, competencia, valor, status) VALUES (?, ?, ?, ?) ON CONFLICT (socio_id, competencia) DO NOTHING')
    .run(s.id, competenciaAtual(), isento ? 0 : s.valor_mensal, isento ? 'isenta' : 'pendente');
}

assoc.put('/me', rota((req) => atualizarSocio(req.socioId, req.body ?? {}, { admin: false })));

assoc.post('/senha', rota((req) => {
  const s = db.prepare('SELECT senha_hash FROM socios WHERE id = ?').get(req.socioId);
  if (!conferirSenha(req.body?.atual ?? '', s.senha_hash)) throw erro(400, 'Senha atual incorreta.');
  validarNovaSenha(req.body?.nova);
  db.prepare('UPDATE socios SET senha_hash = ? WHERE id = ?').run(hashSenha(req.body.nova), req.socioId);
}));

// Fim do primeiro acesso: troca a senha padrão pela senha do sócio e libera a sessão.
assoc.post('/definir-senha', rota((req) => {
  if (!req.provisoria) throw erro(409, 'Sua senha já foi criada. Use "Trocar senha" em Meus dados.');
  validarNovaSenha(req.body?.nova);
  db.prepare('UPDATE socios SET senha_hash = ? WHERE id = ?').run(hashSenha(req.body.nova), req.socioId);
  db.prepare('UPDATE sessoes SET provisoria = 0, expira_em = ? WHERE token = ?').run(new Date(Date.now() + DIAS_SESSAO * 864e5).toISOString(), req.token);
}));

assoc.post('/mensalidades/:id/informar', rota((req) => {
  const m = db.prepare('SELECT * FROM mensalidades WHERE id = ? AND socio_id = ?').get(req.params.id, req.socioId);
  if (!m) throw erro(404, 'Mensalidade não encontrada.');
  if (m.status !== 'pendente') throw erro(409, 'Esta mensalidade não está em aberto.');
  db.prepare("UPDATE mensalidades SET status = 'informada', informado_em = ?, informado_obs = ?, forma = ? WHERE id = ?")
    .run(agora(), String(req.body?.obs ?? '').slice(0, 500) || null, req.body?.forma ?? 'pix', m.id);
}));

assoc.get('/convite', rota((req) => {
  const codigo = codigoConvite('socio', req.socioId);
  const usos = db.prepare('SELECT usos FROM convites WHERE codigo = ?').get(codigo).usos;
  return { codigo, link: linkCadastro(req, codigo), usos };
}));

assoc.get('/avisos', rota(() => comAnexos(db.prepare('SELECT id, titulo, texto, criado_em FROM avisos WHERE publicado = 1 ORDER BY criado_em DESC LIMIT 50').all())));

assoc.post('/sair', rota((req) => { db.prepare('DELETE FROM sessoes WHERE token = ?').run(req.token); }));

app.use('/api/associado', assoc);

// =====================================================================
// App UPPA Financeiro
// =====================================================================
app.get('/api/admin/setup', rota(() => ({ precisa: !db.prepare('SELECT 1 FROM usuarios LIMIT 1').get() })));

// O primeiro administrador só pode ser criado da rede local: com o app publicado na internet,
// um estranho não consegue "chegar primeiro" e tomar a tesouraria.
const redeLocal = (ip = '') => /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::ffff:(127|10|192\.168)\.)/.test(ip);

app.post('/api/admin/setup', rota((req) => {
  if (db.prepare('SELECT 1 FROM usuarios LIMIT 1').get()) throw erro(409, 'O primeiro administrador já foi criado.');
  if (!redeLocal(req.ip)) throw erro(403, 'O primeiro administrador só pode ser criado num computador da rede da UPPA.');
  const { nome, login, senha } = req.body ?? {};
  if (!nome || !login || String(senha ?? '').length < 8) throw erro(400, 'Preencha nome, usuário e uma senha com pelo menos 8 caracteres.');
  const r = db.prepare("INSERT INTO usuarios (nome, login, senha_hash, papel) VALUES (?, ?, ?, 'admin')").run(nome.trim(), login.trim().toLowerCase(), hashSenha(senha));
  return { token: abrirSessao('admin', Number(r.lastInsertRowid)) };
}));

app.post('/api/admin/login', rota((req) => {
  const login = String(req.body?.login ?? '').trim().toLowerCase();
  contarTentativa(`admin:${req.ip}:${login}`);
  const u = db.prepare('SELECT * FROM usuarios WHERE login = ?').get(login);
  if (!u || !conferirSenha(req.body?.senha ?? '', u.senha_hash)) throw erro(401, 'Usuário ou senha incorretos.');
  tentativas.delete(`admin:${req.ip}:${login}`);
  return { token: abrirSessao('admin', u.id, { lembrar: req.body?.lembrar !== false }) };
}));

const adm = express.Router();
adm.use(exigir('admin'));

adm.get('/me', rota((req) => req.usuario));

adm.get('/convite', rota((req) => {
  const codigo = codigoConvite('admin', req.usuario.id);
  const usos = db.prepare('SELECT usos FROM convites WHERE codigo = ?').get(codigo).usos;
  return { codigo, link: linkCadastro(req, codigo), usos };
}));
adm.post('/sair', rota((req) => { db.prepare('DELETE FROM sessoes WHERE token = ?').run(req.token); }));

adm.get('/painel', rota(() => {
  const comp = competenciaAtual();
  gerarMensalidades(comp);
  const contagem = Object.fromEntries(db.prepare('SELECT status, COUNT(*) n FROM socios GROUP BY status').all().map((r) => [r.status, r.n]));
  const mes = db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN status = 'paga' THEN valor END), 0) AS recebido,
      COALESCE(SUM(CASE WHEN status IN ('pendente','informada') THEN valor END), 0) AS em_aberto,
      SUM(status = 'paga') AS pagas, SUM(status IN ('pendente','informada')) AS abertas, SUM(status = 'isenta') AS isentas
    FROM mensalidades WHERE competencia = ?`).get(comp);
  const caixa = db.prepare(`SELECT COALESCE(SUM(CASE WHEN tipo='receita' THEN valor ELSE -valor END), 0) AS saldo FROM lancamentos`).get();
  const meses = db.prepare(`SELECT substr(data, 1, 7) AS mes,
      COALESCE(SUM(CASE WHEN tipo='receita' THEN valor END), 0) AS receitas,
      COALESCE(SUM(CASE WHEN tipo='despesa' THEN valor END), 0) AS despesas
    FROM lancamentos WHERE data >= date(?, '-5 months') GROUP BY mes ORDER BY mes`).all(`${comp}-01`);
  const categorias = db.prepare("SELECT categoria, COUNT(*) n FROM socios WHERE status = 'ativo' GROUP BY categoria").all();
  const informadas = db.prepare("SELECT COUNT(*) n FROM mensalidades WHERE status = 'informada'").get().n;
  return { competencia: comp, socios: contagem, mes, saldo: caixa.saldo, meses, categorias, informadas, causa: datasDaCausa().filter((d) => d.hoje), mensagens: naoLidasDaDiretoria() };
}));

// Aniversariantes (sócios e pessoas autistas) de hoje até `dias` à frente, com a mensagem pronta para o WhatsApp.
adm.get('/aniversariantes', rota((req) => ({ lista: aniversariantes(Math.min(Number(req.query.dias) || 7, 366)), datas: datasDaCausa() })));

// ---- Sócios ----
adm.get('/socios', rota((req) => {
  const { q = '', status = '', categoria = '' } = req.query;
  const termo = `%${String(q).trim().toLowerCase()}%`;
  const digitos = soDigitos(q);
  const linhas = db.prepare(`SELECT s.*,
      (SELECT COUNT(*) FROM autistas a WHERE a.socio_id = s.id) AS n_autistas,
      (SELECT MAX(competencia) FROM mensalidades m WHERE m.socio_id = s.id AND m.status = 'paga') AS ultima_paga,
      (SELECT COUNT(*) FROM mensalidades m WHERE m.socio_id = s.id AND m.status IN ('pendente','informada')) AS abertas
    FROM socios s
    WHERE (? = '' OR s.status = ?) AND (? = '' OR s.categoria = ?)
      AND (lower(s.nome) LIKE ? OR lower(COALESCE(s.email,'')) LIKE ? OR (? <> '' AND (s.cpf LIKE ? OR CAST(s.matricula AS TEXT) = ?)))
    ORDER BY s.status = 'pendente' DESC, s.nome COLLATE NOCASE`).all(status, status, categoria, categoria, termo, termo, digitos, `%${digitos}%`, digitos);
  const fotos = fotosDe(linhas.map((l) => l.id));
  return linhas.map((l) => ({ ...publicar(l, { comAutistas: false }), foto: fotos.get(l.id) ?? null }));
}));

adm.get('/socios/:id', rota((req) => {
  const s = buscarSocio(req.params.id);
  if (!s) throw erro(404, 'Sócio não encontrado.');
  s.mensalidades = db.prepare('SELECT * FROM mensalidades WHERE socio_id = ? ORDER BY competencia DESC').all(s.id);
  s.foto = fotoDe(s.id);
  s.n_documentos = db.prepare('SELECT COUNT(*) n FROM socio_documentos WHERE socio_id = ?').get(s.id).n;
  return s;
}));

adm.post('/socios', rota((req) => buscarSocio(criarSocio(req.body ?? {}, { admin: true }))));
adm.put('/socios/:id', rota((req) => {
  // Tirar uma inscrição de "Aguardando aprovação" é aprovar: só administrador.
  const atual = db.prepare('SELECT status FROM socios WHERE id = ?').get(req.params.id);
  if (atual?.status === 'pendente' && req.body?.status && req.body.status !== 'pendente' && req.usuario.papel !== 'admin') {
    throw erro(403, 'Só um administrador pode aprovar inscrições.');
  }
  return atualizarSocio(Number(req.params.id), req.body ?? {}, { admin: true });
}));

// Inscrições feitas pelo app (inclusive por link de cadastro) só entram depois da autorização de um administrador.
adm.post('/socios/:id/aprovar', soAdmin, rota((req) => {
  const s = db.prepare('SELECT * FROM socios WHERE id = ?').get(req.params.id);
  if (!s) throw erro(404, 'Sócio não encontrado.');
  return atualizarSocio(s.id, { ...publicar(s), status: 'ativo' }, { admin: true });
}));

adm.post('/socios/:id/redefinir-senha', rota((req) => {
  db.prepare('UPDATE socios SET senha_hash = NULL WHERE id = ?').run(req.params.id);
  db.prepare("DELETE FROM sessoes WHERE tipo = 'socio' AND ref_id = ?").run(req.params.id);
}));

adm.delete('/socios/:id', soAdmin, rota((req) => {
  db.prepare('DELETE FROM socios WHERE id = ?').run(req.params.id);
}));

// ---- Mensalidades ----
adm.get('/mensalidades', rota((req) => {
  const comp = /^\d{4}-\d{2}$/.test(req.query.competencia ?? '') ? req.query.competencia : competenciaAtual();
  const status = req.query.status ?? '';
  return {
    competencia: comp,
    itens: db.prepare(`SELECT m.*, s.nome, s.matricula, s.telefone FROM mensalidades m JOIN socios s ON s.id = m.socio_id
      WHERE m.competencia = ? AND (? = '' OR m.status = ?) ORDER BY m.status = 'informada' DESC, s.nome COLLATE NOCASE`).all(comp, status, status),
  };
}));

adm.get('/mensalidades/informadas', rota(() =>
  db.prepare(`SELECT m.*, s.nome, s.matricula FROM mensalidades m JOIN socios s ON s.id = m.socio_id WHERE m.status = 'informada' ORDER BY m.informado_em`).all()));

adm.post('/mensalidades/gerar', rota((req) => {
  const comp = req.body?.competencia;
  if (!/^\d{4}-\d{2}$/.test(comp ?? '')) throw erro(400, 'Competência inválida.');
  return { criadas: gerarMensalidades(comp) };
}));

adm.post('/mensalidades/:id/pagar', rota((req) => darBaixa(Number(req.params.id), { ...req.body, usuario: req.usuario.nome })));
adm.post('/mensalidades/:id/estornar', rota((req) => estornar(Number(req.params.id))));
adm.post('/mensalidades/:id/recusar', rota((req) => {
  db.prepare("UPDATE mensalidades SET status = 'pendente', informado_em = NULL, informado_obs = NULL WHERE id = ? AND status = 'informada'").run(req.params.id);
}));
adm.post('/mensalidades/:id/isentar', rota((req) => {
  db.prepare("UPDATE mensalidades SET status = 'isenta', valor = 0 WHERE id = ? AND status IN ('pendente','informada')").run(req.params.id);
}));
adm.post('/socios/:id/mensalidades', rota((req) => {
  const s = db.prepare('SELECT * FROM socios WHERE id = ?').get(req.params.id);
  const comp = req.body?.competencia;
  if (!s || !/^\d{4}-\d{2}$/.test(comp ?? '')) throw erro(400, 'Dados inválidos.');
  db.prepare('INSERT INTO mensalidades (socio_id, competencia, valor, status) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING')
    .run(s.id, comp, s.isencao ? 0 : s.valor_mensal, s.isencao ? 'isenta' : 'pendente');
}));

// ---- Caixa ----
adm.get('/lancamentos', rota((req) => {
  const mes = /^\d{4}-\d{2}$/.test(req.query.mes ?? '') ? req.query.mes : competenciaAtual();
  const itens = db.prepare(`SELECT l.*, s.nome AS socio_nome FROM lancamentos l LEFT JOIN socios s ON s.id = l.socio_id
    WHERE substr(l.data, 1, 7) = ? ORDER BY l.data DESC, l.id DESC`).all(mes);
  const anterior = db.prepare(`SELECT COALESCE(SUM(CASE WHEN tipo='receita' THEN valor ELSE -valor END), 0) s FROM lancamentos WHERE data < ?`).get(`${mes}-01`).s;
  return { mes, itens, saldo_anterior: anterior };
}));

adm.post('/lancamentos', rota((req) => {
  const { tipo, categoria, descricao, valor, data } = req.body ?? {};
  if (!['receita', 'despesa'].includes(tipo)) throw erro(400, 'Escolha receita ou despesa.');
  if (!(Number(valor) > 0)) throw erro(400, 'Informe um valor maior que zero.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data ?? '')) throw erro(400, 'Informe a data.');
  db.prepare('INSERT INTO lancamentos (tipo, categoria, descricao, valor, data, criado_por, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(tipo, categoria || (tipo === 'receita' ? 'Outra receita' : 'Outra despesa'), descricao || null, Number(valor), data, req.usuario.nome, agora());
}));

adm.delete('/lancamentos/:id', rota((req) => {
  const l = db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(req.params.id);
  if (!l) throw erro(404, 'Lançamento não encontrado.');
  if (l.mensalidade_id) throw erro(409, 'Este lançamento é de uma mensalidade. Estorne pela tela de Mensalidades.');
  db.prepare('DELETE FROM lancamentos WHERE id = ?').run(l.id);
}));

// ---- Avisos (aparecem no app Associados) ----
adm.get('/avisos', rota(() => comAnexos(db.prepare('SELECT * FROM avisos ORDER BY criado_em DESC').all())));
adm.post('/avisos', rota((req) => {
  const { titulo, texto, publicado = true } = req.body ?? {};
  if (!titulo || !texto) throw erro(400, 'Preencha título e texto.');
  const r = db.prepare('INSERT INTO avisos (titulo, texto, publicado, criado_em) VALUES (?, ?, ?, ?)').run(titulo, texto, publicado ? 1 : 0, agora());
  return { id: Number(r.lastInsertRowid) };
}));
adm.put('/avisos/:id', rota((req) => {
  const { titulo, texto, publicado } = req.body ?? {};
  db.prepare('UPDATE avisos SET titulo = ?, texto = ?, publicado = ? WHERE id = ?').run(titulo, texto, publicado ? 1 : 0, req.params.id);
}));
adm.delete('/avisos/:id', rota((req) => { db.prepare('DELETE FROM avisos WHERE id = ?').run(req.params.id); }));
// Anexo enviado como o próprio arquivo no corpo; o nome vem no cabeçalho X-Nome-Arquivo.
adm.post('/avisos/:id/anexos', express.raw({ type: () => true, limit: MAX_VIDEO + 1024 }), rota((req) =>
  ({ id: salvarAnexo(Number(req.params.id), decodeURIComponent(req.get('X-Nome-Arquivo') ?? ''), req.body) })));
adm.delete('/avisos/:id/anexos/:anexo', rota((req) => { db.prepare('DELETE FROM aviso_anexos WHERE id = ? AND aviso_id = ?').run(req.params.anexo, req.params.id); }));

// ---- Configurações e usuários ----
const CHAVES_CONFIG = ['nome_associacao', 'email_associacao', 'valor_ate_2sm', 'valor_acima_2sm', 'pix_chave', 'pix_nome', 'pix_cidade', 'campanhas'];
adm.get('/config', rota(() => Object.fromEntries(Object.entries(lerConfig()).filter(([k]) => CHAVES_CONFIG.includes(k)))));
adm.put('/config', soAdmin, rota((req) => {
  const up = db.prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor');
  for (const k of CHAVES_CONFIG) if (k in (req.body ?? {})) up.run(k, String(req.body[k] ?? '').trim());
}));

adm.get('/usuarios', rota(() => db.prepare('SELECT id, nome, login, papel FROM usuarios ORDER BY nome').all()));
adm.post('/usuarios', soAdmin, rota((req) => {
  const { nome, login, senha, papel } = req.body ?? {};
  if (!nome || !login || String(senha ?? '').length < 8) throw erro(400, 'Preencha nome, usuário e uma senha com pelo menos 8 caracteres.');
  if (db.prepare('SELECT 1 FROM usuarios WHERE login = ?').get(login.trim().toLowerCase())) throw erro(409, 'Já existe um usuário com esse login.');
  db.prepare('INSERT INTO usuarios (nome, login, senha_hash, papel) VALUES (?, ?, ?, ?)').run(nome.trim(), login.trim().toLowerCase(), hashSenha(senha), papel === 'admin' ? 'admin' : 'tesoureiro');
}));
adm.delete('/usuarios/:id', soAdmin, rota((req) => {
  if (Number(req.params.id) === req.usuario.id) throw erro(400, 'Você não pode remover a si mesmo.');
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id);
  db.prepare("DELETE FROM sessoes WHERE tipo = 'admin' AND ref_id = ?").run(req.params.id);
}));
adm.post('/senha', rota((req) => {
  const u = db.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!conferirSenha(req.body?.atual ?? '', u.senha_hash)) throw erro(400, 'Senha atual incorreta.');
  if (String(req.body?.nova ?? '').length < 8) throw erro(400, 'A nova senha precisa ter pelo menos 8 caracteres.');
  db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(hashSenha(req.body.nova), req.usuario.id);
}));

// ---- Importar / exportar ----
adm.post('/importar', soAdmin, rota(async (req) => {
  const { csv, url, simular } = req.body ?? {};
  // Antes de importar de verdade, uma cópia de segurança para poder voltar atrás.
  if (!simular && (csv || url)) fazerCopia('antes');
  if (csv) return importarCsv(String(csv), { simular: !!simular });
  if (url) return importarDeLink(String(url), { simular: !!simular });
  throw erro(400, 'Envie o arquivo CSV ou o link da planilha.');
}));

adm.get('/exportar/socios.csv', rota((_req, res) => {
  const linhas = db.prepare('SELECT * FROM socios ORDER BY matricula').all();
  const cab = ['Matrícula', 'Status', 'Nome', 'Nascimento', 'CPF', 'E-mail', 'Telefone', 'Endereço', 'Profissão', 'Categoria', 'Renda familiar', 'Mensalidade', 'Isenção', 'Pessoas autistas', 'Recebe BPC', 'Inscrito em'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const autistas = db.prepare(`SELECT socio_id, group_concat(nome, '; ') AS nomes FROM autistas GROUP BY socio_id`).all();
  const porSocio = new Map(autistas.map((a) => [a.socio_id, a.nomes]));
  const corpo = linhas.map((s) => [s.matricula, s.status, s.nome, s.nascimento, s.cpf, s.email, s.telefone, s.endereco, s.profissao, rotulo(CATEGORIAS, s.categoria), rotulo(RENDAS, s.renda_familiar), s.valor_mensal, s.isencao, porSocio.get(s.id), s.recebe_bpc === null ? '' : s.recebe_bpc ? 'Sim' : 'Não', s.inscrito_em?.slice(0, 10)].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="socios-uppa.csv"');
  res.send('﻿' + [cab.map(esc).join(','), ...corpo].join('\r\n'));
}));

// ---- 1.7: foto e documentos, cartão (Mercado Pago), agenda e mensagens privadas ----
rotasArquivos({ app, assoc, adm, rota, segredo });
rotasMercadoPago({ app, assoc, adm, soAdmin, rota, darBaixa });
rotasSicredi({ app, assoc, adm, soAdmin, rota, darBaixa });
rotasAgenda({ assoc, adm, rota });
rotasMensagens({ assoc, adm, rota });

// ---- Aviso de nova inscrição por e-mail e WhatsApp (só administradores) ----
adm.get('/notificacoes', soAdmin, rota(() => lerNotificacoes()));
adm.put('/notificacoes', soAdmin, rota((req) => gravarNotificacoes(req.body ?? {})));
adm.post('/notificacoes/teste', soAdmin, rota((req) => testarNotificacoes(enderecoFinanceiro(req))));

// ---- Cópias de segurança (só administradores) ----
adm.get('/copias', soAdmin, rota(() => ({ pasta: PASTA_COPIAS, copias: listarCopias() })));
adm.post('/copias', soAdmin, rota(() => fazerCopia('manual')));
adm.get('/copias/:nome', soAdmin, rota((req, res) => {
  const p = caminhoCopia(req.params.nome);
  return new Promise((ok, falha) => res.download(p, req.params.nome, (e) => (e ? falha(e) : ok())));
}));

app.use('/api/admin', adm);

app.use('/api', (_req, _res, next) => next(erro(404, 'Rota não encontrada.')));

// ---------------- Apps compilados ----------------
for (const nome of ['financeiro', 'associados']) {
  const pasta = path.resolve('dist', nome);
  if (fs.existsSync(pasta)) {
    // "/associados" sem a barra: entrega a página direto (sem o redirecionamento que custa uma ida e volta),
    // com <base> para os caminhos relativos dos arquivos; o app acerta a barra no endereço ao abrir.
    app.get(`/${nome}`, (req, res, next) => {
      if (req.path.endsWith('/')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.type('html').send(fs.readFileSync(path.join(pasta, 'index.html'), 'utf8').replace('<head>', `<head>\n    <base href="/${nome}/" />`));
    });
    // Arquivos com o código da versão no nome (assets/index-AbC123.js): nunca mudam, cache de 1 ano.
    app.use(`/${nome}/assets`, express.static(path.join(pasta, 'assets'), { immutable: true, maxAge: '365d', fallthrough: false }));
    // Ícones e manifesto: 1 dia. A página (index.html) sempre confere se há versão nova.
    app.use(`/${nome}`, express.static(pasta, { maxAge: '1d', setHeaders: (res, arquivo) => arquivo.endsWith('.html') && res.setHeader('Cache-Control', 'no-cache') }));
  }
}
app.get('/', (_req, res) =>
  res.type('html').send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UPPA</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f7fb;color:#13293d;display:grid;place-items:center;min-height:100vh;margin:0}main{text-align:center;padding:24px}a{display:block;margin:12px auto;padding:16px 24px;border-radius:14px;background:#1f6fb2;color:#fff;text-decoration:none;font-weight:600;max-width:280px}a.b{background:#2a9d8f}</style>
<main><h1>UPPA</h1><p>União de Pais e Pessoas Autistas</p><a href="/associados/">UPPA Associados</a><a class="b" href="/financeiro/">UPPA Financeiro</a></main>`));

app.use((e, _req, res, _next) => {
  // Erros 4xx das bibliotecas (ex.: arquivo de /assets que não existe) mantêm o código; o resto vira 500.
  const status = e instanceof ErroHttp ? e.status : e.type === 'entity.too.large' ? 413 : e.status >= 400 && e.status < 500 ? e.status : 500;
  if (status === 500) console.error(e);
  const mensagem = status === 500 ? 'Erro interno no servidor.' : e.type === 'entity.too.large' ? 'Arquivo grande demais (máximo de 10 MB; vídeos até 60 MB).' : status === 404 && !(e instanceof ErroHttp) ? 'Arquivo não encontrado.' : e.message;
  res.status(status).json({ erro: mensagem });
});

const HOST = process.env.HOST || undefined;
app.listen(PORTA, HOST, () => console.log(`UPPA servidor em http://${HOST ?? 'localhost'}:${PORTA}`));
iniciarRotinaDoDia();
iniciarCopias();
