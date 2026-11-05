// Cópias de segurança do banco (sócios, mensalidades, caixa, avisos e anexos).
// - Automática: uma por dia (o servidor confere a cada hora), verificada antes de ser guardada.
// - Manual: botão em Ajustes; e uma "antes" automática antes de cada importação da planilha.
// - Guarda as 14 diárias mais novas e a última de cada mês por 12 meses; manuais e "antes", as 20 mais novas.
// Pasta: UPPA_BACKUP_DIR, ou "copias" ao lado do banco. UPPA_BACKUP_EXTRA (opcional) recebe uma cópia de cada uma
// (por exemplo, uma pasta sincronizada com a nuvem ou um HD externo).
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { db, arquivo } from './db.mjs';
import { erro } from './util.mjs';

export const PASTA = process.env.UPPA_BACKUP_DIR || path.join(path.dirname(path.resolve(arquivo)), 'copias');
const EXTRA = process.env.UPPA_BACKUP_EXTRA || '';
const NOME = /^uppa-(auto|manual|antes)-(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})(\d{2})\.db$/;
const DIARIAS = 14;
const MENSAIS = 12;
const AVULSAS = 20;

const agoraLocal = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Boa_Vista' }); // "2026-11-05 14:03:22"

export function listarCopias() {
  if (!fs.existsSync(PASTA)) return [];
  return fs
    .readdirSync(PASTA)
    .map((nome) => {
      const m = NOME.exec(nome);
      if (!m) return null;
      return { nome, tipo: m[1], data: m[2], hora: `${m[3]}:${m[4]}`, tamanho: fs.statSync(path.join(PASTA, nome)).size };
    })
    .filter(Boolean)
    .sort((a, b) => (a.nome.slice(-21) < b.nome.slice(-21) ? 1 : -1));
}

/** Copia o banco com VACUUM INTO (cópia consistente mesmo com o sistema em uso) e confere a integridade. */
export function fazerCopia(tipo = 'manual') {
  fs.mkdirSync(PASTA, { recursive: true });
  const nome = `uppa-${tipo}-${agoraLocal().replace(' ', '_').replace(/:/g, '')}.db`;
  const destino = path.join(PASTA, nome);
  const tmp = `${destino}.tmp`;
  fs.rmSync(tmp, { force: true });
  db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
  const teste = new DatabaseSync(tmp, { readOnly: true });
  const resultado = Object.values(teste.prepare('PRAGMA quick_check').get())[0];
  teste.close();
  if (resultado !== 'ok') {
    fs.rmSync(tmp, { force: true });
    throw erro(500, `A cópia não passou na verificação (${resultado}).`);
  }
  fs.renameSync(tmp, destino);
  if (EXTRA) {
    try {
      fs.mkdirSync(EXTRA, { recursive: true });
      fs.copyFileSync(destino, path.join(EXTRA, nome));
    } catch (e) {
      console.error('Cópia extra falhou:', e.message);
    }
  }
  limpar();
  return listarCopias().find((c) => c.nome === nome);
}

function limpar() {
  const todas = listarCopias();
  const manter = new Set();
  const auto = todas.filter((c) => c.tipo === 'auto');
  auto.slice(0, DIARIAS).forEach((c) => manter.add(c.nome));
  const meses = new Set();
  for (const c of auto) {
    const mes = c.data.slice(0, 7);
    if (!meses.has(mes) && meses.size < MENSAIS) {
      meses.add(mes);
      manter.add(c.nome);
    }
  }
  todas.filter((c) => c.tipo !== 'auto').slice(0, AVULSAS).forEach((c) => manter.add(c.nome));
  for (const c of todas) if (!manter.has(c.nome)) fs.rmSync(path.join(PASTA, c.nome), { force: true });
}

/** Caminho de uma cópia pelo nome (só nomes no formato das cópias; nada de caminhos). */
export function caminhoCopia(nome) {
  if (!NOME.test(String(nome))) throw erro(404, 'Cópia não encontrada.');
  const p = path.join(PASTA, nome);
  if (!fs.existsSync(p)) throw erro(404, 'Cópia não encontrada.');
  return p;
}

export function rotinaDeCopias() {
  const hoje = agoraLocal().slice(0, 10);
  if (!listarCopias().some((c) => c.tipo === 'auto' && c.data === hoje)) return fazerCopia('auto');
  return null;
}

/** Confere ao ligar o servidor (depois de 15 s) e a cada hora; faz a cópia do dia se ainda não existir. */
export function iniciarCopias() {
  if (arquivo === ':memory:') return;
  const rodar = () => {
    try {
      const c = rotinaDeCopias();
      if (c) console.log(`Cópia de segurança do dia: ${c.nome}`);
    } catch (e) {
      console.error('Cópia de segurança automática falhou:', e.message);
    }
  };
  setTimeout(rodar, 15e3).unref();
  setInterval(rodar, 60 * 60e3).unref();
}
