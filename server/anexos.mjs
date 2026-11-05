// Anexos dos avisos: imagens, vídeos e arquivos de texto guardados no próprio banco (vão junto na cópia de segurança).
// O endereço de cada anexo leva um código assinado, para abrir em <img>, <video> e links sem precisar de login.
import crypto from 'node:crypto';
import { db, agora } from './db.mjs';
import { erro } from './util.mjs';

const MB = 1024 * 1024;
export const MAX_ANEXO = 10 * MB;
export const MAX_VIDEO = 60 * MB;
export const MAX_POR_AVISO = 8;
// Pedaço máximo entregue por pedido "Range" (o vídeo toca enquanto baixa, sem carregar o arquivo inteiro na memória).
const PEDACO = 4 * MB;

const mp4 = (b) => b.subarray(4, 8).toString('latin1') === 'ftyp';

// Só estes tipos entram; o conteúdo é conferido pela assinatura do arquivo, não só pela extensão.
const TIPOS = {
  jpg: { mime: 'image/jpeg', assinatura: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  jpeg: { mime: 'image/jpeg', assinatura: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  png: { mime: 'image/png', assinatura: (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) },
  gif: { mime: 'image/gif', assinatura: (b) => b.subarray(0, 4).toString('latin1') === 'GIF8' },
  webp: { mime: 'image/webp', assinatura: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  // Vídeos: .mov do iPhone também é entregue como MP4, que é o que os navegadores sabem tocar.
  mp4: { mime: 'video/mp4', assinatura: mp4 },
  m4v: { mime: 'video/mp4', assinatura: mp4 },
  mov: { mime: 'video/mp4', assinatura: mp4 },
  webm: { mime: 'video/webm', assinatura: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
  pdf: { mime: 'application/pdf', assinatura: (b) => b.subarray(0, 4).toString('latin1') === '%PDF' },
  txt: { mime: 'text/plain; charset=utf-8', assinatura: (b) => !b.subarray(0, 8192).includes(0) },
  rtf: { mime: 'application/rtf', assinatura: (b) => b.subarray(0, 5).toString('latin1') === '{\\rtf' },
  doc: { mime: 'application/msword', assinatura: (b) => b.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])) },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', assinatura: (b) => b.subarray(0, 4).toString('latin1') === 'PK\x03\x04' },
  odt: { mime: 'application/vnd.oasis.opendocument.text', assinatura: (b) => b.subarray(0, 4).toString('latin1') === 'PK\x03\x04' },
};
export const EXTENSOES = Object.keys(TIPOS);

const codigo = (id, segredo) => crypto.createHmac('sha256', segredo).update(`anexo:${id}`).digest('base64url').slice(0, 20);
const ehImagem = (tipo) => tipo.startsWith('image/');
const ehVideo = (tipo) => tipo.startsWith('video/');

export function anexosDoAviso(avisoId, segredo) {
  return db
    .prepare('SELECT id, nome, tipo, tamanho FROM aviso_anexos WHERE aviso_id = ? ORDER BY id')
    .all(avisoId)
    .map((a) => ({ ...a, imagem: ehImagem(a.tipo), video: ehVideo(a.tipo), url: `/api/publico/anexo/${a.id}/${codigo(a.id, segredo)}` }));
}

export function salvarAnexo(avisoId, nomeOriginal, dados) {
  if (!db.prepare('SELECT 1 FROM avisos WHERE id = ?').get(avisoId)) throw erro(404, 'Aviso não encontrado.');
  if (!Buffer.isBuffer(dados) || dados.length === 0) throw erro(400, 'Arquivo vazio.');
  const nome = String(nomeOriginal ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(-120) || 'arquivo';
  const ext = nome.includes('.') ? nome.split('.').pop().toLowerCase() : '';
  const tipo = TIPOS[ext];
  if (!tipo) throw erro(415, 'Tipo de arquivo não aceito. Use imagens (JPG, PNG, WEBP, GIF), vídeos (MP4, MOV, WEBM) ou textos (PDF, DOC, DOCX, ODT, RTF, TXT).');
  const video = ehVideo(tipo.mime);
  if (dados.length > (video ? MAX_VIDEO : MAX_ANEXO)) throw erro(413, video ? 'Vídeo grande demais (máximo de 60 MB).' : 'Arquivo grande demais (máximo de 10 MB).');
  if (!tipo.assinatura(dados)) throw erro(415, `O conteúdo de "${nome}" não parece ser um arquivo .${ext} de verdade.`);
  if (db.prepare('SELECT COUNT(*) n FROM aviso_anexos WHERE aviso_id = ?').get(avisoId).n >= MAX_POR_AVISO) throw erro(409, `Cada aviso pode ter até ${MAX_POR_AVISO} anexos.`);
  const r = db.prepare('INSERT INTO aviso_anexos (aviso_id, nome, tipo, tamanho, dados, criado_em) VALUES (?, ?, ?, ?, ?, ?)').run(avisoId, nome, tipo.mime, dados.length, dados, agora());
  return Number(r.lastInsertRowid);
}

/** Entrega o arquivo: imagens, vídeos e PDF abrem no navegador; os demais são baixados. Aceita "Range" (vídeo). */
export function enviarAnexo(req, res, segredo) {
  const id = Number(req.params.id);
  const esperado = Buffer.from(codigo(id, segredo));
  const recebido = Buffer.from(String(req.params.codigo ?? ''));
  if (recebido.length !== esperado.length || !crypto.timingSafeEqual(recebido, esperado)) throw erro(404, 'Anexo não encontrado.');
  const a = db.prepare('SELECT nome, tipo, tamanho FROM aviso_anexos WHERE id = ?').get(id);
  if (!a) throw erro(404, 'Anexo não encontrado.');
  const abrir = ehImagem(a.tipo) || ehVideo(a.tipo) || a.tipo === 'application/pdf';
  res.setHeader('Content-Type', a.tipo);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `${abrir ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(a.nome)}`);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.setHeader('Accept-Ranges', 'bytes');

  const faixa = /^bytes=(\d*)-(\d*)$/.exec(req.get('Range') ?? '');
  if (faixa && (faixa[1] !== '' || faixa[2] !== '')) {
    let ini, fim;
    if (faixa[1] === '') {
      ini = Math.max(0, a.tamanho - Number(faixa[2]));
      fim = a.tamanho - 1;
    } else {
      ini = Number(faixa[1]);
      fim = faixa[2] === '' ? a.tamanho - 1 : Math.min(Number(faixa[2]), a.tamanho - 1);
    }
    if (ini >= a.tamanho || ini > fim) {
      res.status(416).setHeader('Content-Range', `bytes */${a.tamanho}`);
      return res.end();
    }
    fim = Math.min(fim, ini + PEDACO - 1);
    const parte = Buffer.from(db.prepare('SELECT substr(dados, ?, ?) AS p FROM aviso_anexos WHERE id = ?').get(ini + 1, fim - ini + 1, id).p);
    res.status(206);
    res.setHeader('Content-Range', `bytes ${ini}-${fim}/${a.tamanho}`);
    res.setHeader('Content-Length', parte.length);
    return res.end(parte);
  }
  const { dados } = db.prepare('SELECT dados FROM aviso_anexos WHERE id = ?').get(id);
  res.setHeader('Content-Length', dados.length);
  res.end(Buffer.from(dados));
}
