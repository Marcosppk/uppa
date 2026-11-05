// Regras do cadastro de sócios, compartilhadas pelas rotas do Financeiro, do Associados e da importação.
import { db, agora, lerConfig, transacao } from './db.mjs';
import { soDigitos, cpfValido, erro } from './util.mjs';
import { CATEGORIAS, RENDAS, RENDA_ATE_2SM, ISENCOES } from '../shared/opcoes.js';

const bool = (v) => (v === null || v === undefined || v === '' ? null : v ? 1 : 0);
const texto = (v) => {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
};

export function valorPadrao(renda) {
  const c = lerConfig();
  return Number(RENDA_ATE_2SM.includes(renda) ? c.valor_ate_2sm : c.valor_acima_2sm);
}

/** Converte linha do banco no objeto enviado aos apps (sem senha). */
export function publicar(linha, { comAutistas = true } = {}) {
  if (!linha) return null;
  const { senha_hash, ...s } = linha;
  for (const k of ['recebe_bpc', 'autoriza_imagem', 'ciente_estatuto', 'ciente_documentos']) s[k] = s[k] === null ? null : !!s[k];
  s.tem_senha = !!senha_hash;
  if (comAutistas) s.autistas = db.prepare('SELECT id, nome, nascimento, nascimento_texto, idade_informada FROM autistas WHERE socio_id = ? ORDER BY id').all(s.id);
  return s;
}

export const buscarSocio = (id) => publicar(db.prepare('SELECT * FROM socios WHERE id = ?').get(id));

const proximaMatricula = () => (db.prepare('SELECT MAX(matricula) AS m FROM socios').get().m ?? 0) + 1;

/**
 * Valida e normaliza os dados. `parcial` deixa de exigir campos (atualização do próprio sócio).
 * Campos administrativos (status, valor, isenção, observações) só passam quando `admin` = true.
 */
function normalizar(d, { admin, exigirCpfValido = true }) {
  const s = {
    email: texto(d.email)?.toLowerCase() ?? null,
    nome: texto(d.nome),
    nascimento: /^\d{4}-\d{2}-\d{2}$/.test(d.nascimento ?? '') ? d.nascimento : null,
    profissao: texto(d.profissao),
    cpf: soDigitos(d.cpf) || null,
    endereco: texto(d.endereco),
    telefone: texto(d.telefone),
    renda_familiar: RENDAS.some((r) => r.valor === d.renda_familiar) ? d.renda_familiar : null,
    categoria: CATEGORIAS.some((c) => c.valor === d.categoria) ? d.categoria : null,
    dependente_nome: texto(d.dependente_nome),
    dependente_cpf: soDigitos(d.dependente_cpf) || null,
    atividade_remunerada: texto(d.atividade_remunerada),
    participacao_economica: texto(d.participacao_economica),
    recebe_bpc: bool(d.recebe_bpc),
    autoriza_imagem: bool(d.autoriza_imagem),
    ciente_estatuto: bool(d.ciente_estatuto),
    ciente_documentos: bool(d.ciente_documentos),
    documentos: texto(d.documentos),
  };
  if (!s.nome) throw erro(400, 'Informe o nome completo.');
  if (exigirCpfValido && s.cpf && !cpfValido(s.cpf)) throw erro(400, 'CPF inválido. Confira os números.');
  if (admin) {
    if (['pendente', 'ativo', 'inativo'].includes(d.status)) s.status = d.status;
    s.isencao = ISENCOES.some((i) => i.valor === d.isencao) ? d.isencao : null;
    s.valor_mensal = d.valor_mensal === undefined || d.valor_mensal === '' || d.valor_mensal === null ? valorPadrao(s.renda_familiar) : Number(d.valor_mensal);
    s.observacoes = texto(d.observacoes);
    if (d.controle_planilha !== undefined) s.controle_planilha = texto(d.controle_planilha);
  }
  const autistas = Array.isArray(d.autistas)
    ? d.autistas
        .map((a) => ({ nome: texto(a.nome), nascimento: /^\d{4}-\d{2}-\d{2}$/.test(a.nascimento ?? '') ? a.nascimento : null, nascimento_texto: texto(a.nascimento_texto), idade_informada: texto(a.idade_informada) }))
        .filter((a) => a.nome)
    : null;
  if (autistas) s.qtd_autistas = autistas.length;
  return { s, autistas };
}

function gravarAutistas(socioId, autistas) {
  db.prepare('DELETE FROM autistas WHERE socio_id = ?').run(socioId);
  const ins = db.prepare('INSERT INTO autistas (socio_id, nome, nascimento, nascimento_texto, idade_informada) VALUES (?, ?, ?, ?, ?)');
  for (const a of autistas) ins.run(socioId, a.nome, a.nascimento, a.nascimento_texto, a.idade_informada);
}

function conferirCpfLivre(cpf, id) {
  if (!cpf) return;
  const outro = db.prepare('SELECT id, nome FROM socios WHERE cpf = ? AND id IS NOT ?').get(cpf, id ?? null);
  if (outro) throw erro(409, `Este CPF já está cadastrado (matrícula de ${outro.nome}).`);
}

export function criarSocio(dados, { admin = false, inscritoEm, exigirCpfValido = true } = {}) {
  const { s, autistas } = normalizar(dados, { admin, exigirCpfValido });
  if (!admin) {
    if (!s.cpf) throw erro(400, 'Informe o CPF.');
    s.status = 'pendente';
    s.valor_mensal = valorPadrao(s.renda_familiar);
  }
  s.status ??= 'ativo';
  conferirCpfLivre(s.cpf);
  return transacao(() => {
    s.inscrito_em = inscritoEm ?? agora();
    s.atualizado_em = agora();
    if (s.status !== 'pendente') s.matricula = proximaMatricula();
    const cols = Object.keys(s);
    const r = db.prepare(`INSERT INTO socios (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...cols.map((c) => s[c]));
    const id = Number(r.lastInsertRowid);
    if (autistas) gravarAutistas(id, autistas);
    return id;
  });
}

/** Campos que o próprio sócio pode mudar pelo app Associados. */
const CAMPOS_DO_SOCIO = ['nascimento', 'email', 'profissao', 'endereco', 'telefone', 'renda_familiar', 'dependente_nome', 'dependente_cpf', 'atividade_remunerada', 'participacao_economica', 'recebe_bpc', 'autoriza_imagem'];

export function atualizarSocio(id, dados, { admin = false } = {}) {
  const atual = db.prepare('SELECT * FROM socios WHERE id = ?').get(id);
  if (!atual) throw erro(404, 'Sócio não encontrado.');
  const base = admin ? dados : { ...publicar(atual, { comAutistas: false }), ...Object.fromEntries(CAMPOS_DO_SOCIO.filter((k) => k in dados).map((k) => [k, dados[k]])), autistas: dados.autistas };
  const { s, autistas } = normalizar(base, { admin, exigirCpfValido: admin ? soDigitos(dados.cpf) !== atual.cpf : false });
  if (!admin) for (const k of Object.keys(s)) if (!CAMPOS_DO_SOCIO.includes(k) && k !== 'qtd_autistas') delete s[k];
  if (admin) conferirCpfLivre(s.cpf, id);
  transacao(() => {
    if (admin && s.status && s.status !== 'pendente' && !atual.matricula) s.matricula = proximaMatricula();
    s.atualizado_em = agora();
    const cols = Object.keys(s);
    db.prepare(`UPDATE socios SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...cols.map((c) => s[c]), id);
    if (autistas) gravarAutistas(id, autistas);
  });
  return buscarSocio(id);
}
