import { useState } from 'react';
import { Campo, Modal, TagMensalidade, useAcao } from '@shared/ui';
import { dinheiro, mesExtenso, hojeIso, dataBr } from '@shared/formato';
import { FORMAS_PAGAMENTO, rotulo } from '@shared/opcoes.js';
import type { Mensalidade } from '@shared/tipos';
import { api } from './api';

/** Janela para dar baixa (registrar pagamento) de uma mensalidade. */
export function BaixaModal({ m, nome, aoFechar, aoSalvar }: { m: Mensalidade; nome?: string; aoFechar: () => void; aoSalvar: () => void }) {
  const [forma, setForma] = useState(m.forma ?? 'pix');
  const [data, setData] = useState(hojeIso());
  const { ocupado, rodar } = useAcao();
  return (
    <Modal titulo="Registrar pagamento" aoFechar={aoFechar}>
      <div className="stack">
        <p>
          <b>{nome ?? m.nome}</b>
          <br />
          <span className="muted">
            {mesExtenso(m.competencia)}
          </span>{' '}
          · <b>{dinheiro(m.valor)}</b>
        </p>
        {m.status === 'informada' && (
          <div className="alert">
            O sócio informou pelo app em {dataBr(m.informado_em)}
            {m.forma ? ` (${rotulo(FORMAS_PAGAMENTO, m.forma)})` : ''}.{m.informado_obs ? ` Obs.: “${m.informado_obs}”` : ''} Confira o extrato antes de confirmar.
          </div>
        )}
        <div className="grid2">
          <Campo rotulo="Forma de pagamento">
            <select className="input" value={forma} onChange={(e) => setForma(e.target.value)}>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Data do pagamento">
            <input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Campo>
        </div>
        <p className="muted small">A receita entra automaticamente no Caixa e o sócio vê a mensalidade como paga no app.</p>
        <div className="acoes">
          {m.status === 'informada' && (
            <button className="btn sec" disabled={ocupado} onClick={() => rodar(() => api.post(`/admin/mensalidades/${m.id}/recusar`), 'Mensalidade voltou para "em aberto".').then((ok) => ok && aoSalvar())}>
              Não encontrei o pagamento
            </button>
          )}
          <button className="btn ok" disabled={ocupado} onClick={() => rodar(() => api.post(`/admin/mensalidades/${m.id}/pagar`, { forma, data }), 'Pagamento registrado.').then((ok) => ok && aoSalvar())}>
            Confirmar pagamento
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Botões de ação de uma mensalidade, conforme a situação. */
export function AcoesMensalidade({ m, nome, aoMudar }: { m: Mensalidade; nome?: string; aoMudar: () => void }) {
  const [baixa, setBaixa] = useState(false);
  const { ocupado, rodar } = useAcao();
  return (
    <div className="acoes">
      {(m.status === 'pendente' || m.status === 'informada') && (
        <>
          <button className={`btn sm ${m.status === 'informada' ? '' : 'ok'}`} onClick={() => setBaixa(true)}>
            {m.status === 'informada' ? 'Conferir' : 'Receber'}
          </button>
          <button className="btn ghost sm" disabled={ocupado} onClick={() => confirm('Isentar esta mensalidade?') && rodar(() => api.post(`/admin/mensalidades/${m.id}/isentar`), 'Mensalidade isenta.').then(aoMudar)}>
            Isentar
          </button>
        </>
      )}
      {m.status === 'paga' && (
        <button className="btn ghost sm" disabled={ocupado} onClick={() => confirm('Estornar este pagamento? O lançamento sai do caixa.') && rodar(() => api.post(`/admin/mensalidades/${m.id}/estornar`), 'Pagamento estornado.').then(aoMudar)}>
          Estornar
        </button>
      )}
      {baixa && (
        <BaixaModal
          m={m}
          nome={nome}
          aoFechar={() => setBaixa(false)}
          aoSalvar={() => {
            setBaixa(false);
            aoMudar();
          }}
        />
      )}
    </div>
  );
}

export function LinhaMensalidade({ m }: { m: Mensalidade }) {
  return (
    <>
      <TagMensalidade status={m.status} />
      {m.status === 'paga' && m.pago_em && (
        <div className="muted small">
          {dataBr(m.pago_em)}
          {m.forma ? ` · ${rotulo(FORMAS_PAGAMENTO, m.forma)}` : ''}
        </div>
      )}
    </>
  );
}
