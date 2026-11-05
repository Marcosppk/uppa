// Banco de dados SQLite (módulo nativo node:sqlite). Um único arquivo guarda tudo
// o que os dois apps compartilham: sócios, pessoas autistas, mensalidades, caixa e avisos.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export const arquivo = process.env.UPPA_DB || path.resolve('data', 'uppa.db');
if (arquivo !== ':memory:') fs.mkdirSync(path.dirname(arquivo), { recursive: true });

export const db = new DatabaseSync(arquivo);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS socios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matricula INTEGER UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendente',          -- pendente | ativo | inativo
  inscrito_em TEXT NOT NULL,                        -- data/hora da inscrição (ISO)
  email TEXT,
  nome TEXT NOT NULL,
  profissao TEXT,
  cpf TEXT UNIQUE,                                  -- só dígitos
  endereco TEXT,
  telefone TEXT,
  renda_familiar TEXT,
  categoria TEXT,                                   -- pai_mae | autista | familiar | apoiador
  dependente_nome TEXT,
  dependente_cpf TEXT,
  qtd_autistas INTEGER,
  atividade_remunerada TEXT,
  participacao_economica TEXT,
  recebe_bpc INTEGER,
  valor_mensal REAL NOT NULL DEFAULT 10,
  isencao TEXT,                                     -- null | dependente | diretoria | outro
  autoriza_imagem INTEGER,
  ciente_estatuto INTEGER,
  ciente_documentos INTEGER,
  documentos TEXT,                                  -- links dos PDFs enviados
  controle_planilha TEXT,                           -- texto original de "Controle de Contribuição"
  observacoes TEXT,
  senha_hash TEXT,
  atualizado_em TEXT
);
CREATE TABLE IF NOT EXISTS autistas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nascimento TEXT,                                  -- AAAA-MM-DD
  nascimento_texto TEXT,                            -- como veio da planilha, quando não deu para ler
  idade_informada TEXT
);
CREATE TABLE IF NOT EXISTS mensalidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL,                        -- AAAA-MM
  valor REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',          -- pendente | informada | paga | isenta
  pago_em TEXT,
  forma TEXT,                                       -- pix | dinheiro | transferencia | outro
  informado_em TEXT,
  informado_obs TEXT,
  lancamento_id INTEGER,
  UNIQUE (socio_id, competencia)
);
CREATE TABLE IF NOT EXISTS lancamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,                               -- receita | despesa
  categoria TEXT NOT NULL,
  descricao TEXT,
  valor REAL NOT NULL,
  data TEXT NOT NULL,                               -- AAAA-MM-DD
  socio_id INTEGER REFERENCES socios(id) ON DELETE SET NULL,
  mensalidade_id INTEGER,
  criado_por TEXT,
  criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS avisos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  texto TEXT NOT NULL,
  publicado INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'tesoureiro'          -- admin | tesoureiro
);
CREATE TABLE IF NOT EXISTS sessoes (
  token TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,                               -- admin | socio
  ref_id INTEGER NOT NULL,
  expira_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS config (
  chave TEXT PRIMARY KEY,
  valor TEXT
);
`);

// Colunas acrescentadas depois da primeira versão (o ALTER falha quando a coluna já existe).
for (const sql of [
  // Sessão aberta com a senha padrão: só serve para o sócio criar a própria senha.
  'ALTER TABLE sessoes ADD COLUMN provisoria INTEGER NOT NULL DEFAULT 0',
  // Inscrição feita por link de convite: quem convidou (texto guardado na hora) e o código usado.
  'ALTER TABLE socios ADD COLUMN convidado_por TEXT',
  'ALTER TABLE socios ADD COLUMN convite TEXT',
  // Data de nascimento do sócio (para os parabéns no aniversário). AAAA-MM-DD.
  'ALTER TABLE socios ADD COLUMN nascimento TEXT',
]) {
  try {
    db.exec(sql);
  } catch {
    /* coluna já existe */
  }
}

// Links de cadastro: cada sócio ou usuário do Financeiro tem o seu código.
db.exec(`
CREATE TABLE IF NOT EXISTS convites (
  codigo TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,                               -- socio | admin
  ref_id INTEGER NOT NULL,
  usos INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL,
  UNIQUE (tipo, ref_id)
);
-- Rotinas automáticas já feitas (ex.: aviso do Dia do Orgulho Autista de 2027), para não repetir.
-- Anexos dos avisos (imagens e arquivos de texto), guardados no próprio banco.
CREATE TABLE IF NOT EXISTS aviso_anexos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aviso_id INTEGER NOT NULL REFERENCES avisos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  tamanho INTEGER NOT NULL,
  dados BLOB NOT NULL,
  criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rotinas_feitas (
  chave TEXT PRIMARY KEY,
  feito_em TEXT NOT NULL
);
`);

const padrao = {
  nome_associacao: 'UPPA-RR — União de Pais e Pessoas Autistas de Roraima',
  email_associacao: 'uppa.rr.2017@gmail.com',
  valor_ate_2sm: '10',
  valor_acima_2sm: '20',
  pix_chave: '',
  pix_nome: 'UPPA RR',
  pix_cidade: 'BOA VISTA',
};
const insConfig = db.prepare('INSERT OR IGNORE INTO config (chave, valor) VALUES (?, ?)');
for (const [k, v] of Object.entries(padrao)) insConfig.run(k, v);

export function lerConfig() {
  return Object.fromEntries(db.prepare('SELECT chave, valor FROM config').all().map((r) => [r.chave, r.valor]));
}

// Transações aninhadas viram SAVEPOINTs (a importação chama funções que já abrem transação).
let nivel = 0;
export function transacao(fn) {
  if (db.isTransaction) {
    const nome = `sp${++nivel}`;
    db.exec(`SAVEPOINT ${nome}`);
    try {
      const r = fn();
      db.exec(`RELEASE ${nome}`);
      return r;
    } catch (e) {
      db.exec(`ROLLBACK TO ${nome}; RELEASE ${nome}`);
      throw e;
    } finally {
      nivel--;
    }
  }
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export const agora = () => new Date().toISOString();
export const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Boa_Vista' });
export const competenciaAtual = () => hoje().slice(0, 7);
