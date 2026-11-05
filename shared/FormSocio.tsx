// Formulário de cadastro do sócio — os mesmos campos do formulário de inscrição da UPPA (planilha).
// modo "inscricao": quem quer se associar (app Associados); "proprio": o sócio editando seus dados;
// "admin": a tesouraria no app Financeiro (campos administrativos a mais).
import type { Autista, Socio } from './tipos';
import { Campo, Icone, SimNao } from './ui';
import { mascaraCpf, mascaraTelefone, idade, dinheiro } from './formato';
import { CATEGORIAS, RENDAS, RENDA_ATE_2SM, ATIVIDADE_REMUNERADA, PARTICIPACAO_ECONOMICA, ISENCOES } from './opcoes.js';

export type DadosSocio = Partial<Socio> & { autistas?: Autista[] };
type Modo = 'inscricao' | 'proprio' | 'admin';

export function FormSocio({ valor, onChange, modo, valores }: { valor: DadosSocio; onChange: (v: DadosSocio) => void; modo: Modo; valores?: { ate2: number; acima2: number } }) {
  const set = <K extends keyof DadosSocio>(k: K, v: DadosSocio[K]) => onChange({ ...valor, [k]: v });
  const fixo = modo === 'proprio';
  const autistas = valor.autistas ?? [];
  const setAutista = (i: number, a: Partial<Autista>) => set('autistas', autistas.map((x, j) => (j === i ? { ...x, ...a } : x)));
  const opcoesTexto = (lista: string[], atual: string | null | undefined) => (atual && !lista.includes(atual) ? [...lista, atual] : lista);
  const ate2 = RENDA_ATE_2SM.includes(valor.renda_familiar ?? '');

  return (
    <div className="stack">
      <fieldset>
        <legend>Dados pessoais</legend>
        <Campo rotulo="Nome completo">
          <input className="input" value={valor.nome ?? ''} onChange={(e) => set('nome', e.target.value)} disabled={fixo} autoComplete="name" required />
        </Campo>
        <div className="grid2">
          <Campo rotulo="CPF">
            <input className="input" inputMode="numeric" value={mascaraCpf(valor.cpf ?? '')} onChange={(e) => set('cpf', e.target.value.replace(/\D/g, ''))} disabled={fixo} placeholder="000.000.000-00" required={modo === 'inscricao'} />
          </Campo>
          <Campo rotulo="Data de nascimento">
            <input className="input" type="date" value={valor.nascimento ?? ''} max={new Date().toLocaleDateString('sv-SE')} onChange={(e) => set('nascimento', e.target.value || null)} autoComplete="bday" />
          </Campo>
          <Campo rotulo="Telefone (WhatsApp)">
            <input className="input" inputMode="tel" value={mascaraTelefone(valor.telefone ?? '')} onChange={(e) => set('telefone', e.target.value)} autoComplete="tel" placeholder="(95) 99999-9999" />
          </Campo>
          <Campo rotulo="E-mail">
            <input className="input" type="email" value={valor.email ?? ''} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
          </Campo>
          <Campo rotulo="Profissão">
            <input className="input" value={valor.profissao ?? ''} onChange={(e) => set('profissao', e.target.value)} />
          </Campo>
        </div>
        <Campo rotulo="Endereço">
          <input className="input" value={valor.endereco ?? ''} onChange={(e) => set('endereco', e.target.value)} autoComplete="street-address" placeholder="Rua, número, bairro, cidade" />
        </Campo>
      </fieldset>

      <fieldset>
        <legend>Categoria de associado</legend>
        <div className="stack" role="radiogroup">
          {CATEGORIAS.map((c) => (
            <label key={c.valor} className="check">
              <input type="radio" name="categoria" checked={valor.categoria === c.valor} onChange={() => set('categoria', c.valor)} disabled={fixo} />
              <span>
                {c.rotulo} <span className="muted small">({c.tipo})</span>
              </span>
            </label>
          ))}
        </div>
        <Campo rotulo="Renda média familiar">
          <select className="input" value={valor.renda_familiar ?? ''} onChange={(e) => set('renda_familiar', e.target.value || null)}>
            <option value="">Selecione…</option>
            {RENDAS.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.rotulo}
              </option>
            ))}
          </select>
        </Campo>
        {valores && modo !== 'admin' && valor.renda_familiar && (
          <div className="alert small">
            Taxa de sócio: <b>{dinheiro(ate2 ? valores.ate2 : valores.acima2)} por mês</b> ({ate2 ? 'renda até 2 salários mínimos' : 'renda acima de 2 salários mínimos'}). Sócio dependente que mora na mesma casa é isento.
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Sócio dependente familiar</legend>
        <p className="muted small">Pessoa da mesma casa que também será sócia (é isenta da mensalidade). Deixe em branco se não houver.</p>
        <div className="grid2">
          <Campo rotulo="Nome do dependente">
            <input className="input" value={valor.dependente_nome ?? ''} onChange={(e) => set('dependente_nome', e.target.value)} />
          </Campo>
          <Campo rotulo="CPF do dependente">
            <input className="input" inputMode="numeric" value={mascaraCpf(valor.dependente_cpf ?? '')} onChange={(e) => set('dependente_cpf', e.target.value.replace(/\D/g, ''))} />
          </Campo>
        </div>
      </fieldset>

      <fieldset>
        <legend>Pessoas autistas na família</legend>
        {autistas.length === 0 && <p className="muted small">Nenhuma pessoa adicionada.</p>}
        {autistas.map((a, i) => {
          const anos = idade(a.nascimento);
          return (
            <div key={i} className="card" style={{ padding: 12, boxShadow: 'none', background: 'var(--surface-2)' }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <b>Pessoa {i + 1}</b>
                <button type="button" className="btn ghost sm" onClick={() => set('autistas', autistas.filter((_, j) => j !== i))}>
                  Remover
                </button>
              </div>
              <div className="grid2">
                <Campo rotulo="Nome">
                  <input className="input" value={a.nome} onChange={(e) => setAutista(i, { nome: e.target.value })} />
                </Campo>
                <Campo rotulo="Data de nascimento" ajuda={anos !== null ? `${anos} ${anos === 1 ? 'ano' : 'anos'}` : a.nascimento_texto ? `Na planilha: "${a.nascimento_texto}"` : a.idade_informada ? `Idade informada: ${a.idade_informada}` : undefined}>
                  <input className="input" type="date" value={a.nascimento ?? ''} onChange={(e) => setAutista(i, { nascimento: e.target.value || null })} />
                </Campo>
              </div>
            </div>
          );
        })}
        <button type="button" className="btn sec" onClick={() => set('autistas', [...autistas, { nome: '', nascimento: null }])}>
          <Icone nome="mais" /> Adicionar pessoa autista
        </button>
        <Campo rotulo="A pessoa autista desenvolve alguma atividade remunerada?">
          <select className="input" value={valor.atividade_remunerada ?? ''} onChange={(e) => set('atividade_remunerada', e.target.value || null)}>
            <option value="">Selecione…</option>
            {opcoesTexto(ATIVIDADE_REMUNERADA, valor.atividade_remunerada).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Qual a participação do autista na vida econômica da família?">
          <select className="input" value={valor.participacao_economica ?? ''} onChange={(e) => set('participacao_economica', e.target.value || null)}>
            <option value="">Selecione…</option>
            {opcoesTexto(PARTICIPACAO_ECONOMICA, valor.participacao_economica).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="A pessoa autista recebe BPC (BPC-LOAS, pago pelo INSS)?">
          <SimNao valor={valor.recebe_bpc} onChange={(v) => set('recebe_bpc', v)} />
        </Campo>
      </fieldset>

      {modo !== 'proprio' && (
        <fieldset>
          <legend>Documentos e declarações</legend>
          <div className="alert small">
            Envie em PDF para o e-mail da associação: documento de identificação com foto (frente e verso) e laudo da pessoa autista; do responsável, caso o autista seja criança ou totalmente
            dependente; CAD Único e comprovante, caso receba BPC.
          </div>
          <label className="check">
            <input type="checkbox" checked={!!valor.ciente_documentos} onChange={(e) => set('ciente_documentos', e.target.checked)} />
            <span>Estou ciente do envio da documentação.</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={!!valor.ciente_estatuto} onChange={(e) => set('ciente_estatuto', e.target.checked)} />
            <span>Declaro estar ciente do Estatuto da UPPA (Art. 11º — direitos e deveres dos sócios).</span>
          </label>
        </fieldset>
      )}

      <fieldset>
        <legend>Uso de imagem</legend>
        <Campo rotulo="Autoriza o uso da sua imagem ou da criança autista em fotos e divulgações da UPPA?">
          <SimNao valor={valor.autoriza_imagem} onChange={(v) => set('autoriza_imagem', v)} />
        </Campo>
      </fieldset>

      {modo === 'admin' && (
        <fieldset>
          <legend>Tesouraria</legend>
          <div className="grid2">
            <Campo rotulo="Situação">
              <select className="input" value={valor.status ?? 'ativo'} onChange={(e) => set('status', e.target.value as Socio['status'])}>
                <option value="pendente">Aguardando aprovação</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </Campo>
            <Campo rotulo="Isenção">
              <select
                className="input"
                value={valor.isencao ?? ''}
                onChange={(e) => onChange({ ...valor, isencao: e.target.value || null, valor_mensal: e.target.value ? 0 : valores ? (ate2 ? valores.ate2 : valores.acima2) : valor.valor_mensal })}
              >
                <option value="">Paga mensalidade</option>
                {ISENCOES.map((i) => (
                  <option key={i.valor} value={i.valor}>
                    Isento — {i.rotulo}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Mensalidade (R$)" ajuda={valores ? `Tabela: ${dinheiro(valores.ate2)} até 2 SM · ${dinheiro(valores.acima2)} acima` : undefined}>
              <input className="input num" type="number" min={0} step="0.01" value={valor.valor_mensal ?? ''} onChange={(e) => set('valor_mensal', e.target.value === '' ? (undefined as never) : Number(e.target.value))} disabled={!!valor.isencao} />
            </Campo>
          </div>
          <Campo rotulo="Documentos enviados (links)">
            <textarea className="input" value={valor.documentos ?? ''} onChange={(e) => set('documentos', e.target.value)} />
          </Campo>
          {valor.controle_planilha && (
            <div className="alert small">
              Controle de contribuição na planilha antiga: <b>{valor.controle_planilha}</b>
            </div>
          )}
          <Campo rotulo="Observações internas">
            <textarea className="input" value={valor.observacoes ?? ''} onChange={(e) => set('observacoes', e.target.value)} />
          </Campo>
        </fieldset>
      )}
    </div>
  );
}

export function LinksDocumentos({ texto }: { texto: string | null | undefined }) {
  const links = (texto ?? '').split(/[\s,]+/).filter((l) => /^https?:\/\//.test(l));
  if (!links.length) return null;
  return (
    <div className="row">
      {links.map((l, i) => (
        <a key={l} className="btn sec sm" href={l} target="_blank" rel="noreferrer">
          Documento {i + 1}
        </a>
      ))}
    </div>
  );
}
