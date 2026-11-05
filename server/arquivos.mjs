// Foto do sócio (perfil e carteirinha) e laudos/documentos do cadastro.
// - Foto: endereço assinado e com a "versão" (muda quando a foto muda), para abrir em <img> sem login.
// - Documentos têm dados de saúde: o endereço assinado vence em 15 minutos e só é gerado para quem tem acesso.
import crypto from 'node:crypto';
import express from 'express';
import { db, agora } from './db.mjs';
import { erro } from './util.mjs';
import { TIPOS_DOCUMENTO } from '../shared/opcoes.js';

const MB = 1024 * 1024;
const MAX_FOTO = 3 * MB;
const MAX_DOC = 10 * MB;
const MAX_DOCS = 30;
const VALIDADE_DOC = 15 * 60; // segundos

let segredo = '';
const assinar = (texto) => crypto.createHmac('sha256', segredo).update(texto).digest('base64url').slice(0, 22);
const confere = (texto, sig) => {
  const a = Buffer.from(assinar(texto));
  const b = Buffer.from(String(sig ?? ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const IMAGENS = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};
const PDF = (b) => b.subarray(0, 4).toString('latin1') === '%PDF';
/** Descobre o tipo pelo conteúdo (não confia no nome nem no que o navegador diz). */
const tipoReal = (b) => Object.entries(IMAGENS).find(([, f]) => f(b))?.[0] ?? (PDF(b) ? 'application/pdf' : null);

const bruto = express.raw({ type: () => true, limit: MAX_DOC + 1024 });
const cabecalho = (req, nome) => decodeURIComponent(req.get(nome) ?? '');

// ---------------- Foto ----------------
const versaoFoto = (iso) => String(Date.parse(iso) || 0);

/** Endereço da foto de cada sócio (Map id → url), numa consulta só. */
export function fotosDe(ids) {
  const mapa = new Map();
  if (!ids.length) return mapa;
  const linhas = db.prepare(`SELECT socio_id, atualizado_em FROM socio_fotos WHERE socio_id IN (${ids.map(() => '?').join(',')})`).all(...ids);
  for (const l of linhas) {
    const v = versaoFoto(l.atualizado_em);
    mapa.set(l.socio_id, `/api/publico/foto/${l.socio_id}/${v}/${assinar(`foto:${l.socio_id}:${v}`)}`);
  }
  return mapa;
}
export const fotoDe = (id) => fotosDe([id]).get(id) ?? null;

function salvarFoto(socioId, dados) {
  if (!Buffer.isBuffer(dados) || !dados.length) throw erro(400, 'Envie a foto.');
  if (dados.length > MAX_FOTO) throw erro(413, 'Foto grande demais (máximo de 3 MB).');
  const tipo = tipoReal(dados);
  if (!tipo || tipo === 'application/pdf') throw erro(415, 'A foto precisa ser uma imagem JPG, PNG ou WEBP.');
  db.prepare('INSERT INTO socio_fotos (socio_id, tipo, dados, atualizado_em) VALUES (?, ?, ?, ?) ON CONFLICT(socio_id) DO UPDATE SET tipo = excluded.tipo, dados = excluded.dados, atualizado_em = excluded.atualizado_em').run(socioId, tipo, dados, agora());
  return { foto: fotoDe(socioId) };
}

// ---------------- Documentos ----------------
function linkDoc(id) {
  const exp = Math.floor(Date.now() / 1000) + VALIDADE_DOC;
  return `/api/publico/doc/${id}/${exp}/${assinar(`doc:${id}:${exp}`)}`;
}

function listarDocs(socioId) {
  return db
    .prepare('SELECT id, tipo, descricao, nome, mime, tamanho, enviado_por, criado_em FROM socio_documentos WHERE socio_id = ? ORDER BY criado_em DESC')
    .all(socioId)
    .map((d) => ({ ...d, imagem: d.mime.startsWith('image/'), url: linkDoc(d.id) }));
}

function salvarDoc(socioId, req, enviadoPor) {
  const dados = req.body;
  if (!Buffer.isBuffer(dados) || !dados.length) throw erro(400, 'Envie o arquivo.');
  if (dados.length > MAX_DOC) throw erro(413, 'Arquivo grande demais (máximo de 10 MB).');
  const mime = tipoReal(dados);
  if (!mime) throw erro(415, 'Envie uma foto (JPG, PNG, WEBP) ou um PDF.');
  const tipo = cabecalho(req, 'X-Tipo-Documento');
  if (!TIPOS_DOCUMENTO.some((t) => t.valor === tipo)) throw erro(400, 'Escolha o tipo do documento.');
  if (db.prepare('SELECT COUNT(*) n FROM socio_documentos WHERE socio_id = ?').get(socioId).n >= MAX_DOCS) throw erro(409, `Limite de ${MAX_DOCS} documentos por sócio. Remova algum antigo.`);
  const descricao = cabecalho(req, 'X-Descricao').trim().slice(0, 120) || null;
  const nome = cabecalho(req, 'X-Nome-Arquivo').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(-120) || (mime === 'application/pdf' ? 'documento.pdf' : 'foto.jpg');
  const r = db
    .prepare('INSERT INTO socio_documentos (socio_id, tipo, descricao, nome, mime, tamanho, dados, enviado_por, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(socioId, tipo, descricao, nome, mime, dados.length, dados, enviadoPor, agora());
  return { id: Number(r.lastInsertRowid) };
}

function apagarDoc(socioId, id) {
  if (!db.prepare('DELETE FROM socio_documentos WHERE id = ? AND socio_id = ?').run(id, socioId).changes) throw erro(404, 'Documento não encontrado.');
}

/** Registra as rotas (antes do "rota não encontrada" da API). */
export function rotasArquivos({ app, assoc, adm, rota, segredo: s }) {
  segredo = s;

  // Público, por endereço assinado
  app.get('/api/publico/foto/:id/:v/:sig', rota((req, res) => {
    if (!confere(`foto:${req.params.id}:${req.params.v}`, req.params.sig)) throw erro(404, 'Foto não encontrada.');
    const f = db.prepare('SELECT tipo, dados, atualizado_em FROM socio_fotos WHERE socio_id = ?').get(req.params.id);
    if (!f || versaoFoto(f.atualizado_em) !== req.params.v) throw erro(404, 'Foto não encontrada.');
    res.setHeader('Content-Type', f.tipo);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.end(Buffer.from(f.dados));
  }));
  app.get('/api/publico/doc/:id/:exp/:sig', rota((req, res) => {
    const { id, exp, sig } = req.params;
    if (!confere(`doc:${id}:${exp}`, sig)) throw erro(404, 'Documento não encontrado.');
    if (Number(exp) < Date.now() / 1000) throw erro(410, 'Este link venceu. Abra o documento de novo pelo app.');
    const d = db.prepare('SELECT nome, mime, dados FROM socio_documentos WHERE id = ?').get(id);
    if (!d) throw erro(404, 'Documento não encontrado.');
    res.setHeader('Content-Type', d.mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(d.nome)}`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(Buffer.from(d.dados));
  }));

  // O próprio sócio
  assoc.put('/foto', bruto, rota((req) => salvarFoto(req.socioId, req.body)));
  assoc.delete('/foto', rota((req) => { db.prepare('DELETE FROM socio_fotos WHERE socio_id = ?').run(req.socioId); }));
  assoc.get('/documentos', rota((req) => listarDocs(req.socioId)));
  assoc.post('/documentos', bruto, rota((req) => salvarDoc(req.socioId, req, 'o próprio sócio')));
  assoc.delete('/documentos/:id', rota((req) => apagarDoc(req.socioId, Number(req.params.id))));

  // Equipe do Financeiro
  const existe = (id) => {
    if (!db.prepare('SELECT 1 FROM socios WHERE id = ?').get(id)) throw erro(404, 'Sócio não encontrado.');
    return Number(id);
  };
  adm.put('/socios/:id/foto', bruto, rota((req) => salvarFoto(existe(req.params.id), req.body)));
  adm.delete('/socios/:id/foto', rota((req) => { db.prepare('DELETE FROM socio_fotos WHERE socio_id = ?').run(existe(req.params.id)); }));
  adm.get('/socios/:id/documentos', rota((req) => listarDocs(existe(req.params.id))));
  adm.post('/socios/:id/documentos', bruto, rota((req) => salvarDoc(existe(req.params.id), req, req.usuario.nome)));
  adm.delete('/socios/:id/documentos/:doc', rota((req) => apagarDoc(existe(req.params.id), Number(req.params.doc))));
}
