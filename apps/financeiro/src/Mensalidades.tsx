import { useState } from 'react';
import { useDados, Estado, Icone, ir, useAcao } from '@shared/ui';
import { dinheiro, mesExtenso, competenciaAtual, mudarMes } from '@shared/formato';
import type { Mensalidade } from '@shared/tipos';
import { api } from './api';
import { AcoesMensalidade, LinhaMensalidade } from './Baixa';

const FILTROS = [
  ['', 'Todas'],
  ['informada', 'Informadas pelo sócio'],
  ['pendente', 'Em aberto'],
  ['paga', 'Pagas'],
  ['isenta', 'Isentas'],
] as const;

export function Mensalidades() {
  const [comp, setComp] = useState(competenciaAtual());
  const [status, setStatus] = useState('');
  const { ocupado, rodar } = useAcao();
  const { dados, erro, recarregar } = useDados(() => api.get<{ itens: Mensalidade[] }>(`/admin/mensalidades?competencia=${comp}`), [comp]);
  const informadas = useDados(() => api.get<Mensalidade[]>('/admin/mensalidades/informadas'), [dados]).dados ?? [];

  const itens = dados?.itens ?? [];
  const lista = status ? itens.filter((m) => m.status === status) : itens;
  const soma = (s: string[]) => itens.filter((m) => s.includes(m.status)).reduce((t, m) => t + m.valor, 0);
  const atualizar = () => recarregar();

  return (
    <>
      <div className="topo">
        <h1>Mensalidades</h1>
        <div className="mes-nav">
          <button className="btn ghost sm" onClick={() => setComp(mudarMes(comp, -1))} aria-label="Mês anterior">
            <Icone nome="voltar" />
          </button>
          <b>{mesExtenso(comp)}</b>
          <button className="btn ghost sm" onClick={() => setComp(mudarMes(comp, 1))} aria-label="Próximo mês">
            <Icone nome="seta" />
          </button>
        </div>
        <button
          className="btn sec"
          disabled={ocupado}
          onClick={() =>
            rodar(async () => {
              const r = await api.post<{ criadas: number }>('/admin/mensalidades/gerar', { competencia: comp });
              recarregar();
              return r;
            }, 'Mensalidades do mês geradas para todos os sócios ativos.')
          }
        >
          Gerar mensalidades do mês
        </button>
      </div>

      {informadas.filter((m) => m.competencia !== comp).length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3>Pagamentos informados em outros meses</h3>
          <ul className="list">
            {informadas
              .filter((m) => m.competencia !== comp)
              .map((m) => (
                <li key={m.id}>
                  <div className="sp">
                    <b>{m.nome}</b>
                    <div className="muted small">
                      {mesExtenso(m.competencia)} · {dinheiro(m.valor)}
                    </div>
                  </div>
                  <AcoesMensalidade m={m} aoMudar={atualizar} />
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="grid-cards" style={{ marginBottom: 12 }}>
        <div className="card stat">
          <span className="l">Recebido</span>
          <span className="v" style={{ color: 'var(--ok)' }}>
            {dinheiro(soma(['paga']))}
          </span>
        </div>
        <div className="card stat">
          <span className="l">Informado pelo sócio</span>
          <span className="v">{dinheiro(soma(['informada']))}</span>
        </div>
        <div className="card stat">
          <span className="l">Em aberto</span>
          <span className="v" style={{ color: 'var(--warn)' }}>
            {dinheiro(soma(['pendente']))}
          </span>
        </div>
      </div>

      <div className="filtros">
        <div className="seg" role="group" style={{ flexWrap: 'wrap' }}>
          {FILTROS.map(([v, t]) => (
            <button key={v} aria-pressed={status === v} onClick={() => setStatus(v)}>
              {t} ({v ? itens.filter((m) => m.status === v).length : itens.length})
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {!dados ? (
          <Estado erro={erro} />
        ) : lista.length === 0 ? (
          <div className="empty">{itens.length ? 'Nada neste filtro.' : 'Nenhuma mensalidade neste mês. Use “Gerar mensalidades do mês”.'}</div>
        ) : (
          <ul className="list">
            {lista.map((m) => (
              <li key={m.id}>
                <div className="sp" style={{ cursor: 'pointer' }} onClick={() => ir(`/socios/${m.socio_id}`)}>
                  <b>{m.nome}</b>
                  <div className="muted small">
                    {m.matricula ? `Mat. ${m.matricula} · ` : ''}
                    <span className="num">{dinheiro(m.valor)}</span>
                  </div>
                </div>
                <div>
                  <LinhaMensalidade m={m} />
                </div>
                <AcoesMensalidade m={m} aoMudar={atualizar} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
