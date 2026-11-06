// Crachá de identificação da equipe do UPPA Financeiro (presidência, diretoria, tesouraria).
// - Foto da pessoa (endereço assinado com versão, como a foto do sócio).
// - Cargo escrito no crachá (ex.: "Vice-presidente"); sem cargo, usa o nome do perfil.
// - QR Code com um código por pessoa: a página pública confirma nome, cargo e foto. Quem perde o acesso
//   (usuário removido) deixa de ser reconhecido na hora.
import crypto from 'node:crypto';
import express from 'express';
import { db, agora } from './db.mjs';
import { erro } from './util.mjs';
import { tipoReal } from './arquivos.mjs';

const MAX_FOTO = 3 * 1024 * 1024;
const CARGO_PADRAO = { presidente: 'Presidente', admin: 'Administrador', diretoria: 'Membro da Diretoria', tesoureiro: 'Tesoureiro' };
const bruto = express.raw({ type: () => true, limit: MAX_FOTO + 1024 });

let segredo = '';
const hmac = (texto, n) => crypto.createHmac('sha256', segredo).update(texto).digest('base64url').slice(0, n);
const confere = (texto, sig) => {
  const a = Buffer.from(hmac(texto, 22));
  const b = Buffer.from(String(sig ?? ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const codigoCracha = (id) => hmac(`usuario:${id}`, 16);
const versaoFoto = (iso) => String(Date.parse(iso) || 0);
function fotoUsuario(id) {
  const f = db.prepare('SELECT atualizado_em FROM usuario_fotos WHERE usuario_id = ?').get(id);
  if (!f) return null;
  const v = versaoFoto(f.atualizado_em);
  return `/api/publico/foto-usuario/${id}/${v}/${hmac(`fotou:${id}:${v}`, 22)}`;
}
const cargoDe = (u) => (u.cargo && u.cargo.trim()) || CARGO_PADRAO[u.papel] || 'Equipe';
/** No crachá vai só o primeiro e o último nome ("Sharinne Allanne de Jesus Aver" → "Sharinne Aver"). */
export const nomeCracha = (nome) => {
  const p = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p.join('');
};

function dadosCracha(id) {
  const u = db.prepare('SELECT id, nome, papel, cargo FROM usuarios WHERE id = ?').get(id);
  if (!u) throw erro(404, 'Usuário não encontrado.');
  return { id: u.id, nome: nomeCracha(u.nome), papel: u.papel, cargo: cargoDe(u), cargo_proprio: u.cargo ?? '', foto: fotoUsuario(u.id), codigo: codigoCracha(u.id) };
}

export function rotasCracha({ app, adm, rota, segredo: s, podeTudo }) {
  segredo = s;
  // Cada um mexe no próprio crachá; presidência e administrador, no de qualquer pessoa.
  const alvo = (req) => {
    const id = Number(req.params.id);
    if (id !== req.usuario.id && !podeTudo(req.usuario)) throw erro(403, 'Somente a presidência ou um administrador.');
    return id;
  };

  // ---- Público ----
  app.get('/api/publico/foto-usuario/:id/:v/:sig', rota((req, res) => {
    if (!confere(`fotou:${req.params.id}:${req.params.v}`, req.params.sig)) throw erro(404, 'Foto não encontrada.');
    const f = db.prepare('SELECT tipo, dados, atualizado_em FROM usuario_fotos WHERE usuario_id = ?').get(req.params.id);
    if (!f || versaoFoto(f.atualizado_em) !== req.params.v) throw erro(404, 'Foto não encontrada.');
    res.setHeader('Content-Type', f.tipo);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.end(Buffer.from(f.dados));
  }));
  app.get('/api/publico/cracha/:codigo', rota((req) => {
    const u = db.prepare('SELECT id, nome, papel, cargo FROM usuarios').all().find((x) => codigoCracha(x.id) === req.params.codigo);
    if (!u) throw erro(404, 'Crachá não reconhecido. A pessoa pode não fazer mais parte da equipe da UPPA.');
    return { nome: nomeCracha(u.nome), cargo: cargoDe(u), foto: fotoUsuario(u.id) };
  }));

  // ---- Equipe ----
  adm.get('/cracha', rota((req) => dadosCracha(req.usuario.id)));
  adm.get('/usuarios/:id/cracha', rota((req) => dadosCracha(alvo(req))));
  adm.put('/usuarios/:id/foto', bruto, rota((req) => {
    const id = alvo(req);
    if (!db.prepare('SELECT 1 FROM usuarios WHERE id = ?').get(id)) throw erro(404, 'Usuário não encontrado.');
    const dados = req.body;
    if (!Buffer.isBuffer(dados) || !dados.length) throw erro(400, 'Envie a foto.');
    if (dados.length > MAX_FOTO) throw erro(413, 'Foto grande demais (máximo de 3 MB).');
    const tipo = tipoReal(dados);
    if (!tipo || tipo === 'application/pdf') throw erro(415, 'A foto precisa ser uma imagem JPG, PNG ou WEBP.');
    db.prepare('INSERT INTO usuario_fotos (usuario_id, tipo, dados, atualizado_em) VALUES (?, ?, ?, ?) ON CONFLICT(usuario_id) DO UPDATE SET tipo = excluded.tipo, dados = excluded.dados, atualizado_em = excluded.atualizado_em').run(id, tipo, dados, agora());
    return { foto: fotoUsuario(id) };
  }));
  adm.delete('/usuarios/:id/foto', rota((req) => {
    db.prepare('DELETE FROM usuario_fotos WHERE usuario_id = ?').run(alvo(req));
  }));
  // O cargo escrito no crachá é definido pela presidência/administrador.
  adm.put('/usuarios/:id/cargo', rota((req) => {
    if (!podeTudo(req.usuario)) throw erro(403, 'Somente a presidência ou um administrador.');
    const cargo = String(req.body?.cargo ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!db.prepare('UPDATE usuarios SET cargo = ? WHERE id = ?').run(cargo || null, req.params.id).changes) throw erro(404, 'Usuário não encontrado.');
    return dadosCracha(Number(req.params.id));
  }));
}
