// Mensagens privadas entre a diretoria (UPPA Financeiro) e cada sócio (UPPA Associados).
// Cada sócio tem uma conversa; só ele e a equipe do Financeiro veem.
import { db, agora } from './db.mjs';
import { erro } from './util.mjs';

const MAX = 2000;

function conversa(socioId) {
  return db.prepare('SELECT id, de, autor, texto, criado_em, lida_em FROM mensagens WHERE socio_id = ? ORDER BY criado_em, id').all(socioId);
}

function escrever(socioId, de, autor, texto) {
  const t = String(texto ?? '').trim();
  if (!t) throw erro(400, 'Escreva a mensagem.');
  if (t.length > MAX) throw erro(400, `A mensagem pode ter até ${MAX} caracteres.`);
  const r = db.prepare('INSERT INTO mensagens (socio_id, de, autor, texto, criado_em) VALUES (?, ?, ?, ?, ?)').run(socioId, de, autor, t, agora());
  return db.prepare('SELECT id, de, autor, texto, criado_em, lida_em FROM mensagens WHERE id = ?').get(r.lastInsertRowid);
}

/** Mensagens da diretoria que o sócio ainda não leu. */
export const naoLidasDoSocio = (socioId) => db.prepare("SELECT COUNT(*) n FROM mensagens WHERE socio_id = ? AND de = 'diretoria' AND lida_em IS NULL").get(socioId).n;
/** Respostas de sócios que a diretoria ainda não leu. */
export const naoLidasDaDiretoria = () => db.prepare("SELECT COUNT(*) n FROM mensagens WHERE de = 'socio' AND lida_em IS NULL").get().n;

export function rotasMensagens({ assoc, adm, rota }) {
  assoc.get('/mensagens', rota((req) => {
    db.prepare("UPDATE mensagens SET lida_em = ? WHERE socio_id = ? AND de = 'diretoria' AND lida_em IS NULL").run(agora(), req.socioId);
    return conversa(req.socioId);
  }));
  assoc.post('/mensagens', rota((req) => {
    const s = db.prepare('SELECT nome FROM socios WHERE id = ?').get(req.socioId);
    return escrever(req.socioId, 'socio', s.nome, req.body?.texto);
  }));

  // Caixa de entrada da diretoria: uma linha por sócio com conversa.
  adm.get('/mensagens', rota(() =>
    db.prepare(`SELECT s.id AS socio_id, s.nome, s.matricula,
        (SELECT texto FROM mensagens WHERE socio_id = s.id ORDER BY criado_em DESC, id DESC LIMIT 1) AS ultima,
        (SELECT de FROM mensagens WHERE socio_id = s.id ORDER BY criado_em DESC, id DESC LIMIT 1) AS ultima_de,
        (SELECT MAX(criado_em) FROM mensagens WHERE socio_id = s.id) AS quando,
        (SELECT COUNT(*) FROM mensagens WHERE socio_id = s.id AND de = 'socio' AND lida_em IS NULL) AS nao_lidas
      FROM socios s WHERE EXISTS (SELECT 1 FROM mensagens WHERE socio_id = s.id)
      ORDER BY nao_lidas > 0 DESC, quando DESC`).all()));
  adm.get('/socios/:id/mensagens', rota((req) => {
    db.prepare("UPDATE mensagens SET lida_em = ? WHERE socio_id = ? AND de = 'socio' AND lida_em IS NULL").run(agora(), req.params.id);
    return conversa(req.params.id);
  }));
  adm.post('/socios/:id/mensagens', rota((req) => {
    if (!db.prepare('SELECT 1 FROM socios WHERE id = ?').get(req.params.id)) throw erro(404, 'Sócio não encontrado.');
    return escrever(Number(req.params.id), 'diretoria', req.usuario.nome, req.body?.texto);
  }));
}
