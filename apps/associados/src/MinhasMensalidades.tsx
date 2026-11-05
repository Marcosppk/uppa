import { useState } from 'react';
import { Modal, TagMensalidade, Icone, useAcao, useToast, Campo } from '@shared/ui';
import { dinheiro, mesExtenso, dataBr } from '@shared/formato';
import type { Mensalidade } from '@shared/tipos';
import { api, type Eu } from './api';
import { useQr } from './Carteirinha';

export function MinhasMensalidades({ eu, aoMudar }: { eu: Eu; aoMudar: () => void }) {
  const [pagar, setPagar] = useState<Mensalidade | null>(null);
  const lista = eu.mensalidades;
  const abertas = lista.filter((m) => m.status === 'pendente');

  return (
    <>
      <h1>Mensalidades</h1>
      {eu.socio.isencao && <div className="alert ok">Você é isento da mensalidade.</div>}
      {abertas.length > 0 && (
        <p className="muted">
          Em aberto: <b>{dinheiro(abertas.reduce((t, m) => t + m.valor, 0))}</b>
        </p>
      )}
      <div className="card">
        {lista.length === 0 ? (
          <div className="empty">Nenhuma mensalidade registrada.</div>
        ) : (
          <ul className="list">
            {lista.map((m) => (
              <li key={m.id}>
                <div className="sp">
                  <b>{mesExtenso(m.competencia)}</b>
                  <div className="muted small">
                    {m.status === 'isenta' ? 'Isento' : dinheiro(m.valor)}
                    {m.status === 'paga' && m.pago_em ? ` · pago em ${dataBr(m.pago_em)}` : ''}
                    {m.status === 'informada' ? ' · aguardando confirmação da tesouraria' : ''}
                  </div>
                </div>
                {m.status === 'pendente' ? (
                  <button className="btn sm" onClick={() => setPagar(m)}>
                    Pagar
                  </button>
                ) : (
                  <TagMensalidade status={m.status} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {pagar && (
        <Pagar
          m={pagar}
          eu={eu}
          aoFechar={() => setPagar(null)}
          aoInformar={() => {
            setPagar(null);
            aoMudar();
          }}
        />
      )}
    </>
  );
}

function Pagar({ m, eu, aoFechar, aoInformar }: { m: Mensalidade; eu: Eu; aoFechar: () => void; aoInformar: () => void }) {
  const qr = useQr(m.pix ?? null);
  const toast = useToast();
  const [obs, setObs] = useState('');
  const { ocupado, rodar } = useAcao();

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(m.pix!);
      toast('Código PIX copiado. Cole no app do seu banco.');
    } catch {
      toast('Não consegui copiar. Selecione o código e copie manualmente.');
    }
  };

  return (
    <Modal titulo={`Mensalidade de ${mesExtenso(m.competencia)}`} aoFechar={aoFechar}>
      <div className="stack">
        <p className="center" style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
          {dinheiro(m.valor)}
        </p>
        {m.pix ? (
          <>
            {qr && <img className="qr" src={qr} alt="QR Code PIX" />}
            <p className="muted small center" style={{ margin: 0 }}>
              Abra o app do seu banco, escolha PIX e leia o QR Code — ou copie o código abaixo.
              <br />
              Recebedor: <b>{eu.associacao.pix_nome}</b>
            </p>
            <div className="pix-code">{m.pix}</div>
            <button className="btn sec block" onClick={copiar}>
              <Icone nome="copiar" /> Copiar código PIX
            </button>
          </>
        ) : (
          <div className="alert">A tesouraria ainda não cadastrou a chave PIX no app. Combine o pagamento diretamente com a diretoria da UPPA.</div>
        )}
        <hr style={{ border: 0, borderTop: '1px solid var(--line)', width: '100%' }} />
        <Campo rotulo="Já pagou? Avise a tesouraria" ajuda="Opcional: escreva um recado (ex.: paguei pela conta da minha esposa).">
          <input className="input" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={300} />
        </Campo>
        <button className="btn ok block" disabled={ocupado} onClick={() => rodar(() => api.post(`/associado/mensalidades/${m.id}/informar`, { forma: 'pix', obs }), 'Pronto! A tesouraria vai confirmar.').then((ok) => ok && aoInformar())}>
          <Icone nome="check" /> Já paguei
        </button>
      </div>
    </Modal>
  );
}
