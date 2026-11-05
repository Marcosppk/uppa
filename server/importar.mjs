// Importação da planilha de respostas do Google Forms ("Respostas ao formulário 1").
// Aceita o CSV exportado (Arquivo → Fazer download → .csv) ou o link da planilha compartilhada.
import { db, transacao, agora } from './db.mjs';
import { criarSocio, atualizarSocio, valorPadrao } from './socios.mjs';
import { soDigitos, erro } from './util.mjs';
import { CATEGORIAS, RENDAS } from '../shared/opcoes.js';

export function lerCsv(t) {
  const linhas = [];
  let linha = [], campo = '', aspas = false;
  t = t.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"') {
        if (t[i + 1] === '"') { campo += '"'; i++; } else aspas = false;
      } else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ',') { linha.push(campo); campo = ''; }
    else if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (ch !== '\r') campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.filter((l) => l.some((c) => c.trim()));
}

/** Transforma o link de edição do Google Sheets no link de exportação CSV da mesma aba. */
export function linkCsv(url) {
  const m = String(url).match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/);
  if (!m) throw erro(400, 'Link não parece ser de uma planilha do Google.');
  const gid = String(url).match(/[#&?]gid=(\d+)/)?.[1];
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
}

const sem = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function data(s) {
  const t = String(s ?? '').trim();
  let m = t.match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{4})$/) || t.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return null;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mes < 1 || mes > 12 || d < 1 || d > 31 || a < 1900 || a > 2100) return null;
  return `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function carimbo(s) {
  const m = String(s ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  // Horário de Boa Vista (UTC−4)
  return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4] + 4, +m[5], +(m[6] ?? 0))).toISOString();
}

const MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
/** "PG Abr2026", "Pg Mai 2026" → ['2026-04', ...] */
export function competenciasPagas(s) {
  const out = [];
  for (const m of sem(s).matchAll(/p[gq]\.?\s*([a-z]{3})[a-z]*\.?\s*\/?\s*(\d{4})/g)) {
    if (MESES[m[1]]) out.push(`${m[2]}-${String(MESES[m[1]]).padStart(2, '0')}`);
  }
  return out;
}

const simNao = (s) => {
  const t = sem(s);
  if (t.startsWith('sim')) return true;
  if (t.startsWith('nao')) return false;
  return null;
};

function porRotulo(lista, s) {
  const t = sem(s);
  return lista.find((o) => t.includes(sem(o.planilha)))?.valor ?? null;
}

/** Converte uma linha da planilha no formato de sócio. */
function socioDaLinha(h, l) {
  const col = (teste) => {
    const i = h.findIndex(teste);
    return i < 0 ? '' : (l[i] ?? '').trim();
  };
  const tem = (pedaco) => (c) => c.includes(pedaco);

  const renda = porRotulo(RENDAS, col(tem('renda media')));
  const taxa = sem(col(tem('taxa de socio')));
  const controle = col(tem('controle de contribuicao'));
  let isencao = null;
  if (taxa.includes('dependente')) isencao = 'dependente';
  else if (taxa.includes('diretoria')) isencao = 'diretoria';
  else if (taxa.includes('isent')) isencao = 'outro';
  if (!isencao && /isent/.test(sem(controle))) isencao = 'outro';
  const valor = taxa.includes('20,00') ? 20 : taxa.includes('10,00') ? 10 : valorPadrao(renda);

  // As pessoas autistas vêm em grupos "Nome / Data de nascimento / Idade" repetidos.
  const autistas = [];
  h.forEach((c, i) => {
    if (!c.includes('nome da pessoa') || !c.includes('autista')) return;
    const nome = (l[i] ?? '').trim();
    if (!nome) return;
    const nasc = (l[i + 1] ?? '').trim();
    const iso = h[i + 1]?.includes('nascimento') ? data(nasc) : null;
    autistas.push({
      nome,
      nascimento: iso,
      nascimento_texto: iso ? null : nasc || null,
      idade_informada: h[i + 2]?.includes('idade') ? (l[i + 2] ?? '').trim() || null : null,
    });
  });

  return {
    inscritoEm: carimbo(l[0]),
    controle,
    dados: {
      email: col((c) => c === 'endereco de e-mail'),
      nome: col(tem('nome completo')),
      profissao: col(tem('profissao')),
      cpf: col((c) => c.includes('cpf') && !c.includes('dependente')),
      endereco: col((c) => /^\d\) endereco/.test(c)),
      telefone: col(tem('telefone')),
      renda_familiar: renda,
      categoria: porRotulo(CATEGORIAS, col(tem('na categoria'))),
      dependente_nome: col((c) => c.includes('nome do') && c.includes('dependente')),
      dependente_cpf: col((c) => c.includes('cpf do') && c.includes('dependente')),
      atividade_remunerada: col(tem('atividade remunerada')),
      participacao_economica: col(tem('participacao do autista')),
      recebe_bpc: simNao(col(tem('recebe bpc'))),
      autoriza_imagem: simNao(col(tem('uso de sua imagem'))),
      ciente_estatuto: sem(col(tem('estatuto'))).startsWith('ciente') || null,
      ciente_documentos: sem(col(tem('documentacoes em pdf'))).startsWith('ciente') || null,
      documentos: col(tem('anexar arquivo')),
      status: 'ativo',
      valor_mensal: isencao ? 0 : valor,
      isencao,
      controle_planilha: controle || null,
      autistas,
    },
  };
}

/**
 * Importa o CSV. Sócio já existente (mesmo CPF) é atualizado; os demais são criados.
 * Itens "PG Mês/Ano" do controle viram mensalidades pagas daquela competência.
 */
export function importarCsv(texto, { simular = false } = {}) {
  const linhas = lerCsv(texto);
  if (linhas.length < 2) throw erro(400, 'A planilha está vazia.');
  const h = linhas[0].map(sem);
  if (!h.some((c) => c.includes('nome completo')) || !h.some((c) => c.includes('cpf'))) {
    throw erro(400, 'Esta planilha não tem as colunas do formulário de inscrição da UPPA (Nome completo, CPF...).');
  }
  const itens = linhas.slice(1).map((l) => socioDaLinha(h, l)).filter((it) => it.dados.nome);
  // Ordena pela data de inscrição para a matrícula seguir a ordem de entrada.
  itens.sort((a, b) => String(a.inscritoEm ?? '').localeCompare(String(b.inscritoEm ?? '')));

  const resumo = { lidos: itens.length, criados: 0, atualizados: 0, mensalidades: 0, avisos: [] };
  const exec = () => {
    for (const it of itens) {
      const cpf = soDigitos(it.dados.cpf);
      // Sem CPF, o mesmo nome conta como o mesmo sócio (para reimportar sem duplicar).
      const existente = cpf
        ? db.prepare('SELECT id, status FROM socios WHERE cpf = ?').get(cpf)
        : db.prepare('SELECT id, status FROM socios WHERE cpf IS NULL AND lower(trim(nome)) = lower(trim(?))').get(it.dados.nome);
      let id;
      try {
        if (existente) {
          id = existente.id;
          atualizarSocio(id, { ...it.dados, status: existente.status === 'inativo' ? 'inativo' : 'ativo' }, { admin: true });
          resumo.atualizados++;
        } else {
          id = criarSocio(it.dados, { admin: true, inscritoEm: it.inscritoEm ?? agora(), exigirCpfValido: false });
          resumo.criados++;
        }
      } catch (e) {
        resumo.avisos.push(`${it.dados.nome}: ${e.message}`);
        continue;
      }
      if (cpf && cpf.length !== 11) resumo.avisos.push(`${it.dados.nome}: CPF com ${cpf.length} dígitos — confira o cadastro.`);
      for (const comp of competenciasPagas(it.controle)) {
        const r = db
          .prepare(`INSERT INTO mensalidades (socio_id, competencia, valor, status, pago_em, forma) VALUES (?, ?, ?, 'paga', ?, 'outro')
                    ON CONFLICT (socio_id, competencia) DO NOTHING`)
          .run(id, comp, it.dados.valor_mensal || valorPadrao(it.dados.renda_familiar), `${comp}-01`);
        resumo.mensalidades += Number(r.changes);
      }
    }
  };
  if (simular) {
    db.exec('BEGIN');
    try { exec(); } finally { db.exec('ROLLBACK'); }
  } else transacao(exec);
  return resumo;
}

export async function importarDeLink(url, opcoes) {
  const resp = await fetch(linkCsv(url), { redirect: 'follow' });
  const tipo = resp.headers.get('content-type') ?? '';
  if (!resp.ok || !tipo.includes('csv')) {
    throw erro(400, 'Não consegui baixar a planilha. Ela precisa estar compartilhada como "Qualquer pessoa com o link" — ou envie o arquivo CSV.');
  }
  return importarCsv(await resp.text(), opcoes);
}
