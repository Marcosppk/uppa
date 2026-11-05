// Calendário: eventos cadastrados pela diretoria + datas que o sistema já conhece
// (datas da causa autista e aniversários da família do sócio).
import { db, agora } from './db.mjs';
import { erro } from './util.mjs';
import { DATAS_DA_CAUSA } from './datas.mjs';

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;
const MES = /^\d{4}-\d{2}$/;
const texto = (v, max) => {
  const s = String(v ?? '').trim().slice(0, max);
  return s || null;
};

function normalizar(d) {
  const e = {
    titulo: texto(d.titulo, 120),
    descricao: texto(d.descricao, 3000),
    data: DATA.test(d.data ?? '') ? d.data : null,
    hora_inicio: HORA.test(d.hora_inicio ?? '') ? d.hora_inicio : null,
    hora_fim: HORA.test(d.hora_fim ?? '') ? d.hora_fim : null,
    local: texto(d.local, 200),
    publicado: d.publicado === false || d.publicado === 0 ? 0 : 1,
  };
  if (!e.titulo) throw erro(400, 'Dê um título ao evento.');
  if (!e.data) throw erro(400, 'Escolha a data do evento.');
  if (e.hora_inicio && e.hora_fim && e.hora_fim < e.hora_inicio) throw erro(400, 'O horário de término é antes do início.');
  return e;
}

/** Datas fixas do mês (causa autista) e aniversários das pessoas da família do sócio. */
function datasDoMes(mes, socioId) {
  const extras = [];
  for (const c of DATAS_DA_CAUSA) if (c.dia.slice(0, 2) === mes.slice(5)) extras.push({ data: `${mes}-${c.dia.slice(3)}`, titulo: c.titulo, tipo: 'causa', emoji: c.emoji });
  if (socioId) {
    const s = db.prepare('SELECT nome, nascimento FROM socios WHERE id = ?').get(socioId);
    const pessoas = [s?.nascimento ? { nome: 'Seu aniversário', nascimento: s.nascimento } : null, ...db.prepare('SELECT nome, nascimento FROM autistas WHERE socio_id = ? AND nascimento IS NOT NULL').all(socioId).map((a) => ({ nome: `Aniversário de ${a.nome.split(' ')[0]}`, nascimento: a.nascimento }))].filter(Boolean);
    for (const p of pessoas) if (p.nascimento.slice(5, 7) === mes.slice(5)) extras.push({ data: `${mes}-${p.nascimento.slice(8)}`, titulo: p.nome, tipo: 'aniversario', emoji: '🎂' });
  }
  return extras.sort((a, b) => a.data.localeCompare(b.data));
}

export function rotasAgenda({ assoc, adm, rota }) {
  const doMes = (mes, soPublicados) => {
    if (!MES.test(mes ?? '')) throw erro(400, 'Mês inválido.');
    return db.prepare(`SELECT * FROM eventos WHERE data LIKE ? ${soPublicados ? 'AND publicado = 1' : ''} ORDER BY data, hora_inicio`).all(`${mes}-%`);
  };

  assoc.get('/agenda', rota((req) => ({ eventos: doMes(req.query.mes, true), datas: datasDoMes(req.query.mes, req.socioId) })));
  assoc.get('/agenda/proximos', rota(() => db.prepare("SELECT * FROM eventos WHERE publicado = 1 AND data >= date('now', '-4 hours') ORDER BY data, hora_inicio LIMIT 3").all()));

  adm.get('/agenda', rota((req) => ({ eventos: doMes(req.query.mes, false), datas: datasDoMes(req.query.mes, null) })));
  adm.post('/eventos', rota((req) => {
    const e = normalizar(req.body ?? {});
    const r = db.prepare('INSERT INTO eventos (titulo, descricao, data, hora_inicio, hora_fim, local, publicado, criado_por, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(e.titulo, e.descricao, e.data, e.hora_inicio, e.hora_fim, e.local, e.publicado, req.usuario.nome, agora());
    return { id: Number(r.lastInsertRowid) };
  }));
  adm.put('/eventos/:id', rota((req) => {
    const e = normalizar(req.body ?? {});
    const r = db.prepare('UPDATE eventos SET titulo = ?, descricao = ?, data = ?, hora_inicio = ?, hora_fim = ?, local = ?, publicado = ? WHERE id = ?').run(e.titulo, e.descricao, e.data, e.hora_inicio, e.hora_fim, e.local, e.publicado, req.params.id);
    if (!r.changes) throw erro(404, 'Evento não encontrado.');
  }));
  adm.delete('/eventos/:id', rota((req) => { db.prepare('DELETE FROM eventos WHERE id = ?').run(req.params.id); }));
}
