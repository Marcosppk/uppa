import { useEffect, useState } from 'react';
import { useDados, Estado, Icone, Iniciais, TagSocio, ir, useAcao, Modal } from '@shared/ui';
import { cpfFormatado, dinheiro, mesCurto } from '@shared/formato';
import { CATEGORIAS, rotulo } from '@shared/opcoes.js';
import type { Socio } from '@shared/tipos';
import { LinkCadastro, type Convite } from '@shared/LinkCadastro';
import { api } from './api';

export function Socios({ statusInicial = '' }: { statusInicial?: string }) {
  const [q, setQ] = useState('');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState(statusInicial);
  const [categoria, setCategoria] = useState('');
  const [link, setLink] = useState(false);
  const { ocupado, rodar } = useAcao();

  useEffect(() => {
    const t = setTimeout(() => setBusca(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { dados, erro } = useDados(
    () => api.get<Socio[]>(`/admin/socios?${new URLSearchParams({ q: busca, status, categoria })}`),
    [busca, status, categoria],
  );

  return (
    <>
      <div className="topo">
        <h1>Sócios</h1>
        <button className="btn sec" onClick={() => setLink(true)}>
          <Icone nome="enviar" /> Link de cadastro
        </button>
        <button className="btn sec" disabled={ocupado} onClick={() => rodar(() => api.baixar('/admin/exportar/socios.csv', 'socios-uppa.csv'))}>
          <Icone nome="baixar" /> Exportar
        </button>
        <a className="btn" href="#/socios/novo">
          <Icone nome="mais" /> Novo sócio
        </a>
      </div>

      {link && (
        <Modal titulo="Link de cadastro" aoFechar={() => setLink(false)}>
          <p className="muted small">Envie este link para quem quer se associar. Ele abre direto a ficha de inscrição do app UPPA Associados.</p>
          <LinkCadastro carregar={() => api.get<Convite>('/admin/convite')} />
        </Modal>
      )}

      <div className="filtros">
        <label className="busca">
          <Icone nome="busca" />
          <input className="input" placeholder="Buscar por nome, CPF, e-mail ou matrícula" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </label>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação">
          <option value="">Todas as situações</option>
          <option value="pendente">Aguardando aprovação</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        {!dados ? (
          <Estado erro={erro} />
        ) : dados.length === 0 ? (
          <div className="empty">
            Nenhum sócio encontrado.
            {!busca && !status && !categoria && (
              <p style={{ marginTop: 8 }}>
                Para trazer os cadastros da planilha, vá em <a href="#/config">Ajustes → Importar planilha</a>.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="muted small">{dados.length} sócio(s)</p>
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Sócio</th>
                    <th className="so-largo">Categoria</th>
                    <th className="so-largo">CPF</th>
                    <th className="r">Mensalidade</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((s) => (
                    <tr key={s.id} className="click" onClick={() => ir(`/socios/${s.id}`)}>
                      <td>
                        <div className="row" style={{ flexWrap: 'nowrap', gap: 10 }}>
                          <Iniciais nome={s.nome} />
                          <div>
                            <b>{s.nome}</b>
                            <div className="muted small">
                              {s.matricula ? `Matrícula ${s.matricula}` : 'Sem matrícula'}
                              {s.n_autistas ? ` · ${s.n_autistas} autista(s)` : ''}
                            </div>
                            {s.status === 'pendente' && s.convidado_por && <div className="muted small">Convite de {s.convidado_por}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="so-largo small">{rotulo(CATEGORIAS, s.categoria)}</td>
                      <td className="so-largo small num" style={{ whiteSpace: 'nowrap' }}>{cpfFormatado(s.cpf)}</td>
                      <td className="r small">
                        {s.isencao ? <span className="tag">Isento</span> : <span className="num">{dinheiro(s.valor_mensal)}</span>}
                        <div className="muted">
                          {s.abertas ? <span style={{ color: 'var(--warn)' }}>{s.abertas} em aberto</span> : s.ultima_paga ? `pago ${mesCurto(s.ultima_paga)}` : ''}
                        </div>
                      </td>
                      <td>
                        <TagSocio status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
