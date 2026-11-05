import { useState } from 'react';
import { useDados, Estado, Icone, Modal, Campo, useAcao } from '@shared/ui';
import { dinheiro, mesExtenso, competenciaAtual, mudarMes, dataBr, hojeIso } from '@shared/formato';
import { CATEGORIAS_RECEITA, CATEGORIAS_DESPESA } from '@shared/opcoes.js';
import type { Lancamento } from '@shared/tipos';
import { api } from './api';

export function Caixa() {
  const [mes, setMes] = useState(competenciaAtual());
  const [novo, setNovo] = useState<'receita' | 'despesa' | null>(null);
  const { ocupado, rodar } = useAcao();
  const { dados, erro, recarregar } = useDados(() => api.get<{ itens: Lancamento[]; saldo_anterior: number }>(`/admin/lancamentos?mes=${mes}`), [mes]);

  const itens = dados?.itens ?? [];
  const rec = itens.filter((l) => l.tipo === 'receita').reduce((t, l) => t + l.valor, 0);
  const des = itens.filter((l) => l.tipo === 'despesa').reduce((t, l) => t + l.valor, 0);

  return (
    <>
      <div className="topo">
        <h1>Caixa</h1>
        <div className="mes-nav">
          <button className="btn ghost sm" onClick={() => setMes(mudarMes(mes, -1))} aria-label="Mês anterior">
            <Icone nome="voltar" />
          </button>
          <b>{mesExtenso(mes)}</b>
          <button className="btn ghost sm" onClick={() => setMes(mudarMes(mes, 1))} aria-label="Próximo mês">
            <Icone nome="seta" />
          </button>
        </div>
        <button className="btn ok" onClick={() => setNovo('receita')}>
          <Icone nome="mais" /> Receita
        </button>
        <button className="btn danger" onClick={() => setNovo('despesa')}>
          <Icone nome="mais" /> Despesa
        </button>
      </div>

      {dados && (
        <div className="grid-cards" style={{ marginBottom: 12 }}>
          <div className="card stat">
            <span className="l">Saldo anterior</span>
            <span className="v">{dinheiro(dados.saldo_anterior)}</span>
          </div>
          <div className="card stat">
            <span className="l">Receitas do mês</span>
            <span className="v" style={{ color: 'var(--ok)' }}>
              {dinheiro(rec)}
            </span>
          </div>
          <div className="card stat">
            <span className="l">Despesas do mês</span>
            <span className="v" style={{ color: 'var(--bad)' }}>
              {dinheiro(des)}
            </span>
          </div>
          <div className="card stat">
            <span className="l">Saldo no fim do mês</span>
            <span className="v">{dinheiro(dados.saldo_anterior + rec - des)}</span>
          </div>
        </div>
      )}

      <div className="card">
        {!dados ? (
          <Estado erro={erro} />
        ) : itens.length === 0 ? (
          <div className="empty">Nenhum lançamento neste mês.</div>
        ) : (
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th className="so-largo">Categoria</th>
                  <th className="r">Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {itens.map((l) => (
                  <tr key={l.id}>
                    <td className="num small">{dataBr(l.data)}</td>
                    <td>
                      {l.descricao || l.categoria}
                      {l.criado_por && <div className="muted small">por {l.criado_por}</div>}
                    </td>
                    <td className="so-largo small">{l.categoria}</td>
                    <td className="r num" style={{ color: l.tipo === 'receita' ? 'var(--ok)' : 'var(--bad)', fontWeight: 600 }}>
                      {l.tipo === 'despesa' ? '−' : '+'} {dinheiro(l.valor)}
                    </td>
                    <td className="r">
                      {!l.mensalidade_id && (
                        <button className="btn ghost sm" disabled={ocupado} aria-label="Excluir lançamento" onClick={() => confirm('Excluir este lançamento?') && rodar(() => api.del(`/admin/lancamentos/${l.id}`), 'Lançamento excluído.').then(recarregar)}>
                          <Icone nome="x" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {novo && (
        <NovoLancamento
          tipo={novo}
          aoFechar={() => setNovo(null)}
          aoSalvar={() => {
            setNovo(null);
            recarregar();
          }}
        />
      )}
    </>
  );
}

function NovoLancamento({ tipo, aoFechar, aoSalvar }: { tipo: 'receita' | 'despesa'; aoFechar: () => void; aoSalvar: () => void }) {
  const cats = tipo === 'receita' ? CATEGORIAS_RECEITA.filter((c) => c !== 'Mensalidade') : CATEGORIAS_DESPESA;
  const [f, setF] = useState({ categoria: cats[0], descricao: '', valor: '', data: hojeIso() });
  const { ocupado, rodar } = useAcao();
  return (
    <Modal titulo={tipo === 'receita' ? 'Nova receita' : 'Nova despesa'} aoFechar={aoFechar}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          rodar(() => api.post('/admin/lancamentos', { ...f, tipo, valor: Number(f.valor.replace(',', '.')) }), 'Lançamento registrado.').then((ok) => ok && aoSalvar());
        }}
      >
        <div className="grid2">
          <Campo rotulo="Valor (R$)">
            <input className="input num" inputMode="decimal" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} placeholder="0,00" required autoFocus />
          </Campo>
          <Campo rotulo="Data">
            <input className="input" type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} required />
          </Campo>
        </div>
        <Campo rotulo="Categoria">
          <select className="input" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Descrição">
          <input className="input" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder={tipo === 'receita' ? 'Ex.: Doação do bazar' : 'Ex.: Conta de luz de março'} />
        </Campo>
        <div className="acoes">
          <button type="button" className="btn sec" onClick={aoFechar}>
            Cancelar
          </button>
          <button className={`btn ${tipo === 'receita' ? 'ok' : 'danger'}`} disabled={ocupado}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}
